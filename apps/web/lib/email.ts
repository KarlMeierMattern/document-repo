import { Resend } from "resend";

let _resend: Resend | null = null;

function client(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

type ReminderRow = {
  id: string;
  title: string;
  dueDate: string;
  reminderType: string;
};

export function renderDigestHtml(items: ReminderRow[], baseUrl: string): string {
  const grouped = new Map<string, ReminderRow[]>();
  for (const r of items) {
    const arr = grouped.get(r.reminderType) ?? [];
    arr.push(r);
    grouped.set(r.reminderType, arr);
  }

  const sections = [...grouped.entries()]
    .map(([type, rows]) => {
      const lis = rows
        .map(
          (r) => `
        <li style="margin:6px 0;line-height:1.4;">
          <a href="${baseUrl}/dashboard" style="color:#1d4ed8;text-decoration:none;">
            ${escape(r.title)}
          </a>
          <span style="color:#64748b;font-size:12px;"> — ${escape(r.dueDate)}</span>
        </li>`
        )
        .join("");
      return `
        <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:20px 0 6px;">
          ${escape(type.replace(/_/g, " "))}
        </h3>
        <ul style="margin:0;padding-left:20px;">${lis}</ul>`;
    })
    .join("");

  return `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
    <h1 style="font-size:18px;margin:0 0 4px;">Upcoming reminders</h1>
    <p style="color:#64748b;font-size:13px;margin:0 0 16px;">
      ${items.length} item${items.length === 1 ? "" : "s"} due in the next 30 days.
    </p>
    ${sections}
    <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
      <a href="${baseUrl}/dashboard" style="color:#1d4ed8;">Open dashboard →</a>
    </p>
  </div>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendDigest(opts: {
  to: string;
  items: ReminderRow[];
  baseUrl: string;
}): Promise<{ id: string }> {
  const from = process.env.RESEND_FROM ?? "Documents <onboarding@resend.dev>";
  const html = renderDigestHtml(opts.items, opts.baseUrl);
  const subject = `${opts.items.length} reminder${opts.items.length === 1 ? "" : "s"} coming up`;
  const res = await client().emails.send({
    from,
    to: opts.to,
    subject,
    html,
  });
  if (res.error) throw new Error(`Resend error: ${res.error.message}`);
  return { id: res.data?.id ?? "unknown" };
}
