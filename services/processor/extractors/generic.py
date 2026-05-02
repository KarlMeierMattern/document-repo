from ._common import compact, field

NAME = "generic"

SYSTEM_PROMPT = """This document doesn't match a known type. Extract a short
title, one-paragraph summary, and up to 10 free-form key/value pairs
representing the document's most important facts. Prefer durable identifiers
(names, dates, IDs, amounts) over filler text."""

TOOL = {
    "name": "record_generic",
    "description": "Record generic document fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "summary": {"type": "string"},
            "key_facts": {
                "type": "array",
                "maxItems": 10,
                "items": {
                    "type": "object",
                    "properties": {
                        "key": {"type": "string"},
                        "value": {"type": "string"},
                    },
                    "required": ["key", "value"],
                },
            },
            "confidence": {"type": "number"},
        },
        "required": ["summary"],
    },
}


def transform(p):
    base = compact(
        [
            field("title", p.get("title")),
            field("summary", p.get("summary")),
        ]
    )
    for kv in p.get("key_facts") or []:
        if kv.get("key") and kv.get("value"):
            base.append(
                {
                    "key": str(kv["key"])[:200],
                    "value": str(kv["value"])[:2000],
                    "value_type": "string",
                    "confidence": None,
                }
            )
    return base, []
