import { NextResponse } from "next/server";

import {
  editableUiFieldDefinitions,
  normalizeUiOverrides,
  validateUiOverrides
} from "@/content/ui-config";
import {
  editableFieldDefinitions,
  normalizeContentOverrides,
  normalizeContentStyleOverrides,
  validateContentStyleOverrides,
  validateContentOverrides
} from "@/lib/content";
import { getResolvedContentWithOverrides } from "@/lib/content-server";
import { getResolvedUiWithOverrides } from "@/lib/ui-config-server";
import {
  readContentStyleOverrides,
  resetAllContentStyleOverrides,
  writeContentStyleOverrides
} from "@/lib/content-style-store";
import { readContentOverrides, resetAllContentOverrides, writeContentOverrides } from "@/lib/content-store";
import { readUiOverrides, resetAllUiOverrides, writeUiOverrides } from "@/lib/ui-store";
import type { EditableContentOverrides, EditableContentStyleOverrides, EditableUiOverrides } from "@/lib/types";

interface SaveContentBody {
  overrides?: EditableContentOverrides;
  styleOverrides?: EditableContentStyleOverrides;
  uiOverrides?: EditableUiOverrides;
}

interface DeleteContentBody {
  keys?: string[];
  styleKeys?: string[];
  uiKeys?: string[];
}

export async function GET() {
  const { overrides, snapshot, styleOverrides } = getResolvedContentWithOverrides();
  const ui = getResolvedUiWithOverrides();

  return NextResponse.json({
    overrides,
    snapshot,
    styleOverrides,
    fields: editableFieldDefinitions,
    uiOverrides: ui.overrides,
    uiSnapshot: ui.snapshot,
    uiFields: editableUiFieldDefinitions,
    uiCssVariables: ui.cssVariables
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveContentBody;
    const nextOverrides = body.overrides ?? {};
    const nextStyleOverrides = body.styleOverrides ?? {};
    const nextUiOverrides = body.uiOverrides ?? {};
    const validationError = validateContentOverrides(nextOverrides);
    const styleValidationError = validateContentStyleOverrides(nextStyleOverrides);
    const uiValidationError = validateUiOverrides(nextUiOverrides);

    if (validationError) {
      return new NextResponse(validationError, { status: 400 });
    }

    if (styleValidationError) {
      return new NextResponse(styleValidationError, { status: 400 });
    }

    if (uiValidationError) {
      return new NextResponse(uiValidationError, { status: 400 });
    }

    const merged = {
      ...readContentOverrides(),
      ...nextOverrides
    };
    const mergedStyle = {
      ...readContentStyleOverrides(),
      ...nextStyleOverrides
    };
    const mergedUi = {
      ...readUiOverrides(),
      ...nextUiOverrides
    };

    const normalized = normalizeContentOverrides(merged);
    const normalizedStyle = normalizeContentStyleOverrides(mergedStyle);
    const normalizedUi = normalizeUiOverrides(mergedUi);
    writeContentOverrides(normalized);
    writeContentStyleOverrides(normalizedStyle);
    writeUiOverrides(normalizedUi);

    const { overrides, snapshot, styleOverrides } = getResolvedContentWithOverrides();
    const ui = getResolvedUiWithOverrides();
    return NextResponse.json({
      overrides,
      snapshot,
      styleOverrides,
      uiOverrides: ui.overrides,
      uiSnapshot: ui.snapshot,
      uiCssVariables: ui.cssVariables
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save content overrides.";
    return new NextResponse(message, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as DeleteContentBody;
    const hasKeysProp = "keys" in body;
    const hasStyleKeysProp = "styleKeys" in body;
    const hasUiKeysProp = "uiKeys" in body;
    const keys = body.keys ?? [];
    const styleKeys = body.styleKeys ?? [];
    const uiKeys = body.uiKeys ?? [];

    if (!hasKeysProp && !hasStyleKeysProp && !hasUiKeysProp) {
      resetAllContentOverrides();
      resetAllContentStyleOverrides();
      resetAllUiOverrides();
    } else if (hasKeysProp && keys.length === 0) {
      resetAllContentOverrides();
    } else if (hasKeysProp) {
      const current = { ...readContentOverrides() };
      for (const key of keys) {
        delete current[key];
      }
      writeContentOverrides(normalizeContentOverrides(current));
    }

    if (hasStyleKeysProp && styleKeys.length === 0) {
      resetAllContentStyleOverrides();
    } else if (hasStyleKeysProp) {
      const currentStyle = { ...readContentStyleOverrides() };
      for (const key of styleKeys) {
        delete currentStyle[key];
      }
      writeContentStyleOverrides(normalizeContentStyleOverrides(currentStyle));
    }

    if (hasUiKeysProp && uiKeys.length === 0) {
      resetAllUiOverrides();
    } else if (hasUiKeysProp) {
      const currentUi = { ...readUiOverrides() };
      for (const key of uiKeys) {
        delete currentUi[key];
      }
      writeUiOverrides(normalizeUiOverrides(currentUi));
    }

    const { overrides, snapshot, styleOverrides } = getResolvedContentWithOverrides();
    const ui = getResolvedUiWithOverrides();
    return NextResponse.json({
      overrides,
      snapshot,
      styleOverrides,
      uiOverrides: ui.overrides,
      uiSnapshot: ui.snapshot,
      uiCssVariables: ui.cssVariables
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset content overrides.";
    return new NextResponse(message, { status: 500 });
  }
}
