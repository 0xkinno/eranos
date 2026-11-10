# PROOF

Results of the proof plan. Every row points at a Sui mainnet transaction, a Walrus blob, or a script output. Digests are in [EVIDENCE.md](EVIDENCE.md). Funds are capped: the demo circle pays 0.1 USDC per member per 20-minute round.

| # | Claim | Result | Where |
|---|---|---|---|
| P1 | Joining adds the member to money and memory in one transaction | Done for 5 members, 2 Move calls in each transaction | EVIDENCE: "join member" rows |
| P2 | The contract refuses money membership without memory membership | Refused with abort code 12 (`EMemoryNotGranted`) at Tatum's pre-execution check. This is a refused simulation, not an executed failed transaction. The Move test `admit_without_memory_key_is_refused` covers the contract. | EVIDENCE: P2 row |
| P3 | Contributions are paid by members' own signatures, and by an agent over x402 | Contributions signed by members with keeper-sponsored gas. 2 x402 agent payments from the standing-order script, plus 1 payment from a browser wallet through the deployed UI | EVIDENCE: "x402" and "UI payment" rows |
| P4 | The pot went only to the scheduled member | 5 of 5 payouts in cycle 1 matched the cycle order. The contract reads `order[round]` and nothing else | `PaidOut` events, circle page timeline |
| P5 | A payout to anyone else is impossible | Move tests, plus a mainnet attempt to pay out a round that was not full: abort code 6 (`ERoundNotFull`), refused at Tatum's pre-execution check | EVIDENCE: P5 row |
| P6 | Leaving removes the memory key in the same transaction | Member 3 left between cycles: one transaction with `remove_delegate_key` then `circle::remove`. Access counter 0 to 1, read through Tatum | EVIDENCE: "leave member 3" row |
| P7 | A departed member's key is refused | Same derived key, same recall request. Before: 3 results. After: HTTP 401 from the relayer. A Seal key request for the old counter was not run separately | EVIDENCE: P7 row |
| P8 | Memory changed the product | See the table below. Reminder times changed for 5 of 5 members. Next-cycle order changed for 3 of 5 | docs/p8.json |
| P9 | A model's guess cannot change a decision | Member 4's order position was 3 before, 3 while the claim sat in `heard`, 1 after they signed | EVIDENCE: P9 row |
| P10 | The keeper cannot invent a payment | With the fault switch on, Tatum answered "Transaction not found" for the claimed payment and nothing was written | EVIDENCE: sabotage tick row, `tests/keeper.test.ts` |
| P11 | The memory survives the app | A fresh process with no database, no Redis and no env file, given only a member key and the account ID, recalled 37 lines and reproduced the reminder schedule and order | `scripts/portable.ts`, EVIDENCE: P11 row |
| P12 | At least 10 memories on mainnet | See `docs/FACTS.json` (counted by `scripts/facts.ts` from live `listMemories`) | FACTS |
| P13 | Unattended run | Not recorded. It needs the GitHub secrets `ERANOS_URL` and `CRON_SECRET`. The workflow `.github/workflows/tick.yml` and the route `/api/cron/tick` are written | pending |

## P8: memory off versus on, every demo member

Taken from the real circle's memories on 10 Nov 2026 (times are UTC for the current round of cycle 1).

| Member | Reminders off | Reminders on | Order off | Order on | Why (order, with memory on) |
|---|---|---|---|---|---|
| 1 | 08:27, 08:37 | 08:39, 08:43 | 1 | 2 | paid on time in every recorded round |
| 2 | 08:27, 08:37 | 08:43, 08:44 | 2 | 4 | paid 0.01 h late on average, so draws later |
| 3 | 08:27, 08:37 | 08:33, 08:37 | 3 | 3 | paid on time in every recorded round |
| 4 | 08:27, 08:37 | 08:37, 08:41 | 4 | 1 | confirmed need for round 1: "Member 4 needs the pot early, in round 1, because the school  |
| 5 | 08:27, 08:37 | 08:45, 08:45 | 5 | 5 | paid 0.05 h late on average, so draws later |

Member 4's earlier place comes from a fact they confirmed. Members 2 and 5 draw later because the keeper recorded their real late payments. The cited memory ids are in docs/p8.json.

## Both error directions

A reminder can be wrong in two ways: it arrives before the member has been paid and is ignored (false early), or it arrives after the member already paid (wasted). The replay below uses **12 invented member-months. They are synthetic, labelled as such, and kept out of every headline number.**

| | Reminders | False early | Wasted |
|---|---|---|---|
| Memory off (round open, 24 hours before deadline) | 24 | 12 | 10 |
| Memory on (payday, then a nudge) | 24 | 0 | 10 |

Memory removes the false-early reminders. It does not reduce wasted ones: the planner schedules a second nudge whether or not the member has paid. A live sender would skip it for members who already paid. **Reminder delivery is not built.** Eranos computes and shows the schedule. Nothing is sent to a phone yet.

Admission screening: the Tatum address check accepted all 5 demo wallets as "not listed". Whether Tatum's sources cover Sui is unproven, so this is not a safety claim. Flagged: 0. Untested: any real-world flagged address.

## Misses and limits

- The P2 and P5 refusals are caught at transaction resolution, so no failed transaction is on chain.
- A Seal key request after leaving was not run.
- The remember-to-recall lag was measured twice (about 2.6 seconds), not over 30 writes. The 30-write study and points-per-round were not done.
- Steward proposals live in memory on the deployed site until a Redis store is connected. Cycle 2 was proposed and signed through the same API on a local server.
- zkLogin wallets cannot be stewards or derive a memory key.
