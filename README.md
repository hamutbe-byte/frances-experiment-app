# Frances Experiment App

Responsive Next.js implementation of the Frances et al. (2020) contextual diversity experiment.

Current scope: training phase only.

## Stack

- Next.js App Router
- Supabase for durable session storage
- Vercel for deployment
- Generated study seed from the original workbook

## Local setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Fill in the Supabase values
4. Run `npm run dev`

## Tests

- Run `npm run test` to execute the training-phase smoke tests
- Run `npm run test:watch` while iterating locally

The smoke tests verify:

- the generated study seed has 4 versions with 30 training trials each
- each version keeps the expected 8 critical and 22 filler passages
- version assignment stays balanced across participants
- sessions persist correctly in the local file-backed store
- the session creation and comprehension API routes behave as expected

## Data

- The study seed lives in `src/data/generated/frances-study.json`
- Regenerate it with `npm run extract:data`

## Notes

- This milestone includes:
  - participant start page
  - instructions page
  - 30 reading passages with yes/no comprehension checks
  - completion screen for the learning phase
- Recall, matching, researcher admin, and cloud persistence will be added later.
- The current implementation uses a local file-backed session store in `.runtime/session-store.json` so the training flow remains stable in local development before the Supabase layer is added.
- Telemetry is disabled by default in local development for speed. Turn it on by setting `NEXT_PUBLIC_ENABLE_TELEMETRY=true` when you want to profile participant behavior.
