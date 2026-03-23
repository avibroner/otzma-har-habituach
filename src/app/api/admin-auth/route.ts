import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function generateToken(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "";
  return createHmac("sha256", password).update("otzma-admin").digest("hex");
}

function isValidToken(token: string): boolean {
  const expected = generateToken();
  return expected !== "" && token === expected;
}

// POST: login with password
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD לא מוגדר בשרת" },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "סיסמה שגויה" },
        { status: 401 }
      );
    }

    const token = generateToken();
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "שגיאה בבקשה" },
      { status: 400 }
    );
  }
}

// GET: check if authenticated
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = token ? isValidToken(token) : false;
  return NextResponse.json({ authenticated });
}

// DELETE: logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
