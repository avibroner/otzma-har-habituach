import { createClient } from "redis";

const KV_KEY = "otzma:buffer-mapping";

// Default buffer mapping (initial seed)
const DEFAULT_MAPPING: Record<string, string> = {
  "ייעוץ ובדיקות": "1",
  "מוות מתאונה": "1",
  "מחלות קשות": "1",
  "השתלות": "1",
  "ניתוחים אחידה": "1",
  "תרופות - בסיס": "1",
  "ניתוחים בחו\"ל": "1",
  "נספח טיפולים מחליפי ניתוח": "1",
  "כתב שירות רופא און ליין": "1",
  "תרופות - הרחבה": "1",
  "תרופות - בסיס + הרחבה": "1",
  "כתב שירות אבחון מהיר": "1",
  "ביטוח חיים למקרה מוות": "1",
  "אחר": "1",
  "ניתוחים עם פיצוי על פנייה לציבורי/שב\"ן": "1",
  "ניתוחים משלים שב\"ן": "1",
  "ניתוחים אחידה - משלים שב\"ן": "1",
  "כתב שירות רפואה משלימה": "1",
  "כתב שירות ניהול רפואי אישי": "1",
  "כתב שירות ליווי אשפוז": "1",
  "ניתוחים - אחר": "1",
  "ניתוחים עם השתתפות עצמית": "1",
  "חבילת כיסויים": "1",
  "כתב שירות רפואת ספורט": "1",
  "כתב שירות ליווי בעת מחלה": "1",
  "שיניים": "1",
  "רכב חובה": "2",
  "מקיף לבית עסק": "2",
  "ביטוח מקיף": "2",
  "ביטוח צד ג'": "2",
  "ביטוח מבנה": "2",
  "ביטוח מבנה ותכולה": "2",
  "ביטוח תכולה": "2",
  "סיעודי עד 3 חודשים": "3",
  "סיעודי - המתנה של 37-60 חודשים": "3",
  "סיעודי - המתנה של 4-36 חודשים": "3",
  "נכויות": "3",
  "תאונות אישיות": "3",
  "אבדן כושר עבודה שחרור ופיצוי": "4",
  "אבדן כושר עבודה": "4",
  "אבדן כושר עבודה שחרור": "4",
  "ביטוח חיים חיסכון טהור": "4",
  "ביטוח חיים משולב בחיסכון": "4",
};

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
    if (!client) return { ...DEFAULT_MAPPING };

    const data = await client.get(KV_KEY);
    await client.disconnect();

    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Redis not available — fall back to defaults
  }
  return { ...DEFAULT_MAPPING };
}

export async function writeMapping(
  mapping: Record<string, string>
): Promise<void> {
  const client = await getRedisClient();
  if (!client) throw new Error("Redis not configured");

  await client.set(KV_KEY, JSON.stringify(mapping));
  await client.disconnect();
}
