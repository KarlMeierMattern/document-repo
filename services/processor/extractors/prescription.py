from ._common import ISO_DATE, compact, field, parse_date, reminder

NAME = "prescription"

SYSTEM_PROMPT = """Extract prescription label / pharmacy bag details. Common
fields include drug name, dosage strength + form, prescriber, fill date, days
supply, refills remaining, and expiry / discard-after date. Leave fields blank
if not visible.
"""

TOOL = {
    "name": "record_prescription",
    "description": "Record extracted prescription fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "drug_name": {"type": "string"},
            "dosage": {"type": "string"},
            "form": {"type": "string", "description": "tablet, capsule, liquid, etc."},
            "quantity": {"type": "string"},
            "prescriber": {"type": "string"},
            "pharmacy": {"type": "string"},
            "rx_number": {"type": "string"},
            "fill_date": ISO_DATE,
            "days_supply": {"type": ["integer", "null"]},
            "refills_remaining": {"type": ["integer", "null"]},
            "refill_due_date": ISO_DATE,
            "expiry_date": ISO_DATE,
            "directions": {"type": "string"},
            "confidence": {"type": "number"},
        },
        "required": ["drug_name"],
    },
}


def transform(p):
    refill_due = parse_date(p.get("refill_due_date"))
    expiry = parse_date(p.get("expiry_date"))
    fill = parse_date(p.get("fill_date"))

    fields = compact(
        [
            field("drug_name", p.get("drug_name")),
            field("dosage", p.get("dosage")),
            field("form", p.get("form")),
            field("quantity", p.get("quantity")),
            field("prescriber", p.get("prescriber")),
            field("pharmacy", p.get("pharmacy")),
            field("rx_number", p.get("rx_number")),
            field("fill_date", fill.isoformat() if fill else None, value_type="date"),
            field("days_supply", p.get("days_supply"), value_type="number"),
            field("refills_remaining", p.get("refills_remaining"), value_type="number"),
            field("refill_due_date", refill_due.isoformat() if refill_due else None, value_type="date"),
            field("expiry_date", expiry.isoformat() if expiry else None, value_type="date"),
            field("directions", p.get("directions")),
        ]
    )
    drug = p.get("drug_name") or "Prescription"
    reminders = compact(
        [
            reminder(
                reminder_type="prescription_refill",
                title=f"{drug} refill due",
                due=refill_due,
            ),
            reminder(
                reminder_type="prescription_expiry",
                title=f"{drug} expires",
                due=expiry,
            ),
        ]
    )
    return fields, reminders
