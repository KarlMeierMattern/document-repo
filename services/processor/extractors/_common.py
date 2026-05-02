"""Shared helpers for extractor transforms."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Iterable

from dateutil import parser as dateparser


def parse_date(v: Any) -> date | None:
    if v is None or v == "":
        return None
    if isinstance(v, date):
        return v
    try:
        return dateparser.parse(str(v)).date()
    except (ValueError, TypeError):
        return None


def field(
    key: str,
    value: Any,
    *,
    value_type: str = "string",
    confidence: float | None = None,
) -> dict[str, Any] | None:
    """Build a field dict, skipping empties."""
    if value is None or value == "" or value == []:
        return None
    if isinstance(value, (list, dict)):
        # Compact list/dict to JSON string for storage
        import json

        value = json.dumps(value, ensure_ascii=False)
    return {
        "key": key,
        "value": str(value),
        "value_type": value_type,
        "confidence": confidence,
    }


def reminder(
    *,
    reminder_type: str,
    title: str,
    due: date | str | None,
) -> dict[str, Any] | None:
    d = parse_date(due)
    if not d:
        return None
    return {
        "reminder_type": reminder_type,
        "title": title,
        "due_date": d.isoformat(),
    }


def compact(items: Iterable[dict[str, Any] | None]) -> list[dict[str, Any]]:
    return [x for x in items if x is not None]


def add_months(d: date, months: int) -> date:
    """Naive month addition; clamps to month length."""
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    # find last day of target month
    next_first = date(y + (1 if m == 12 else 0), 1 if m == 12 else m + 1, 1)
    last_day = (next_first - timedelta(days=1)).day
    return date(y, m, min(d.day, last_day))


# Reusable JSON Schema fragments
ISO_DATE = {
    "type": "string",
    "description": "ISO-8601 date (YYYY-MM-DD). Empty string if not present on document.",
}

ISO_DATE_OR_NULL = {
    "type": ["string", "null"],
    "description": "ISO-8601 date (YYYY-MM-DD), or null if not present.",
}

CONFIDENCE = {
    "type": "number",
    "minimum": 0,
    "maximum": 1,
    "description": "Self-rated confidence 0–1 in the extraction overall.",
}
