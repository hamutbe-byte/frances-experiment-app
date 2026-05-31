import fs from "node:fs";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

type LocalStoreFile = {
  bundles: Array<Record<string, unknown>>;
};

type LocalSession = {
  id: string;
  studySlug: string;
  versionId: string;
  versionNumber: number;
  recallPromptOrder: number[];
  matchingTrialOrder: number[];
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  completionCode: string;
  device: unknown;
};

function getSourceStorePath() {
  return path.join(process.cwd(), process.env.FRANCES_STORE_DIR ?? ".runtime", "session-store.json");
}

function readLocalStore(): LocalStoreFile {
  const storePath = getSourceStorePath();
  if (!fs.existsSync(storePath)) {
    throw new Error(`Local store not found at ${storePath}`);
  }

  const raw = fs.readFileSync(storePath, "utf8");
  return JSON.parse(raw) as LocalStoreFile;
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

async function replaceRows(client: ReturnType<typeof getSupabaseClient>, table: string, sessionId: string, rows: Record<string, unknown>[]) {
  const deleteResult = await client.from(table).delete().eq("session_id", sessionId);
  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (rows.length === 0) {
    return;
  }

  const insertResult = await client.from(table).insert(rows);
  if (insertResult.error) {
    throw insertResult.error;
  }
}

async function main() {
  const client = getSupabaseClient();
  const store = readLocalStore();

  let imported = 0;
  for (const bundle of store.bundles) {
    const session = bundle.session as LocalSession | undefined;
    if (!session?.id) {
      continue;
    }

    const sessionId = String(session.id);
    const sessionRow = {
      id: session.id,
      study_slug: session.studySlug,
      version_id: session.versionId,
      version_number: session.versionNumber,
      recall_prompt_order: session.recallPromptOrder,
      matching_trial_order: session.matchingTrialOrder,
      status: session.status,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      completed_at: session.completedAt,
      completion_code: session.completionCode,
      device: session.device,
      questionnaire: bundle.questionnaire ?? null
    };

    const sessionResult = await client.from("sessions").upsert(sessionRow, { onConflict: "id" });
    if (sessionResult.error) {
      throw sessionResult.error;
    }

    await replaceRows(client, "comprehension_responses", sessionId, (bundle.comprehension as Record<string, unknown>[] | undefined) ?? []);
    await replaceRows(client, "distractor_responses", sessionId, (bundle.distractor as Record<string, unknown>[] | undefined) ?? []);
    await replaceRows(client, "recall_responses", sessionId, (bundle.recall as Record<string, unknown>[] | undefined) ?? []);
    await replaceRows(client, "recognition_responses", sessionId, (bundle.recognition as Record<string, unknown>[] | undefined) ?? []);
    await replaceRows(client, "matching_responses", sessionId, (bundle.matching as Record<string, unknown>[] | undefined) ?? []);
    await replaceRows(client, "telemetry_events", sessionId, (bundle.telemetry as Record<string, unknown>[] | undefined) ?? []);

    imported += 1;
    process.stdout.write(`Imported session ${sessionId}\n`);
  }

  process.stdout.write(`Imported ${imported} sessions from ${getSourceStorePath()}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
