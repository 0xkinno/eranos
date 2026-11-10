# PROGRESS

Updated 2026-11-09 (submission closes 2026-11-10 17:00 UTC).

## Done and verified (mainnet and the deployed site, 10 Nov 2026)
- Contract published; memory account and circle created by the 2 of 3 steward multisig; 5 members joined (money and memory in one transaction each); cycle 1 completed with 5 of 5 payouts to the scheduled members; one member left (access counter 0 to 1, key refused by the relayer); cycle 2 started from the planner's memory-driven order, signed by two stewards.
- Sponsored contributions, 2 x402 agent payments, 1 payment from a browser wallet on the deployed site, keeper verification through Tatum, memory writes by members through the proxy.
- P1 to P11 recorded in docs/PROOF.md with their limits. P12 counted by script. P13 not recorded.
- Redesign in Sui light blue with Framer Motion, hand-drawn SVG scene, self-hosted fonts; Playwright inspection of fonts, SVG placement, overflow and contrast on the deployed site (docs/UI_INSPECTION.md).
- 68 Vitest and 24 Move tests green. 62 Playwright tests pass on the deployed site (responsive and axe on 7 viewports, wallet flows including a browser payment, guided tour, memory switch).
- Reminders delivered in the app inside the interruption budget; deployed state in a Vercel Blob store; both proven on the live site (see PROOF P14 and /api/status).
- Tatum AI Builder entered with disclosure (shell generated on ai.tatum.io, shipped product built with Claude Code).

## Blocked on Kinnoski
- GitHub secrets ERANOS_URL and CRON_SECRET (P13, unattended tick).
- Publishing the blog post and the X post, recording the demo video, submitting the form.

## Not done
30-write recall-lag study and points per round; a separate Seal key request after leaving; phone push for reminders (in-app delivery is live); five-agent external red-team round; Tatum AI Builder award (not built with ai.tatum.io, not claimed).

## Self-judged scores (builder's view, not independent)
Walrus and Tatum integration: strong on depth, with real limits listed. Technical quality: tests, CI gates, mainnet proof, honest misses. Creativity: a group-owned memory with enforced money and memory membership. Presentation: README, live proof, 60-second walk, guided tour; demo video still to record.
