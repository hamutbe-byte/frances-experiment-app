# Performance Profile

Profile date: 2026-04-26

## What Was Measured

I profiled three layers:

- Local store operations without HTTP using `npm.cmd run profile:local`
- Real HTTP requests in Next.js dev mode using `npm.cmd run profile:http -- http://localhost:3001`
- Real HTTP requests in production mode using `npm.cmd run build`, `npm.cmd run start -- --port 3002`, then `npm.cmd run profile:http -- http://localhost:3002`

## Main Findings

The biggest slowdown while developing locally is Next.js dev mode, not the React UI or the study data size.

In dev mode, the learning page request had a median around `302 ms` and an average around `352 ms`. In production mode, the same learning page request dropped to about `9-11 ms`.

The second bottleneck is the current file-backed JSON session store. It is fine for local testing, but every write reads and rewrites the full `session-store.json` file. As more sessions accumulate, response saving gets slower.

## Timing Results

### Local Store, 80 Sessions x 30 Responses

| Operation | Avg | P50 | P95 | Max |
| --- | ---: | ---: | ---: | ---: |
| createSession | 1.76 ms | 1.64 ms | 3.22 ms | 5.51 ms |
| getSessionBundle | 2.94 ms | 2.53 ms | 5.45 ms | 12.31 ms |
| saveComprehensionResponse | 6.09 ms | 5.78 ms | 11.57 ms | 44.31 ms |

### Local Store, 250 Sessions x 30 Responses

| Operation | Avg | P50 | P95 | Max |
| --- | ---: | ---: | ---: | ---: |
| createSession | 2.16 ms | 1.98 ms | 4.04 ms | 4.80 ms |
| getSessionBundle | 12.93 ms | 10.25 ms | 30.64 ms | 62.85 ms |
| saveComprehensionResponse | 24.00 ms | 18.65 ms | 56.38 ms | 264.32 ms |

### Next.js Dev Mode, 3 Sessions x 30 Responses

| Operation | Avg | P50 | P95 | Max |
| --- | ---: | ---: | ---: | ---: |
| POST /api/session | 80.63 ms | 36.94 ms | 177.34 ms | 177.34 ms |
| GET /study/start | 268.20 ms | 281.29 ms | 309.73 ms | 309.73 ms |
| GET /study/instructions | 1160.68 ms | 248.87 ms | 2994.27 ms | 2994.27 ms |
| GET /study/learn/:trial | 351.53 ms | 302.44 ms | 516.21 ms | 2410.26 ms |
| GET /api/session/:id | 119.07 ms | 75.79 ms | 242.71 ms | 242.71 ms |
| POST /api/session/:id/comprehension | 45.50 ms | 38.04 ms | 100.42 ms | 137.48 ms |

### Next.js Production Mode, 30 Sessions x 30 Responses

| Operation | Avg | P50 | P95 | Max |
| --- | ---: | ---: | ---: | ---: |
| POST /api/session | 13.46 ms | 8.19 ms | 17.16 ms | 145.71 ms |
| GET /study/start | 11.92 ms | 9.71 ms | 20.64 ms | 68.90 ms |
| GET /study/instructions | 10.58 ms | 9.91 ms | 18.54 ms | 18.54 ms |
| GET /study/learn/:trial | 9.73 ms | 9.39 ms | 12.96 ms | 47.08 ms |
| GET /api/session/:id | 5.47 ms | 5.54 ms | 6.99 ms | 7.11 ms |
| POST /api/session/:id/comprehension | 8.09 ms | 8.18 ms | 10.42 ms | 19.44 ms |

## Bottlenecks

1. Next.js dev mode is the main reason the app feels slow on `npm.cmd run dev`.
2. The JSON file store becomes slower as the number of sessions grows.
3. Each trial currently performs a page navigation plus an API request to reload the session bundle.
4. OneDrive may add extra filesystem latency because the app, `.next`, and `.runtime` are inside a synced folder.

## Recommended Fixes

1. For realistic speed, test with production mode:
   `npm.cmd run build`
   `npm.cmd run start`

2. Before collecting real data, replace the JSON store with Supabase or another database. The JSON store is useful for local development, but it is not the right storage layer for real participants.

3. Optimize the learning flow by loading the session once and moving between trials inside one client route. That would remove most per-trial page navigation overhead.

4. For local development, consider moving the app outside OneDrive or moving `.runtime` to a non-synced folder with `FRANCES_STORE_DIR`.
