// Build simulate probes for AcrossBridgePermission (depositV3 on the source SpokePool), using viem
// to encode exactly what the runtime sends. One set per route direction:
//   .sail/probes-across-base.json       Base USDC → Robinhood USDG   (args-across-base.json)
//   .sail/probes-across-robinhood.json  Robinhood USDG → Base USDC   (args-across-robinhood.json)
// Timestamps are taken from `now`, so regenerate right before `sailor mandate simulate`.
import { encodeFunctionData, parseAbi } from "viem";
import { writeFileSync } from "node:fs";

const DEPOSIT_V3 = parseAbi([
  "function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes message) payable",
]);
const SPOKE_BASE = "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64";
const SPOKE_RH = "0xD29C85F15DF544bA632C9E25829fd29d767d7978";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDG_RH = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const ACCOUNT = "0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA";
const RANDOM = "0x1111111111111111111111111111111111111111";
const ZERO = "0x0000000000000000000000000000000000000000";
const now = Math.floor(Date.now() / 1000);

function dep(o) {
  return encodeFunctionData({
    abi: DEPOSIT_V3,
    functionName: "depositV3",
    args: [o.depositor ?? ACCOUNT, o.recipient ?? ACCOUNT, o.inputToken, o.outputToken, BigInt(o.inputAmount), BigInt(o.outputAmount), BigInt(o.dest),
      o.relayer ?? ZERO, o.quote ?? now, o.deadline ?? now + 7200, o.exclusivity ?? 0, o.message ?? "0x"],
  });
}
function set(spoke, inTok, outTok, dest, label) {
  const probes = [];
  const add = (l, calldata, expect, value = "0") => probes.push({ label: l, target: spoke, calldata, value, expect });
  const base = { inputToken: inTok, outputToken: outTok, dest, inputAmount: 200_000_000, outputAmount: 199_700_000 };
  // Must-pass
  add(`${label}: 200 → 199.7 (14.6 bps fee), quoted now, 2h deadline`, dep(base), "pass");
  add(`${label}: at cap 1000 → floor 997 (30 bps)`, dep({ ...base, inputAmount: 1_000_000_000, outputAmount: 997_000_000 }), "pass");
  add(`${label}: quote 59 min old`, dep({ ...base, quote: now - 3540 }), "pass");
  add(`${label}: fill deadline near the 6h max`, dep({ ...base, deadline: now + 21600 - 120 }), "pass"); // margin: the block clock moves between generation and simulation
  // Must-fail
  add(`${label}: recipient not the SMA`, dep({ ...base, recipient: RANDOM }), "fail");
  add(`${label}: depositor not the SMA (refund would leave the SMA)`, dep({ ...base, depositor: RANDOM }), "fail");
  add(`${label}: wrong output token`, dep({ ...base, outputToken: RANDOM }), "fail");
  add(`${label}: wrong input token`, dep({ ...base, inputToken: RANDOM }), "fail");
  add(`${label}: wrong destination chain`, dep({ ...base, dest: 1 }), "fail");
  add(`${label}: over cap (1001)`, dep({ ...base, inputAmount: 1_001_000_000, outputAmount: 1_000_000_000 }), "fail");
  add(`${label}: output below the 30 bps floor`, dep({ ...base, outputAmount: 199_000_000 }), "fail");
  add(`${label}: exclusive relayer set`, dep({ ...base, relayer: RANDOM }), "fail");
  add(`${label}: exclusivity deadline set`, dep({ ...base, exclusivity: now + 3 }), "fail");
  add(`${label}: stale quote (2h old)`, dep({ ...base, quote: now - 7200 }), "fail");
  add(`${label}: fill deadline beyond 6h`, dep({ ...base, deadline: now + 21601 }), "fail");
  add(`${label}: non-empty message`, dep({ ...base, message: "0xdeadbeef" }), "fail");
  add(`${label}: native value attached`, dep(base), "fail", "1");
  probes.push({ label: `${label}: wrong target`, target: RANDOM, calldata: dep(base), value: "0", expect: "fail" });
  return probes;
}
writeFileSync(".sail/probes-across-base.json", JSON.stringify(set(SPOKE_BASE, USDC_BASE, USDG_RH, 4663, "Base→Robinhood"), null, 2));
writeFileSync(".sail/probes-across-robinhood.json", JSON.stringify(set(SPOKE_RH, USDG_RH, USDC_BASE, 8453, "Robinhood→Base"), null, 2));
console.log("wrote .sail/probes-across-base.json and .sail/probes-across-robinhood.json (18 probes each)");
