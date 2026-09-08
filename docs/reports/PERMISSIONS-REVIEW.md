# Permissions review — Onchain Finance Portfolio SMA

**SMA:** `0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA` (Base `8453` + Ethereum `1`)
**Kernel:** `0x38b508756c976e876EFF05a29E731A4d348BA6ED` (selective dispatch) · governance fee `0.00015 ETH` per permission on both chains
**Reviewed:** 2026-09-07, against live `getPermissions()`, `sailor doctor`, and the constructor args decoded from each deploy transaction.

Verdict in one line: **the structure is sound (funds cannot leave the SMA through any registered
permission), but four superseded permissions are still live, the Ethereum pair must be replaced to
admit ZAMA, and the agent's scheduled run has been failing since it was installed.**

---

## 1. What is registered today (6 permissions after the 2026-09-07 revocations: 3 on Base, 3 on Ethereum)

| # | Chain | Name (local) | Address | What it bounds | Status |
|---|---|---|---|---|---|
| 1 | Base | CctpBridgePermission | `0xa94F…7018` | `depositForBurn` on the Base TokenMessenger: USDC only, ≤ 1,000 USDC/tx, dest domain **0 (Ethereum) only**, mint recipient == SMA; `receiveMessage` on the transmitter | **Keep** |
| 2 | Ethereum | CctpBridgePermission | `0x7A8a…0b4d` | Same, mirrored: dest domain **6 (Base) only** | **Keep** |
| 3 | Base | ExactInputSwapPermission (v1) | `0x5CD7…b31f` | Old calldata layout (creation bytecode ≠ current source). Routers: `0x68b3…Fc45` (**Ethereum's** SwapRouter02, no code on Base) + Aerodrome | **Revoke** — dead, wrong-chain router |
| 4 | Ethereum | ExactInputSwapPermission (v1) | `0xE0ba…cd64` | Old calldata layout. Router `0x68b3…Fc45` (SwapRouter02), tokensOut [SKY], via [WETH] | **Revoke** — dead layout |
| 5 | Base | BoundedErc20Approve (v1) | `0xBf4F…1ae9` | approve() on USDC/cbHYPE/UNI/AAVE/MORPHO to `0x68b3…Fc45` (no code on Base), Aerodrome, CCTP messenger; uncapped | **Revoke** — superseded, still auto-resolved by the runner (used 2026-09-03 21:32 UTC) |
| 6 | Ethereum | BoundedErc20Approve (v1) | `0xd89c…b449` | approve() on USDC/SKY to `0x68b3…Fc45` + messenger; uncapped | **Revoke** — dangling allowance target no swap permission covers |
| 7 | Base | ExactInputSwapPermission-v2 | `0x2b70…449A` | `exactInput`/`exactInputSingle` on SwapRouter02 `0x2626…e481` + Aerodrome; tokensIn [USDC]; tokensOut [cbHYPE, UNI, AAVE, MORPHO]; recipient == SMA; buy ≤ 1,000 USDC/tx; sell ≤ 1e24 units; minOut > 0 | **Keep** |
| 8 | Base | BoundedErc20Approve-v2 | `0xB9CA…9D8` | approve() on USDC + 4 basket tokens to SwapRouter02, Aerodrome, messenger; uncapped | **Keep** |
| 9 | Ethereum | ExactInputSwapPermission-v2 | `0x1088…e78F` | classic SwapRouter `0xE592…1564`; tokensOut [SKY]; via [WETH]; same caps | **Superseded by v3 on 2026-09-07 — revoke** |
| 10 | Ethereum | BoundedErc20Approve-v2 | `0x1073…182B` | approve() on USDC, SKY to classic router + messenger; uncapped | **Superseded by v3 on 2026-09-07 — revoke** |
| 11 | Ethereum | ExactInputSwapPermission-v3 | `0x132A…dAAf` | classic SwapRouter; tokensOut [SKY, ZAMA]; via [WETH, USDT]; same caps. Simulated 16/16, registered tx `0xb8df4761…` | **Keep** |
| 12 | Ethereum | BoundedErc20Approve-v3 | `0x1792…37FA` | approve() on USDC, SKY, ZAMA to classic router + messenger; uncapped. Simulated 13/13, registered tx `0xb8df4761…` | **Keep** |

Every permission pins `recipient == account` (swaps) or `mintRecipient == account` (bridge) and
rejects native value. There is no registered path by which the manager key can move value to any
address other than the SMA itself. That is the property that matters most, and it holds.

---

## 2. Findings, ordered by what to act on first

### F1 — The scheduled agent run has never succeeded (operational, high)

`~/Library/LaunchAgents/com.sail.onchain-finance-portfolio.plist` fires `sailor run --once` daily
at 11:00, but every run dies before Sailor starts: `.sail/agent.log` contains only

```
shell-init: error retrieving current directory: getcwd: cannot access parent directories: Operation not permitted
/bin/bash: ./.sail/.env.local: Operation not permitted
```

macOS TCC blocks launchd-spawned processes from reading `~/Desktop` (this project lives there);
your other agents under `~/` run fine. The only successful ticks were manual (2026-09-03, 2026-09-05).
Until this is fixed there is no unattended investing, rebalancing, or Telegram report.

Fix (pick one): move the project out of `~/Desktop` (e.g. `~/onchain_finance_portfolio`) and update
the plist's paths, or grant `/bin/bash` Full Disk Access in System Settings → Privacy & Security
(broader than needed). Moving is the cleaner option and matches your other agents.

### F2 — Four superseded permissions are still live (hygiene, medium)

Rows 3–6 above. The v1 swap permissions have an obsolete calldata layout and reference the
**Ethereum** SwapRouter02 address on Base (no code there). The v1 approve permissions still work
and the runner still auto-resolves through them (row 5 authorised the unlimited USDC approve on
2026-09-03). None of them opens an exit for funds, but each is extra attack surface, they make the
dashboard show 10 permissions where 6 are real, and `mandate sign` keeps re-listing them.

Revoke (owner signs once per chain, agent submits, no refund of the 0.00015 ETH fee):

```bash
CHAIN_ID=8453 sailor mandate revoke --address 0x5cd7e027a71212d263e02b4b83116fe53206b31f,0xbf4f10905ef248edf61632056852119802b51ae9 --sma 0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA --json
```

```bash
CHAIN_ID=1 sailor mandate revoke --address 0xe0bac00cfb555d514052fde0488b2b6bf95fcd64,0xd89c79a394e4257544a1042b90e1f62683d4b449 --sma 0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA --json
```

Do the Ethereum revocation **after** v3 is registered (section 3) so the ETH v2 pair can go in the
same signature.

### F3 — Standing unlimited allowances (design, medium)

`BoundedErc20Approve` is deployed with `MAX_APPROVAL = 0` (uncapped) and the runtime approves
`2^256 − 1` to each router and messenger. The routers (Uniswap SwapRouter02, classic SwapRouter,
Aerodrome, CCTP TokenMessenger) are immutable and only pull tokens from `msg.sender` inside a call
the SMA itself makes, so the exposure is "a bug in one of those contracts", not "a third party
drains the allowance". The `AGENTS.md` invariant of *never infinite* applies to the owner-set
model; the agent-managed default trades that ceiling for never needing a top-up signature.

Improve later, not now: cap `MAX_APPROVAL` at roughly a year of trading (e.g. 5,000 USDC) **and**
change the runtime to approve that cap instead of `MAX_UINT256` (the two must move together, or
every approve is denied and no swap fires). Left uncapped in the v3 args so the runtime keeps
working unchanged.

### F4 — The on-chain price floor is a dust guard, not a slippage bound (design, medium)

The swap permissions require `amountOutMinimum > 0` and cap sells at `1e24` units (effectively
unbounded). The real 1% floor is computed off-chain by the agent. A compromised manager key could
therefore sell holdings into thin pools at any price (UNI's Base pool ≈ $19k, cbHYPE ≈ $58k
observed at onboarding) — the loss bound is the position size, though the proceeds stay in the SMA.
This is the residual risk of the current design and the one worth spending on next: an
oracle-checked min-out (the shared `SwapPermission` template's tolerance check) or a sell cap sized
to a fraction of each position.

### F5 — Bridge has no cumulative cap on-chain (low)

Per-transaction cap 1,000 USDC, domain allowlist, self-recipient. A looping bridge would only move
USDC between the SMA's own two addresses, paying CCTP gas. Acceptable.

### F6 — Ethereum gas is low on both wallets (operational, low)

`sailor doctor` flags both: manager `0.000875 ETH` (~$2.2), owner `0.0045 ETH` (~$11). Registering
the two v3 permissions costs the manager `2 × 0.00015 = 0.0003 ETH` plus gas; a mainnet gas spike
would also stall a SKY/ZAMA leg. Top the manager up to ≥ 0.003 ETH before the v3 rollout.

### F7 — Secrets at rest (low)

`SAIL_PASSPHRASE` sits in plaintext in `.sail/.env.local` (mode 600) beside the encrypted manager
key, so anyone with the folder has the manager key. Fine for a kernel-bounded manager, but check
that iCloud "Desktop & Documents" sync is off for this Mac, or move the project (see F1).

---

## 3. ZAMA rollout — deploy → simulate → register, on Ethereum

**Revocations done 2026-09-07:** v1 swap + v1 approve on both chains and the Ethereum v2 pair were revoked (owner-signed, six transactions); the live set is now bridge + swap v2 + approve v2 on Base, and bridge + swap v3 + approve v3 on Ethereum. Mandate re-signed on both chains.

**Done 2026-09-07:** swap v3 `0x132A7e680071D2c8613243e7cD7847239355dAAf` and approve v3 `0x1792BB2504Fcc55858054F8813774985D39F37FA` deployed (owner-signed), simulated clean, registered in one signature (tx `0xb8df4761bbc65409eb77ad8a8147c36d1fc90b6ad184230cec71a8fea7e1bea8`), mandate re-signed on both chains. Remaining: the revocations below, and the reallocation run. The commands that follow are kept as the record of what was run.

ZAMA (`0xA12CC123ba206d4031D1c7f6223D1C2Ec249f4f3`, 18 decimals; verified against Coinbase,
Etherscan and Zama's docs) has no USDC pool; it trades USDC → USDT (fee 500) → ZAMA (fee 500) on
Uniswap V3 (pool `0x4d68…2bBD`, ~$520k liquidity, ~$776k 24h volume; a 50 USDC buy quoted at
~971.7 ZAMA live). The current Ethereum permissions allowlist only SKY and WETH, so the kernel would
deny every ZAMA leg. Both Ethereum permissions must be redeployed:

- `.sail/args-swap-eth-v3.json` — routers [classic SwapRouter], tokensIn [USDC], tokensOut [SKY, ZAMA], via [WETH, USDT], caps unchanged (1,000 USDC buy / 1e24 sell)
- `.sail/args-approve-eth-v3.json` — tokens [USDC, SKY, ZAMA], spenders [classic SwapRouter, CCTP messenger], uncapped
- Foundry: 61/61 tests pass including the new USDT-hub and ZAMA cases; probes regenerated to `.sail/probes-swap-eth-v3.json` (16) and `.sail/probes-approve-eth-v3.json` (13)

Cost: deploys are signed by the **owner** in the browser (≈ 0.00013 ETH total at 0.12 gwei, ≈ $0.35);
registration is paid by the **manager** (0.0003 ETH fee + gas). Then:

```bash
CHAIN_ID=1 sailor mandate deploy --contract ExactInputSwapPermission --name ExactInputSwapPermission-v3 --args-file .sail/args-swap-eth-v3.json --json
```

```bash
CHAIN_ID=1 sailor mandate deploy --contract BoundedErc20Approve --name BoundedErc20Approve-v3 --args-file .sail/args-approve-eth-v3.json --json
```

```bash
CHAIN_ID=1 sailor mandate simulate --address ExactInputSwapPermission-v3 --calls .sail/probes-swap-eth-v3.json --summary
```

```bash
CHAIN_ID=1 sailor mandate simulate --address BoundedErc20Approve-v3 --calls .sail/probes-approve-eth-v3.json --summary
```

Both simulations must report zero mismatches (the must-fail probes proven to reject). Then register
both in one signature, revoke the ETH v1 + v2 pairs in one signature, and re-sign the mandate:

```bash
CHAIN_ID=1 sailor mandate register --address ExactInputSwapPermission-v3,BoundedErc20Approve-v3 --sma 0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA --json
```

```bash
CHAIN_ID=1 sailor mandate revoke --address 0xe0bac00cfb555d514052fde0488b2b6bf95fcd64,0xd89c79a394e4257544a1042b90e1f62683d4b449,0x10884d75a883b5b0b8e41c65cf373622d90fe78f,0x1073338964c8be0767e790467bae3e923422182b --sma 0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA --json
```

```bash
sailor mandate sign --yes
```

### How the reallocation actually happens

The targets are now cbHYPE 25% / ZAMA 5% (`.sail/portfolio.json`, spec v4) and the band was
narrowed to **±5pp** on 2026-09-07 (option 1 below, applied). cbHYPE sits ~5.1pp over, so the next
`sailor run --once` trims it; the following runs bridge the proceeds and buy ZAMA. Two ways to make it happen:

1. Narrow `rebalanceBandBps` to `500` (the skill default). The next weekly rebalance then trims
   ~$52 of cbHYPE on Base, bridges it to Ethereum, and buys ZAMA. (The bug report already
   recommends a narrower band; a 3pp drift was invisible at ±10pp.)
2. Deposit ~50 USDC on Base; the next tick bridges it and buys ZAMA, leaving cbHYPE to drift down
   relatively.

Either way, register v3 first: until then the ZAMA buy is denied by the kernel (the merged runtime
records it as a failed trade and retries each tick, so nothing is lost, but USDC would sit on
Ethereum).

---

## 4. 2026-09-08 — Robinhood Chain and the Across routes

CRCL (Circle, as a Robinhood stock token) joined the basket at 20%. Robinhood Chain (4663) settles in
USDG (Paxos, 6 decimals) and CCTP does not reach it, so the agent bridges there and back with
**Across** (`depositV3`, relayer-filled in seconds, refunded to the depositor if unfilled), bounded by
a new `AcrossBridgePermission` per direction. Both SpokePools are upgradeable proxies administered from
the Ethereum HubPool, whose owner is a 3-of-N Gnosis Safe (`0xB524…3715`); the per-tx cap bounds that
residual. Registered and simulated (every must-fail probe proven to reject):

| Chain | Permission | Address | Registered |
|---|---|---|---|
| Base | AcrossBridgePermission (USDC → USDG, dest 4663) | `0x6a90Fe9a29f1a66a7F3DB997B92f82b7F160EC41` | tx `0x74ddbeff…` |
| Base | BoundedErc20Approve v3 (adds the SpokePool as spender; v2 `0xB9CA…9D8` revoked, tx `0x10ef884a…`) | `0x46520565634ad7E0D6f332C4eC17177e275a5e3c` | tx `0x74ddbeff…` |
| Robinhood | ExactInputSwapPermission (USDG ↔ CRCL, SwapRouter02) | `0x34d9783d636eE686B9b92854B231CCDf6aE48C9b` | tx `0xba8eabf9…` |
| Robinhood | BoundedErc20Approve (USDG, CRCL → router, SpokePool) | `0x4E7bC6FC4f1Fa9f5d0F0460bFaE9F8e670914948` | tx `0xba8eabf9…` |
| Robinhood | AcrossBridgePermission (USDG → USDC, dest 8453) | `0xCC739fDaa582FAB80947E40b97E4c5120F601541` | tx `0xba8eabf9…` |

Live set: Base bridge + swap v2 + approve v3 + Across; Ethereum bridge + swap v3 + approve v3;
Robinhood swap + approve + Across. Both Across routes are named in `.sail/portfolio.json`, which is
what switches them on. Manager wallet balances after the fees: Base ~0.0002 ETH, Ethereum ~0.0016 ETH,
Robinhood ~0.0003 ETH — top up Base before the next deposit is invested.
