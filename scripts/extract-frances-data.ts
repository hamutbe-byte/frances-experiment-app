import fs from "node:fs";
import path from "node:path";

import XLSX from "xlsx";

const outputPath = path.resolve(process.cwd(), "src", "data", "generated", "frances-study.json");

const meaningMap: Record<string, string> = {
  agua: "water",
  balon: "ball",
  casa: "house",
  coche: "car",
  libro: "book",
  manzana: "apple",
  mesa: "table",
  perro: "dog"
};

type ColumnMap = {
  passage: number;
  pseudoword: number;
  realword: number;
  diversity: number;
  storyNumber: number;
  prompt: number;
  correct: number;
  token: number;
};

function findWorkbookPath() {
  const desktopRoot = path.resolve(process.cwd(), "..");

  for (const entry of fs.readdirSync(desktopRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = path.join(
      desktopRoot,
      entry.name,
      "חומרי עזר",
      "חומר עזר Frances",
      "חומר עזר פרנסיס.xlsx"
    );

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not locate חומר עזר פרנסיס.xlsx next to the phd_papers folder.");
}

function toRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<(string | number | boolean)[]>(sheet, {
    header: 1,
    raw: false,
    defval: ""
  });
}

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildVersion(
  rows: (string | number | boolean)[][],
  meta: { id: string; label: string; versionNumber: number },
  columns: ColumnMap
) {
  const trials = rows
    .slice(1)
    .filter((row) => row[columns.passage] && row[columns.pseudoword] && row[columns.realword])
    .slice(0, 30)
    .map((row, index) => {
      const pseudoword = String(row[columns.pseudoword]);
      const meaningCode = String(row[columns.realword]);
      const promptText = cleanText(row[columns.prompt]);
      const correctValue = cleanText(row[columns.correct]);

      return {
        trialIndex: index + 1,
        rowNumber: index + 2,
        tokenId: cleanText(row[columns.token]),
        pseudoword,
        displayWord: pseudoword.toUpperCase(),
        meaningCode,
        meaningLabel: meaningMap[meaningCode],
        diversityLevel: Number(row[columns.diversity]),
        storyNumber: Number(row[columns.storyNumber]),
        passageText: cleanText(row[columns.passage]),
        comprehensionPromptText: promptText,
        comprehensionPromptHtml: `<p>${promptText}</p>`,
        correctAnswer: correctValue === "True" ? "yes" : "no",
        isCritical: index < 8
      };
    });

  return {
    id: meta.id,
    label: meta.label,
    versionNumber: meta.versionNumber,
    learningTrials: trials
  };
}

function buildStudy() {
  const workbookPath = findWorkbookPath();
  const workbook = XLSX.readFile(workbookPath, { raw: false });

  const versionConfigs = [
    {
      sheet: "Version1 EN",
      meta: { id: "version-1", label: "Version 1", versionNumber: 1 },
      columns: { passage: 0, pseudoword: 1, realword: 2, diversity: 3, storyNumber: 4, prompt: 5, correct: 6, token: 8 }
    },
    {
      sheet: "Version2 EN",
      meta: { id: "version-2", label: "Version 2", versionNumber: 2 },
      columns: { passage: 13, pseudoword: 14, realword: 15, diversity: 16, storyNumber: 17, prompt: 18, correct: 19, token: 9 }
    },
    {
      sheet: "Version3 EN",
      meta: { id: "version-3", label: "Version 3", versionNumber: 3 },
      columns: { passage: 13, pseudoword: 14, realword: 15, diversity: 16, storyNumber: 17, prompt: 18, correct: 19, token: 9 }
    },
    {
      sheet: "Version4 EN",
      meta: { id: "version-4", label: "Version 4", versionNumber: 4 },
      columns: { passage: 12, pseudoword: 13, realword: 14, diversity: 15, storyNumber: 16, prompt: 17, correct: 18, token: 9 }
    }
  ] as const;

  const versions = versionConfigs.map((config) =>
    buildVersion(toRows(workbook.Sheets[config.sheet]), config.meta, config.columns)
  );

  const targets = new Map<
    string,
    { pseudoword: string; display: string; intendedMeaning: string; meaningCode: string }
  >();

  for (const version of versions) {
    for (const trial of version.learningTrials) {
      targets.set(trial.pseudoword, {
        pseudoword: trial.pseudoword,
        display: trial.displayWord,
        intendedMeaning: trial.meaningLabel,
        meaningCode: trial.meaningCode
      });
    }
  }

  return {
    slug: "frances-2020",
    title: "Frances et al. (2020) Reading Phase",
    citation: "Frances et al. (2020) The effects of contextual diversity on incidental vocabulary learning",
    sourceWorkbook: "חומר עזר פרנסיס.xlsx",
    summary: "Training-phase only build with 30 reading passages and one yes/no comprehension question after each passage.",
    targetWords: [...targets.values()].sort((left, right) => left.meaningCode.localeCompare(right.meaningCode)),
    versions,
    recallPrompts: [],
    matchingTrials: []
  };
}

const study = buildStudy();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(study, null, 2));
console.log(`Wrote ${outputPath}`);
