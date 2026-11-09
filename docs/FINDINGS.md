# FINDINGS

Questions are pre-registered here and committed before they are run. Results are filled in after, including negative ones.
Flaws in sponsor products go in the friction report at the end, never in a headline.

## Pre-registered questions

1. After `remove_delegate_key`, what exactly does the relayer return for that key, and does a Seal key request for the old counter succeed or fail?
2. Does a delegate's `recall` see memories written by another delegate in the same namespace immediately after `rememberAndWait` resolves, or is there an indexing lag? Measure p50 and p95 over 30 writes.
3. Is the `MemWalAccount` type defined at the current package ID or an original ID? This matters for Move dependencies.
4. Does a member-signed request through a path-prefixed proxy verify on the managed relayer?
5. How many relayer points does one full round cost (all writes and recalls)? Can a 19 member circle run inside 500 points per hour?

## Results

Pending. Q3 has partial evidence, recorded in PLATFORM_PROBE.md (probe 1).

## Friction report

Pending.
