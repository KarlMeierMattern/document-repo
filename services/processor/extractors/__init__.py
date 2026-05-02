"""
Extractor registry.

Pipeline:
  1. classifier picks one of the doc types.
  2. that doc type's extractor runs and returns (fields, reminders).

Each extractor module exports:
  NAME           : str
  SYSTEM_PROMPT  : str
  TOOL           : dict  (Anthropic tool definition)
  transform(parsed: dict) -> tuple[list[Field], list[Reminder]]
"""

from __future__ import annotations

import logging
from typing import Any

from claude_client import call_vision_tool

from . import (
    classifier,
    dna_report,
    generic,
    id_document,
    insurance_card,
    invoice,
    lab_result,
    medical_record,
    photo,
    prescription,
    receipt,
    vaccination_record,
    vehicle_registration,
    warranty,
)

log = logging.getLogger(__name__)

REGISTRY = {
    m.NAME: m
    for m in (
        warranty,
        prescription,
        lab_result,
        insurance_card,
        invoice,
        receipt,
        vehicle_registration,
        vaccination_record,
        id_document,
        dna_report,
        medical_record,
        photo,
        generic,
    )
}


def classify_and_extract(
    *, image_bytes: bytes, image_media_type: str, model: str | None
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    # 1. Classify
    parsed = call_vision_tool(
        image_bytes=image_bytes,
        image_media_type=image_media_type,
        system_prompt=classifier.SYSTEM_PROMPT,
        tool=classifier.TOOL,
        model=model,
    )
    doc_type = parsed.get("doc_type", "generic")
    if doc_type not in REGISTRY:
        log.warning("classifier returned unknown type %s; falling back to generic", doc_type)
        doc_type = "generic"
    log.info("classified as %s", doc_type)

    # 2. Extract with the matched extractor
    ext = REGISTRY[doc_type]
    parsed = call_vision_tool(
        image_bytes=image_bytes,
        image_media_type=image_media_type,
        system_prompt=ext.SYSTEM_PROMPT,
        tool=ext.TOOL,
        model=model,
    )
    fields, reminders = ext.transform(parsed)
    return doc_type, fields, reminders
