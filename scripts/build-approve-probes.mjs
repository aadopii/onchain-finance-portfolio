// Build simulate probes for BoundedErc20Approve, using viem to encode
// `approve(spender, amount)`. target == the ERC-20 being approved (ctx.target).
import { encodeFunctionData, parseAbi } from "viem";
import { writeFileSync } from "node:fs";

const APPROVE = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const TRANSFER = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

// Base
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CBHYPE = "0xB200000000000000000000451d033a5000cb479e";
const UNI = "0xc3De830EA07524a0761646a6a4e4be0e114a3C83";
const AAVE = "0x63706e401c06ac8513145b7687A14804d17f814b";
const MORPHO = "0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842";
const ROUTER_02_BASE = "0x2626664c2603336E57B271c5C0b26F421741e481"; // Base SwapRouter02
const ROUTER_AERO = "0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F";
const MESSENGER_BASE = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";

// Ethereum
const USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const SKY = "0x56072C95FAA701256059aa122697B133aDEd9279";
const ZAMA = "0xa12cc123ba206d4031d1c7f6223d1c2ec249f4f3"; // v3
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // hub only — never approved by the agent
const ROUTER_CLASSIC = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // classic SwapRouter (two-hop)
const MESSENGER_ETH = "0xBd3fa81B58Ba92a82136038B25aDec7066af3155";

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const RANDOM = "0x1111111111111111111111111111111111111111";
const MAX = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

function approve(spender, amount) {
  return encodeFunctionData({ abi: APPROVE, functionName: "approve", args: [spender, BigInt(amount)] });
}
function transfer(to, amount) {
  return encodeFunctionData({ abi: TRANSFER, functionName: "transfer", args: [to, BigInt(amount)] });
}

// ── Base approve ─────────────────────────────────────────────────────────────
const base = [];
function badd(label, target, calldata, expect, value = "0") {
  base.push({ label, target, calldata, value, expect });
}
// Must-pass
badd("approve USDC to SwapRouter02", USDC_BASE, approve(ROUTER_02_BASE, 500_000_000), "pass");
badd("approve USDC to Aerodrome router", USDC_BASE, approve(ROUTER_AERO, 500_000_000), "pass");
badd("approve USDC to CCTP messenger (bridge)", USDC_BASE, approve(MESSENGER_BASE, 500_000_000), "pass");
badd("approve cbHYPE to Aerodrome (sell leg)", CBHYPE, approve(ROUTER_AERO, 10n ** 18n), "pass");
badd("approve UNI to SwapRouter02 (sell leg)", UNI, approve(ROUTER_02_BASE, 10n ** 18n), "pass");
badd("approve AAVE to SwapRouter02 (sell leg)", AAVE, approve(ROUTER_02_BASE, 10n ** 18n), "pass");
badd("approve MORPHO to SwapRouter02 (sell leg)", MORPHO, approve(ROUTER_02_BASE, 10n ** 18n), "pass");
badd("approve uncapped (max uint256) — MAX_APPROVAL==0", USDC_BASE, approve(ROUTER_02_BASE, MAX), "pass");
// Must-fail
badd("wrong selector (transfer)", USDC_BASE, transfer(RANDOM, 500_000_000), "fail");
badd("native value attached", USDC_BASE, approve(ROUTER_02_BASE, 500_000_000), "fail", "1");
badd("unlisted token (WETH not allowlisted)", WETH, approve(ROUTER_02_BASE, 500_000_000), "fail");
badd("unlisted token (SKY on Base)", SKY, approve(ROUTER_02_BASE, 500_000_000), "fail");
badd("unlisted spender (random)", USDC_BASE, approve(RANDOM, 500_000_000), "fail");
badd("wrong-chain spender (ETH messenger)", USDC_BASE, approve(MESSENGER_ETH, 500_000_000), "fail");
writeFileSync(".sail/probes-approve-base.json", JSON.stringify(base, null, 2));
console.log("wrote .sail/probes-approve-base.json (" + base.length + " probes)");

// ── Ethereum approve ─────────────────────────────────────────────────────────
const eth = [];
function eadd(label, target, calldata, expect, value = "0") {
  eth.push({ label, target, calldata, value, expect });
}
// Must-pass
eadd("approve USDC to classic SwapRouter", USDC_ETH, approve(ROUTER_CLASSIC, 500_000_000), "pass");
eadd("approve USDC to CCTP messenger (bridge)", USDC_ETH, approve(MESSENGER_ETH, 500_000_000), "pass");
eadd("approve SKY to classic SwapRouter (sell leg)", SKY, approve(ROUTER_CLASSIC, 10n ** 18n), "pass");
eadd("approve uncapped (max uint256) — MAX_APPROVAL==0", USDC_ETH, approve(ROUTER_CLASSIC, MAX), "pass");
// Must-fail
eadd("wrong selector (transfer)", USDC_ETH, transfer(RANDOM, 500_000_000), "fail");
eadd("native value attached", USDC_ETH, approve(ROUTER_CLASSIC, 500_000_000), "fail", "1");
eadd("unlisted token (WETH not allowlisted)", WETH, approve(ROUTER_CLASSIC, 500_000_000), "fail");
eadd("unlisted token (UNI on ETH)", UNI, approve(ROUTER_CLASSIC, 500_000_000), "fail");
eadd("unlisted spender (random)", USDC_ETH, approve(RANDOM, 500_000_000), "fail");
eadd("wrong-chain spender (Base messenger)", USDC_ETH, approve(MESSENGER_BASE, 500_000_000), "fail");
writeFileSync(".sail/probes-approve-eth.json", JSON.stringify(eth, null, 2));
console.log("wrote .sail/probes-approve-eth.json (" + eth.length + " probes)");

// ── Ethereum v3 approve (USDC, SKY, ZAMA → classic router / messenger) — args-approve-eth-v3 ──
const eth3 = [...eth];
const e3 = (label, target, calldata, expect, value = "0") => eth3.push({ label, target, calldata, value, expect });
e3("approve ZAMA to classic SwapRouter (sell leg)", ZAMA, approve(ROUTER_CLASSIC, 1000n * 10n ** 18n), "pass");
e3("approve ZAMA to random spender", ZAMA, approve(RANDOM, 1000n * 10n ** 18n), "fail");
e3("approve USDT (hub, not allowlisted)", USDT, approve(ROUTER_CLASSIC, 500_000_000), "fail");
writeFileSync(".sail/probes-approve-eth-v3.json", JSON.stringify(eth3, null, 2));
console.log("wrote .sail/probes-approve-eth-v3.json (" + eth3.length + " probes)");
