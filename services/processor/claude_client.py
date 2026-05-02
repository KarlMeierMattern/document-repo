"""Thin Anthropic SDK wrapper.

We use prompt caching on system prompt + tool definitions so repeated
extractions of the same doc type are ~10x cheaper / faster.
"""

from __future__ import annotations

import base64
import logging
from typing import Any

from anthropic import Anthropic

from settings import settings

log = logging.getLogger(__name__)

_client: Anthropic | None = None


def client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def call_vision_tool(
    *,
    image_bytes: bytes,
    image_media_type: str,
    system_prompt: str,
    tool: dict[str, Any],
    user_text: str | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
) -> dict[str, Any]:
    """
    Run a single vision call that MUST return a tool call. Returns the tool
    input (parsed JSON dict). Caches system prompt + tool definition.
    """
    model = model or settings.DEFAULT_MODEL
    image_b64 = base64.b64encode(image_bytes).decode("ascii")

    user_content: list[dict[str, Any]] = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": image_media_type,
                "data": image_b64,
            },
        }
    ]
    if user_text:
        user_content.append({"type": "text", "text": user_text})

    msg = client().messages.create(
        model=model,
        max_tokens=max_tokens,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        tools=[
            {
                **tool,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        tool_choice={"type": "tool", "name": tool["name"]},
        messages=[{"role": "user", "content": user_content}],
    )

    log.info(
        "claude call model=%s usage=%s",
        model,
        getattr(msg, "usage", None),
    )

    for block in msg.content:
        if block.type == "tool_use" and block.name == tool["name"]:
            return dict(block.input)  # type: ignore[arg-type]

    raise RuntimeError(
        f"Claude did not return expected tool call '{tool['name']}'. "
        f"Got: {[b.type for b in msg.content]}"
    )
