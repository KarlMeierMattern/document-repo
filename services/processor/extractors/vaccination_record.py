from ._common import ISO_DATE, compact, field, parse_date, reminder

NAME = "vaccination_record"

SYSTEM_PROMPT = """Extract a vaccination record / immunization card. Capture
vaccine name, dose number, date administered, provider, lot number, and any
next-dose date if printed."""

TOOL = {
    "name": "record_vaccination",
    "description": "Record vaccination fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "vaccine": {"type": "string"},
            "manufacturer": {"type": "string"},
            "dose_number": {"type": ["integer", "null"]},
            "date_administered": ISO_DATE,
            "provider": {"type": "string"},
            "lot_number": {"type": "string"},
            "next_due_date": ISO_DATE,
            "confidence": {"type": "number"},
        },
        "required": ["vaccine"],
    },
}


def transform(p):
    administered = parse_date(p.get("date_administered"))
    next_due = parse_date(p.get("next_due_date"))
    fields = compact(
        [
            field("vaccine", p.get("vaccine")),
            field("manufacturer", p.get("manufacturer")),
            field("dose_number", p.get("dose_number"), value_type="number"),
            field("date_administered", administered.isoformat() if administered else None, value_type="date"),
            field("provider", p.get("provider")),
            field("lot_number", p.get("lot_number")),
            field("next_due_date", next_due.isoformat() if next_due else None, value_type="date"),
        ]
    )
    reminders = compact(
        [
            reminder(
                reminder_type="vaccine_due",
                title=f"{p.get('vaccine') or 'Vaccine'} next dose",
                due=next_due,
            )
        ]
    )
    return fields, reminders
