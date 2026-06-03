"use client";

import type {
  Document,
  DocumentField,
  Reminder,
} from "@/drizzle/schema";
import { formatDate, relativeFromNow } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DocumentDetail({
  doc,
  fields: initialFields,
  reminders: initialReminders,
  previewUrl,
}: {
  doc: Document;
  fields: DocumentField[];
  reminders: Reminder[];
  previewUrl: string | null;
}) {
  const router = useRouter();
  const [fields, setFields] = useState(initialFields);
  const [reminders, setReminders] = useState(initialReminders);
  const [context, setContext] = useState(doc.userContext ?? "");
  const [contextSaved, setContextSaved] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [reprocessing, startReprocess] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [status, setStatus] = useState(doc.status);

  async function saveField(fieldId: string, value: string) {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, value } : f))
    );
    await fetch(`/api/documents/${doc.id}/fields/${fieldId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
  }

  async function deleteField(fieldId: string) {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    await fetch(`/api/documents/${doc.id}/fields/${fieldId}`, {
      method: "DELETE",
    });
  }

  async function saveContext() {
    setContextSaved("saving");
    await fetch(`/api/documents/${doc.id}/context`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ context }),
    });
    setContextSaved("saved");
    setTimeout(() => setContextSaved("idle"), 1500);
  }

  function reprocess(highQuality = false) {
    startReprocess(async () => {
      setStatus("processing");
      const url = `/api/documents/${doc.id}/process${highQuality ? "?model=claude-sonnet-4-6" : ""}`;
      await fetch(url, { method: "POST" });
      // Poll for completion
      const deadline = Date.now() + 5 * 60_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch(`/api/documents/${doc.id}`);
        if (!res.ok) continue;
        const json = (await res.json()) as {
          document: { status: string };
        };
        if (
          json.document.status === "processed" ||
          json.document.status === "failed"
        ) {
          router.refresh();
          return;
        }
      }
    });
  }

  function deleteDocument() {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    startDelete(async () => {
      await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      router.push("/dashboard");
    });
  }

  async function dismissReminder(id: string) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r))
    );
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
  }

  async function updateReminderDate(id: string, due_date: string) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, dueDate: due_date } : r))
    );
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ due_date }),
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-muted aspect-[4/3] overflow-hidden">
          {previewUrl ? (
            doc.mimeType === "application/pdf" ? (
              <iframe
                src={previewUrl}
                title={doc.originalFilename ?? "Document"}
                className="w-full h-full"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={doc.originalFilename ?? "Document"}
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-fg text-sm">
              No preview
            </div>
          )}
        </div>
        <div className="break-all text-xs text-muted-fg">
          {doc.originalFilename ?? doc.id} · {doc.mimeType}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            disabled={reprocessing || status === "processing"}
            onClick={() => reprocess(false)}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50 sm:w-auto"
          >
            {status === "processing" ? "Processing…" : "Reprocess"}
          </button>
          <button
            disabled={reprocessing || status === "processing"}
            onClick={() => reprocess(true)}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50 sm:w-auto"
          >
            Reprocess (high quality)
          </button>
          <button
            disabled={deleting}
            onClick={deleteDocument}
            className="rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50 sm:ml-auto sm:w-auto"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
        {doc.error && (
          <div className="rounded-lg bg-danger/5 border border-danger/30 px-3 py-2 text-xs text-danger">
            {doc.error}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-fg">
            {doc.docType?.replace(/_/g, " ") ?? "Document"} ·{" "}
            <span className="text-fg">{status}</span>
          </h2>

          {fields.length === 0 ? (
            <p className="text-sm text-muted-fg">
              {status === "processing"
                ? "Processing — fields will appear in a moment."
                : "No fields extracted."}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-bg">
              {fields.map((f) => (
                <FieldRow
                  key={f.id}
                  f={f}
                  onSave={(v) => saveField(f.id, v)}
                  onDelete={() => deleteField(f.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-fg mb-2">
            Reminders
          </h2>
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-fg">None.</p>
          ) : (
            <ul className="space-y-2">
              {reminders.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-bg px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {r.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        defaultValue={r.dueDate}
                        onChange={(e) => {
                          if (e.target.value) updateReminderDate(r.id, e.target.value);
                        }}
                        className="text-xs text-muted-fg bg-transparent border-b border-dashed border-border focus:outline-none focus:border-fg"
                      />
                      <span className="text-xs text-muted-fg">{relativeFromNow(r.dueDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide bg-muted rounded-full px-2 py-0.5">
                      {r.status}
                    </span>
                    {r.status !== "dismissed" && (
                      <button
                        onClick={() => dismissReminder(r.id)}
                        className="text-xs text-muted-fg hover:text-fg"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-fg mb-2">
            Your notes
          </h2>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onBlur={saveContext}
            rows={4}
            placeholder="Add context — what is this for, who it relates to, anything else worth remembering."
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
          />
          <div className="text-xs text-muted-fg mt-1">
            {contextSaved === "saving"
              ? "Saving…"
              : contextSaved === "saved"
                ? "Saved"
                : "Auto-saves on blur"}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  f,
  onSave,
  onDelete,
}: {
  f: DocumentField;
  onSave: (v: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(f.value);

  return (
    <li className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
      <div className="w-full shrink-0 pt-0 text-xs uppercase tracking-wide text-muted-fg sm:w-32 sm:pt-1.5">
        {f.key.replace(/_/g, " ")}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (val !== f.value) onSave(val);
            }}
            rows={Math.min(6, Math.max(1, val.split("\n").length))}
            autoFocus
            className="w-full rounded border border-border bg-bg px-2 py-1 text-sm"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-left text-sm w-full break-words"
          >
            {f.value || (
              <span className="italic text-muted-fg">empty — click to edit</span>
            )}
          </button>
        )}
      </div>
      <button
        onClick={onDelete}
        title="Delete field"
        className="self-end pt-1 text-xs text-muted-fg hover:text-danger sm:self-auto"
      >
        ✕
      </button>
    </li>
  );
}
