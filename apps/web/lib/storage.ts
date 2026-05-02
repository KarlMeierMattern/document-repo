/**
 * Cloudflare R2 storage helpers, S3-compatible.
 *
 * R2 endpoint: https://<account-id>.r2.cloudflarestorage.com
 * We never expose R2 keys to the browser — uploads use presigned PUT URLs,
 * downloads to the UI use presigned GET URLs (5-min TTL).
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

let _client: S3Client | null = null;

function client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });
  return _client;
}

export function buildR2Key(opts: {
  documentId: string;
  filename?: string | null;
}): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext =
    opts.filename && opts.filename.includes(".")
      ? opts.filename.split(".").pop()!.toLowerCase().slice(0, 8)
      : "bin";
  return `raw/${yyyy}/${mm}/${opts.documentId}.${ext}`;
}

export async function presignPut(opts: {
  key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 600
}): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: required("R2_BUCKET"),
    Key: opts.key,
    ContentType: opts.contentType,
  });
  return getSignedUrl(client(), cmd, { expiresIn: opts.expiresIn ?? 600 });
}

export async function presignGet(opts: {
  key: string;
  expiresIn?: number; // default 300 (5 min)
}): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: required("R2_BUCKET"),
    Key: opts.key,
  });
  return getSignedUrl(client(), cmd, { expiresIn: opts.expiresIn ?? 300 });
}
