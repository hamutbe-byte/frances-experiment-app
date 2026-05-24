import fs from "node:fs";
import path from "node:path";

import type { EditableUiOverrides } from "@/lib/types";

interface UiStoreFile {
  overrides: EditableUiOverrides;
}

function getRuntimeDir() {
  return process.env.FRANCES_STORE_DIR ?? path.join(process.cwd(), ".runtime");
}

function getUiStorePath() {
  return path.join(getRuntimeDir(), "ui-overrides.json");
}

function ensureUiStoreFile() {
  const runtimeDir = getRuntimeDir();
  const uiStorePath = getUiStorePath();
  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(uiStorePath)) {
    const initial: UiStoreFile = { overrides: {} };
    fs.writeFileSync(uiStorePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

function readUiStoreFile(): UiStoreFile {
  ensureUiStoreFile();
  const raw = fs.readFileSync(getUiStorePath(), "utf8");
  const parsed = JSON.parse(raw) as UiStoreFile;

  return {
    overrides: parsed.overrides ?? {}
  };
}

function writeUiStoreFile(store: UiStoreFile) {
  ensureUiStoreFile();
  fs.writeFileSync(getUiStorePath(), JSON.stringify(store, null, 2), "utf8");
}

export function readUiOverrides(): EditableUiOverrides {
  return readUiStoreFile().overrides;
}

export function writeUiOverrides(overrides: EditableUiOverrides) {
  writeUiStoreFile({ overrides });
}

export function resetAllUiOverrides() {
  writeUiOverrides({});
}
