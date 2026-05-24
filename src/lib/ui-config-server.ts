import { unstable_noStore as noStore } from "next/cache";

import { applyUiOverrides, defaultUiSnapshot, getUiCssVariables } from "@/content/ui-config";
import { readUiOverrides } from "@/lib/ui-store";

export function getResolvedUiSnapshot() {
  noStore();
  const overrides = readUiOverrides();
  return applyUiOverrides(defaultUiSnapshot, overrides);
}

export function getResolvedUiCssVariables() {
  return getUiCssVariables(getResolvedUiSnapshot());
}

export function getResolvedUiWithOverrides() {
  noStore();
  const overrides = readUiOverrides();
  const snapshot = applyUiOverrides(defaultUiSnapshot, overrides);

  return {
    overrides,
    snapshot,
    cssVariables: getUiCssVariables(snapshot)
  };
}
