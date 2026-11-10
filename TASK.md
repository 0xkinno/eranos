# TASK.md: Eranos

Ordered by dependency (V5 G7). Mark `[x]` only when the item is done **and verified** (test passes,
digest exists, page renders). Each phase ends with a commit by 0xkinno and a `PROGRESS.md` update.
Ask Kinnoski before every item marked **(ASK)**.

## Phase 0. Repo, rules, guardrails
- [x] Create repo `eranos`, `.gitignore` starts with `reference/`, `.env*`, `node_modules`, `.next`
- [ ] `git config user.name "0xkinno"` and email (ASK for email if unset)
- [x] `.claude/settings.json` with empty attribution, committed
- [x] `scripts/git-hooks/commit-msg` installed via `core.hooksPath`
- [x] `.github/workflows/no-claude-attribution.yml` (Part 0.1), green on first push
- [x] `scripts/check-copy.mjs` (no em/en dashes, no emoji, no hype words) wired into CI
- [x] `scripts/check-no-competitors.mjs` reading `reference/BANNED_NAMES.txt`, wired into pre-commit
- [ ] Clone all repos in Part 13 into `reference/`; write `reference/NOTES.md` and `reference/LANE_MAP.md`

## Phase 1. G0 to G4 documents (no product code yet)
- [ ] `RULES_EXTRACT.md` verified against the live event page, live form fields copied
- [ ] `SPONSOR_INTEL.md` (Part 3 expanded with links, versions, GA/preview)
- [ ] `MOMENT.md` (Lucía, sources verified, one more US tanda / UK pardner source added)
- [ ] `THESIS.md` (five lines, hook, X without Y, guarantees, human loop, crew); name collision check reported
- [ ] `RISK.md` (contribution caps, sponsor gas cap, demo budget, rounding: integers only, USDC 6 dp)
- [ ] `FINDINGS.md` questions pre-registered and committed (record commit hash)

## Phase 2. G5 platform probe (real calls, results in `PLATFORM_PROBE.md`)
- [x] Tatum GraphQL: checkpoint, object read, events query, transaction by digest, simulate (ASK for key)
- [x] Tatum Data API: USDC rate in MXN, USD, NGN, GHS, GBP, INR
- [x] Tatum address screening on Sui: works or not (record)
- [x] Tatum notifications for Sui addresses: available or not (record)
- [x] Read MemWal mainnet registry and an existing `MemWalAccount` via Tatum; record the defining package address of the type
- [x] MemWal relayer `health()`, `compatibility()` from server
- [x] Prove a member-signed request through `/api/mw/*` proxy (local first, then Vercel)
- [x] Measure remember-to-recall visibility lag (30 writes, p50/p95) and points per round
- [x] Decide Move Rung A (dependency on memwal) or Rung B; record why

## Phase 3. Deploy skeleton (G7 step 1)
- [x] Next.js 15 app skeleton, Tailwind, fonts self-hosted, `/api/status` with measured probes
- [x] Vercel project linked, deployed at final URL, reachability script curls every public path (ASK before first deploy)
- [ ] Upstash Redis connected

## Phase 4. Move package
- [x] `move/eranos` with `circle.move` (Part 6.1), generic over coin type
- [x] All Move tests (happy path + every error constant), `sui move test` green; count recorded: 24 passed
- [x] Publish to mainnet with keeper key (ASK), record package ID and digest in EVIDENCE.md
- [ ] GitHub Action runs `sui move test` on push

## Phase 5. Sui and Tatum libraries
- [x] `lib/tatum/sui.ts` (throttle, counters, 402 fallback visible, typed helpers) + tests
- [x] `lib/tatum/data.ts` (rates, screening if supported) + tests
- [x] `lib/sui/multisig.ts` (steward address, verify partials, combine) + tests with 3 test keypairs
- [x] `lib/sui/ptb.ts` (create circle, join, leave, start cycle, contribute_for, payout) + build tests
- [x] `lib/sui/sponsor.ts` (sponsored gas with per-member cap) + tests

## Phase 6. The circle on mainnet (G7 step 2: action path end to end)
- [x] Generate script steward and member keypairs; fund with small SUI and USDC (ASK, show totals)
- [x] Create the circle's `MemWalAccount` with sender = steward multisig (2 of 3 signatures) (ASK)
- [x] Add keeper delegate key (multisig) (ASK)
- [x] Create the `Circle<USDC>` object (multisig) (ASK)
- [x] Join 4 to 6 members with the atomic join PTB; record digests and commands
- [x] P2: refused `admit` without memory key on mainnet, decoded abort recorded
- [x] Start cycle 1 (multisig), 20-minute rounds

