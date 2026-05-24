import fs from "node:fs";
import path from "node:path";

import type { EditableContentStyleOverrides } from "@/lib/types";

interface ContentStyleStoreFile {
  overrides: EditableContentStyleOverrides;
}

function getRuntimeDir() {
  return process.env.FRANCES_STORE_DIR ?? path.join(process.cwd(), ".runtime");
}

function getContentStyleStorePath() {
  return path.join(getRuntimeDir(), "content-style-overrides.json");
}

function ensureContentStyleStoreFile() {
  const runtimeDir = getRuntimeDir();
  const contentStyleStorePath = getContentStyleStorePath();
  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(contentStyleStorePath)) {
    const initial: ContentStyleStoreFile = { overrides: {} };
    fs.writeFileSync(contentStyleStorePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

function readContentStyleStoreFile(): ContentStyleStoreFile {
  ensureContentStyleStoreFile();
  const raw = fs.readFileSync(getContentStyleStorePath(), "utf8");
  const parsed = JSON.parse(raw) as ContentStyleStoreFile;
  return {
    overrides: parsed.overrides ?? {}
  };
}

function writeContentStyleStoreFile(store: ContentStyleStoreFile) {
  ensureContentStyleStoreFile();
  fs.writeFileSync(getContentStyleStorePath(), JSON.stringify(store, null, 2), "utf8");
}

export function readContentStyleOverrides(): EditableContentStyleOverrides {
  return readContentStyleStoreFile().overrides;
}

export function writeContentStyleOverrides(overrides: EditableContentStyleOverrides) {
  writeContentStyleStoreFile({ overrides });
}

export function resetAllContentStyleOverrides() {
  writeContentStyleOverrides({});
}
