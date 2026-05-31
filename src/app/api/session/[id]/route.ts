import { NextResponse } from "next/server";

import { getSessionBundle, updateSessionStatus } from "@/lib/store";
import type { SessionStage } from "@/lib/types";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const bundle = await getSessionBundle(id);
    if (!bundle) {
      return new NextResponse("Session not found", { status: 404 });
    }

    return NextResponse.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load session.";
    return new NextResponse(message, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status: SessionStage };
    const bundle = await updateSessionStatus(id, body.status);
    return NextResponse.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session.";
    return new NextResponse(message, { status: 500 });
  }
}
