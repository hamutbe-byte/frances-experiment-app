import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { POST as createSessionPost } from "@/app/api/session/route";
import { DELETE as adminContentDelete, GET as adminContentGet, POST as adminContentPost } from "@/app/api/admin/content/route";
import { POST as submitComprehensionPost } from "@/app/api/session/[id]/comprehension/route";
import { POST as submitDistractorPost } from "@/app/api/session/[id]/distractor/route";
import { POST as submitMatchingPost } from "@/app/api/session/[id]/matching/route";
import { POST as submitRecallPost } from "@/app/api/session/[id]/recall/route";
import { POST as submitRecognitionPost } from "@/app/api/session/[id]/recognition/route";
import { GET as adminExportGet } from "@/app/admin/export/route";
import { corsiBlocks, corsiTrialList, getCorsiTrial, getExpectedCorsiResponse } from "@/lib/corsi";
import { chooseBalancedVersion } from "@/lib/assignment";
import { getDefaultEditableUiValue, getUiCssVariables, validateUiOverrides } from "@/content/ui-config";
import {
  defaultContentSnapshot,
  getDefaultEditableContentStyleValue,
  getEditableContentStyleValue,
  getEditableContentValue,
  validateContentOverrides,
  validateContentStyleOverrides
} from "@/lib/content";
import { getResolvedContentSnapshot } from "@/lib/content-server";
import { readContentOverrides } from "@/lib/content-store";
import { readContentStyleOverrides } from "@/lib/content-style-store";
import { getResolvedUiSnapshot } from "@/lib/ui-config-server";
import { readUiOverrides } from "@/lib/ui-store";
import { bundlesToResponsesCsv } from "@/lib/csv";
import {
  __resetStoreForTests,
  createSession,
  getSessionBundle,
  listSessionBundles,
  saveDistractorResponse,
  saveComprehensionResponse,
  saveMatchingResponse,
  saveRecallResponse,
  saveRecognitionResponse
} from "@/lib/store";
import { getAllNvltLevels, getConfiguredNvltLevelIds } from "@/lib/nvlt";
import { getStudyOrThrow } from "@/lib/study";
import type { ParticipantQuestionnaireInput, ParticipantSession } from "@/lib/types";

function log(message: string) {
  process.stdout.write(`${message}\n`);
}

function sampleDevice() {
  return {
    userAgent: "test-agent",
    viewportWidth: 1280,
    viewportHeight: 800,
    language: "en-US",
    platform: "Win32",
    deviceType: "desktop" as const,
    timezone: "Asia/Jerusalem"
  };
}

function sampleQuestionnaire(): ParticipantQuestionnaireInput {
  return {
    lastName: "כהן",
    firstName: "נועה",
    todayDate: "2026-05-16",
    age: 29,
    dateOfBirth: "1997-08-21",
    gender: "female",
    languagesByDominance: ["עברית", "אנגלית", "", "", ""],
    languagesByAcquisition: ["עברית", "אנגלית", "", "", ""],
    currentExposure: [
      { language: "עברית", percentage: "70%" },
      { language: "אנגלית", percentage: "30%" },
      { language: "", percentage: "" },
      { language: "", percentage: "" },
      { language: "", percentage: "" }
    ],
    readingPreference: [
      { language: "אנגלית", percentage: "60%" },
      { language: "עברית", percentage: "40%" },
      { language: "", percentage: "" },
      { language: "", percentage: "" },
      { language: "", percentage: "" }
    ],
    speakingPreference: [
      { language: "עברית", percentage: "80%" },
      { language: "אנגלית", percentage: "20%" },
      { language: "", percentage: "" },
      { language: "", percentage: "" },
      { language: "", percentage: "" }
    ],
    cultures: [
      { culture: "ישראלית", identificationLevel: 10 },
      { culture: "יהודית", identificationLevel: 9 },
      { culture: "", identificationLevel: null },
      { culture: "", identificationLevel: null },
      { culture: "", identificationLevel: null }
    ],
    yearsOfEducation: 16,
    educationLevel: "college",
    educationLevelOther: "",
    usaImmigrationDate: "",
    otherImmigrationDetails: "",
    hasVisionProblem: false,
    hasHearingImpairment: false,
    hasLanguageDisability: false,
    hasLearningDisability: false,
    disabilityExplanation: "",
    languageProfiles: [
      {
        language: "עברית",
        languageStatus: "native",
        ageBeganAcquiring: 0,
        ageBecameFluent: 3,
        ageBeganReading: 6,
        ageBecameFluentReading: 8,
        countryYears: 29,
        countryMonths: 0,
        familyYears: 29,
        familyMonths: 0,
        schoolWorkYears: 20,
        schoolWorkMonths: 0,
        speakingProficiency: 10,
        understandingSpokenLanguageProficiency: 10,
        readingProficiency: 10,
        learningByFriends: 8,
        learningByFamily: 10,
        learningByReading: 9,
        learningByLanguageTapesSelfInstruction: 2,
        learningByWatchingTv: 6,
        learningByListeningToRadio: 5,
        exposureToFriends: 8,
        exposureToFamily: 10,
        exposureToWatchingTv: 6,
        exposureToRadioMusic: 5,
        exposureToReading: 9,
        exposureToLanguageLabSelfInstruction: 1,
        foreignAccent: 0,
        nonNativeIdentificationByAccent: 0
      }
    ]
  };
}

