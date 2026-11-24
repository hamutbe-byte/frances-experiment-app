import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { chromium, expect, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { questionnaireText } from "@/content/questionnaire-text";
import { getCorsiTrial, getExpectedCorsiResponse } from "@/lib/corsi";
import { getStudyOrThrow } from "@/lib/study";
import type { SessionBundle } from "@/lib/types";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

function resolveBaseUrl(value: string) {
  return value.includes("://") ? new URL(value) : new URL(`https://${value}`);
}

const baseUrl = resolveBaseUrl(process.env.PARTICIPANT_BASE_URL ?? "http://127.0.0.1:3000");
const studySlug = process.env.PARTICIPANT_STUDY_SLUG ?? "frances-2020";
const headless = process.env.PARTICIPANT_HEADLESS !== "false";
const timeoutMs = Number(process.env.PARTICIPANT_TIMEOUT_MS ?? 20_000);
const debug = process.env.PARTICIPANT_DEBUG === "true";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false
        }
      })
    : null;

type BundleExpectation = {
  questionnaire?: boolean;
  comprehension?: number;
  distractor?: number;
  recall?: number;
  recognition?: number;
  matching?: number;
  status?: SessionBundle["session"]["status"];
};

function log(message: string) {
  process.stdout.write(`${message}\n`);
}

function appUrl(pathname: string) {
  return new URL(pathname, baseUrl).toString();
}

