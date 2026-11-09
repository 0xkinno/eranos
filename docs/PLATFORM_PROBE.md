# PLATFORM_PROBE (G5)

Real calls, with dates. Pending items need Kinnoski's Tatum key or funded wallets and are marked.

## Probe 1: which Walrus Memory deployment is current (2026-11-09)

Source: `GET https://relayer.memory.walrus.xyz/config`.
- Relayer reports package `0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5`, registry `0x8bf82c9e09e36b8d1c38298f68b7cb68e7b8762887e7592add9986d5e9cf199f`.
- The IDs in the build instruction (`0xcee7a6fd...`, registry `0x0da982ce...`) are an older deployment. Its registry object has 4,424 accounts and no `migration_finalized` field. The relayer registry has 11,520 accounts and `migration_finalized: true`, which matches the v3 contract source.
- Decision: Eranos uses the relayer's IDs. An account created under the old package would not be recognised by the relayer.
- The registry type string reads `0xe7c16f...::account::AccountRegistry`, so types are defined at that package address (partial answer to pre-registered question 3; the `MemWalAccount` type itself is read once an account exists).

## Probe 2: relayer health and version (2026-11-09)

`GET /health` and `GET /version`: status ok, relayerVersion 0.1.0, apiVersion 1.0.0, minSupportedSdk typescript 0.0.4. Feature flags include `remember.asyncJobs`, `remember.bulk`, `auth.accountBoundNonce`, `auth.sealSessionHeader`. SDK in use: 0.1.14.

## Probe 3: Sui GraphQL (2026-11-09)

- `https://sui-mainnet.gateway.tatum.io/graphql` answered `chainIdentifier` with no API key in this container. Behaviour with a key and credit accounting: pending key.
- The public endpoint `https://graphql.mainnet.sui.io/graphql` serves the same schema. `SuiGraphQLClient` object reads, `simulateTransaction` and `executeTransaction` exist on the schema.
- The `/api/status` route measured both the Sui GraphQL checkpoint read and the relayer health call from the Next.js server.

## Pending

- Tatum Data API rates (USDC in MXN, USD, NGN, GHS, GBP, INR): needs key.
- Tatum address screening on Sui: needs key.
- Tatum notifications for Sui addresses: needs key.
- Member-signed request through `/api/mw/*` on mainnet: needs a funded account. The proxy exists and forwards `health`, rejects non-allowlisted paths with 404 (tested locally).
- Remember-to-recall lag over 30 writes and points per round: needs a funded account.
- Move Rung A or B decision: needs the Sui CLI to compile.
