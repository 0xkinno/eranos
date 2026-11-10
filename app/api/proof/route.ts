import { NextResponse } from "next/server";
import { evidence, factsFile } from "@/lib/facts/stats";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ evidence: evidence(), facts: factsFile() }); }
