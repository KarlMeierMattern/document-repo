from ._common import ISO_DATE, compact, field, parse_date, reminder

NAME = "medical_record"

SYSTEM_PROMPT = """Extract a clinical/medical record (visit summary, discharge
note, referral letter). Capture provider, visit date, brief summary,
diagnoses (≤5 codes/labels), follow-up date if present."""

TOOL = {
    "name": "record_medical",
    "description": "Record medical record fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "provider": {"type": "string"},
            "facility": {"type": "string"},
            "visit_date": ISO_DATE,
            "summary": {"type": "string"},
            "diagnoses": {
                "type": "array",
                "maxItems": 5,
                "items": {"type": "string"},
            },
            "follow_up_date": ISO_DATE,
            "confidence": {"type": "number"},
        },
        "required": ["visit_date"],
    },
}


def transform(p):
    visit = parse_date(p.get("visit_date"))
    follow = parse_date(p.get("follow_up_date"))
    diagnoses = p.get("diagnoses") or []
    fields = compact(
        [
            field("provider", p.get("provider")),
            field("facility", p.get("facility")),
            field("visit_date", visit.isoformat() if visit else None, value_type="date"),
            field("summary", p.get("summary")),
            field("diagnoses", diagnoses if diagnoses else None),
            field("follow_up_date", follow.isoformat() if follow else None, value_type="date"),
        ]
    )
    reminders = compact(
        [
            reminder(
                reminder_type="follow_up",
                title=f"Follow-up: {p.get('provider') or 'medical'}",
                due=follow,
            )
        ]
    )
    return fields, reminders
