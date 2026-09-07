// Build simulate probes for ExactInputSwapPermission (v2 — exactInputSingle on
// SwapRouter02 for single-hop Uniswap V3, multi-hop exactInput for two-hop/Aerodrome).
// Uses viem to encode both call shapes. Emits .sail/probes-swap-{base,eth}.json.
import { encodeFunctionData, parseAbi } from "viem";
import { writeFileSync } from "node:fs";

const EXACT_INPUT = parseAbi([
  "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) payable returns (uint256 amountOut)",
]);
const EXACT_INPUT_SINGLE = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
]);

const ROUTER_02_BASE = "0x2626664c2603336E57B271c5C0b26F421741e481"; // Base SwapRouter02
const ROUTER_CLASSIC = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // classic SwapRouter (two-hop)
const ROUTER_AERO = "0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const CBHYPE = "0xB200000000000000000000451d033a5000cb479e";
const UNI = "0xc3De830EA07524a0761646a6a4e4be0e114a3C83";
const AAVE = "0x63706e401c06ac8513145b7687A14804d17f814b";
const MORPHO = "0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842";
const SKY = "0x56072C95FAA701256059aa122697B133aDEd9279";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Ethereum hub for ZAMA (v3)
const ZAMA = "0xa12cc123ba206d4031d1c7f6223d1c2ec249f4f3";
const RANDOM = "0x1111111111111111111111111111111111111111";
const ACCOUNT = "0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA";

function pathBytes(parts) {
  let hex = "0x";
  for (const p of parts) {
    if (typeof p === "string") hex += p.slice(2).toLowerCase();
    else hex += p.toString(16).padStart(6, "0");
  }
  return hex;
}

function exactInput(pathHex, recipient, amountIn, minOut) {
  return encodeFunctionData({
    abi: EXACT_INPUT,
    functionName: "exactInput",
    args: [
      {
        path: pathHex,
        recipient,
        deadline: BigInt(2000000000),
        amountIn: BigInt(amountIn),
        amountOutMinimum: BigInt(minOut),
      },
    ],
  });
}

function exactInputSingle(tokenIn, fee, tokenOut, recipient, amountIn, minOut) {
  return encodeFunctionData({
    abi: EXACT_INPUT_SINGLE,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn,
        tokenOut,
        fee,
        recipient,
        amountIn: BigInt(amountIn),
        amountOutMinimum: BigInt(minOut),
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
}

const singleBuy = (t0, fee, t1) => pathBytes([t0, fee, t1]);
const twoHop = (t0, fee1, via, fee2, t1) => pathBytes([t0, fee1, via, fee2, t1]);

// ── Base ──────────────────────────────────────────────────────────────────────
const base = [];
const badd = (label, target, calldata, expect, value = "0") =>
  base.push({ label, target, calldata, value, expect });

// Must-pass — exactInputSingle (single-hop Uniswap V3, SwapRouter02)
badd("buy UNI (1%) via exactInputSingle", ROUTER_02_BASE, exactInputSingle(USDC_BASE, 10000, UNI, ACCOUNT, 500_000_000, 1), "pass");
badd("buy AAVE (0.3%) via exactInputSingle", ROUTER_02_BASE, exactInputSingle(USDC_BASE, 3000, AAVE, ACCOUNT, 500_000_000, 1), "pass");
badd("buy MORPHO (1%) via exactInputSingle", ROUTER_02_BASE, exactInputSingle(USDC_BASE, 10000, MORPHO, ACCOUNT, 500_000_000, 1), "pass");
badd("sell UNI back to USDC via exactInputSingle", ROUTER_02_BASE, exactInputSingle(UNI, 10000, USDC_BASE, ACCOUNT, 10n ** 18n, 1), "pass");
badd("sell AAVE back to USDC via exactInputSingle (exit)", ROUTER_02_BASE, exactInputSingle(AAVE, 3000, USDC_BASE, ACCOUNT, 10n ** 18n, 1), "pass");
badd("sell MORPHO back to USDC via exactInputSingle (exit)", ROUTER_02_BASE, exactInputSingle(MORPHO, 10000, USDC_BASE, ACCOUNT, 100n * 10n ** 18n, 1), "pass");
badd("sell full cbHYPE position (exit, 1000 units)", ROUTER_AERO, exactInput(singleBuy(CBHYPE, 200, USDC_BASE), ACCOUNT, 1000n * 10n ** 18n, 1), "pass");
badd("buy AAVE at cap (1000 USDC)", ROUTER_02_BASE, exactInputSingle(USDC_BASE, 3000, AAVE, ACCOUNT, 1_000_000_000, 1), "pass");
// Must-pass — exactInput (Aerodrome Slipstream, tickSpacing 200)
badd("buy cbHYPE via Aerodrome (tickSpacing 200)", ROUTER_AERO, exactInput(singleBuy(USDC_BASE, 200, CBHYPE), ACCOUNT, 500_000_000, 1), "pass");
badd("sell cbHYPE back to USDC (Aerodrome)", ROUTER_AERO, exactInput(singleBuy(CBHYPE, 200, USDC_BASE), ACCOUNT, 10n ** 18n, 1), "pass");

// Must-fail
badd("over-cap buy (1001 USDC) via exactInputSingle", ROUTER_02_BASE, exactInputSingle(USDC_BASE, 3000, AAVE, ACCOUNT, 1_001_000_000, 1), "fail");
badd("wrong router", RANDOM, exactInputSingle(USDC_BASE, 3000, AAVE, ACCOUNT, 500_000_000, 1), "fail");
badd("wrong recipient (not SMA)", ROUTER_02_BASE, exactInputSingle(USDC_BASE, 3000, AAVE, RANDOM, 500_000_000, 1), "fail");
badd("unlisted tokenOut (SKY on Base)", ROUTER_02_BASE, exactInputSingle(USDC_BASE, 3000, SKY, ACCOUNT, 500_000_000, 1), "fail");
badd("exactInputSingle native value", ROUTER_02_BASE, exactInputSingle(USDC_BASE, 3000, AAVE, ACCOUNT, 500_000_000, 1), "fail", "1");
badd("zero minOut (exactInputSingle)", ROUTER_02_BASE, exactInputSingle(USDC_BASE, 3000, AAVE, ACCOUNT, 500_000_000, 0), "fail");
badd("exactInput (multi-hop shape) to SwapRouter02 — structurally authorized (would revert in-router, no value loss)", ROUTER_02_BASE, exactInput(singleBuy(USDC_BASE, 3000, AAVE), ACCOUNT, 500_000_000, 1), "pass");

writeFileSync(".sail/probes-swap-base.json", JSON.stringify(base, null, 2));
console.log("wrote .sail/probes-swap-base.json (" + base.length + " probes)");

// ── Ethereum ──────────────────────────────────────────────────────────────────
const eth = [];
const eadd = (label, target, calldata, expect, value = "0") =>
  eth.push({ label, target, calldata, value, expect });

// Must-pass — exactInput two-hop via classic SwapRouter
eadd("buy SKY two-hop USDC→WETH→SKY", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, WETH, 3000, SKY), ACCOUNT, 500_000_000, 1), "pass");
eadd("sell SKY back two-hop", ROUTER_CLASSIC, exactInput(twoHop(SKY, 3000, WETH, 500, USDC_ETH), ACCOUNT, 100n * 10n ** 18n, 1), "pass");
eadd("buy SKY at cap (1000 USDC)", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, WETH, 3000, SKY), ACCOUNT, 1_000_000_000, 1), "pass");

