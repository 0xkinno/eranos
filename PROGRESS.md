# PROGRESS

Updated 2026-11-09 (submission closes 2026-11-10 17:00 UTC).

## Done and verified
- Repo, guardrails, attribution gate files, copy gate, name gate (pre-commit hook runs both).
- 13 reference repos cloned into `reference/` (gitignored). Lane notes started.
- Libraries with passing Vitest tests: memory format and tombstones, key derivation, heard-to-known policy, reminder and order planners, steward multisig, PTB builders, sponsor cap, Tatum client (throttle, counters, visible fallback), x402 facilitator logic.
- `/api/status` and `/api/mw/*` proxy run locally against live Sui GraphQL and the live relayer.
- Wallets generated into `.env.local` (not committed).
- Finding: the instruction's Walrus Memory package and registry IDs are the older deployment. The relayer's current IDs are used. See docs/PLATFORM_PROBE.md.

## Written but not verified
- Move: 24 tests pass on Sui CLI 1.60.1 (Rung A, links to mainnet memwal 0xe7c16f). Not yet published.

## Blocked on Kinnoski
- GitHub repo URL to push to; git author email (currently the 0xkinno noreply address).
- Tatum API key and dashboard account ID.
- Funding of the generated wallets, and approval for each mainnet step.
- Permission to install the Sui CLI so Move tests can run and the package can be published.
- Upstash Redis, Vercel project link, blog and X accounts.

## Not started
UI (landing, app screens, tour), SVG assets, Playwright suites, README, memory client flows against mainnet, keeper tick, x402 HTTP route, proof pages, blog, submission file.

## Self-judged scores
Not scored yet. Nothing has run on mainnet, so integration and presentation criteria are unproven.
