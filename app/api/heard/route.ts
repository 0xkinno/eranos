import { NextResponse } from "next/server";
import { keeperMemory } from "@/lib/memory/client";
import { readKnown } from "@/lib/memory/read";
import { MEMORY_ACCOUNT_ID } from "@/lib/facts/stats";
import { visibleKnown } from "@/lib/memory/format";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET() {
  const all = await readKnown(keeperMemory(MEMORY_ACCOUNT_ID, "heard"), "heard");
  const items = visibleKnown(all.map((m) => m)); // retract lines hide rejected or confirmed lines
  return NextResponse.json({ heard: items.filter((i) => i.type === "heard") });
}
