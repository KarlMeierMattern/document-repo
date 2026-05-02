"""Minimal Postgres helpers using psycopg3."""

from __future__ import annotations

import json
import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

import psycopg

from settings import settings

log = logging.getLogger(__name__)


@contextmanager
def conn() -> Iterator[psycopg.Connection]:
    c = psycopg.connect(settings.DATABASE_URL, autocommit=False)
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def update_status(
    document_id: str,
    status: str,
    *,
    error: str | None = None,
    doc_type: str | None = None,
    processed_at: datetime | None = None,
) -> None:
    sets: list[str] = ["status = %s"]
    args: list[Any] = [status]
    if error is not None or status == "processed":
        sets.append("error = %s")
        args.append(error)
    if doc_type is not None:
        sets.append("doc_type = %s")
        args.append(doc_type)
    if processed_at is not None:
        sets.append("processed_at = %s")
        args.append(processed_at)
    args.append(document_id)
    sql = f"UPDATE documents SET {', '.join(sets)} WHERE id = %s"
    with conn() as c:
        c.execute(sql, args)


def write_extraction(
    document_id: str,
    doc_type: str,
    fields: list[dict[str, Any]],
    reminders: list[dict[str, Any]],
) -> None:
    """Wipe prior fields + reminders for this doc, then insert new ones, then
    mark the document processed. Single transaction.
    """
    now = datetime.now(timezone.utc)
    with conn() as c, c.cursor() as cur:
        cur.execute(
            "DELETE FROM document_fields WHERE document_id = %s", (document_id,)
        )
        cur.execute(
            "DELETE FROM reminders WHERE document_id = %s", (document_id,)
        )

        for f in fields:
            cur.execute(
                """
                INSERT INTO document_fields (document_id, key, value, value_type, confidence)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    document_id,
                    str(f["key"])[:200],
                    str(f.get("value", ""))[:2000],
                    f.get("value_type", "string"),
                    f.get("confidence"),
                ),
            )

        for r in reminders:
            cur.execute(
                """
                INSERT INTO reminders (document_id, reminder_type, title, due_date, status)
                VALUES (%s, %s, %s, %s, 'pending')
                """,
                (
                    document_id,
                    r["reminder_type"],
                    r["title"],
                    r["due_date"],
                ),
            )

        cur.execute(
            "UPDATE documents SET status = 'processed', doc_type = %s, processed_at = %s, error = NULL WHERE id = %s",
            (doc_type, now, document_id),
        )
    log.info(
        "wrote extraction doc=%s type=%s fields=%d reminders=%d",
        document_id,
        doc_type,
        len(fields),
        len(reminders),
    )
