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
    media_bytes: bytes,
    media_type: str,
    system_prompt: str,
    tool: dict[str, Any],
    user_text: str | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
) -> dict[str, Any]:
    """
    Run a single vision/document call that MUST return a tool call. Returns
    the tool input (parsed JSON dict). Caches system prompt + tool definition.

    media_type "application/pdf" is sent as a `document` content block;
    everything else is sent as an `image` block.
    """
    model = model or settings.DEFAULT_MODEL
    media_b64 = base64.b64encode(media_bytes).decode("ascii")

    block_type = "document" if media_type == "application/pdf" else "image"
    user_content: list[dict[str, Any]] = [
        {
            "type": block_type,
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": media_b64,
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
