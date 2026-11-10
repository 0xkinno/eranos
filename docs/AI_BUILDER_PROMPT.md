# Tatum AI Builder prompt (Part 15, optional)

The Best Tatum AI Builder award is for "the best shippable product built primarily with ai.tatum.io". Eranos was built with Claude Code in a terminal, not primarily with ai.tatum.io, so it does not enter that award and does not claim it.

The prompt below is kept for anyone who wants to generate a first shell on ai.tatum.io and wire Walrus Memory into it. If it is run, export the result and commit it as a separate tag (`ai-builder-v0`) so the origin of that code stays honest.

```text
Build a mobile-first Next.js app called Eranos: a savings circle (tanda, ajo, susu) on Sui. Members
connect a Sui wallet, see a ring of members with whose turn it is, pay their round in USDC, and see
a timeline of rounds. Include pages: landing, my circles, circle home, memory (known, heard,
keeper), stewards (proposals to sign), proof. Use Tatum Sui RPC for all chain reads, and leave
clean hooks for Walrus Memory (@mysten-incubation/memwal) remember and recall. Light blue Sui
colours, serif accent headlines, no emoji.
```
