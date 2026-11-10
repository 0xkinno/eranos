# REDTEAM_LOG

One self-run round on 10 Nov 2026 against https://eranos.vercel.app and the repository. This was not the five-agent judge round from the plan: no independent reviewer agents were run, so treat it as a builder's red team, not a clean external round.

| Check | Result |
|---|---|
| Secrets in tracked files and git history (private keys, Tatum key, keeper memory key) | none found |
| Competitor names in the tracked tree | none (`scripts/check-no-competitors.mjs`, 12 names) |
| Em dashes, en dashes, emoji, banned words | none (`scripts/check-copy.mjs`) |
| `/api/mw` with a path outside the allowlist | 404 |
| x402 route with a non-member address, a negative round | 404, 400 |
| x402 payment that echoes different requirements, a bad signature, a failed simulation, a wrong event or amount, a replay | refused with the matching `errorReason` (unit tests) |
| Sponsored gas for a transaction that uses the gas coin, calls another function or transfers objects | refused (`tests/sponsor-check.test.ts`) |
| Steward proposal with bad input | 400 |
| Cron tick without or with a wrong secret | 401 |
| Scribe with a non-member address | 400. Found during this pass: the scribe and proposals routes had no rate limit. A per-IP limit was added |
| Balance and rate routes with bad input | 400 |
| Keeper told a member paid when the chain shows no payment | refused, nothing written |
| Heard fact confirmed by the wrong wallet, over different text, or by nobody | refused (`tests/policy.test.ts`) |
| README links | all external links returned 200 to a fetch except Modern Ghana, which returns 403 to automated clients but was found by search |

Open items found and not fixed: steward proposals are held in memory on the deployed site, so they can vanish between serverless instances until a Redis store is connected. The rate limiter is per instance, not global. Reminder delivery is not built.
