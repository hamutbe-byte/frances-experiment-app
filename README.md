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

The smoke tests verify:

- the generated study seed has 4 versions with 30 training trials each
- the generated study seed has 8 recall prompts and 32 matching trials
- every matching picture ID has an image in `public/stimuli/matching`
- each version keeps the expected 8 critical and 22 filler passages
- version assignment stays balanced across participants
- sessions persist correctly in the local store fallback
- the session creation, comprehension, recall, recognition, and matching API routes behave as expected

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
- Telemetry is disabled by default in local development for speed. Turn it on by setting `NEXT_PUBLIC_ENABLE_TELEMETRY=true` when you want to profile participant behavior.
- The dev jump toolbar is disabled by default. Turn it on with `NEXT_PUBLIC_ENABLE_DEV_TOOLS=true`.
