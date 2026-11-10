# PROGRESS

Updated 2026-11-09 (submission closes 2026-11-10 17:00 UTC).

## Done and verified (mainnet, 2026-11-10)
- Contract published, circle and Walrus Memory account created by the 2 of 3 steward multisig, 5 members joined with money and memory in one transaction each, cycle 1 started, contributions with sponsored gas, two x402 agent payments, keeper payouts, keeper verification through Tatum.
- P2 (admit without memory key refused), P5 (early payout refused), P9 (heard fact changes nothing until the member signs, then moves order 3 to 1), P10 (keeper refuses a claimed payment Tatum cannot find).
- Member-signed memory writes through the `/api/mw` proxy verify on the managed relayer.
- Vercel deployment at https://eranos.vercel.app. Responsive plus axe suite: 50 of 57 pass on the deployed site, all 7 failures are the memory page without the keeper key on Vercel; 16 of 16 pass locally at two viewports.
- 62 Vitest tests, 24 Move tests.

## Blocked on Kinnoski
- KEEPER_SUI_KEY and KEEPER_MEMWAL_KEY on Vercel (planner, scribe, memory page, sponsored UI payment, cron tick need them).
- GitHub secrets ERANOS_URL and CRON_SECRET for the unattended tick (P13).
- Upstash Redis (optional): proposals and idempotency state are in memory on Vercel until then.
- Publishing the blog post, the X post, the form submission.

## Not done yet
Leave proof (P6, P7) and cycle 2 (need cycle 1 to finish, about 08:48 UTC), P8 file, portable run (P11), deployed wallet E2E including the UI payment, Playwright wallet trace, demo video, blog publication, red-team rounds, README final render with leave and P-results.
