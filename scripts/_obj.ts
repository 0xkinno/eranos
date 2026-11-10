import "./env";
import { tatum } from "@/lib/tatum/sui";
(async () => { for (const id of process.argv.slice(2)) { try { const o = await tatum().getObject(id); console.log(id, o.type, JSON.stringify(o.owner)); } catch (e) { console.log(id, "ERR", String(e).slice(0, 100)); } } })();
