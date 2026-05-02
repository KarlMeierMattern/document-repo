"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

type FileState = {
  id: string; // local uuid
  file: File;
  documentId?: string;
  status:
    | "queued"
    | "presigning"
    | "uploading"
    | "processing"
    | "processed"
    | "failed";
  progress: number; // 0-100
  error?: string;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export function UploadZone({ onChange }: { onChange?: () => void }) {
  const [files, setFiles] = useState<FileState[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const arr = Array.from(list);
      const initial: FileState[] = arr.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        status: "queued",
        progress: 0,
      }));
      setFiles((prev) => [...initial, ...prev]);
      // Kick uploads
      for (const fs of initial) void uploadOne(fs);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  async function uploadOne(initial: FileState) {
    const update = (patch: Partial<FileState>) =>
      setFiles((prev) =>
        prev.map((f) => (f.id === initial.id ? { ...f, ...patch } : f))
      );

    try {
      update({ status: "presigning" });
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: initial.file.name,
          contentType: initial.file.type || "application/octet-stream",
          size: initial.file.size,
        }),
      });
      if (!presignRes.ok) {
        const txt = await presignRes.text();
        throw new Error(`presign failed: ${presignRes.status} ${txt}`);
      }
      const { documentId, uploadUrl } = (await presignRes.json()) as {
        documentId: string;
        uploadUrl: string;
      };
      update({ documentId, status: "uploading" });

      // PUT directly to R2 with progress via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader(
          "content-type",
          initial.file.type || "application/octet-stream"
        );
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            update({ progress: Math.round((e.loaded / e.total) * 100) });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`R2 PUT ${xhr.status}: ${xhr.responseText}`));
        };
        xhr.onerror = () => reject(new Error("network error during upload"));
        xhr.send(initial.file);
      });

      update({ status: "processing", progress: 100 });

      // Trigger processing
      const procRes = await fetch(`/api/documents/${documentId}/process`, {
        method: "POST",
      });
      if (!procRes.ok) {
        const txt = await procRes.text();
        throw new Error(`process trigger failed: ${procRes.status} ${txt}`);
      }

      // Poll status
      const deadline = Date.now() + 5 * 60_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const r = await fetch(`/api/documents/${documentId}`);
        if (!r.ok) continue;
        const json = (await r.json()) as { document: { status: string; error?: string | null } };
        if (json.document.status === "processed") {
          update({ status: "processed" });
          onChange?.();
          return;
        }
        if (json.document.status === "failed") {
          throw new Error(json.document.error ?? "processing failed");
        }
      }
      throw new Error("processing timed out");
    } catch (e: unknown) {
      update({
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed transition p-6 text-center",
          dragOver
            ? "border-accent bg-accent/5"
            : "border-border hover:border-muted-fg"
        )}
      >
        <p className="text-sm text-muted-fg">
          Drop images here, or
        </p>
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full sm:w-auto rounded-lg bg-fg text-bg px-4 py-3 text-sm font-medium"
          >
            Choose files
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="w-full sm:w-auto rounded-lg border border-border px-4 py-3 text-sm font-medium"
          >
            Take photo
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-border p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {f.file.name}
                </div>
                <div className="text-xs text-muted-fg flex items-center gap-2">
                  <span>{(f.file.size / 1024 / 1024).toFixed(1)} MB</span>
                  <span>•</span>
                  <StatusPill status={f.status} />
                  {f.error && (
                    <span className="text-danger truncate">— {f.error}</span>
                  )}
                </div>
                {(f.status === "uploading" || f.status === "presigning") && (
                  <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-accent transition-[width]"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {f.status === "processed" && f.documentId && (
                <a
                  href={`/documents/${f.documentId}`}
                  className="text-sm text-accent font-medium"
                >
                  Open
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: FileState["status"] }) {
  const map: Record<FileState["status"], string> = {
    queued: "bg-muted text-muted-fg",
    presigning: "bg-muted text-muted-fg",
    uploading: "bg-accent/10 text-accent",
    processing: "bg-warning/10 text-warning",
    processed: "bg-success/10 text-success",
    failed: "bg-danger/10 text-danger",
  };
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide", map[status])}>
      {status}
    </span>
  );
}
