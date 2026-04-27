import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { POST as createSessionPost } from "@/app/api/session/route";
import { POST as submitComprehensionPost } from "@/app/api/session/[id]/comprehension/route";
import { POST as submitMatchingPost } from "@/app/api/session/[id]/matching/route";
import { POST as submitRecallPost } from "@/app/api/session/[id]/recall/route";
import { POST as submitRecognitionPost } from "@/app/api/session/[id]/recognition/route";
import { chooseBalancedVersion } from "@/lib/assignment";
import {
  __resetStoreForTests,
  createSession,
  getSessionBundle,
  saveComprehensionResponse,
  saveMatchingResponse,
  saveRecallResponse,
  saveRecognitionResponse
} from "@/lib/store";
import { getStudyOrThrow } from "@/lib/study";
import type { ParticipantSession } from "@/lib/types";

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

function setIsolatedStoreDir(name: string) {
  process.env.FRANCES_STORE_DIR = path.join(os.tmpdir(), `frances-tests-${name}-${Date.now()}`);
  __resetStoreForTests();
}

function makeSession(versionId: string, versionNumber: number, index: number): ParticipantSession {
  return {
    id: `session-${index}`,
    studySlug: "frances-2020",
    versionId,
    versionNumber,
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
          device: sampleDevice()
        })
      })
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.session.studySlug, "frances-2020");
    assert.match(payload.nextPath, /instructions\?session=/);
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
    assert.equal(payload.nextTrialIndex, 2);
    assert.equal(payload.completed, false);
  });

  log("All smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
