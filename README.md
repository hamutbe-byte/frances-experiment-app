# Frances Experiment App

Responsive Next.js implementation of the Frances et al. (2020) contextual diversity experiment.

Current scope: training phase, distractor placeholder, recall, recognition, and picture-word matching.

## Stack

- Next.js App Router
- Supabase for durable participant storage
- Vercel for deployment
- Generated study seed from the original workbook

## Local setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Fill in the Supabase values if you want durable storage
4. Run `npm run dev`

## Tests

- Run `npm run test` to execute the training-phase smoke tests
- Run `npm run test:watch` while iterating locally
- Run `npm run participant:bot` to walk the full participant flow in a browser and verify saved data/export output

The smoke tests verify:

- the generated study seed has 4 versions with 30 training trials each
- the generated study seed has 8 recall prompts and 32 matching trials
- every matching picture ID has an image in `public/stimuli/matching`
- each version keeps the expected 8 critical and 22 filler passages
- version assignment stays balanced across participants
- sessions persist correctly in the local store fallback
- the session creation, comprehension, recall, recognition, and matching API routes behave as expected

## Participant Bot

- The bot lives in `scripts/participant-bot.ts`
- Its npm command is `npm run participant:bot`
- The main runtime flags are:
  - `PARTICIPANT_BASE_URL` for the app URL to test
  - `PARTICIPANT_STUDY_SLUG` for the study slug
  - `PARTICIPANT_HEADLESS` to keep the browser hidden when set to `true`
  - `PARTICIPANT_TIMEOUT_MS` for longer or shorter waits
  - `PARTICIPANT_DEBUG=true` to print request/response logs while the bot runs
- The bot creates a real participant session and then verifies:
  - the session row in `public.sessions`
  - the questionnaire saved in `public.sessions.questionnaire`
  - the response tables for comprehension, distractor, recall, recognition, and matching
  - the export endpoints in `/admin/export`

To run it against the local app:

```bash
npm run dev
# in a second terminal
npm run participant:bot
```

To run it against another deployment:

```bash
PARTICIPANT_BASE_URL=https://your-app-url npm run participant:bot
```

If Chromium is missing, install it with:

```bash
npx playwright install chromium
```

### Inspect a bot run in Supabase

If the bot prints a session id like `mq1386pwls3szcyc`, you can inspect the saved data with this single query in Supabase SQL Editor:

```sql
with session_row as (
  select
    id,
    study_slug,
    version_id,
    version_number,
    status,
    created_at,
    updated_at,
    completed_at,
    completion_code,
    questionnaire
  from public.sessions
  where id = 'mq1386pwls3szcyc'
),
response_counts as (
  select
    (select count(*) from public.comprehension_responses where session_id = 'mq1386pwls3szcyc') as comprehension_count,
    (select count(*) from public.distractor_responses where session_id = 'mq1386pwls3szcyc') as distractor_count,
    (select count(*) from public.recall_responses where session_id = 'mq1386pwls3szcyc') as recall_count,
    (select count(*) from public.recognition_responses where session_id = 'mq1386pwls3szcyc') as recognition_count,
    (select count(*) from public.matching_responses where session_id = 'mq1386pwls3szcyc') as matching_count,
    (select count(*) from public.telemetry_events where session_id = 'mq1386pwls3szcyc') as telemetry_count
)
select * from session_row cross join response_counts;
```

For a deeper look, drill into the individual tables with the same session id:

```sql
select * from public.comprehension_responses where session_id = 'mq1386pwls3szcyc' order by trial_index;
select * from public.distractor_responses where session_id = 'mq1386pwls3szcyc' order by trial_index;
select * from public.recall_responses where session_id = 'mq1386pwls3szcyc' order by prompt_index;
select * from public.recognition_responses where session_id = 'mq1386pwls3szcyc' order by prompt_index;
select * from public.matching_responses where session_id = 'mq1386pwls3szcyc' order by trial_index;
select * from public.telemetry_events where session_id = 'mq1386pwls3szcyc' order by created_at;
```

## Data

- The study seed lives in `src/data/generated/frances-study.json`
- Regenerate it with `npm run extract:data`

## Notes

- This milestone includes:
  - participant start page
  - instructions page
  - 30 reading passages with yes/no comprehension checks
  - 10-minute distractor placeholder
  - typed recall prompts
  - immediate four-option recognition prompts
  - 32-trial picture-word matching task
  - inline end-of-experiment state after the final matching trial
- The app uses Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, and falls back to `.runtime/session-store.json` otherwise.
- Run `npm run db:import` once to copy any existing local sessions into Supabase before switching production over.
- Deploy to Vercel free tier for the participant URL and use Supabase free tier for the hosted database.
- The participant bot uses Playwright. If the browser binary is missing, install it with `npx playwright install chromium`.
- Telemetry is disabled by default in local development for speed. Turn it on by setting `NEXT_PUBLIC_ENABLE_TELEMETRY=true` when you want to profile participant behavior.
- The dev jump toolbar is disabled by default. Turn it on with `NEXT_PUBLIC_ENABLE_DEV_TOOLS=true`.
- The local server reads app flags from `.env.local`; `run-server.cmd` only sets the Node path and starts the build/server.
- Set `NEXT_PUBLIC_ENABLE_SESSION_RESUME=false` to prevent the app from restoring the last browser session from `localStorage`. A `?session=...` URL still opens that exact session.
