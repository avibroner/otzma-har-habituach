import { NextRequest, NextResponse } from "next/server";

// Routes that require Fireberry iframe context (Referer check)
const PROTECTED_PATHS = ["/api/process-excel"];

// Routes that are always accessible (admin, auth, static)
const OPEN_PREFIXES = ["/admin", "/api/admin-auth", "/api/field-options", "/api/users", "/api/upload-log", "/_next", "/favicon"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow open routes
  if (OPEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Check Referer for protected paths and root page
  const isProtected = pathname === "/" || PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const referer = request.headers.get("referer") || "";
    const isFromFireberry = referer.includes("fireberry.com");
    const isFromSelf = referer.includes(request.nextUrl.host);

    if (!isFromFireberry && !isFromSelf) {
      return new NextResponse(
        JSON.stringify({ error: "גישה מותרת רק מתוך פיירברי" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|bg.png).*)"],
};
