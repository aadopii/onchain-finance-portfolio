// send-report.ts — compose and send the weekly portfolio report via Telegram now.
//
// Reads the latest snapshot (.sail/state/snapshot.json) and the ledger, rebuilds
// the prior-report context so the flow decomposition (deposit/withdrawal vs
// market) is correct, and sends the report exactly as the agent would on its
// weekly report tick. Run with:
//   npx tsx scripts/send-report.ts
//
// Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .sail/.env.local.
import fs from "node:fs";
import path from "node:path";
import {
  buildReportContext,
  buildSnapshot,
  composeReport,
  htmlToText,
  sendTelegramReport,
  type LedgerEntry,
} from "../src/report.js";

const root = process.cwd();
const sail = path.join(root, ".sail");

function readJson(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(path.join(sail, file), "utf-8"));
  } catch {
    return null;
  }
}

function readLedger(): LedgerEntry[] {
  try {
    return fs
      .readFileSync(path.join(sail, "memory", "ledger.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

// Load .sail/.env.local into process.env (TELEGRAM_* tokens).
const envPath = path.join(sail, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = (process.env[m[1]] ?? "") || m[2].replace(/^["']|["']$/g, "");
  }
}

const snapshot = readJson("state/snapshot.json");
if (!snapshot) {
  console.error("No snapshot found yet. Run `sailor run --once` first to generate one.");
  process.exit(1);
}

// Rebuild the PortfolioSnapshot from the JSON (bigints are decimal strings).
const s = buildSnapshot({
  usdcTotal: BigInt(snapshot.idleUsdc),
  holdings: snapshot.holdings.map((h: any) => ({
    symbol: h.symbol,
    value: BigInt(h.value),
    targetBps: BigInt(h.targetBps),
  })),
  bandBps: 1000,
  costBasis: snapshot.costBasis != null ? BigInt(snapshot.costBasis) : null,
  asOf: snapshot.asOf,
});

const asOf = snapshot.asOf ? new Date(snapshot.asOf * 1000).toISOString().slice(0, 10) : undefined;
const context = buildReportContext(readLedger());
const text = composeReport(s, { title: "Onchain Finance Portfolio", asOf, context });
await sendTelegramReport(text);
console.log("Report sent:\n\n" + htmlToText(text));
