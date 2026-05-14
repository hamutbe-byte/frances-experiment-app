import { nvltVersionB } from "@/data/generated/nvlt-version-b";

export type NvltLevelId = (typeof nvltVersionB.levels)[number]["id"];
export type NvltQuestion = (typeof nvltVersionB.levels)[number]["questions"][number];
export type NvltLevel = (typeof nvltVersionB.levels)[number];

const allLevelIds = nvltVersionB.levels.map((level) => level.id);
const defaultLevelIds: NvltLevelId[] = ["1000", "2000"];

export function getAllNvltLevels(): readonly NvltLevel[] {
  return nvltVersionB.levels;
}

export function getConfiguredNvltLevelIds(configValue = process.env.NEXT_PUBLIC_NVLT_ACTIVE_LEVELS): NvltLevelId[] {
  if (!configValue) {
    return defaultLevelIds;
  }

  const selected = configValue
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is NvltLevelId => allLevelIds.includes(value as NvltLevelId));

  return selected.length > 0 ? selected : defaultLevelIds;
}

export function getConfiguredNvltLevels(configValue = process.env.NEXT_PUBLIC_NVLT_ACTIVE_LEVELS): NvltLevel[] {
  const selectedIds = new Set(getConfiguredNvltLevelIds(configValue));
  return nvltVersionB.levels.filter((level) => selectedIds.has(level.id));
}

export function getNvltMetadata() {
  return {
    id: nvltVersionB.id,
    title: nvltVersionB.title,
    citation: nvltVersionB.citation,
    sourceFile: nvltVersionB.sourceFile
  };
}
