import { createClient } from "redis";

const KV_KEY = "otzma:buffer-mapping";

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
