import { NextResponse } from "next/server";

import { saveRecognitionResponse } from "@/lib/store";

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
      selectedOptionIndex: number;
      responseTimeMs: number;
    };

    const result = await saveRecognitionResponse(id, body);
    return NextResponse.json({
      nextPromptIndex: result.nextPromptIndex,
      completed: result.completed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save recognition response.";
    return new NextResponse(message, { status: 500 });
  }
}
