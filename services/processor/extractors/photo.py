from ._common import compact, field

NAME = "photo"

SYSTEM_PROMPT = """This image is not a structured document — it is a photo.
Provide a brief one-sentence caption and up to 5 short tags."""

TOOL = {
    "name": "record_photo",
    "description": "Record photo metadata.",
    "input_schema": {
        "type": "object",
        "properties": {
            "caption": {"type": "string"},
            "tags": {
                "type": "array",
                "maxItems": 5,
                "items": {"type": "string"},
            },
            "confidence": {"type": "number"},
        },
        "required": ["caption"],
    },
}


def transform(p):
    fields = compact(
        [
            field("caption", p.get("caption")),
            field("tags", p.get("tags") or None),
        ]
    )
    return fields, []
