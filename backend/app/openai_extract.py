from __future__ import annotations

import base64
import json
from typing import Any

from openai import OpenAI


class OpenAIError(Exception):
    """Custom exception for OpenAI errors with both raw and user-friendly messages."""
    
    def __init__(self, user_message: str, raw_error: str):
        self.user_message = user_message
        self.raw_error = raw_error
        super().__init__(user_message)


def _parse_openai_error(error: Exception) -> OpenAIError:
    """
    Parse an OpenAI API error and return an OpenAIError with user-friendly message.
    """
    raw_error = str(error)
    error_lower = raw_error.lower()
    
    # Rate limit errors (429)
    if "429" in raw_error or "rate" in error_lower or "too many" in error_lower:
        return OpenAIError(
            user_message="OpenAI rate limit exceeded. Please wait a moment and try again.",
            raw_error=raw_error
        )
    
    # Quota/billing errors
    if "quota" in error_lower or "billing" in error_lower or "insufficient" in error_lower:
        return OpenAIError(
            user_message="OpenAI quota exceeded or billing issue. Please check your OpenAI account.",
            raw_error=raw_error
        )
    
    # Authentication errors (401)
    if "401" in raw_error or "invalid api key" in error_lower or "authentication" in error_lower:
        return OpenAIError(
            user_message="Invalid OpenAI API key. Please check your API key and try again.",
            raw_error=raw_error
        )
    
    # Permission errors (403)
    if "403" in raw_error or "permission" in error_lower or "access denied" in error_lower:
        return OpenAIError(
            user_message="Access denied. Your API key may not have permission for this model.",
            raw_error=raw_error
        )
    
    # Model not found (404)
    if "404" in raw_error or "model" in error_lower and "not found" in error_lower:
        return OpenAIError(
            user_message="OpenAI model not found. Please check the model name.",
            raw_error=raw_error
        )
    
    # Invalid request / Bad request (400)
    if "400" in raw_error or "invalid" in error_lower or "bad request" in error_lower:
        return OpenAIError(
            user_message="Invalid request to OpenAI. Please check your input and try again.",
            raw_error=raw_error
        )
    
    # Content policy / moderation
    if "content" in error_lower and ("policy" in error_lower or "filter" in error_lower):
        return OpenAIError(
            user_message="Content was blocked by OpenAI's content policy. Try a different image.",
            raw_error=raw_error
        )
    
    # Server errors (500, 502, 503, 504)
    if any(code in raw_error for code in ["500", "502", "503", "504"]) or "server" in error_lower:
        return OpenAIError(
            user_message="OpenAI server error. Please try again later.",
            raw_error=raw_error
        )
    
    # Timeout
    if "timeout" in error_lower or "timed out" in error_lower:
        return OpenAIError(
            user_message="Request to OpenAI timed out. Please try again.",
            raw_error=raw_error
        )
    
    # Connection errors
    if "connection" in error_lower or "network" in error_lower:
        return OpenAIError(
            user_message="Network error connecting to OpenAI. Please check your connection.",
            raw_error=raw_error
        )
    
    # Context length exceeded
    if "context" in error_lower and "length" in error_lower:
        return OpenAIError(
            user_message="Image or request too large for this model. Try a smaller image or fewer fields.",
            raw_error=raw_error
        )
    
    # Default fallback
    return OpenAIError(
        user_message="An error occurred with OpenAI. Please try again.",
        raw_error=raw_error
    )


def _data_url_for_upload(filename: str, content_bytes: bytes) -> str:
    """
    Convert bytes to a data URL for Responses API image input.
    """
    lower = (filename or "").lower()
    if lower.endswith(".png"):
        mime = "image/png"
    elif lower.endswith(".webp"):
        mime = "image/webp"
    elif lower.endswith(".gif"):
        mime = "image/gif"
    else:
        # default to jpeg for .jpg/.jpeg and unknowns
        mime = "image/jpeg"

    b64 = base64.b64encode(content_bytes).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def extract_rows_from_image(
    *,
    api_key: str,
    model: str,
    prompt: str,
    fields_csv: str,
    schema: dict[str, Any],
    image_filename: str,
    image_bytes: bytes,
    detail: str = "auto",
) -> dict[str, Any]:
    """
    Returns a dict with at least: {"rows": [...]}
    Raises OpenAIError on errors with both user-friendly and raw messages.
    """
    try:
        client = OpenAI(api_key=api_key)
        image_data_url = _data_url_for_upload(image_filename, image_bytes)

        wrapped_prompt = (
            "You are extracting structured data from a screenshot.\n\n"
            f"User instructions:\n{prompt}\n\n"
            f"Fields (comma-separated): {fields_csv}\n\n"
            "Return JSON that matches the provided schema.\n"
            "- If the image contains no relevant data, return rows: []\n"
            "- For missing or unreadable values, return null.\n"
            "- Do not guess or invent values.\n"
            "- If there are multiple entries in the screenshot, return multiple objects in rows.\n"
        )

        response = client.responses.create(
            model=model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": wrapped_prompt},
                        {
                            "type": "input_image",
                            "image_url": image_data_url,
                            "detail": detail,
                        },
                    ],
                }
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "extraction",
                    "strict": True,
                    "schema": schema,
                }
            },
        )

        if getattr(response, "status", None) == "incomplete":
            details = getattr(response, "incomplete_details", None)
            raise OpenAIError(
                user_message="OpenAI returned an incomplete response. Please try again.",
                raw_error=f"Incomplete response: {details}"
            )

        # Refusals may not match schema; detect explicitly.
        for output in getattr(response, "output", []) or []:
            if getattr(output, "type", None) != "message":
                continue
            for part in getattr(output, "content", []) or []:
                if getattr(part, "type", None) == "refusal":
                    refusal_text = getattr(part, "refusal", None) or "Refused."
                    raise OpenAIError(
                        user_message="OpenAI refused to process this image. Try a different image.",
                        raw_error=f"Model refused: {refusal_text}"
                    )

        parsed = json.loads(response.output_text)
        if not isinstance(parsed, dict) or "rows" not in parsed:
            raise OpenAIError(
                user_message="OpenAI returned unexpected data format. Please try again.",
                raw_error=f"Response missing 'rows' key: {parsed}"
            )
        if not isinstance(parsed.get("rows"), list):
            raise OpenAIError(
                user_message="OpenAI returned invalid data format. Please try again.",
                raw_error=f"'rows' is not a list: {type(parsed.get('rows'))}"
            )
        
        return parsed
        
    except OpenAIError:
        # Re-raise our custom errors as-is
        raise
    except json.JSONDecodeError as e:
        raise OpenAIError(
            user_message="Failed to parse OpenAI's response. Please try again.",
            raw_error=f"JSON decode error: {e}"
        )
    except Exception as e:
        # Parse and convert other exceptions to OpenAIError
        raise _parse_openai_error(e)
