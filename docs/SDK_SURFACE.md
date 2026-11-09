# SDK_SURFACE

Every sponsor feature used, with where. Status: live, substitute, designed, or not used.

| Feature | Version | Where | Status |
|---|---|---|---|
| `@mysten-incubation/memwal` `MemWal.create` | 0.1.14 | lib/memory/client.ts | written, not yet run on mainnet |
| Relayer pass-through proxy | n/a | app/api/mw/[...path]/route.ts | written, forwards health in local test |
| `memwal::account::add_delegate_key`, `remove_delegate_key`, `create_account` | package 0xe7c16f... | lib/sui/ptb.ts | built in tests, not yet executed |
| `memwal::account::is_delegate`, `owner` read from Move | interface stub | move/eranos/sources/circle.move | written, not compiled (Sui CLI missing) |
| Tatum Sui GraphQL gateway via `SuiGraphQLClient` custom fetch | @mysten/sui 2.39.1 | lib/tatum/sui.ts | live read verified, key pending |
| Tatum Data API rates and screening | n/a | not written | not used, so not claimed |
| Relayer `POST /api/ask` | n/a | not written | not used, so not claimed |
