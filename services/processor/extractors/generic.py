from ._common import ISO_DATE_OR_NULL, compact, field, parse_date, reminder

NAME = "generic"

SYSTEM_PROMPT = """This document doesn't match a known type. Extract a short
title, one-paragraph summary, and up to 10 free-form key/value pairs
representing the document's most important facts. Prefer durable identifiers
(names, dates, IDs, amounts) over filler text.

Also extract any significant dates (expiry, termination, due, renewal, etc.).
For each date, infer a sensible remind_on date: when the user should be notified
in advance so they can act in time. For example, remind 30 days before a lease
termination, on the day for a payment due date. If a date has no actionable
lead time needed, set remind_on equal to the date itself."""

TOOL = {
    "name": "record_generic",
    "description": "Record generic document fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "summary": {"type": "string"},
            "key_facts": {
                "type": "array",
                "maxItems": 10,
                "items": {
                    "type": "object",
                    "properties": {
                        "key": {"type": "string"},
                        "value": {"type": "string"},
                    },
                    "required": ["key", "value"],
                },
            },
            "significant_dates": {
                "type": "array",
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {
                            "type": "string",
                            "description": "Human-readable label, e.g. 'Lease termination'",
                        },
                        "date": ISO_DATE_OR_NULL,
                        "remind_on": ISO_DATE_OR_NULL,
                    },
                    "required": ["label", "date", "remind_on"],
                },
            },
            "confidence": {"type": "number"},
        },
        "required": ["summary"],
    },
}


def transform(p):
    base = compact(
        [
            field("title", p.get("title")),
            field("summary", p.get("summary")),
        ]
    )
    for kv in p.get("key_facts") or []:
        if kv.get("key") and kv.get("value"):
            base.append(
                {
                    "key": str(kv["key"])[:200],
                    "value": str(kv["value"])[:2000],
                    "value_type": "string",
                    "confidence": None,
                }
            )

    reminders = compact(
        [
            reminder(
                reminder_type="date",
                title=d.get("label") or "Reminder",
                due=parse_date(d.get("remind_on")) or parse_date(d.get("date")),
            )
            for d in (p.get("significant_dates") or [])
        ]
    )
    return base, reminders