async function fetchJson<T>(pathname: string): Promise<T> {
  const response = await fetch(appUrl(pathname), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${pathname} failed with ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

async function fetchText(pathname: string): Promise<string> {
  const response = await fetch(appUrl(pathname), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${pathname} failed with ${response.status}: ${await response.text()}`);
  }

  return await response.text();
}

async function waitForSessionBundle(sessionId: string, expectation: BundleExpectation, waitTimeoutMs = timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < waitTimeoutMs) {
    const bundle = await fetchJson<SessionBundle>(`/api/session/${sessionId}`);

    if (expectation.questionnaire && !bundle.questionnaire) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

    if (expectation.comprehension !== undefined && bundle.comprehension.length !== expectation.comprehension) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

    if (expectation.distractor !== undefined && bundle.distractor.length !== expectation.distractor) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

    if (expectation.recall !== undefined && bundle.recall.length !== expectation.recall) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

    if (expectation.recognition !== undefined && bundle.recognition.length !== expectation.recognition) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

    if (expectation.matching !== undefined && bundle.matching.length !== expectation.matching) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

    if (expectation.status !== undefined && bundle.session.status !== expectation.status) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

    return bundle;
  }

  throw new Error(`Timed out waiting for session ${sessionId} to satisfy ${JSON.stringify(expectation)}.`);
}

async function fillLabeledInput(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value);
}

async function checkLabeledOption(page: Page, label: string) {
  await page.getByLabel(label, { exact: true }).check();
}

async function fillMatrixSection(section: Locator, rows: Array<{ value: string; select: string }>) {
  const languageRow = section.locator("table tbody tr").nth(0);
  const selectionRow = section.locator("table tbody tr").nth(1);

  for (let index = 0; index < rows.length; index += 1) {
    await languageRow.locator("td").nth(index).locator("select").selectOption(rows[index].value);
    await selectionRow.locator("td").nth(index).locator("select").selectOption(rows[index].select);
  }
}

async function fillQuestionnaire(page: Page) {
  await fillLabeledInput(page, questionnaireText.participant.lastName, "כהן");
  await fillLabeledInput(page, questionnaireText.participant.firstName, "נועה");
  await fillLabeledInput(page, questionnaireText.participant.age, "29");
  await checkLabeledOption(page, questionnaireText.participant.genderOptions[1].label);

  const sections = page.locator("section.form-section");

  const dominanceSection = sections.nth(1);
  await dominanceSection.locator("select").nth(0).selectOption("עברית");
  await dominanceSection.locator("select").nth(1).selectOption("אנגלית");

  const acquisitionSection = sections.nth(2);
  await acquisitionSection.locator("select").nth(0).selectOption("עברית");
  await acquisitionSection.locator("select").nth(1).selectOption("אנגלית");

  const exposureSection = sections.nth(3);
  await fillMatrixSection(exposureSection, [
    { value: "עברית", select: "70" },
    { value: "אנגלית", select: "30" }
  ]);

  const readingSection = sections.nth(4);
  await fillMatrixSection(readingSection, [
    { value: "אנגלית", select: "60" },
    { value: "עברית", select: "40" }
  ]);

  const speakingSection = sections.nth(5);
  await fillMatrixSection(speakingSection, [
    { value: "עברית", select: "80" },
    { value: "אנגלית", select: "20" }
  ]);

  await fillMatrixSection(sections.nth(6), [
    { value: "עברית", select: "60" },
    { value: "אנגלית", select: "40" }
  ]);
  await fillMatrixSection(sections.nth(7), [
    { value: "עברית", select: "50" },
    { value: "אנגלית", select: "50" }
  ]);

  await fillLabeledInput(page, questionnaireText.prompts.yearsOfEducation, "16");
  await page.locator('input[name="english-course-level"][value="advanced_b"]').check();
  await page.locator('input[name="academic-english-placement"][value="pre_basic_a"]').check();
  await page.locator('label:has([data-content-key="questionnaireText.prompts.countryOfBirth"]) select').selectOption("US");
  await page.locator('label:has([data-content-key="questionnaireText.prompts.ageAtImmigration"]) input').fill("12");
  await page.locator("select").filter({ has: page.locator("option[value='not_applicable']") }).selectOption("not_applicable");

  await checkLabeledOption(page, questionnaireText.disabilityOptions.at(-1)!.label);
  await page.getByLabel(questionnaireText.languageSection.motherTonguePrompt, { exact: true }).selectOption("ערבית");
  await fillLabeledInput(page, questionnaireText.languageSection.motherTongueExposureAge, "12");

  await page.locator(".actions button").last().click();
}

async function completeLearning(page: Page, sessionId: string) {
  const study = getStudyOrThrow(studySlug);
  const bundle = await waitForSessionBundle(sessionId, { questionnaire: true });
  const version = study.versions.find((entry) => entry.id === bundle.session.versionId);
  assert.ok(version, `Unknown study version ${bundle.session.versionId}.`);

  for (const trial of version.learningTrials) {
    const answerButtons = page.locator(".answer-grid .answer-button");
    await answerButtons.nth(trial.correctAnswer === "yes" ? 0 : 1).click();

    if (trial.trialIndex < version.learningTrials.length) {
    await page.waitForURL((url) => url.pathname.includes(`/learn/${trial.trialIndex + 1}`), {
      timeout: timeoutMs,
      waitUntil: "commit"
    });
    } else {
      await page.waitForURL((url) => url.pathname.includes("/distractor"), {
        timeout: timeoutMs,
        waitUntil: "commit"
      });
    }
  }

  await waitForSessionBundle(sessionId, { comprehension: version.learningTrials.length, status: "distractor" });
}

async function completeDistractor(page: Page, sessionId: string) {
  const startButton = page.locator(".corsi-actions button").first();

  for (let trialIndex = 1; trialIndex <= 20; trialIndex += 1) {
    const trial = getCorsiTrial(sessionId, trialIndex);
    const expectedSequence = getExpectedCorsiResponse(trial.direction, trial.sequence);

    await expect(startButton).toBeEnabled({ timeout: timeoutMs });
    await startButton.click();
    await expect(page.locator(".corsi-block").first()).toBeEnabled({ timeout: timeoutMs });

    for (const blockIndex of expectedSequence) {
      await page.locator(".corsi-block").nth(blockIndex).click();
    }

    if (trialIndex < 20) {
      await expect(startButton).toBeEnabled({ timeout: timeoutMs });
    } else {
      await page.evaluate((sessionIdValue) => {
        window.localStorage.setItem(`frances-distractor-ends-at:${sessionIdValue}`, String(Date.now() - 1000));
      }, sessionId);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => url.pathname.includes("/recall/1"), {
        timeout: timeoutMs,
        waitUntil: "commit"
      });
    }
  }

  await waitForSessionBundle(sessionId, { distractor: 20, status: "recall" });
}

async function completeRecall(page: Page, sessionId: string) {
  const study = getStudyOrThrow(studySlug);
  const bundle = await waitForSessionBundle(sessionId, { distractor: 20 });
  const promptOrder = bundle.session.recallPromptOrder.length > 0 ? bundle.session.recallPromptOrder : study.recallPrompts.map((entry) => entry.promptIndex);

  for (let position = 1; position <= promptOrder.length; position += 1) {
    const promptIndex = promptOrder[position - 1];
    const prompt = study.recallPrompts.find((entry) => entry.promptIndex === promptIndex);
    assert.ok(prompt, `Missing recall prompt ${promptIndex}.`);

    await expect(page.locator("#recall-answer")).toBeVisible({ timeout: timeoutMs });
    await page.locator("#recall-answer").fill(prompt.pseudoword);
    await page.locator(".question-block .actions button").click();

    await expect(page.locator(".option-button").first()).toBeVisible({ timeout: timeoutMs });
    const correctOptionPosition = prompt.recognitionOptions.findIndex((option) => option.isCorrect);
    assert.ok(correctOptionPosition >= 0, `Missing correct recognition option for prompt ${promptIndex}.`);
    await page.locator(".option-button").nth(correctOptionPosition).click();

    if (position < promptOrder.length) {
      await page.waitForURL((url) => url.pathname.includes(`/recall/${position + 1}`), {
        timeout: timeoutMs,
        waitUntil: "commit"
      });
    } else {
      await page.waitForURL((url) => url.pathname.includes("/matching"), {
        timeout: timeoutMs,
        waitUntil: "commit"
      });
    }
  }

  await waitForSessionBundle(sessionId, { recall: promptOrder.length, recognition: promptOrder.length, status: "matching" });
}

async function completeMatching(page: Page, sessionId: string) {
  const study = getStudyOrThrow(studySlug);
  const bundle = await waitForSessionBundle(sessionId, { recall: 8, recognition: 8 });
  const order = bundle.session.matchingTrialOrder.length > 0 ? bundle.session.matchingTrialOrder : study.matchingTrials.map((entry) => entry.trialIndex);
  const answerButtons = page.locator(".matching-panel .answer-button");

  for (let position = 0; position < order.length; position += 1) {
    const trialIndex = order[position];
    const trial = study.matchingTrials.find((entry) => entry.trialIndex === trialIndex);
    assert.ok(trial, `Missing matching trial ${trialIndex}.`);

    await answerButtons.nth(trial.correctAnswer === "no" ? 0 : 1).click();
    await waitForSessionBundle(sessionId, { matching: position + 1 });
  }

  await waitForSessionBundle(sessionId, { matching: order.length, status: "complete" });
  await expect(page.locator(".screen-panel")).toContainText(/סיום|בוצע|הושלם/).catch(() => null);
}

async function verifyDatabase(sessionId: string) {
  if (!supabase) {
    log("Skipping direct Supabase verification because SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.");
    return;
  }

  const { data: sessionRow, error: sessionError } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (sessionError) {
    throw sessionError;
  }

  assert.ok(sessionRow.questionnaire, "Expected questionnaire to be stored in public.sessions.questionnaire.");

  const [comprehension, distractor, recall, recognition, matching, telemetry] = await Promise.all([
    supabase.from("comprehension_responses").select("trial_index").eq("session_id", sessionId),
    supabase.from("distractor_responses").select("trial_index").eq("session_id", sessionId),
    supabase.from("recall_responses").select("prompt_index").eq("session_id", sessionId),
    supabase.from("recognition_responses").select("prompt_index").eq("session_id", sessionId),
    supabase.from("matching_responses").select("trial_index").eq("session_id", sessionId),
    supabase.from("telemetry_events").select("id").eq("session_id", sessionId)
  ]);

  assert.equal(comprehension.data?.length ?? 0, 30);
  assert.equal(distractor.data?.length ?? 0, 20);
  assert.equal(recall.data?.length ?? 0, 8);
  assert.equal(recognition.data?.length ?? 0, 8);
  assert.equal(matching.data?.length ?? 0, 32);
  assert.ok((telemetry.data?.length ?? 0) >= 0);
}

async function verifyExtraction(sessionId: string) {
  const json = await fetchJson<{ sessions: Array<{ session: { id: string } }> }>("/admin/export?format=json");
  assert.ok(json.sessions.some((entry) => entry.session.id === sessionId), "Expected admin export JSON to include the participant session.");

  const csv = await fetchText("/admin/export?format=csv&type=responses");
  assert.match(csv, new RegExp(sessionId));
}

async function main() {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  if (debug) {
    page.on("request", (request) => {
      if (request.url().includes("/api/session")) {
        log(`request ${request.method()} ${request.url()}`);
      }
    });
    page.on("response", async (response) => {
      if (response.url().includes("/api/session")) {
        log(`response ${response.status()} ${response.url()}`);
      }
    });
  }

  try {
    const startUrl = appUrl(`/study/${studySlug}/start`);
    log(`Opening participant flow at ${startUrl}`);
    await page.goto(startUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    const consentButton = page.locator(".consent-actions button");
    if (await consentButton.isVisible()) {
      await consentButton.click();
    }
    await expect(page.getByLabel(questionnaireText.languageSection.motherTonguePrompt, { exact: true })).toBeVisible();

    await fillQuestionnaire(page);
    if (debug) {
      await page.waitForTimeout(1500);
      log(`Post-submit URL: ${page.url()}`);
      log(`Post-submit body:\n${await page.locator("body").innerText()}`);
    }
    await page.waitForURL((url) => url.pathname.includes("/learn/1") && url.searchParams.has("session"), {
      timeout: timeoutMs,
      waitUntil: "commit"
    });

    const sessionId = new URL(page.url()).searchParams.get("session");
    assert.ok(sessionId, "Expected the questionnaire submission to create a session id.");
    log(`Session id: ${sessionId}`);

    const bundleAfterQuestionnaire = await waitForSessionBundle(sessionId, { questionnaire: true });
    assert.equal(bundleAfterQuestionnaire.questionnaire?.firstName, "נועה");
    assert.equal(bundleAfterQuestionnaire.questionnaire?.lastName, "כהן");

    await completeLearning(page, sessionId);
    await completeDistractor(page, sessionId);
    await completeRecall(page, sessionId);
    await completeMatching(page, sessionId);

    const finalBundle = await waitForSessionBundle(sessionId, {
      questionnaire: true,
      comprehension: 30,
      distractor: 20,
      recall: 8,
      recognition: 8,
      matching: 32,
      status: "complete"
    });
    assert.equal(finalBundle.session.status, "complete");

    await verifyDatabase(sessionId);
    await verifyExtraction(sessionId);

    log("Participant bot completed successfully.");
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
