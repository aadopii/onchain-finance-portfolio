// Resolve the SMA (Safe) address the probe builders pin as recipient/depositor/mint recipient.
// Order: `--sma <address>` → `SMA_ADDRESS` env → `.sail/account.json` (`safe`). Never a literal:
// the probes must be built for YOUR account, since the permissions pin the recipient to it.
import { existsSync, readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

export function resolveSma() {
  const i = process.argv.indexOf("--sma");
  let sma = i >= 0 ? process.argv[i + 1] : undefined;
  if (!sma) sma = process.env.SMA_ADDRESS;
  if (!sma) {
    const p = resolvePath(process.cwd(), ".sail", "account.json");
    if (existsSync(p)) {
      try { sma = JSON.parse(readFileSync(p, "utf8")).safe; } catch { /* fall through */ }
    }
  }
  if (!sma || !/^0x[0-9a-fA-F]{40}$/.test(sma)) {
    console.error(
      "No SMA address. Pass --sma <address>, set SMA_ADDRESS, or create .sail/account.json (with `safe`) via `sailor account create`."
    );
    process.exit(2);
  }
  return sma;
}
