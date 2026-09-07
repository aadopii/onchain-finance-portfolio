// Build simulate probes for CctpBridgePermission. Flat params, no tuple.
import { encodeFunctionData, parseAbi } from "viem";
import { writeFileSync } from "node:fs";

const DEPOSIT_FOR_BURN = parseAbi([
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) returns (uint64 nonce)",
]);
const RECEIVE_MESSAGE = parseAbi([
  "function receiveMessage(bytes message, bytes attestation) returns (bool success)",
]);

const ACCOUNT = "0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA";
// Base
const MESSENGER_BASE = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
const TRANSMITTER_BASE = "0xAD09780d193884d503182aD4588450C416D6F9D4";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
// Ethereum
const MESSENGER_ETH = "0xBd3fa81B58Ba92a82136038B25aDec7066af3155";
const TRANSMITTER_ETH = "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81";
const USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const selfRecipient = "0x" + "0".repeat(24) + ACCOUNT.slice(2);

function burn(amount, domain, recipient, token) {
  return encodeFunctionData({
    abi: DEPOSIT_FOR_BURN,
    functionName: "depositForBurn",
    args: [BigInt(amount), domain, recipient, token],
  });
}
function receive(message, attestation) {
  return encodeFunctionData({
    abi: RECEIVE_MESSAGE,
    functionName: "receiveMessage",
    args: [message, attestation],
  });
}

// ── Base bridge (burn USDC → Ethereum domain 0) ──────────────────────────────
const base = [];
function badd(label, target, calldata, expect) {
  base.push({ label, target, calldata, value: "0", expect });
}
badd("burn 500 USDC to domain 0 (self-recipient)", MESSENGER_BASE, burn(500e6, 0, selfRecipient, USDC_BASE), "pass");
badd("burn at cap (1000 USDC)", MESSENGER_BASE, burn(1000e6, 0, selfRecipient, USDC_BASE), "pass");
badd("burn over cap (1001 USDC)", MESSENGER_BASE, burn(1001e6, 0, selfRecipient, USDC_BASE), "fail");
badd("burn to off-allowlist domain (6=Base itself)", MESSENGER_BASE, burn(500e6, 6, selfRecipient, USDC_BASE), "fail");
badd("burn non-USDC token", MESSENGER_BASE, burn(500e6, 0, selfRecipient, USDC_ETH), "fail");
const badRecipient = "0x" + "00".repeat(24) + "beef" + "00".repeat(6); // 32-byte non-self mintRecipient
badd("burn to non-self recipient", MESSENGER_BASE, burn(500e6, 0, badRecipient, USDC_BASE), "fail");
badd("wrong target (not messenger)", TRANSMITTER_BASE, burn(500e6, 0, selfRecipient, USDC_BASE), "fail");
writeFileSync(".sail/probes-bridge-base.json", JSON.stringify(base, null, 2));
console.log("wrote .sail/probes-bridge-base.json (" + base.length + " probes)");

// ── Ethereum bridge (receiveMessage to mint) ────────────────────────────────
const eth = [];
function eadd(label, target, calldata, expect) {
  eth.push({ label, target, calldata, value: "0", expect });
}
const dummy = "0x" + "00".repeat(32);
eadd("receiveMessage on transmitter (mint half)", TRANSMITTER_ETH, receive(dummy, dummy), "pass");
eadd("receiveMessage on wrong target (messenger)", MESSENGER_ETH, receive(dummy, dummy), "fail");
eadd("depositForBurn on transmitter (wrong selector)", TRANSMITTER_ETH, burn(500e6, 0, selfRecipient, USDC_ETH), "fail");
writeFileSync(".sail/probes-bridge-eth.json", JSON.stringify(eth, null, 2));
console.log("wrote .sail/probes-bridge-eth.json (" + eth.length + " probes)");
