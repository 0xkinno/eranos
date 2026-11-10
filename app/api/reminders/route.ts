import { NextRequest, NextResponse } from "next/server";
import { inbox } from "@/lib/keeper/deliver";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const m = req.nextUrl.searchParams.get("member") ?? "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(m)) return NextResponse.json({ error: "bad address" }, { status: 400 });
  return NextResponse.json({ notices: await inbox(m) });
}
