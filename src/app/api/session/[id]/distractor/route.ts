import { NextResponse } from "next/server";

import { saveDistractorResponse } from "@/lib/store";
import type { DistractorDirection } from "@/lib/types";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      trialIndex: number;
      direction: DistractorDirection;
      sequenceLength: number;
      shownSequence: number[];
      responseSequence: number[];
      responseTimeMs: number;
    };

    const result = await saveDistractorResponse(id, body);
    return NextResponse.json({
      correct: result.response.correct
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save distractor response.";
    return new NextResponse(message, { status: 500 });
  }
}
