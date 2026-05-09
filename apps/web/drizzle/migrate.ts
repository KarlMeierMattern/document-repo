/**
 * Run on a fresh Neon DB:  npm run db:migrate
 *
 * Applies every .sql file in ./drizzle/migrations in lexicographic order,
 * tracking applied migrations in a _migrations table. Idempotent.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// Load .env from repo root (two levels up from apps/web)
config({ path: join(__dirname, "..", "..", "..", ".env") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const dir = join(process.cwd(), "drizzle", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const applied = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
    if (applied.length > 0) {
      console.log(`✓ ${file} (already applied)`);
      continue;
    }
    const body = await readFile(join(dir, file), "utf8");
    console.log(`→ applying ${file}`);
    const statements = body
      .split(/;\s*$/m)
      .map((s) => s.trim())
      .filter(Boolean);
    // Neon HTTP driver doesn't support multi-statement transactions over HTTP,
    // so we run statements sequentially. Migrations must be idempotent
    // (use IF NOT EXISTS) — they are.
    for (const stmt of statements) {
      await sql(stmt);
    }
    await sql`INSERT INTO _migrations (name) VALUES (${file})`;
    console.log(`✓ ${file}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
