from __future__ import annotations

import logging
import time
from typing import Any, Literal
from uuid import uuid4

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .openai_extract import extract_rows_from_image, OpenAIError
from .gemini_extract import extract_rows_from_image_gemini, GeminiError
from .logging_config import RequestIdAdapter, configure_logging
from .schema_builder import build_rows_schema


configure_logging()
logger = logging.getLogger("ss2sd")

app = FastAPI(title="Screenshot to Structured Data API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


MAX_IMAGES = 50
ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}

# Default models for each provider
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"


@app.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/config")
def get_config() -> dict[str, Any]:
    """
    Get API configuration including available providers.
    Both providers use BYOK (Bring Your Own Key).
    """
    return {
        "default_provider": "openai",
        "default_gemini_model": DEFAULT_GEMINI_MODEL,
        "default_openai_model": DEFAULT_OPENAI_MODEL,
    }


@app.post("/api/extract")
async def extract(
    images: list[UploadFile] = File(...),
    prompt: str = Form(...),
    fields: str = Form(...),
    provider: str = Form(default="openai"),
    model: str = Form(default=""),
    detail: str = Form(default="auto"),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> dict[str, Any]:
    """
    Extract structured data from images.
    
    Supports two providers (both BYOK - Bring Your Own Key):
    - openai: Uses user-provided X-API-Key header
    - gemini: Uses user-provided X-API-Key header
    """
    request_id = str(uuid4())
    log = RequestIdAdapter(logger, {})
    log.request_id = request_id  # type: ignore[attr-defined]

    t0 = time.perf_counter()

    # Validate provider
    if provider not in {"gemini", "openai"}:
        raise HTTPException(status_code=400, detail="provider must be 'gemini' or 'openai'")

    # Set default model based on provider if not specified
    if not model:
        model = DEFAULT_GEMINI_MODEL if provider == "gemini" else DEFAULT_OPENAI_MODEL

    # Both providers require API key from user (BYOK)
    if not x_api_key:
        log.info("extract rejected: missing_x_api_key provider=%s", provider)
        raise HTTPException(status_code=401, detail=f"Missing X-API-Key header for {provider} provider.")

    if not images:
        log.info("extract rejected: no_images")
        raise HTTPException(status_code=400, detail="No images uploaded.")
    if len(images) > MAX_IMAGES:
        log.info("extract rejected: too_many_images count=%s max=%s", len(images), MAX_IMAGES)
        raise HTTPException(status_code=400, detail=f"Too many images. Max is {MAX_IMAGES}.")

    if detail not in {"auto", "low", "high"}:
        log.info("extract rejected: invalid_detail detail=%s", detail)
        raise HTTPException(status_code=400, detail="detail must be one of: auto, low, high")

    try:
        schema, key_map, columns = build_rows_schema(fields)
    except ValueError as e:
        log.info("extract rejected: invalid_fields error=%s", str(e))
        raise HTTPException(status_code=400, detail=str(e))

    all_rows: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    log.info(
        "extract start provider=%s images=%s model=%s detail=%s fields=%s",
        provider,
        len(images),
        model,
        detail,
        len(columns),
    )

    for upload in images:
        source_image = upload.filename or "image"
        if upload.content_type and upload.content_type not in ALLOWED_MIME:
            log.info("image skipped unsupported_type filename=%s content_type=%s", source_image, upload.content_type)
            errors.append(
                {
                    "source_image": source_image,
                    "error": f"Unsupported content type: {upload.content_type}",
                }
            )
            continue

        try:
            img_t0 = time.perf_counter()
            image_bytes = await upload.read()
            log.info("image start filename=%s bytes=%s provider=%s", source_image, len(image_bytes), provider)
            
            if provider == "gemini":
                parsed = extract_rows_from_image_gemini(
                    api_key=x_api_key,  # type: ignore
                    model=model,
                    prompt=prompt,
                    fields_csv=fields,
                    columns=columns,
                    key_map=key_map,
                    image_filename=source_image,
                    image_bytes=image_bytes,
                )
            else:
                # OpenAI provider
                parsed = extract_rows_from_image(
                    api_key=x_api_key,  # type: ignore
                    model=model,
                    prompt=prompt,
                    fields_csv=fields,
                    schema=schema,
                    image_filename=source_image,
                    image_bytes=image_bytes,
                    detail=detail,
                )
            
            rows = parsed.get("rows", [])
            if not isinstance(rows, list):
                raise RuntimeError("Parsed rows was not a list.")

            log.info(
                "image success filename=%s rows=%s elapsed_ms=%s",
                source_image,
                len(rows),
                int((time.perf_counter() - img_t0) * 1000),
            )

            for r in rows:
                if not isinstance(r, dict):
                    continue
                # Ensure stable column shape; keep only expected columns.
                cleaned = {k: r.get(k) for k in columns}
                cleaned["source_image"] = source_image
                all_rows.append(cleaned)
                
        except GeminiError as e:
            # Log raw error for debugging, return user-friendly message
            log.warning("image error filename=%s error=%s", source_image, e.raw_error)
            errors.append({"source_image": source_image, "error": e.user_message})
        except OpenAIError as e:
            # Log raw error for debugging, return user-friendly message
            log.warning("image error filename=%s error=%s", source_image, e.raw_error)
            errors.append({"source_image": source_image, "error": e.user_message})
        except Exception as e:
            # For unexpected errors, log full message but show generic user message
            error_msg = str(e)
            log.warning("image error filename=%s error=%s", source_image, error_msg)
            errors.append({"source_image": source_image, "error": "An unexpected error occurred. Please try again."})

    log.info(
        "extract done provider=%s rows=%s errors=%s elapsed_ms=%s",
        provider,
        len(all_rows),
        len(errors),
        int((time.perf_counter() - t0) * 1000),
    )

    return {
        "request_id": request_id,
        "provider": provider,
        "columns": columns,
        "key_map": key_map,
        "rows": all_rows,
        "errors": errors,
    }
