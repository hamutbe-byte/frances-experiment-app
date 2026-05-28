import { performance } from "node:perf_hooks";

const baseUrl = process.argv[2] ?? "http://localhost:3001";
const sessionCount = Number(process.argv[3] ?? 8);
const responsesPerSession = Number(process.argv[4] ?? 30);
const includePages = process.argv[5] !== "api-only";

const samples = [];

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function summarize(label) {
  const values = samples.filter((sample) => sample.label === label).map((sample) => sample.durationMs);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    operation: label,
    count: values.length,
    avg_ms: (total / Math.max(values.length, 1)).toFixed(2),
    p50_ms: percentile(values, 50).toFixed(2),
    p95_ms: percentile(values, 95).toFixed(2),
    max_ms: Math.max(...values).toFixed(2)
  };
}

async function timedFetch(label, path, options) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  samples.push({ label, durationMs: performance.now() - startedAt });

  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${text}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  return text && contentType.includes("application/json") ? JSON.parse(text) : null;
}

function device(index) {
  return {
    userAgent: `profile-http/${index}`,
    viewportWidth: 1280,
    viewportHeight: 800,
    timezone: "Asia/Jerusalem",
    language: "en-US",
    platform: "Win32"
  };
}

for (let index = 0; index < sessionCount; index += 1) {
  const created = await timedFetch("POST /api/session", "/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studySlug: "frances-2020", device: device(index) })
  });

  const sessionId = created.session.id;
  if (includePages) {
    await timedFetch("GET /study/start", "/study/frances-2020/start");
    await timedFetch("GET /study/learn/1", `/study/frances-2020/learn/1?session=${sessionId}`);
  }

  await timedFetch("GET /api/session/:id", `/api/session/${sessionId}`, {
    headers: { "Cache-Control": "no-store" }
  });

  for (let trialIndex = 1; trialIndex <= responsesPerSession; trialIndex += 1) {
    if (includePages) {
      await timedFetch("GET /study/learn/:trial", `/study/frances-2020/learn/${trialIndex}?session=${sessionId}`);
    }

    await timedFetch("POST /api/session/:id/comprehension", `/api/session/${sessionId}/comprehension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trialIndex,
        answer: trialIndex % 2 === 0 ? "yes" : "no",
        responseTimeMs: 1000 + trialIndex
      })
    });
  }
}

console.table([
  summarize("POST /api/session"),
  summarize("GET /study/start"),
  summarize("GET /study/learn/1"),
  summarize("GET /study/learn/:trial"),
  summarize("GET /api/session/:id"),
  summarize("POST /api/session/:id/comprehension")
]);
console.log(`Profiled ${sessionCount} HTTP sessions x ${responsesPerSession} responses at ${baseUrl}.`);
