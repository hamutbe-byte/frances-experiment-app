import { NextResponse } from "next/server";

import {
  editableFieldDefinitions,
  normalizeContentOverrides,
  validateContentOverrides
} from "@/lib/content";
import { getResolvedContentWithOverrides } from "@/lib/content-server";
import { readContentOverrides, resetAllContentOverrides, writeContentOverrides } from "@/lib/content-store";
import type { EditableContentOverrides } from "@/lib/types";

interface SaveContentBody {
  overrides?: EditableContentOverrides;
}

interface DeleteContentBody {
  keys?: string[];
}

export async function GET() {
  const { overrides, snapshot } = getResolvedContentWithOverrides();

  return NextResponse.json({
    overrides,
    snapshot,
    fields: editableFieldDefinitions
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveContentBody;
    const nextOverrides = body.overrides ?? {};
    const validationError = validateContentOverrides(nextOverrides);

    if (validationError) {
      return new NextResponse(validationError, { status: 400 });
    }

    const merged = {
      ...readContentOverrides(),
      ...nextOverrides
    };

    const normalized = normalizeContentOverrides(merged);
    writeContentOverrides(normalized);

    const { overrides, snapshot } = getResolvedContentWithOverrides();
    return NextResponse.json({ overrides, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save content overrides.";
    return new NextResponse(message, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as DeleteContentBody;
    const keys = body.keys ?? [];

    if (keys.length === 0) {
      resetAllContentOverrides();
    } else {
      const current = { ...readContentOverrides() };
      for (const key of keys) {
        delete current[key];
      }
      writeContentOverrides(normalizeContentOverrides(current));
    }

    const { overrides, snapshot } = getResolvedContentWithOverrides();
    return NextResponse.json({ overrides, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset content overrides.";
    return new NextResponse(message, { status: 500 });
  }
}
