from __future__ import annotations

import logging
import os
import traceback

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

import db
import image_prep
import storage
from extractors import classify_and_extract
from settings import settings

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
log = logging.getLogger("processor")

app = FastAPI(title="Document Processor")


class ProcessRequest(BaseModel):
    document_id: str
    r2_key: str
    model: str | None = None  # optional override (e.g. high-quality reprocess)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/process")
def process(
    body: ProcessRequest,
    x_processor_secret: str | None = Header(default=None, alias="X-Processor-Secret"),
) -> dict[str, str]:
    if x_processor_secret != settings.PROCESSOR_SECRET:
        raise HTTPException(status_code=401, detail="unauthorized")

    log.info(
        "process start document_id=%s r2_key=%s model=%s",
        body.document_id,
        body.r2_key,
        body.model or "(default)",
    )

    db.update_status(body.document_id, "processing")
    try:
        raw = storage.download_bytes(body.r2_key)
        jpeg, media_type = image_prep.normalize(raw)

        doc_type, fields, reminders = classify_and_extract(
            image_bytes=jpeg,
            image_media_type=media_type,
            model=body.model,
        )

        db.write_extraction(
            document_id=body.document_id,
            doc_type=doc_type,
            fields=fields,
            reminders=reminders,
        )
        log.info("process done doc=%s type=%s", body.document_id, doc_type)
        return {"status": "processed", "doc_type": doc_type}
    except Exception as e:
        log.error(
            "process failed doc=%s err=%s\n%s",
            body.document_id,
            e,
            traceback.format_exc(),
        )
        db.update_status(body.document_id, "failed", error=str(e)[:500])
        raise HTTPException(status_code=500, detail=str(e))
