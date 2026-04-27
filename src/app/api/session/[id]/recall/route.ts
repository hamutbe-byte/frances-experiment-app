import { NextResponse } from "next/server";

import { saveRecallResponse } from "@/lib/store";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      promptIndex: number;
      text: string;
      firstKeystrokeLatencyMs: number | null;
      totalResponseTimeMs: number;
      editCount: number;
      pasted: boolean;
      pasteCount: number;
    };

    const result = saveRecallResponse(id, body);
    return NextResponse.json({
      response: result.response
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save recall response.";
    return new NextResponse(message, { status: 500 });
  }
}
