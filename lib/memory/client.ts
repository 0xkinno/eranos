// Walrus Memory clients. Keeper (server) and member (browser, through our pass-through proxy).
import { MemWal } from "@mysten-incubation/memwal";
import { MEMWAL_RELAYER } from "@/lib/config";

/** Keeper: one delegate key. Only ever writes verified outcomes, payouts and reminder logs. */
export const keeperMemory = (accountId: string, namespace: string, key = process.env.KEEPER_MEMWAL_KEY!) =>
  MemWal.create({ key, accountId, serverUrl: MEMWAL_RELAYER, namespace });

/** Member (browser): the member's own derived key. serverUrl is our proxy: the SDK signs the path only, so the "/api/mw" prefix does not break the signature. */
export const memberMemory = (keyHex: string, accountId: string, namespace: string, origin: string) =>
  MemWal.create({ key: keyHex, accountId, serverUrl: `${origin}/api/mw`, namespace });
