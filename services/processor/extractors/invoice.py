from ._common import ISO_DATE, compact, field, parse_date, reminder

NAME = "invoice"

SYSTEM_PROMPT = """Extract details from a bill or invoice. Capture vendor,
invoice number, issue/due dates, total amount + currency, and up to 10 line
items. If the invoice is already paid, still record fields but no reminder
is needed."""

TOOL = {
    "name": "record_invoice",
    "description": "Record invoice fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "vendor": {"type": "string"},
            "invoice_number": {"type": "string"},
            "issue_date": ISO_DATE,
            "due_date": ISO_DATE,
            "total": {"type": ["number", "null"]},
            "currency": {"type": "string", "description": "ISO 4217 like USD, EUR, GBP"},
            "status": {
                "type": "string",
                "description": "paid | unpaid | unknown",
            },
            "line_items": {
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
    issue = parse_date(p.get("issue_date"))
    due = parse_date(p.get("due_date"))
    items = p.get("line_items") or []

    fields = compact(
        [
            field("vendor", p.get("vendor")),
            field("invoice_number", p.get("invoice_number")),
            field("issue_date", issue.isoformat() if issue else None, value_type="date"),
            field("due_date", due.isoformat() if due else None, value_type="date"),
            field("total", p.get("total"), value_type="currency"),
            field("currency", p.get("currency")),
            field("status", p.get("status")),
            field("line_items", items if items else None),
        ]
    )

    reminders = []
    if (p.get("status") or "").lower() != "paid":
        rem = reminder(
            reminder_type="invoice_due",
            title=f"Invoice due: {p.get('vendor') or 'invoice'}"
            + (f" ({p.get('total')} {p.get('currency') or ''})".strip() if p.get("total") else ""),
            due=due,
        )
        if rem:
            reminders.append(rem)
    return fields, reminders
