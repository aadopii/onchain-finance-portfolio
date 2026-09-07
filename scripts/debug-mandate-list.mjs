// Print the exact permission addresses the SailorClient's mandate.list returns on ETH,
// to check whether any have a wrong checksum that would make viem's evaluate() throw.
import { SailorClient } from "@sail.money/sailor/sdk";
import fs from "node:fs";
import path from "node:path";

const sail = path.join(process.cwd(), ".sail");
const env = {};
for (const line of fs.readFileSync(path.join(sail, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const client = new SailorClient({
  chainId: 1,
  rpcUrl: env.RPC_URL_1,
  kernel: "0x38b508756c976e876EFF05a29E731A4d348BA6ED",
});

const list = await client.mandate.list("0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA");
for (const m of list) {
  console.log(m.permission);
}
