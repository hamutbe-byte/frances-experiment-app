import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import type { CreateSessionInput, YesNoAnswer } from "@/lib/types";

interface TimedSample {
  label: string;
  durationMs: number;
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function summarize(label: string, samples: TimedSample[]) {
  const values = samples.filter((sample) => sample.label === label).map((sample) => sample.durationMs);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    label,
    count: values.length,
    averageMs: total / Math.max(values.length, 1),
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    maxMs: Math.max(...values)
  };
}

function time<T>(samples: TimedSample[], label: string, fn: () => T) {
  const startedAt = performance.now();
  const result = fn();
  samples.push({ label, durationMs: performance.now() - startedAt });
  return result;
}

function fakeDevice(index: number): CreateSessionInput["device"] {
  return {
    userAgent: `profile-local/${index}`,
    viewportWidth: 1280,
    viewportHeight: 800,
    timezone: "Asia/Jerusalem",
    language: "en-US",
    deviceType: "desktop",
    platform: "Win32"
  };
}

async function main() {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "frances-profile-"));
  process.env.FRANCES_STORE_DIR = runDir;

  const {
    createSession,
    getSessionBundle,
    saveComprehensionResponse,
    __resetStoreForTests
  } = await import("@/lib/store");

  const samples: TimedSample[] = [];
  const sessionIds: string[] = [];
  const sessionCount = Number(process.argv[2] ?? 80);
  const responsesPerSession = Number(process.argv[3] ?? 30);

  try {
    __resetStoreForTests();

    for (let index = 0; index < sessionCount; index += 1) {
      const created = time(samples, "createSession", () =>
        createSession({
          studySlug: "frances-2020",
          device: fakeDevice(index)
        })
      );
      sessionIds.push(created.session.id);
    }

    for (const sessionId of sessionIds) {
      time(samples, "getSessionBundle", () => getSessionBundle(sessionId));

      for (let trialIndex = 1; trialIndex <= responsesPerSession; trialIndex += 1) {
        const answer: YesNoAnswer = trialIndex % 2 === 0 ? "yes" : "no";
        time(samples, "saveComprehensionResponse", () =>
          saveComprehensionResponse(sessionId, {
            trialIndex,
            answer,
            responseTimeMs: 1000 + trialIndex
          })
        );
      }
    }

    const storePath = path.join(runDir, "session-store.json");
    const storeSizeKb = fs.existsSync(storePath) ? fs.statSync(storePath).size / 1024 : 0;
    const summaries = ["createSession", "getSessionBundle", "saveComprehensionResponse"].map((label) =>
      summarize(label, samples)
    );

    console.table(
      summaries.map((summary) => ({
        operation: summary.label,
        count: summary.count,
        avg_ms: summary.averageMs.toFixed(2),
        p50_ms: summary.p50Ms.toFixed(2),
        p95_ms: summary.p95Ms.toFixed(2),
        max_ms: summary.maxMs.toFixed(2)
      }))
    );
    console.log(`Profiled ${sessionCount} sessions x ${responsesPerSession} responses.`);
    console.log(`Temporary store size: ${storeSizeKb.toFixed(1)} KB`);
    console.log(`Temporary store directory: ${runDir}`);
  } finally {
    __resetStoreForTests();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
