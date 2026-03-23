import { NextRequest, NextResponse } from "next/server";
import { fetchFieldOptions } from "@/lib/fireberry";
import { readMapping, writeMapping } from "@/lib/mapping-store";

// GET: fetch branches + buffers from Fireberry + saved mapping
export async function GET() {
  try {
    const fieldOptions = await fetchFieldOptions();

    const branches = Object.entries(fieldOptions.branchMap).map(
      ([name, value]) => ({ name, value })
    );
    const buffers = Object.entries(fieldOptions.bufferMap).map(
      ([name, value]) => ({ name, value })
    );

    const mapping = await readMapping();

    return NextResponse.json({ branches, buffers, mapping });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: save buffer mapping (admin only)
export async function POST(request: NextRequest) {
  // Check admin cookie
  const token = request.cookies.get("admin_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "לא מאומת" }, { status: 401 });
  }

  try {
    const { mapping } = await request.json();
    await writeMapping(mapping);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
