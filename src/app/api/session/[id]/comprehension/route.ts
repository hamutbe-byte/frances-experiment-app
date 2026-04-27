import { NextResponse } from "next/server";

import { saveComprehensionResponse } from "@/lib/store";
import type { YesNoAnswer } from "@/lib/types";

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
      answer: YesNoAnswer;
      responseTimeMs: number;
    };

    const result = saveComprehensionResponse(id, body);

    return NextResponse.json({
      nextTrialIndex: result.nextTrialIndex,
      completed: result.completed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save comprehension response.";
    return new NextResponse(message, { status: 500 });
  }
}