// Must-fail
eadd("over-cap buy", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, WETH, 3000, SKY), ACCOUNT, 1_001_000_000, 1), "fail");
eadd("two-hop via non-WETH", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, RANDOM, 3000, SKY), ACCOUNT, 500_000_000, 1), "fail");
eadd("wrong recipient", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, WETH, 3000, SKY), RANDOM, 500_000_000, 1), "fail");
eadd("zero minOut", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, WETH, 3000, SKY), ACCOUNT, 500_000_000, 0), "fail");
eadd("wrong router", RANDOM, exactInput(twoHop(USDC_ETH, 500, WETH, 3000, SKY), ACCOUNT, 500_000_000, 1), "fail");

writeFileSync(".sail/probes-swap-eth.json", JSON.stringify(eth, null, 2));
console.log("wrote .sail/probes-swap-eth.json (" + eth.length + " probes)");

// ── Ethereum v3 (SKY + ZAMA; hubs WETH + USDT) — .sail/args-swap-eth-v3.json ─────────────
const eth3 = [...eth];
const e3 = (label, target, calldata, expect, value = "0") =>
  eth3.push({ label, target, calldata, value, expect });
// Must-pass
e3("buy ZAMA two-hop USDC→USDT→ZAMA (fee 500/500)", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, USDT, 500, ZAMA), ACCOUNT, 50_000_000, 1), "pass");
e3("sell ZAMA back two-hop ZAMA→USDT→USDC", ROUTER_CLASSIC, exactInput(twoHop(ZAMA, 500, USDT, 500, USDC_ETH), ACCOUNT, 1000n * 10n ** 18n, 1), "pass");
e3("buy ZAMA at cap (1000 USDC)", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, USDT, 500, ZAMA), ACCOUNT, 1_000_000_000, 1), "pass");
// Must-fail
e3("ZAMA over-cap buy (1001 USDC)", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, USDT, 500, ZAMA), ACCOUNT, 1_001_000_000, 1), "fail");
e3("ZAMA via unlisted hub", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, RANDOM, 500, ZAMA), ACCOUNT, 50_000_000, 1), "fail");
e3("USDT as tokenOut (hub is not a basket token)", ROUTER_CLASSIC, exactInput(singleBuy(USDC_ETH, 500, USDT), ACCOUNT, 50_000_000, 1), "fail");
e3("ZAMA buy with zero minOut", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, USDT, 500, ZAMA), ACCOUNT, 50_000_000, 0), "fail");
e3("ZAMA buy to wrong recipient", ROUTER_CLASSIC, exactInput(twoHop(USDC_ETH, 500, USDT, 500, ZAMA), RANDOM, 50_000_000, 1), "fail");
writeFileSync(".sail/probes-swap-eth-v3.json", JSON.stringify(eth3, null, 2));
console.log("wrote .sail/probes-swap-eth-v3.json (" + eth3.length + " probes)");
