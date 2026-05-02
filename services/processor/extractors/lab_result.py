from ._common import ISO_DATE, compact, field, parse_date

NAME = "lab_result"

SYSTEM_PROMPT = """Extract a clinical lab result. Capture the test panel name,
provider/lab, collection date, and the most clinically meaningful findings (up
to 5). For each finding include its name, value with units, reference range if
visible, and a flag (low/high/normal) when the report indicates one. Do not
diagnose."""

TOOL = {
    "name": "record_lab",
    "description": "Record lab result fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "panel": {"type": "string"},
            "lab": {"type": "string"},
            "ordering_provider": {"type": "string"},
            "collected_date": ISO_DATE,
            "reported_date": ISO_DATE,
            "findings": {
                "type": "array",
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "value": {"type": "string"},
                        "units": {"type": "string"},
                        "reference_range": {"type": "string"},
                        "flag": {"type": "string", "description": "low | high | normal"},
                    },
                    "required": ["name", "value"],
                },
            },
            "confidence": {"type": "number"},
        },
        "required": ["panel"],
    },
}


def transform(p):
    collected = parse_date(p.get("collected_date"))
    reported = parse_date(p.get("reported_date"))
    findings = p.get("findings") or []
    fields = compact(
        [
            field("panel", p.get("panel")),
            field("lab", p.get("lab")),
            field("ordering_provider", p.get("ordering_provider")),
            field("collected_date", collected.isoformat() if collected else None, value_type="date"),
            field("reported_date", reported.isoformat() if reported else None, value_type="date"),
            field("findings", findings if findings else None),
        ]
    )
    return fields, []
