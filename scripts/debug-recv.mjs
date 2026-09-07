// Reproduce the runner's resolvePermissionForCall for the receiveMessage dispatch
// to see whether evaluate() returns true, false, or throws.
import { createPublicClient, http, getAddress } from "viem";
import { base, mainnet } from "viem/chains";
import fs from "node:fs";
import path from "node:path";

const sail = path.join(process.cwd(), ".sail");
function env() {
  const out = {};
  for (const line of fs.readFileSync(path.join(sail, ".env.local"), "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const E = env();
const RPC1 = E.RPC_URL_1;
const KERNEL = "0x38b508756c976e876EFF05a29E731A4d348BA6ED";
const ACCOUNT = "0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA";
const MANAGER = "0x72cc50a0Cf19F737D10FCB82D694d626D6795047";

const pc = createPublicClient({ chain: mainnet, transport: http(RPC1) });

const REGISTRATION_EPOCH_ABI = [{ type: "function", name: "registrationEpoch", stateMutability: "view", inputs: [{ name: "account", type: "address" }, { name: "permission", type: "address" }], outputs: [{ type: "uint256" }] }];

const IPERMISSION_ABI = [{
  name: "evaluate", type: "function", stateMutability: "view",
  inputs: [
    { name: "txData", type: "bytes" },
    { name: "ctx", type: "tuple", components: [
      { name: "account", type: "address" },
      { name: "manager", type: "address" },
      { name: "submitter", type: "address" },
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
      { name: "value", type: "uint256" },
      { name: "blockTimestamp", type: "uint256" },
      { name: "blockNumber", type: "uint256" },
      { name: "configEpoch", type: "uint256" },
    ]},
  ],
  outputs: [{ name: "", type: "bool" }],
}];

const BRIDGE = "0x7A8a4ac51052fF00B84D77D18398077Fb1C60b4d";
const SWAPV2 = "0x10884d75a883b5b0b8e41c65Cf373622D90fe78F";

// receiveMessage(bytes,bytes) with dummy args, selector 0x57ecfd28
const recvData = "0x57ecfd28" + "00".repeat(32) + "00".repeat(32) + "00".repeat(32) + "00".repeat(32);

async function check(perm, label, target, data) {
  try {
    const epoch = await pc.readContract({ address: KERNEL, abi: REGISTRATION_EPOCH_ABI, functionName: "registrationEpoch", args: [ACCOUNT, perm] });
    const block = await pc.getBlock();
    const ctx = {
      account: ACCOUNT, manager: MANAGER, submitter: MANAGER,
      target, selector: data.slice(0, 10), value: 0n,
      blockTimestamp: block.timestamp, blockNumber: block.number, configEpoch: epoch,
    };
    try {
      const accepted = await pc.readContract({ address: perm, abi: IPERMISSION_ABI, functionName: "evaluate", args: [data, ctx] });
      console.log(`${label} (${perm.slice(0,10)}): evaluate = ${accepted}`);
    } catch (e) {
      console.log(`${label} (${perm.slice(0,10)}): evaluate THREW: ${e.shortMessage || e.message.split("\n")[0]}`);
    }
  } catch (e) {
    console.log(`${label}: registrationEpoch THREW: ${e.shortMessage || e.message.split("\n")[0]}`);
  }
}

await check(BRIDGE, "bridge receiveMessage", "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81", recvData);
await check(SWAPV2, "swapv2 receiveMessage (should be false)", "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81", recvData);
