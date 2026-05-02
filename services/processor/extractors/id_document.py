from ._common import ISO_DATE, compact, field, parse_date, reminder

NAME = "id_document"

SYSTEM_PROMPT = """Extract an ID document (passport, national ID, driver's
license). Capture document type, number, full name, date of birth,
issue/expiry dates, issuing authority/country."""

TOOL = {
    "name": "record_id",
    "description": "Record ID document fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "id_type": {
                "type": "string",
                "description": "passport | drivers_license | national_id | residence_permit | other",
            },
            "number": {"type": "string"},
            "full_name": {"type": "string"},
            "date_of_birth": ISO_DATE,
            "issuer": {"type": "string"},
            "issue_date": ISO_DATE,
            "expiry_date": ISO_DATE,
            "confidence": {"type": "number"},
        },
        "required": ["id_type"],
    },
}


def transform(p):
    dob = parse_date(p.get("date_of_birth"))
    issued = parse_date(p.get("issue_date"))
    expiry = parse_date(p.get("expiry_date"))
    fields = compact(
        [
            field("id_type", p.get("id_type")),
            field("number", p.get("number")),
            field("full_name", p.get("full_name")),
            field("date_of_birth", dob.isoformat() if dob else None, value_type="date"),
            field("issuer", p.get("issuer")),
            field("issue_date", issued.isoformat() if issued else None, value_type="date"),
            field("expiry_date", expiry.isoformat() if expiry else None, value_type="date"),
        ]
    )
    label = (p.get("id_type") or "ID").replace("_", " ")
    reminders = compact(
        [
            reminder(
                reminder_type="id_expiry",
                title=f"{label.title()} expires",
                due=expiry,
            )
        ]
    )
    return fields, reminders
