import { createClient } from "redis";
import type { UploadLogEntry } from "./types";

const KV_KEY = "otzma:buffer-mapping";
const LOG_KEY = "otzma:upload-log";

async function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const client = createClient({ url });
  await client.connect();
  return client;
}

export async function readMapping(): Promise<Record<string, string>> {
  try {
    const client = await getRedisClient();
    if (!client) return {};

    const data = await client.get(KV_KEY);
    await client.disconnect();

    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Redis not available — fall back to defaults
  }
  return {};
}

export async function writeMapping(
  mapping: Record<string, string>
): Promise<void> {
  const client = await getRedisClient();
  if (!client) throw new Error("Redis not configured");

  await client.set(KV_KEY, JSON.stringify(mapping));
  await client.disconnect();
}

export async function logUpload(entry: UploadLogEntry): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.lPush(LOG_KEY, JSON.stringify(entry));
    // Keep only last 200 entries
    await client.lTrim(LOG_KEY, 0, 199);
    await client.disconnect();
  } catch {
    // Don't fail the upload if logging fails
  }
}

export async function getUploadLogs(limit = 50): Promise<UploadLogEntry[]> {
  try {
    const client = await getRedisClient();
    if (!client) return [];

    const data = await client.lRange(LOG_KEY, 0, limit - 1);
    await client.disconnect();

    return data.map((d) => JSON.parse(d));
  } catch {
    return [];
  }
}
