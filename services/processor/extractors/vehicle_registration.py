from ._common import ISO_DATE, compact, field, parse_date, reminder

NAME = "vehicle_registration"

SYSTEM_PROMPT = """Extract a vehicle registration / title document: jurisdiction,
license plate, VIN, make/model/year, owner, and validity dates."""

TOOL = {
    "name": "record_registration",
    "description": "Record vehicle registration fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "jurisdiction": {"type": "string", "description": "state, province, or country"},
            "plate": {"type": "string"},
            "vin": {"type": "string"},
            "make": {"type": "string"},
            "model": {"type": "string"},
            "year": {"type": ["integer", "null"]},
            "owner": {"type": "string"},
            "valid_from": ISO_DATE,
            "valid_to": ISO_DATE,
            "confidence": {"type": "number"},
        },
        "required": ["plate"],
    },
}


def transform(p):
    valid_from = parse_date(p.get("valid_from"))
    valid_to = parse_date(p.get("valid_to"))
    fields = compact(
        [
            field("jurisdiction", p.get("jurisdiction")),
            field("plate", p.get("plate")),
            field("vin", p.get("vin")),
            field("make", p.get("make")),
            field("model", p.get("model")),
            field("year", p.get("year"), value_type="number"),
            field("owner", p.get("owner")),
            field("valid_from", valid_from.isoformat() if valid_from else None, value_type="date"),
            field("valid_to", valid_to.isoformat() if valid_to else None, value_type="date"),
        ]
    )
    label = " ".join(filter(None, [str(p.get("year") or ""), p.get("make") or "", p.get("model") or ""])).strip() or "Vehicle"
    reminders = compact(
        [
            reminder(
                reminder_type="registration_renewal",
                title=f"{label} registration renewal",
                due=valid_to,
            )
        ]
    )
    return fields, reminders
