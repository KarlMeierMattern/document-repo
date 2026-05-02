from ._common import ISO_DATE, compact, field, parse_date, reminder

NAME = "insurance_card"

SYSTEM_PROMPT = """Extract details from an insurance card / certificate (health,
dental, vision, auto, home, travel). Capture insurer name, policy number,
member/group ids, plan name, and coverage validity dates. Determine
coverage_type from the card if possible.
"""

TOOL = {
    "name": "record_insurance",
    "description": "Record insurance card fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "insurer": {"type": "string"},
            "coverage_type": {
                "type": "string",
                "description": "health, dental, vision, auto, home, life, travel, etc.",
            },
            "policy_number": {"type": "string"},
            "member_id": {"type": "string"},
            "group": {"type": "string"},
            "plan": {"type": "string"},
            "valid_from": ISO_DATE,
            "valid_to": ISO_DATE,
            "support_phone": {"type": "string"},
            "confidence": {"type": "number"},
        },
        "required": ["insurer"],
    },
}


def transform(p):
    valid_from = parse_date(p.get("valid_from"))
    valid_to = parse_date(p.get("valid_to"))
    fields = compact(
        [
            field("insurer", p.get("insurer")),
            field("coverage_type", p.get("coverage_type")),
            field("policy_number", p.get("policy_number")),
            field("member_id", p.get("member_id")),
            field("group", p.get("group")),
            field("plan", p.get("plan")),
            field("valid_from", valid_from.isoformat() if valid_from else None, value_type="date"),
            field("valid_to", valid_to.isoformat() if valid_to else None, value_type="date"),
            field("support_phone", p.get("support_phone")),
        ]
    )
    label = p.get("insurer") or "Insurance"
    if p.get("coverage_type"):
        label = f"{label} ({p['coverage_type']})"
    reminders = compact(
        [
            reminder(
                reminder_type="insurance_renewal",
                title=f"{label} renewal",
                due=valid_to,
            )
        ]
    )
    return fields, reminders
