import { NextResponse } from "next/server";

import { createSession } from "@/lib/store";
import type { CreateSessionInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSessionInput;
    if (!body?.studySlug || !body?.device) {
      return new NextResponse("Invalid session payload.", { status: 400 });
    }

    const result = createSession(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session.";
    return new NextResponse(message, { status: 500 });
  }
}
