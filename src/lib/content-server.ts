import { unstable_noStore as noStore } from "next/cache";

import { applyContentOverrides, defaultContentSnapshot } from "@/lib/content";
import { readContentOverrides } from "@/lib/content-store";

export function getResolvedContentSnapshot() {
  noStore();
  const overrides = readContentOverrides();
  return applyContentOverrides(defaultContentSnapshot, overrides);
}

export function getResolvedContentWithOverrides() {
  noStore();
  const overrides = readContentOverrides();

  return {
    overrides,
    snapshot: applyContentOverrides(defaultContentSnapshot, overrides)
  };
}
