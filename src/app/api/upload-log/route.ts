import { NextRequest, NextResponse } from "next/server";
import { getUploadLogs } from "@/lib/mapping-store";

// GET: fetch upload history (admin only)
export async function GET(request: NextRequest) {
  // Check admin cookie
  const token = request.cookies.get("admin_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "לא מאומת" }, { status: 401 });
  }

  const logs = await getUploadLogs(50);
  return NextResponse.json({ logs });
}
