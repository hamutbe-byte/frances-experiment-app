import { unstable_noStore as noStore } from "next/cache";

import { applyContentOverrides, defaultContentSnapshot, normalizeContentOverrides } from "@/lib/content";
import { readContentOverrides } from "@/lib/content-store";
import { readContentStyleOverrides } from "@/lib/content-style-store";

export function getResolvedContentSnapshot() {
  noStore();
  const overrides = normalizeContentOverrides(readContentOverrides());
  return applyContentOverrides(defaultContentSnapshot, overrides);
}

export function getResolvedContentWithOverrides() {
  noStore();
  const overrides = normalizeContentOverrides(readContentOverrides());
  const styleOverrides = readContentStyleOverrides();

  return {
    overrides,
    styleOverrides,
    snapshot: applyContentOverrides(defaultContentSnapshot, overrides)
  };
}
