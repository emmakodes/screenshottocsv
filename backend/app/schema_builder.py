from __future__ import annotations

import re
from typing import Any


def normalize_key(label: str) -> str:
    """
    Normalize a human field label into a stable, CSV/JSON-safe key.
    Example: "Length (cm)" -> "length_cm"
    """
    s = (label or "").strip().lower()
    s = re.sub(r"[^\w]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "field"


def parse_fields_csv(fields_csv: str) -> list[str]:
    return [f.strip() for f in (fields_csv or "").split(",") if f.strip()]


def build_rows_schema(
    fields_csv: str,
) -> tuple[dict[str, Any], dict[str, str], list[str]]:
    """
    Build a strict JSON Schema for Structured Outputs:
      {
        "rows": [ { <field_key>: <value|null>, ... }, ... ]
      }

    Returns: (schema, key_map, columns)
      - schema: JSON Schema dict
      - key_map: normalized_key -> original label
      - columns: ordered list of normalized keys (excludes 'source_image')
    """
    fields = parse_fields_csv(fields_csv)
    if not fields:
        raise ValueError(
            "No fields provided. Provide a comma-separated list of fields to extract."
        )

    key_map: dict[str, str] = {}
    properties: dict[str, Any] = {}
    columns: list[str] = []

    for label in fields:
        base = normalize_key(label)
        key = base
        i = 2
        while key in key_map:
            key = f"{base}_{i}"
            i += 1
        key_map[key] = label
        columns.append(key)

        # Generic, robust default type.
        properties[key] = {"type": ["string", "null"], "description": label}

    row_schema: dict[str, Any] = {
        "type": "object",
        "additionalProperties": False,
        "properties": properties,
        # Structured Outputs requirement: all fields required.
        "required": columns,
    }

    schema: dict[str, Any] = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "rows": {
                "type": "array",
                "items": row_schema,
            }
        },
        "required": ["rows"],
    }

    return schema, key_map, columns
