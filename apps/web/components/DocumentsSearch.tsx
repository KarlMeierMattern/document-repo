"use client";

import { DOC_TYPES } from "@/drizzle/schema";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function DocumentsSearch({
  initialType,
  initialQ,
}: {
  initialType: string;
  initialQ: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState(initialType);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(t: string, query: string) {
    const params = new URLSearchParams();
    if (t) params.set("type", t);
    if (query) params.set("q", query);
    const qs = params.toString();
    router.push(`/documents${qs ? `?${qs}` : ""}`);
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setType(val);
    navigate(val, q);
  }

  function handleQChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQ(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => navigate(type, val), 150);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <select
        value={type}
        onChange={handleTypeChange}
        className="rounded-lg border border-border px-3 py-2 text-sm bg-bg appearance-none"
      >
        <option value="">All types</option>
        {DOC_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <input
        type="search"
        value={q}
        onChange={handleQChange}
        placeholder="Search filename"
        className="flex-1 rounded-lg border border-border px-3 py-2 text-sm bg-bg"
      />
    </div>
  );
}