function setIsolatedStoreDir(name: string) {
  process.env.FRANCES_STORE_DIR = path.join(os.tmpdir(), `frances-tests-${name}-${Date.now()}`);
  __resetStoreForTests();
}

function makeSession(versionId: string, versionNumber: number, index: number): ParticipantSession {
  const study = getStudyOrThrow("frances-2020");
  return {
    id: `session-${index}`,
    studySlug: "frances-2020",
    versionId,
    versionNumber,
    recallPromptOrder: study.recallPrompts.map((prompt) => prompt.promptIndex),
    matchingTrialOrder: study.matchingTrials.map((trial) => trial.trialIndex),
    status: "created",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    completionCode: `FRANCES-${index}`,
    device: sampleDevice()
  };
}

function readJpegSize(filePath: string) {
  const bytes = fs.readFileSync(filePath);
  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + length;
  }

  throw new Error(`Could not read JPEG dimensions for ${filePath}`);
}

async function run(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    log(`PASS ${name}`);
  } catch (error) {
    log(`FAIL ${name}`);
    throw error;
  }
}

async function main() {
  await run("seeded study contains four 30-trial versions", () => {
    const study = getStudyOrThrow("frances-2020");
    assert.equal(study.versions.length, 4);
    assert.equal(study.targetWords.length, 8);
    for (const version of study.versions) {
      assert.equal(version.learningTrials.length, 30);
    }
  });

  await run("seeded study contains recall, recognition, and matching materials", () => {
    const study = getStudyOrThrow("frances-2020");
    assert.equal(study.recallPrompts.length, 8);
    assert.equal(study.matchingTrials.length, 32);
    for (const prompt of study.recallPrompts) {
      assert.equal(prompt.recognitionOptions.length, 4);
      assert.equal(prompt.recognitionOptions.filter((option) => option.isCorrect).length, 1);
    }
  });

  await run("matching materials are balanced and all image files exist", () => {
    const study = getStudyOrThrow("frances-2020");
    const counts = study.matchingTrials.reduce<Record<string, number>>((accumulator, trial) => {
      accumulator[trial.condition] = (accumulator[trial.condition] ?? 0) + 1;
      assert.equal(fs.existsSync(`public${trial.imagePath}`), true);
      return accumulator;
    }, {});

    assert.deepEqual(counts, {
      match: 8,
      distractor: 8,
      category: 8,
      unrelated: 8
    });
  });

  await run("matching images are rotated upright", () => {
    const expectedSizes = [
      { fileName: "PICTURE_96.jpg", width: 521, height: 529 },
      { fileName: "PICTURE_358.jpg", width: 521, height: 518 },
      { fileName: "PICTURE_535.jpg", width: 521, height: 518 },
      { fileName: "PICTURE_552.jpg", width: 521, height: 521 }
    ];

    for (const expected of expectedSizes) {
      const actual = readJpegSize(path.resolve(process.cwd(), "public", "stimuli", "matching", expected.fileName));
      assert.deepEqual(actual, {
        width: expected.width,
        height: expected.height
      });
    }
  });

  await run("seeded study contains 8 critical and 22 filler trials per version", () => {
    const study = getStudyOrThrow("frances-2020");
    for (const version of study.versions) {
      assert.equal(version.learningTrials.filter((trial) => trial.isCritical).length, 8);
      assert.equal(version.learningTrials.filter((trial) => !trial.isCritical).length, 22);
    }
  });

  await run("seeded learning passages contain story text for every version", () => {
    const study = getStudyOrThrow("frances-2020");
    for (const version of study.versions) {
      for (const trial of version.learningTrials) {
        assert.ok(trial.passageText.length > 80);
        assert.doesNotMatch(trial.passageText, /^System\.Xml/);
        assert.doesNotMatch(trial.passageText, /^[a-z]+\d*$/);
        assert.match(trial.tokenId, /^[a-z]+\d+$/);
      }
    }
  });

  await run("NVLT seed contains all 1000-5000 levels in source order", () => {
    const levels = getAllNvltLevels();
    assert.deepEqual(
      levels.map((level) => level.id),
      ["1000", "2000", "3000", "4000", "5000"]
    );

    for (const level of levels) {
      assert.equal(level.questions.length, 10);
      for (const question of level.questions) {
        assert.equal(question.words.length, 6);
        assert.equal(question.prompts.length, 3);
      }
    }
  });

  await run("NVLT configuration defaults to 1000 and 2000 and ignores unknown levels", () => {
    assert.deepEqual(getConfiguredNvltLevelIds(undefined), ["1000", "2000"]);
    assert.deepEqual(getConfiguredNvltLevelIds("1000,2000,4000"), ["1000", "2000", "4000"]);
    assert.deepEqual(getConfiguredNvltLevelIds("9000,banana"), ["1000", "2000"]);
  });

  await run("balanced assignment prefers the least-used version", () => {
    const study = getStudyOrThrow("frances-2020");
    const version = chooseBalancedVersion(study, [
      makeSession("version-1", 1, 1),
      makeSession("version-1", 1, 2),
      makeSession("version-2", 2, 3),
      makeSession("version-3", 3, 4)
    ]);
    assert.equal(version.id, "version-4");
  });

  await run("session creation persists and rotates versions", () => {
    setIsolatedStoreDir("create-session");
    const created = Array.from({ length: 5 }, () =>
      createSession({
        studySlug: "frances-2020",
        device: sampleDevice()
      })
    );

    assert.deepEqual(
      created.map((entry) => entry.session.versionId),
      ["version-1", "version-2", "version-3", "version-4", "version-1"]
    );

    const bundle = getSessionBundle(created[0].session.id);
    assert.ok(bundle);
    assert.equal(bundle?.session.id, created[0].session.id);
  });

  await run("session creation stores stable randomized post-test orders", () => {
    setIsolatedStoreDir("randomized-orders");
    const study = getStudyOrThrow("frances-2020");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });
    const bundle = getSessionBundle(created.session.id);
    assert.ok(bundle);

    assert.deepEqual([...bundle.session.recallPromptOrder].sort((left, right) => left - right), study.recallPrompts.map((prompt) => prompt.promptIndex));
    assert.deepEqual([...bundle.session.matchingTrialOrder].sort((left, right) => left - right), study.matchingTrials.map((trial) => trial.trialIndex));
    assert.equal(bundle.session.recallPromptOrder.length, 8);
    assert.equal(bundle.session.matchingTrialOrder.length, 32);
  });

  await run("session creation stores the pre-experiment questionnaire", () => {
    setIsolatedStoreDir("questionnaire");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice(),
      questionnaire: sampleQuestionnaire()
    });
    const bundle = getSessionBundle(created.session.id);
    assert.ok(bundle?.questionnaire);
    assert.equal(bundle?.questionnaire?.age, 29);
    assert.equal(bundle?.questionnaire?.firstName, "נועה");
    assert.equal(bundle?.questionnaire?.gender, "female");
    assert.deepEqual(bundle?.questionnaire?.languagesByDominance.slice(0, 2), ["עברית", "אנגלית"]);
    assert.equal(bundle?.questionnaire?.currentExposure[0]?.percentage, "70%");
    assert.equal(bundle?.questionnaire?.languageProfiles[0]?.language, "עברית");
  });

  await run("session bundles can be listed for admin views", () => {
    setIsolatedStoreDir("admin-list");
    const first = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });
    const second = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });

    const bundles = listSessionBundles();
    assert.equal(bundles.length, 2);
    assert.deepEqual(
      bundles.map((bundle) => bundle.session.id).sort(),
      [first.session.id, second.session.id].sort()
    );
  });

  await run("comprehension responses are stored with correctness and next trial", () => {
    setIsolatedStoreDir("comprehension");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });

    const result = saveComprehensionResponse(created.session.id, {
      trialIndex: 1,
      answer: "yes",
      responseTimeMs: 750
    });

    assert.equal(result.response.correct, true);
    assert.equal(result.nextTrialIndex, 2);
    assert.equal(result.completed, false);
  });

  await run("last comprehension response advances to the distractor stage", () => {
    setIsolatedStoreDir("last-comprehension");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });

    const result = saveComprehensionResponse(created.session.id, {
      trialIndex: 30,
      answer: "yes",
      responseTimeMs: 800
    });
    const bundle = getSessionBundle(created.session.id);

    assert.equal(result.completed, true);
    assert.equal(bundle?.session.status, "distractor");
  });

  await run("distractor response stores Corsi sequence accuracy", () => {
    setIsolatedStoreDir("distractor");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });

    const result = saveDistractorResponse(created.session.id, {
      trialIndex: 1,
      direction: "forward",
      sequenceLength: 3,
      shownSequence: [0, 4, 7],
      responseSequence: [0, 4, 7],
      responseTimeMs: 1800
    });

    assert.equal(result.response.correct, true);
    assert.equal(result.response.direction, "forward");
    assert.deepEqual(result.response.shownSequence, [0, 4, 7]);
    assert.equal(getSessionBundle(created.session.id)?.session.status, "distractor");
  });

  await run("Corsi trials use a fixed span-style task list", () => {
    assert.equal(corsiTrialList.length, 20);
    assert.deepEqual(corsiTrialList.map((trial) => trial.direction), Array(20).fill("forward"));
    assert.deepEqual(corsiTrialList.map((trial) => trial.sequence.length), [
      2, 2, 2, 2,
      3, 3, 3, 3,
      4, 4, 4, 4,
      5, 5, 5, 5,
      6, 6, 6, 6
    ]);
  });

  await run("Corsi block coordinates stay within the board frame", () => {
    for (const block of corsiBlocks) {
      assert.ok(block.x >= 16 && block.x <= 82);
      assert.ok(block.y >= 12 && block.y <= 78);
    }
  });

  await run("distractor client uses an explicit start button, 500ms cues, and correctness feedback", () => {
    const distractor = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "distractor-client.tsx"), "utf8");
    assert.match(distractor, /const cueDurationMs = 500/);
    assert.match(distractor, /const cueGapMs = 0/);
    assert.match(distractor, /startSequence/);
    assert.match(distractor, /התחיל[וו] את הרצף הבא/);
    assert.match(distractor, /message: result\.correct \? "נכון" : "לא נכון"/);
  });

  await run("distractor client keeps instructions, action controls, and timer at the top", () => {
    const distractor = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "distractor-client.tsx"), "utf8");
    const instructionText = fs.readFileSync(path.resolve(process.cwd(), "src", "content", "instruction-text.ts"), "utf8");

    assert.match(distractor, /corsi-top-stack/);
    assert.match(distractor, /corsi-top-controls/);
    assert.match(distractor, /corsi-inline-instruction/);
    assert.match(distractor, /className="countdown"/);
    assert.match(
      distractor,
      /showInstructions \? "instructionText\.study\.distractor\.startSequenceButton" : "instructionText\.study\.distractor\.nextSequenceButton"/
    );
    assert.match(instructionText, /instructionsIntro:/);
    assert.match(instructionText, /startSequenceButton:/);
  });

  await run("recall response stores timing, edit, and paste metadata", () => {
    setIsolatedStoreDir("recall");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });

    const result = saveRecallResponse(created.session.id, {
      promptIndex: 1,
      text: " nilan ",
      firstKeystrokeLatencyMs: 120,
      totalResponseTimeMs: 1400,
      editCount: 5,
      pasted: true,
      pasteCount: 1
    });

    assert.equal(result.response.text, "nilan");
    assert.equal(result.response.firstKeystrokeLatencyMs, 120);
    assert.equal(result.response.editCount, 5);
    assert.equal(result.response.pasted, true);
    assert.equal(result.response.pasteCount, 1);
    assert.equal(result.response.isEmpty, false);
  });

  await run("recognition response stores correctness and advances prompts", () => {
    setIsolatedStoreDir("recognition");
    const study = getStudyOrThrow("frances-2020");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });
    const correctOption = study.recallPrompts[0].recognitionOptions.find((option) => option.isCorrect);
    assert.ok(correctOption);

    const result = saveRecognitionResponse(created.session.id, {
      promptIndex: 1,
      selectedOptionIndex: correctOption.optionIndex,
      responseTimeMs: 650
    });

    assert.equal(result.response.correct, true);
    assert.equal(result.nextPromptIndex, 2);
    assert.equal(result.completed, false);
  });

  await run("recognition completion is based on all randomized prompts, not prompt number", () => {
    setIsolatedStoreDir("recognition-random-completion");
    const study = getStudyOrThrow("frances-2020");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });
    const prompt = study.recallPrompts[7];
    const correctOption = prompt.recognitionOptions.find((option) => option.isCorrect);
    assert.ok(correctOption);

    const result = saveRecognitionResponse(created.session.id, {
      promptIndex: 8,
      selectedOptionIndex: correctOption.optionIndex,
      responseTimeMs: 650
    });

    assert.equal(result.completed, false);
    assert.equal(getSessionBundle(created.session.id)?.session.status, "recall");
  });

  await run("matching response stores correctness, condition, and completion", () => {
    setIsolatedStoreDir("matching");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });

    const first = saveMatchingResponse(created.session.id, {
      trialIndex: 1,
      answer: "yes",
      responseTimeMs: 430
    });
    assert.equal(first.response.correct, true);
    assert.equal(first.response.pictureId, "PICTURE_229");
    assert.equal(first.response.condition, "match");
    assert.equal(first.completed, false);

    for (let trialIndex = 2; trialIndex <= 31; trialIndex += 1) {
      saveMatchingResponse(created.session.id, {
        trialIndex,
        answer: "no",
        responseTimeMs: 530
      });
    }

    const last = saveMatchingResponse(created.session.id, {
      trialIndex: 32,
      answer: "no",
      responseTimeMs: 530
    });
    const bundle = getSessionBundle(created.session.id);
    assert.equal(last.completed, true);
    assert.equal(bundle?.session.status, "complete");
    assert.ok(bundle?.session.completedAt);
  });

  await run("matching completion is based on all randomized trials and supports timeout responses", () => {
    setIsolatedStoreDir("matching-random-completion");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });

    const earlyTrial32 = saveMatchingResponse(created.session.id, {
      trialIndex: 32,
      answer: "timeout",
      responseTimeMs: 2500
    });
    const bundle = getSessionBundle(created.session.id);

    assert.equal(earlyTrial32.completed, false);
    assert.equal(earlyTrial32.response.answer, "timeout");
    assert.equal(earlyTrial32.response.correct, false);
    assert.equal(bundle?.session.status, "matching");
  });

  await run("response CSV includes all implemented response phases", () => {
    setIsolatedStoreDir("response-csv");
    const study = getStudyOrThrow("frances-2020");
    const created = createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });
    const correctOption = study.recallPrompts[0].recognitionOptions.find((option) => option.isCorrect);
    assert.ok(correctOption);

    saveComprehensionResponse(created.session.id, {
      trialIndex: 1,
      answer: "yes",
      responseTimeMs: 750
    });
    saveDistractorResponse(created.session.id, {
      trialIndex: 1,
      direction: "forward",
      sequenceLength: 3,
      shownSequence: [0, 4, 7],
      responseSequence: [0, 4, 7],
      responseTimeMs: 1800
    });
    saveRecallResponse(created.session.id, {
      promptIndex: 1,
      text: "nilan",
      firstKeystrokeLatencyMs: 100,
      totalResponseTimeMs: 1200,
      editCount: 3,
      pasted: false,
      pasteCount: 0
    });
    saveRecognitionResponse(created.session.id, {
      promptIndex: 1,
      selectedOptionIndex: correctOption.optionIndex,
      responseTimeMs: 500
    });
    saveMatchingResponse(created.session.id, {
      trialIndex: 1,
      answer: "yes",
      responseTimeMs: 430
    });

    const csv = bundlesToResponsesCsv(listSessionBundles());
    assert.match(csv, /comprehension/);
    assert.match(csv, /distractor/);
    assert.match(csv, /recall/);
    assert.match(csv, /recognition/);
    assert.match(csv, /matching/);
    assert.match(csv, /PICTURE_229/);
  });

  await run("dev toolbar is styled as a left-side navigation rail", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "globals.css"), "utf8");
    const toolbarRule = /\.dev-toolbar\s*\{(?<body>[^}]+)\}/.exec(css);
    assert.ok(toolbarRule?.groups?.body);
    assert.match(toolbarRule.groups.body, /position:\s*fixed/);
    assert.match(toolbarRule.groups.body, /left:\s*\d+px/);
    assert.match(toolbarRule.groups.body, /top:\s*50%/);
    assert.match(toolbarRule.groups.body, /transform:\s*translateY\(-50%\)/);
    assert.match(toolbarRule.groups.body, /flex-direction:\s*column/);
  });

  await run("dev toolbar is collapsible behind a hamburger button", () => {
    const component = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "dev-toolbar.tsx"), "utf8");
    const css = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "globals.css"), "utf8");
    assert.match(component, /aria-label="Toggle development navigation"/);
    assert.match(component, /aria-expanded=\{isOpen\}/);
    assert.match(css, /\.dev-toolbar-toggle\s*\{/);
    assert.match(css, /\.dev-toolbar:not\(\.is-open\)/);
  });

  await run("dev toolbar jumps open the beginning of each phase without auto-skipping completed trials", () => {
    const toolbar = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "dev-toolbar.tsx"), "utf8");
    const learning = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "learning-trial-client.tsx"), "utf8");
    const recall = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "recall-recognition-client.tsx"), "utf8");
    const matching = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "matching-task-client.tsx"), "utf8");

    assert.match(toolbar, /devJump=1/);
    assert.match(toolbar, /NVLT/);
    assert.doesNotMatch(toolbar, /Home/);
    assert.doesNotMatch(toolbar, /Complete/);
    assert.match(learning, /isDevJump/);
    assert.match(learning, /alreadyAnswered && !isDevJump/);
    assert.match(recall, /isDevJump/);
    assert.match(recall, /recallDone && recognitionDone && !isDevJump/);
    assert.match(matching, /isDevJump/);
    assert.match(matching, /trialByIndex\(order\[0\]\)/);
  });

  await run("post-test clients use stored random order without client-side matching timeout", () => {
    const recall = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "recall-recognition-client.tsx"), "utf8");
    const matching = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "matching-task-client.tsx"), "utf8");

    assert.match(recall, /recallPromptOrder/);
    assert.match(recall, /orderedPromptIndex/);
    assert.match(matching, /matchingTrialOrder/);
    assert.doesNotMatch(matching, /matchingResponseWindowMs = 2500/);
    assert.doesNotMatch(matching, /submitAnswer\("timeout"\)/);
  });

  await run("session creation API returns a valid response", async () => {
    setIsolatedStoreDir("api-session");

    const response = await createSessionPost(
      new Request("http://localhost:3000/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studySlug: "frances-2020",
          device: sampleDevice(),
          questionnaire: sampleQuestionnaire()
        })
      })
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.session.studySlug, "frances-2020");
    assert.match(payload.nextPath, /instructions\?session=/);
    assert.equal(getSessionBundle(payload.session.id)?.questionnaire?.gender, "female");
  });

  await run("comprehension API advances the flow to the next trial", async () => {
    setIsolatedStoreDir("api-comprehension");

    const createResponse = await createSessionPost(
      new Request("http://localhost:3000/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studySlug: "frances-2020",
          device: sampleDevice()
        })
      })
    );
    const created = await createResponse.json();

    const response = await submitComprehensionPost(
      new Request(`http://localhost:3000/api/session/${created.session.id}/comprehension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          trialIndex: 1,
          answer: "yes",
          responseTimeMs: 900
        })
      }),
      {
        params: Promise.resolve({
          id: created.session.id
        })
      }
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.nextTrialIndex, 2);
    assert.equal(payload.completed, false);
  });

  await run("recall and recognition APIs store post-test responses", async () => {
    setIsolatedStoreDir("api-post-tests");
    const study = getStudyOrThrow("frances-2020");
    const createResponse = await createSessionPost(
      new Request("http://localhost:3000/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studySlug: "frances-2020",
          device: sampleDevice()
        })
      })
    );
    const created = await createResponse.json();

    const recallResponse = await submitRecallPost(
      new Request(`http://localhost:3000/api/session/${created.session.id}/recall`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          promptIndex: 1,
          text: "nilan",
          firstKeystrokeLatencyMs: 100,
          totalResponseTimeMs: 1200,
          editCount: 3,
          pasted: false,
          pasteCount: 0
        })
      }),
      {
        params: Promise.resolve({
          id: created.session.id
        })
      }
    );
    assert.equal(recallResponse.status, 200);

    const correctOption = study.recallPrompts[0].recognitionOptions.find((option) => option.isCorrect);
    assert.ok(correctOption);
    const recognitionResponse = await submitRecognitionPost(
      new Request(`http://localhost:3000/api/session/${created.session.id}/recognition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          promptIndex: 1,
          selectedOptionIndex: correctOption.optionIndex,
          responseTimeMs: 500
        })
      }),
      {
        params: Promise.resolve({
          id: created.session.id
        })
      }
    );

    assert.equal(recognitionResponse.status, 200);
    const payload = await recognitionResponse.json();
    assert.equal(payload.nextPromptIndex, 2);
    assert.equal(payload.completed, false);
  });

  await run("distractor API stores Corsi responses", async () => {
    setIsolatedStoreDir("api-distractor");
    const createResponse = await createSessionPost(
      new Request("http://localhost:3000/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studySlug: "frances-2020",
          device: sampleDevice()
        })
      })
    );
    const created = await createResponse.json();

    const response = await submitDistractorPost(
      new Request(`http://localhost:3000/api/session/${created.session.id}/distractor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          trialIndex: 1,
          direction: "backward",
          sequenceLength: 3,
          shownSequence: [7, 4, 0],
          responseSequence: [7, 4, 0],
          responseTimeMs: 1500
        })
      }),
      {
        params: Promise.resolve({
          id: created.session.id
        })
      }
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.correct, true);
  });

  await run("matching API stores responses and advances matching trials", async () => {
    setIsolatedStoreDir("api-matching");
    const createResponse = await createSessionPost(
      new Request("http://localhost:3000/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studySlug: "frances-2020",
          device: sampleDevice()
        })
      })
    );
    const created = await createResponse.json();

    const response = await submitMatchingPost(
      new Request(`http://localhost:3000/api/session/${created.session.id}/matching`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          trialIndex: 1,
          answer: "yes",
          responseTimeMs: 700
        })
      }),
      {
        params: Promise.resolve({
          id: created.session.id
        })
      }
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    const bundle = getSessionBundle(created.session.id);
    const expectedNextTrialIndex = bundle?.session.matchingTrialOrder.find((trialIndex) => trialIndex !== 1);
    assert.equal(payload.nextTrialIndex, expectedNextTrialIndex);
    assert.equal(payload.completed, false);
  });

  await run("admin export API returns JSON and CSV datasets", async () => {
    setIsolatedStoreDir("api-admin-export");
    createSession({
      studySlug: "frances-2020",
      device: sampleDevice()
    });

    const jsonResponse = await adminExportGet(new Request("http://localhost:3000/admin/export?format=json"));
    assert.equal(jsonResponse.status, 200);
    const jsonPayload = await jsonResponse.json();
    assert.equal(jsonPayload.sessions.length, 1);

    const csvResponse = await adminExportGet(new Request("http://localhost:3000/admin/export?format=csv&type=responses"));
    assert.equal(csvResponse.status, 200);
    assert.match(csvResponse.headers.get("Content-Type") ?? "", /text\/csv/);
    assert.match(await csvResponse.text(), /session_id,version_id,phase/);
  });

  await run("admin list pages are dynamic so session counts stay fresh", () => {
    const studiesPage = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "admin", "studies", "page.tsx"), "utf8");
    const sessionsPage = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "admin", "sessions", "page.tsx"), "utf8");

    assert.match(studiesPage, /export const dynamic = "force-dynamic"/);
    assert.match(sessionsPage, /export const dynamic = "force-dynamic"/);
  });

  await run("home page redirects straight into the full participant flow", () => {
    const homePage = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "page.tsx"), "utf8");
    assert.match(homePage, /import \{ redirect \} from "next\/navigation"/);
    assert.match(homePage, /redirect\(fullFlowPath\)/);
    assert.match(homePage, /\/study\/\$\{studySlug\}\/start\?next=/);
    assert.match(homePage, /\/nvlt\?next=/);
  });

  await run("NVLT page includes the shared navigation toolbar", () => {
    const nvltPage = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "nvlt", "page.tsx"), "utf8");
    assert.match(nvltPage, /studySlug=\{getDefaultStudySlug\(\)\}/);
    assert.doesNotMatch(nvltPage, /title=/);
  });

  await run("recall and matching pages omit the phase title", () => {
    const recallPage = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "study", "[slug]", "recall", "[prompt]", "page.tsx"), "utf8");
    const matchingPage = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "study", "[slug]", "matching", "page.tsx"), "utf8");

    assert.doesNotMatch(recallPage, /title=/);
    assert.doesNotMatch(matchingPage, /title=/);
  });

  await run("NVLT client shows a solved example before the first 1000-word section", () => {
    const nvltClient = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "nvlt-test-client.tsx"), "utf8");
    const instructionContent = fs.readFileSync(path.resolve(process.cwd(), "src", "content", "instruction-text.ts"), "utf8");

    assert.match(nvltClient, /"game", "island", "mouth", "movie", "song", "yard"/);
    assert.match(nvltClient, /useState\(-1\)/);
    assert.match(nvltClient, /setQuestionIndex\(0\)/);
    assert.match(nvltClient, /exampleAnswers = \[2, 3, 5\]/);
    assert.match(nvltClient, /<div className="nvlt-sheet nvlt-drag-sheet" dir="ltr">/);
    assert.match(nvltClient, /nvlt-example-instructions/);
    assert.match(instructionContent, /exampleTitle/);
  });

  await run("resolved content defaults to the bundled wording without overrides", () => {
    setIsolatedStoreDir("content-defaults");
    const snapshot = getResolvedContentSnapshot();
    assert.deepEqual(snapshot, defaultContentSnapshot);
  });

  await run("content override validation rejects missing template placeholders", () => {
    const validationMessage = validateContentOverrides({
      "appText.nvlt.progressTitle": "שאלה בלבד"
    });

    assert.equal(validationMessage, "Missing placeholder {current} in appText.nvlt.progressTitle.");
  });

  await run("content style override validation accepts formatting values", () => {
    const validationMessage = validateContentStyleOverrides({
      "appText.nvlt.progressTitle": {
        fontSize: "1.5rem",
        fontWeight: "bold",
        fontStyle: "italic"
      }
    });

    assert.equal(validationMessage, null);
    assert.deepEqual(getDefaultEditableContentStyleValue(), {});
  });

  await run("content API saves overrides and updates the resolved snapshot", async () => {
    setIsolatedStoreDir("content-api-save");
    const response = await adminContentPost(
      new Request("http://localhost:3000/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          overrides: {
            "appText.nvlt.progressTitle": "שאלה {current} מתוך {total} - בדיקה"
          },
          styleOverrides: {
            "appText.nvlt.progressTitle": {
              fontSize: "1.5rem",
              fontWeight: "bold",
              fontStyle: "italic"
            }
          }
        })
      })
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.overrides["appText.nvlt.progressTitle"], "שאלה {current} מתוך {total} - בדיקה");
    assert.equal(
      getEditableContentValue(payload.snapshot, "appText.nvlt.progressTitle"),
      "שאלה {current} מתוך {total} - בדיקה"
    );
    assert.equal(
      getEditableContentValue(getResolvedContentSnapshot(), "appText.nvlt.progressTitle"),
      "שאלה {current} מתוך {total} - בדיקה"
    );
    assert.equal(payload.styleOverrides["appText.nvlt.progressTitle"].fontSize, "1.5rem");
    assert.equal(payload.styleOverrides["appText.nvlt.progressTitle"].fontWeight, "bold");
    assert.equal(payload.styleOverrides["appText.nvlt.progressTitle"].fontStyle, "italic");
    assert.equal(getEditableContentStyleValue(payload.styleOverrides, "appText.nvlt.progressTitle").fontSize, "1.5rem");
    assert.equal(readContentStyleOverrides()["appText.nvlt.progressTitle"].fontWeight, "bold");
  });

  await run("content API rejects invalid template overrides", async () => {
    setIsolatedStoreDir("content-api-invalid");
    const response = await adminContentPost(
      new Request("http://localhost:3000/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          overrides: {
            "instructionText.nvlt.inputAriaLabel": "טקסט בלי placeholder"
          }
        })
      })
    );

    assert.equal(response.status, 400);
    const message = await response.text();
    assert.match(message, /Missing placeholder \{prompt\}/);
  });

  await run("content API can fetch fields and reset individual or all overrides", async () => {
    setIsolatedStoreDir("content-api-reset");

    const saveResponse = await adminContentPost(
      new Request("http://localhost:3000/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          overrides: {
            "appText.nvlt.progressTitle": "שאלה {current} מתוך {total} - א",
            "instructionText.nvlt.inputAriaLabel": "הקלידו עבור {prompt} - א"
          },
          styleOverrides: {
            "appText.nvlt.progressTitle": {
              fontSize: "1.4rem",
              fontWeight: "bold",
              fontStyle: "italic"
            }
          }
        })
      })
    );
    assert.equal(saveResponse.status, 200);

    const getResponse = await adminContentGet();
    assert.equal(getResponse.status, 200);
    const getPayload = await getResponse.json();
    assert.ok(Array.isArray(getPayload.fields));
    assert.ok(getPayload.fields.some((field: { key: string }) => field.key === "appText.nvlt.progressTitle"));
    assert.equal(getPayload.styleOverrides["appText.nvlt.progressTitle"].fontSize, "1.4rem");
    assert.equal(getPayload.styleOverrides["appText.nvlt.progressTitle"].fontWeight, "bold");
    assert.equal(readContentStyleOverrides()["appText.nvlt.progressTitle"].fontStyle, "italic");

    const deleteOneResponse = await adminContentDelete(
      new Request("http://localhost:3000/api/admin/content", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          keys: ["appText.nvlt.progressTitle"]
        })
      })
    );
    assert.equal(deleteOneResponse.status, 200);
    assert.equal(readContentOverrides()["appText.nvlt.progressTitle"], undefined);
    assert.equal(readContentOverrides()["instructionText.nvlt.inputAriaLabel"], "הקלידו עבור {prompt} - א");

    const deleteAllResponse = await adminContentDelete(
      new Request("http://localhost:3000/api/admin/content", {
        method: "DELETE"
      })
    );
    assert.equal(deleteAllResponse.status, 200);
    assert.deepEqual(readContentOverrides(), {});
    assert.deepEqual(readContentStyleOverrides(), {});
    assert.deepEqual(readUiOverrides(), {});
  });

  await run("UI override validation rejects empty values and resolves defaults", () => {
    const validationMessage = validateUiOverrides({
      "fontSizes.nvltPromptText": ""
    });

    assert.equal(validationMessage, "UI value cannot be empty for fontSizes.nvltPromptText.");
    assert.equal(getDefaultEditableUiValue("fontSizes.nvltPromptText"), "clamp(1.45rem, 2vw, 2.1rem)");
  });

  await run("UI overrides update NVLT font sizes from one place", async () => {
    setIsolatedStoreDir("ui-overrides");
    const response = await adminContentPost(
      new Request("http://localhost:3000/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uiOverrides: {
            "fontSizes.nvltPromptText": "2rem",
            "fontSizes.nvltWordChip": "1.9rem"
          }
        })
      })
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.uiOverrides["fontSizes.nvltPromptText"], "2rem");
    assert.equal(getResolvedUiSnapshot().fontSizes.nvltPromptText, "2rem");
    const uiCssVariables = getUiCssVariables(payload.uiSnapshot) as Record<string, string>;
    assert.equal(uiCssVariables["--font-size-nvlt-prompt-text"], "2rem");
  });

  await run("matching typography defaults are compact", () => {
    assert.equal(getDefaultEditableUiValue("fontSizes.matchingWord"), "clamp(1.6rem, 6vw, 2.9rem)");
    assert.equal(getDefaultEditableUiValue("fontSizes.questionLabel"), "0.76rem");
    assert.equal(getDefaultEditableUiValue("fontSizes.questionText"), "0.98rem");
    assert.equal(getDefaultEditableUiValue("fontSizes.answerTitle"), "0.92rem");
    assert.equal(getDefaultEditableUiValue("fontSizes.answerHint"), "0.84rem");
  });

  await run("inline editing stays hidden until operator mode is enabled", () => {
    const editorComponent = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "inline-content-editor.tsx"), "utf8");
    const editModeHelpers = fs.readFileSync(path.resolve(process.cwd(), "src", "lib", "content-edit-mode.ts"), "utf8");
    assert.match(editModeHelpers, /NEXT_PUBLIC_CONTENT_EDITOR_ENABLED/);
    assert.doesNotMatch(editModeHelpers, /storedValue === "0"/);
    assert.match(editModeHelpers, /removeItem\(contentEditModeKey\)/);
    assert.match(editorComponent, /if \(!isEnabled \|\| \(screenFields\.length === 0 && screenUiFields\.length === 0\)\) \{/);
    assert.match(editorComponent, /return null;/);
  });

  await run("admin pages expose the content editor entrypoint", () => {
    const studiesPage = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "admin", "studies", "page.tsx"), "utf8");
    const contentPage = fs.readFileSync(path.resolve(process.cwd(), "src", "app", "admin", "content", "page.tsx"), "utf8");
    const launcher = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "admin-content-launcher.tsx"), "utf8");
    const editorComponent = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "inline-content-editor.tsx"), "utf8");
    const uiConfig = fs.readFileSync(path.resolve(process.cwd(), "src", "content", "ui-config.ts"), "utf8");

    assert.match(studiesPage, /href="\/admin\/content"/);
    assert.match(contentPage, /AdminContentLauncher/);
    assert.match(launcher, /enableContentEditMode/);
    assert.match(launcher, /\/api\/admin\/content/);
    assert.match(editorComponent, /addEventListener\("dblclick"/);
    assert.match(editorComponent, /onBlur=\{\(event\) => \{/);
    assert.match(editorComponent, /event\.relatedTarget/);
    assert.match(uiConfig, /NVLT Typography/);
  });

  await run("questionnaire language fields support type-ahead suggestions", () => {
    const startClient = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "start-phase-client.tsx"), "utf8");
    assert.match(startClient, /datalist id=\{languageOptionsListId\}/);
    assert.match(startClient, /list=\{languageOptionsListId\}/);
  });

  await run("questionnaire education options keep the original logical order", () => {
    const questionnaireText = fs.readFileSync(path.resolve(process.cwd(), "src", "content", "questionnaire-text.ts"), "utf8");
    const expectedOrder = [
      "less_than_high_school",
      "high_school",
      "professional_training",
      "some_college",
      "college",
      "some_graduate_school",
      "masters",
      "phd_md_jd",
      "other"
    ];
    const positions = expectedOrder.map((value) => questionnaireText.indexOf(`{ value: "${value}"`));
    assert.ok(positions.every((position) => position >= 0));
    assert.deepEqual([...positions].sort((left, right) => left - right), positions);
  });

  await run("questionnaire headings can opt into direct inline editing by content key", () => {
    const startClient = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "start-phase-client.tsx"), "utf8");
    const editorComponent = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "inline-content-editor.tsx"), "utf8");
    assert.match(startClient, /contentKey="questionnaireText\.prompts\.usaImmigrationDate"/);
    assert.match(startClient, /contentKey="questionnaireText\.prompts\.otherEducationSpecify"/);
    assert.match(startClient, /contentKey="questionnaireText\.prompts\.disabilityExplanationLabel"/);
    assert.match(startClient, /contentKey="questionnaireText\.languageSection\.profileHeading"/);
    assert.match(startClient, /contentKey="questionnaireText\.languageSection\.profileIntro"/);
    assert.match(startClient, /contentKey="questionnaireText\.languageSection\.knowledgePrefix"/);
    assert.match(startClient, /contentKey="questionnaireText\.languageSection\.statusLabel"/);
    assert.match(startClient, /contentKey="questionnaireText\.languageSection\.ageWhenYou"/);
    assert.match(startClient, /contentKey="questionnaireText\.languageSection\.environmentPrompt"/);
    assert.match(startClient, /contentKey="questionnaireText\.languageSection\.proficiencyPrompt"/);
    assert.match(startClient, /contentKey="questionnaireText\.languageSection\.learningPrompt"/);
    assert.match(startClient, /contentKey="questionnaireText\.languageSection\.exposurePrompt"/);
    assert.match(startClient, /EditableContentText/);
    assert.match(editorComponent, /querySelectorAll\?\.\("\[data-content-key\]"\)/);
    assert.match(editorComponent, /inlineTarget\.field\.kind === "textarea" \|\| inlineTarget\.field\.kind === "template"/);
  });

  log("All smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