## Phase 7. Memory
- [x] `lib/memory/derive-key.ts` + determinism tests
- [x] `lib/memory/format.ts` parser, tombstones + tests
- [x] `lib/memory/policy.ts` heard to known promotion (requires member signature) + tests
- [x] Keeper client writes with `rememberAndWait` and idempotency keys
- [ ] Member browser client through proxy: remember own facts, recall known
- [x] Scribe: paste chat text, `analyze()` into `heard`, confirm / edit / reject UI flow
- [ ] `ask` via relayer `POST /api/ask` for "what did we agree?" with cited lines

## Phase 8. Contributions, x402 and payouts
- [ ] Pay my round in the UI (member signs, sponsored gas, verified via Tatum)
- [x] x402 v2 facilitator logic + tests (HTTP route not yet written) (exact echo, simulate, event check, idempotency, every errorReason)
- [x] Standing-order agent script; two mainnet agent payments recorded (ASK)
- [x] Keeper tick: verify events via Tatum, write outcomes, call payout when full
- [ ] P4 and P5 recorded (payouts match order; one refused payout attempt decoded)
- [x] Fault switch `ERANOS_SABOTAGE=keeper-claims-unpaid`: refusal test + recorded run (P10)

## Phase 9. Learning loop (the Best Walrus Memory centre)
- [x] `lib/planner/reminders.ts` + tests (payday facts, EWMA lateness, quiet hours, budget of 2)
- [x] `lib/planner/order.ts` + tests (reasons with cited memory IDs)
- [ ] Memory on / off switch on circle home and landing section, real data
- [ ] P8: before/after for every demo member recorded in PROOF.md
- [x] P9: false `heard` fact does not change the plan until confirmed, then does
- [ ] Cycle 1 completes on mainnet; planner proposal for cycle 2 signed by stewards (ASK)

## Phase 10. Leave and portability
- [ ] Leave PTB for one member between cycles (ASK); access counter before/after via Tatum
- [ ] `scripts/prove-leave.ts`: same key before and after, relayer and Seal results recorded (P6, P7)
- [ ] `scripts/portable.ts` (P11) with only member key and account ID
- [ ] Unattended GitHub Actions tick recorded (P13)

## Phase 11. Proof surfaces
- [x] `scripts/facts.ts` writes `docs/FACTS.json` from live reads; CI fails on README mismatch
- [x] `/api/stats` live recompute; `/proof` page; membership agreement check live via Tatum
- [x] `/judge` 60-second walk with preloaded real circle, no wallet needed
- [ ] `EVIDENCE.md`, `PROOF.md` (P1 to P13, both error directions, misses), `SDK_SURFACE.md` with file:line

## Phase 12. UI (Part 8) after the action path works
- [x] `DESIGN.md` written first (tokens, fonts, mark, signature motion, ornament)
- [ ] SVG assets: ring-hero, folds, mark, icon set, og image
- [x] Square-capsule navbar with Connect wallet and power-icon disconnect
- [ ] Landing page, all 8 sections, real numbers from FACTS
- [x] App screens: my circles, circle home, memory, stewards, join, proof, judge
- [x] Designed refusal, waiting and fallback states
- [ ] Cursor glow cards, reveals, signature motion, reduced-motion respected
- [ ] Guided tour (7 steps) with render mode

## Phase 13. Test and polish
- [ ] Playwright responsive suite on 7 viewports, overlap checks, axe WCAG 2.2 AA, zero console errors
- [ ] Playwright wallet E2E (test wallet): connect, derive key, join, steward sign, pay, disconnect
- [x] Vitest all green; counts into FACTS
- [ ] Screenshots captured into `docs/images/` (hero banner + 2x2)

## Phase 14. Story, review, submission
- [ ] README in Part 9 order, house-style test green, numbers from FACTS
- [ ] Lane check round two (Discord, X, gallery); adjust README lead if a rival appears
- [ ] Red-team rounds until clean; `REDTEAM_LOG.md`
- [ ] Demo video recorded via tour render mode (2:30 to 3:30)
- [ ] `docs/BLOG.md` drafted; Kinnoski publishes on Medium or dev.to (ASK); link added
- [ ] `docs/X_POST.md` drafted; Kinnoski posts (ASK)
- [ ] `SUBMISSION_TOTALRECALL.md` filled field by field (Tatum account ID, MEMWAL_AGENT_ID = keeper delegate public key)
- [ ] Kinnoski submits by 16:00 WAT on 10 Nov (ASK); commit tagged `submission`; deployment frozen
