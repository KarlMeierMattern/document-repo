from ._common import ISO_DATE, compact, field, parse_date

NAME = "dna_report"

SYSTEM_PROMPT = """Extract details from a DNA / genetic ancestry / health
report (23andMe, AncestryDNA, etc.). Capture provider, report date, and up to
10 noteworthy highlights (ancestry composition top entries, health
predispositions, traits). Do not provide medical advice."""

TOOL = {
    "name": "record_dna",
    "description": "Record DNA report fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "provider": {"type": "string"},
            "report_date": ISO_DATE,
            "subject_name": {"type": "string"},
            "highlights": {
                "type": "array",
                "maxItems": 10,
                "items": {"type": "string"},
            },
            "confidence": {"type": "number"},
        },
        "required": ["provider"],
    },
}


def transform(p):
    rd = parse_date(p.get("report_date"))
    highlights = p.get("highlights") or []
    fields = compact(
        [
            field("provider", p.get("provider")),
            field("report_date", rd.isoformat() if rd else None, value_type="date"),
            field("subject_name", p.get("subject_name")),
            field("highlights", highlights if highlights else None),
        ]
    )
    return fields, []
