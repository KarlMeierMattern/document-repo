from ._common import ISO_DATE, compact, field, parse_date

NAME = "receipt"

SYSTEM_PROMPT = """Extract a retail/dining receipt: vendor, purchase date,
total + currency, payment method, and up to 10 line items. No reminder is
needed for receipts."""

TOOL = {
    "name": "record_receipt",
    "description": "Record receipt fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "vendor": {"type": "string"},
            "purchase_date": ISO_DATE,
            "total": {"type": ["number", "null"]},
            "currency": {"type": "string"},
            "payment_method": {"type": "string"},
            "items": {
                "type": "array",
                "maxItems": 10,
                "items": {
                    "type": "object",
                    "properties": {
                        "description": {"type": "string"},
                        "amount": {"type": ["number", "null"]},
                    },
                    "required": ["description"],
                },
            },
            "confidence": {"type": "number"},
        },
        "required": ["vendor"],
    },
}


def transform(p):
    purchase = parse_date(p.get("purchase_date"))
    items = p.get("items") or []
    fields = compact(
        [
            field("vendor", p.get("vendor")),
            field("purchase_date", purchase.isoformat() if purchase else None, value_type="date"),
            field("total", p.get("total"), value_type="currency"),
            field("currency", p.get("currency")),
            field("payment_method", p.get("payment_method")),
            field("items", items if items else None),
        ]
    )
    return fields, []
