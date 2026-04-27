import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

import { POST as createSessionPost } from "@/app/api/session/route";
import { POST as submitComprehensionPost } from "@/app/api/session/[id]/comprehension/route";
import { chooseBalancedVersion } from "@/lib/assignment";
import { __resetStoreForTests, createSession, getSessionBundle, saveComprehensionResponse } from "@/lib/store";
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

  await run("seeded study contains 8 critical and 22 filler trials per version", () => {
    const study = getStudyOrThrow("frances-2020");
    for (const version of study.versions) {
      assert.equal(version.learningTrials.filter((trial) => trial.isCritical).length, 8);
      assert.equal(version.learningTrials.filter((trial) => !trial.isCritical).length, 22);
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

  log("All smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
