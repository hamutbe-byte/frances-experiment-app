import fs from "node:fs";
import path from "node:path";

import type { EditableContentOverrides } from "@/lib/types";

interface ContentStoreFile {
  overrides: EditableContentOverrides;
}

function getRuntimeDir() {
  return process.env.FRANCES_STORE_DIR ?? path.join(process.cwd(), ".runtime");
}

function getContentStorePath() {
  return path.join(getRuntimeDir(), "content-overrides.json");
}

function ensureContentStoreFile() {
  const runtimeDir = getRuntimeDir();
  const contentStorePath = getContentStorePath();
  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(contentStorePath)) {
    const initial: ContentStoreFile = { overrides: {} };
    fs.writeFileSync(contentStorePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

function readContentStoreFile(): ContentStoreFile {
  if (!fs.existsSync(getContentStorePath())) {
    return { overrides: {} };
  }

  // Some editors save JSON with a UTF-8 BOM, which JSON.parse does not accept.
  const raw = fs.readFileSync(getContentStorePath(), "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw) as ContentStoreFile;
  return {
    overrides: parsed.overrides ?? {}
  };
}

function writeContentStoreFile(store: ContentStoreFile) {
  ensureContentStoreFile();
  fs.writeFileSync(getContentStorePath(), JSON.stringify(store, null, 2), "utf8");
}

export function readContentOverrides(): EditableContentOverrides {
  return readContentStoreFile().overrides;
}

export function writeContentOverrides(overrides: EditableContentOverrides) {
  writeContentStoreFile({ overrides });
}

export function resetAllContentOverrides() {
  writeContentOverrides({});
}
