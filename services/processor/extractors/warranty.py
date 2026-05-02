from ._common import (
    ISO_DATE,
    add_months,
    compact,
    field,
    parse_date,
    reminder,
)

NAME = "warranty"

SYSTEM_PROMPT = """Extract warranty / proof-of-purchase details from this image.
Use the document's stated dates exactly. If only purchase_date and warranty_length_months
are given, leave expiry_date blank — the system will compute it.
Leave any field as empty string if not visible. Do not fabricate.
"""

TOOL = {
    "name": "record_warranty",
    "description": "Record extracted warranty fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "vendor": {"type": "string"},
            "product": {"type": "string"},
            "model_or_sku": {"type": "string"},
            "serial_number": {"type": "string"},
            "purchase_date": ISO_DATE,
            "warranty_length_months": {"type": ["integer", "null"]},
            "expiry_date": ISO_DATE,
            "notes": {"type": "string"},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        },
        "required": ["vendor", "product"],
    },
}


def transform(p):
    purchase = parse_date(p.get("purchase_date"))
    expiry = parse_date(p.get("expiry_date"))
    months = p.get("warranty_length_months")
    if not expiry and purchase and months:
        try:
            expiry = add_months(purchase, int(months))
        except (TypeError, ValueError):
            expiry = None

    fields = compact(
        [
            field("vendor", p.get("vendor")),
            field("product", p.get("product")),
            field("model_or_sku", p.get("model_or_sku")),
            field("serial_number", p.get("serial_number")),
            field("purchase_date", purchase.isoformat() if purchase else None, value_type="date"),
            field("warranty_length_months", months, value_type="number"),
            field("expiry_date", expiry.isoformat() if expiry else None, value_type="date"),
            field("notes", p.get("notes")),
        ]
    )
    reminders = compact(
        [
            reminder(
                reminder_type="warranty_expiry",
                title=f"{p.get('product') or 'Warranty'} expires"
                + (f" ({p.get('vendor')})" if p.get("vendor") else ""),
                due=expiry,
            )
        ]
    )
    return fields, reminders
