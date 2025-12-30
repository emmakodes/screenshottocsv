from __future__ import annotations

import json
from typing import Any

from google import genai
from google.genai import types


class GeminiError(Exception):
    """Custom exception for Gemini errors with both raw and user-friendly messages."""
    
    def __init__(self, user_message: str, raw_error: str):
        self.user_message = user_message
        self.raw_error = raw_error
        super().__init__(user_message)


def _get_mime_type(filename: str) -> str:
    """Get MIME type from filename extension."""
    lower = (filename or "").lower()
    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".heic": "image/heic",
        ".heif": "image/heif",
    }
    for ext, mime in mime_types.items():
        if lower.endswith(ext):
            return mime
    return "image/png"


def _parse_gemini_error(error: Exception) -> GeminiError:
    """
    Parse a Gemini API error and return a GeminiError with user-friendly message.
    """
    raw_error = str(error)
    error_lower = raw_error.lower()
    
    # Quota/Rate limit errors (429)
    if "429" in raw_error or "resource_exhausted" in error_lower or "quota" in error_lower:
        return GeminiError(
            user_message="Gemini free tier limit exceeded. Please wait a moment and try again, or switch to OpenAI.",
            raw_error=raw_error
        )
    
    # Authentication errors (401, 403)
    if "401" in raw_error or "403" in raw_error or "permission" in error_lower or "api key" in error_lower:
        return GeminiError(
            user_message="Gemini API authentication failed. The server's API key may be invalid.",
            raw_error=raw_error
        )
    
    # Invalid request / Bad request (400)
    if "400" in raw_error or "invalid" in error_lower or "bad request" in error_lower:
        return GeminiError(
            user_message="Invalid request to Gemini. Please check your input and try again.",
            raw_error=raw_error
        )
    
    # Model not found (404)
    if "404" in raw_error or "not found" in error_lower:
        return GeminiError(
            user_message="Gemini model not found. The configured model may not be available.",
            raw_error=raw_error
        )
    
    # Server errors (500, 502, 503, 504)
    if any(code in raw_error for code in ["500", "502", "503", "504"]) or "server" in error_lower:
        return GeminiError(
            user_message="Gemini server error. Please try again later.",
            raw_error=raw_error
        )
    
    # Content safety / blocked
    if "blocked" in error_lower or "safety" in error_lower or "harm" in error_lower:
        return GeminiError(
            user_message="Content was blocked by Gemini's safety filters. Try a different image.",
            raw_error=raw_error
        )
    
    # Timeout
    if "timeout" in error_lower or "timed out" in error_lower:
        return GeminiError(
            user_message="Request to Gemini timed out. Please try again.",
            raw_error=raw_error
        )
    
    # Network errors
    if "connection" in error_lower or "network" in error_lower:
        return GeminiError(
            user_message="Network error connecting to Gemini. Please check your connection.",
            raw_error=raw_error
        )
    
    # Default fallback
    return GeminiError(
        user_message="An error occurred with Gemini. Please try again or switch to OpenAI.",
        raw_error=raw_error
    )


def _build_gemini_schema(columns: list[str], key_map: dict[str, str]) -> types.Schema:
    """
    Build a Schema for Gemini's structured output using the types module.
    Returns schema for: {"rows": [{"field1": "value", ...}, ...]}
    """
    # Build properties for each column - using STRING type with nullable=True
    properties = {}
    for col in columns:
        original_label = key_map.get(col, col)
        properties[col] = types.Schema(
            type=types.Type.STRING,
            nullable=True,
            description=f"The {original_label} extracted from the image"
        )
    
    # Item schema for each row
    item_schema = types.Schema(
        type=types.Type.OBJECT,
        properties=properties,
        required=columns
    )
    
    # Full schema with rows array
    return types.Schema(
        type=types.Type.OBJECT,
        properties={
            "rows": types.Schema(
                type=types.Type.ARRAY,
                items=item_schema,
                description="Array of extracted items from the image"
            )
        },
        required=["rows"]
    )


def extract_rows_from_image_gemini(
    *,
    api_key: str,
    model: str,
    prompt: str,
    fields_csv: str,
    columns: list[str],
    key_map: dict[str, str],
    image_filename: str,
    image_bytes: bytes,
) -> dict[str, Any]:
    """
    Extract structured data from an image using Gemini.
    Uses the user-provided API key (BYOK).
    
    Returns a dict with: {"rows": [...]}
    Raises GeminiError on errors with both user-friendly and raw messages.
    """
    if not api_key:
        raise GeminiError(
            user_message="Gemini API key is required. Please enter your API key.",
            raw_error="No Gemini API key provided"
        )
    
    try:
        client = genai.Client(api_key=api_key)
        
        # Build schema for structured output
        response_schema = _build_gemini_schema(columns, key_map)
        
        # Build extraction prompt
        field_list = "\n".join([f"- {key_map.get(col, col)}" for col in columns])
        
        full_prompt = f"""You are extracting structured data from a screenshot.

User instructions:
{prompt}

Fields to extract (comma-separated): {fields_csv}

Extract ALL rows/items from the image. For each row, extract:
{field_list}

Return a JSON object with a "rows" array containing objects for each row found.
- If the image contains no relevant data, return {{"rows": []}}
- For missing or unreadable values, return null for that field.
- Do not guess or invent values.
- If there are multiple entries in the screenshot, return multiple objects in rows.
"""
        
        # Create image part
        mime_type = _get_mime_type(image_filename)
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        
        # Generate with structured output using GenerateContentConfig
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
        )
        
        response = client.models.generate_content(
            model=model,
            contents=[image_part, full_prompt],
            config=config,
        )
        
        # Check for errors in response
        if not response.text:
            raise GeminiError(
                user_message="Gemini returned an empty response. Please try again.",
                raw_error="Empty response from Gemini API"
            )
        
        # Parse and validate response
        try:
            parsed = json.loads(response.text)
        except json.JSONDecodeError as e:
            raise GeminiError(
                user_message="Failed to parse Gemini's response. Please try again.",
                raw_error=f"JSON decode error: {e}. Response text: {response.text[:500]}"
            )
        
        if not isinstance(parsed, dict) or "rows" not in parsed:
            raise GeminiError(
                user_message="Gemini returned unexpected data format. Please try again.",
                raw_error=f"Response missing 'rows' key: {parsed}"
            )
        
        if not isinstance(parsed.get("rows"), list):
            raise GeminiError(
                user_message="Gemini returned invalid data format. Please try again.",
                raw_error=f"'rows' is not a list: {type(parsed.get('rows'))}"
            )
        
        return parsed
        
    except GeminiError:
        # Re-raise our custom errors as-is
        raise
    except Exception as e:
        # Parse and convert other exceptions to GeminiError
        raise _parse_gemini_error(e)
