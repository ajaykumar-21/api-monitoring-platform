import { NextResponse } from "next/server";
import { executePingCheck } from "@/lib/worker/pingEngine";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await executePingCheck(id);
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}
