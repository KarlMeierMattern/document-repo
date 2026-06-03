"use client";

import type { Document, Reminder } from "@/drizzle/schema";
import { formatDate, relativeFromNow } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

type Item = { reminder: Reminder; document: Document };

export function UpcomingReminders({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial);

  async function dismiss(id: string) {
    setItems((prev) => prev.filter((i) => i.reminder.id !== id));
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-fg">Nothing coming up. 🎉</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-bg">
      {items.map(({ reminder, document }) => (
        <li
          key={reminder.id}
          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="min-w-0">
            <Link
              href={`/documents/${document.id}`}
              className="text-sm font-medium hover:underline truncate block"
            >
              {reminder.title}
            </Link>
            <div className="text-xs text-muted-fg">
              {formatDate(reminder.dueDate)} · {relativeFromNow(reminder.dueDate)}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:shrink-0">
            <span className="text-[10px] uppercase tracking-wide rounded-full bg-warning/10 text-warning px-2 py-0.5">
              {reminder.reminderType.replace(/_/g, " ")}
            </span>
            <button
              onClick={() => dismiss(reminder.id)}
              className="text-xs text-muted-fg hover:text-fg"
              title="Dismiss"
            >
              Dismiss
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
