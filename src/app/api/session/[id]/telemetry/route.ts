import { NextResponse } from "next/server";

import { appendTelemetry } from "@/lib/store";
import type { ClientEvent } from "@/lib/types";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Omit<ClientEvent, "createdAt" | "sessionId">;
    appendTelemetry(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save telemetry event.";
    return new NextResponse(message, { status: 500 });
  }
}
