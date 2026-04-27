import fs from "node:fs";
import os from "node:os";
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
  const directCandidates = [
    process.env.FRANCES_WORKBOOK_PATH,
    path.resolve(process.cwd(), ".runtime", "supplement-check", "frances-supplement.xlsx")
  ].filter(Boolean) as string[];

  for (const candidate of directCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const searchRoots = [
    path.resolve(process.cwd(), "..", ".."),
    path.join(os.homedir(), "OneDrive - ac.sce.ac.il", "Desktop"),
    path.join(os.homedir(), "Desktop")
  ].filter((entry) => fs.existsSync(entry));

  const visited = new Set<string>();
  const stack = [...searchRoots];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.includes("Frances") || current.includes("Frances") || current.endsWith("Desktop")) {
          stack.push(fullPath);
        }
        continue;
      }

      if (entry.name.toLowerCase().endsWith(".xlsx") && fullPath.includes("Frances")) {
        return fullPath;
      }
    }
  }

  throw new Error("Could not locate the Frances supplementary workbook.");
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

function cleanHtml(value: unknown) {
  return String(value ?? "").trim();
}

function normalizePseudoword(value: unknown) {
  return cleanText(value).toLowerCase();
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

function buildTargets(rows: (string | number | boolean)[][]) {
  return rows
    .slice(1)
    .filter((row) => row[0] && row[1])
    .map((row) => {
      const pseudoword = normalizePseudoword(row[0]);
      const meaningCode = cleanText(row[1]);

      return {
        pseudoword,
        display: pseudoword.toUpperCase(),
        intendedMeaning: cleanText(row[2]) || meaningMap[meaningCode],
        meaningCode
      };
    });
}

function buildRecallPrompts(rows: (string | number | boolean)[][]) {
  return rows
    .slice(1)
    .filter((row) => row[0] && row[1] && row[2])
    .slice(0, 8)
    .map((row, index) => {
      const pseudoword = normalizePseudoword(row[1]);
      const meaningCode = cleanText(row[2]);
      const correctOptionIndex = Number(row[7]);
      const recognitionOptions = [3, 4, 5, 6].map((column, optionIndex) => {
        const text = normalizePseudoword(row[column]);
        const oneBasedIndex = optionIndex + 1;

        return {
          optionIndex: oneBasedIndex,
          text,
          displayText: text.toUpperCase(),
          isCorrect: oneBasedIndex === correctOptionIndex
        };
      });

      return {
        promptIndex: index + 1,
        pseudoword,
        displayWord: pseudoword.toUpperCase(),
        meaningCode,
        meaningLabel: meaningMap[meaningCode],
        promptText: cleanText(row[0]),
        promptHtml: cleanHtml(row[0]),
        recognitionOptions,
        correctOptionIndex,
        distractorPseudoword: normalizePseudoword(row[8])
      };
    });
}

function buildMatchingTrials(rows: (string | number | boolean)[][]) {
  return rows
    .slice(1)
    .filter((row) => row[0] && row[1] && row[2] && row[4])
    .slice(0, 32)
    .map((row, index) => {
      const pictureId = cleanText(row[0]);
      const pseudoword = normalizePseudoword(row[1]);
      const meaningCode = cleanText(row[2]);
      const condition = cleanText(row[4]) as "match" | "distractor" | "category" | "unrelated";

      return {
        trialIndex: index + 1,
        pictureId,
        imagePath: `/stimuli/matching/${pictureId}.jpg`,
        pseudoword,
        displayWord: pseudoword.toUpperCase(),
        meaningCode,
        meaningLabel: meaningMap[meaningCode],
        relation: condition,
        family: condition === "match" ? "target" : condition,
        condition,
        correctAnswer: cleanText(row[6]) === "y" ? "yes" : "no"
      };
    });
}

function buildStudy() {
  const workbookPath = findWorkbookPath();
  const workbook = XLSX.readFile(workbookPath, { raw: false });

  const versionConfigs = [
    {
      sheet: "Version1 EN",
      meta: { id: "version-1", label: "Version 1", versionNumber: 1 },
      columns: { passage: 0, pseudoword: 1, realword: 2, diversity: 3, storyNumber: 4, prompt: 5, correct: 6, token: 9 }
    },
    {
      sheet: "Version2 EN",
      meta: { id: "version-2", label: "Version 2", versionNumber: 2 },
      columns: { passage: 0, pseudoword: 1, realword: 2, diversity: 3, storyNumber: 4, prompt: 5, correct: 6, token: 9 }
    },
    {
      sheet: "Version3 EN",
      meta: { id: "version-3", label: "Version 3", versionNumber: 3 },
      columns: { passage: 0, pseudoword: 1, realword: 2, diversity: 3, storyNumber: 4, prompt: 5, correct: 6, token: 9 }
    },
    {
      sheet: "Version4 EN",
      meta: { id: "version-4", label: "Version 4", versionNumber: 4 },
      columns: { passage: 0, pseudoword: 1, realword: 2, diversity: 3, storyNumber: 4, prompt: 5, correct: 6, token: 9 }
    }
  ] as const;

  const versions = versionConfigs.map((config) =>
    buildVersion(toRows(workbook.Sheets[config.sheet]), config.meta, config.columns)
  );

  return {
    slug: "frances-2020",
    title: "Frances et al. (2020) Contextual Diversity Experiment",
    citation: "Frances et al. (2020) The effects of contextual diversity on incidental vocabulary learning",
    sourceWorkbook: path.basename(workbookPath),
    summary: "Training phase with recall, recognition, and matching post-test materials.",
    targetWords: buildTargets(toRows(workbook.Sheets.VersionesParaCorreccion)),
    versions,
    recallPrompts: buildRecallPrompts(toRows(workbook.Sheets["Recall EN"])),
    matchingTrials: buildMatchingTrials(toRows(workbook.Sheets.Matching))
  };
}

const study = buildStudy();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(study, null, 2));
console.log(`Wrote ${outputPath}`);
