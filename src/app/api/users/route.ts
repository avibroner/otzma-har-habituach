import { NextResponse } from "next/server";

const API_BASE = "https://api.fireberry.com";

function getToken(): string {
  const token = process.env.FIREBERRY_TOKEN;
  if (!token) throw new Error("FIREBERRY_TOKEN is not set");
  return token;
}

export interface FireberryUser {
  name: string;
  email: string;
  id: string;
}

// GET: fetch active users from Fireberry
export async function GET() {
  try {
    const token = getToken();

    const res = await fetch(`${API_BASE}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        tokenid: token,
      },
      body: JSON.stringify({
        objecttype: "15", // users
        fields: "fullname,email,systemuserid",
        page_size: 100,
        query: "(statuscode = 1)", // active users only
      }),
    });

    const json = await res.json();
    const records = json?.data?.Data || [];

    const users: FireberryUser[] = records
      .filter((r: Record<string, string>) => r.fullname && r.email)
      .map((r: Record<string, string>) => ({
        name: r.fullname,
        email: r.email,
        id: r.systemuserid,
      }))
      .sort((a: FireberryUser, b: FireberryUser) => a.name.localeCompare(b.name, "he"));

    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשליפת משתמשים" },
      { status: 500 }
    );
  }
}
