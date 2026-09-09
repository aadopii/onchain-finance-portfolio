# Bug Report — MORPHO under-allocation in portfolio agent (3 root-cause bugs)

**Project:** `onchain_finance_portfolio` · Sailor `2.2.0-317`
**SMA:** `0xF516aEdbA31c6E5E581Ab45D6dc6F2aA29f536eA` (Base `8453` + Ethereum `1`)
**Date:** September 2026

---

## Summary

After distributing 1,000 USDC across a 5-asset basket, **MORPHO settled at 14.6%
allocation vs. a 17.5% target**, while the other four assets all landed within
±1.6 percentage points of target:

| Asset   | Target | Actual | Delta |
|---------|--------|--------|-------|
| cbHYPE  | 30.0%  | 31.7%  | +1.7pp |
| UNI     | 17.5%  | 17.9%  | +0.4pp |
| AAVE    | 17.5%  | 18.0%  | +0.5pp |
| MORPHO  | 17.5%  | **14.6%** | **−2.9pp** |
| SKY     | 17.5%  | 17.9%  | +0.4pp |

This is not random slippage. Three separate defects in the distribution loop
combine to produce a systematic, token-specific under-allocation. One of them
(in-flight capital invisibility) would under-allocate *any* token bought while a
cross-chain bridge is pending; the other two (silently-dropped reverted swaps,
all-or-nothing buy sizing) are what left MORPHO specifically stuck.

---

## Bug 1 (primary) — In-flight cross-chain capital is invisible to valuation

**Symptom.** UNI, AAVE and MORPHO were each first bought for **~$144 instead of
$175** (17.5% of the intended basket).

**Root cause.** The agent values the portfolio as the *sum of current on-chain
balances*. When USDC is burned on the source chain for a CCTP bridge, it leaves
the source chain's USDC balance immediately, but does **not** appear on the
destination chain until the mint completes — a window that can be many minutes
(or, here, ~1 hour).

The SKY leg required bridging $175 from Base to Ethereum. Timeline (all Base,
chain 8453):

| Time (UTC) | Event | Visible totalValue |
|------------|-------|--------------------|
| 18:46:03 | cbHYPE bought (~$300) | ~$1000 |
| 18:46:11 | $175 USDC burned for SKY bridge | $175 disappears, not yet minted |
| 18:46:55 | **UNI bought $144.18** | ~$825 → 17.5% = $144.4 |
| 19:09:27 | **AAVE bought $144.16** | ~$825 → 17.5% = $144.4 |
| 19:09:30 | **MORPHO bought $144.16** | ~$825 → 17.5% = $144.4 |
| 19:47:16 | SKY mint completes ($175 appears on ETH) | ~$995 |

The buys at $144.16–$144.18 are within $0.30 of `17.5% × $825`. The agent is
correctly sizing each buy — against a total that is **understated by the $175
in flight**. When the mint lands, the true total is ~$995 and every token bought
during the flight window is now ~3pp under target.

**Fix.** Track in-flight bridge amounts as "pending USDC." The ledger already
records `bridged` entries with an `amount`; add the sum of un-minted
`bridged` amounts to `totalValue` in the valuation (or value the portfolio
against cumulative deposits, not visible balances). A bridge entry should only
be removed from "pending" once the mint actually lands.

---

## Bug 2 — Slippage-reverted swaps are optimistically recorded and never retried

**Symptom.** The agent attempted a top-up for MORPHO after the SKY mint
re-priced the basket. The top-up **reverted on-chain**, but the agent recorded it
as a successful buy and never retried.

**Evidence (on-chain):**

| Swap | Path | amountIn | Result |
|------|------|----------|--------|
| `0x43a7f23d` | USDC→UNI | $33.86 | ✅ executed |
| `0xcf7468b5` | USDC→AAVE | $32.22 | ✅ executed |
| `0xd3b2d605` | USDC→MORPHO | **$33.25** | ❌ **reverted** (191k gas, `STF`) |

The three top-ups were computed in the same tick. UNI and AAVE succeeded;
MORPHO's reverted (price moved against the trade between quote and execution,
breaching the 1% `maxSlippageBps` floor — the sim reports `STF` /
SafeTransferFailed).

**Root cause.** `swap()` appends `kind:"bought"` to the ledger *before* the
dispatch confirms on-chain. A reverted swap is indistinguishable from a
successful one to the ledger, and there is no retry path: the next tick
recomputes the shortfall against a *new* (lower) cash position, so the capital
that would have funded the retry has already been spent by other legs.

**Fix.** Write `bought` only after the swap confirms (the runner surfaces the
outcome as `dispatch_executed` vs `dispatch_reverted`). On a reverted swap,
retry next tick with a fresh quote and adaptive slippage (e.g. widen
`maxSlippageBps` by a few bps per retry up to a cap), rather than dropping it.

---

## Bug 3 — Buy sizing is all-or-nothing per token; partial cash can't fund a shortfall

**Symptom.** MORPHO is now $32.89 short of target, and **$26.42 of idle USDC sits
on Base** doing nothing — the agent declines to spend it because it isn't quite
enough to cover the full shortfall.

**Root cause.** `pickBuyChain` requires the chain to hold `>=` the full shortfall
(`if (toBase(raw) >= buyUsd) return chainId`). When idle cash is below the
shortfall, the token is skipped entirely and the cash stays idle. Combined with
Bug 2 (the reverted top-up), MORPHO is left permanently ~3pp under target with
no path to recover until a new deposit arrives.

**Fix.** Allow partial buys: size each buy as `min(shortfall, available cash)`.
Better, in invest mode, sweep idle USDC across *all* under-target tokens
proportionally to their deficits in a single pass, so partial cash still moves
every laggard toward target instead of funding the first token in basket order
and starving the rest.

**Status: FIXED (in this project).** `pickBuyChain` now returns the chain holding
the most settlement currency (not a boolean "enough or not"), and the buy loop
caps each buy at `min(shortfall, available)`. Verified: the $26.42 idle balance
was swept into MORPHO (14.6% → 16.79%), and the final $10 deposit closed the gap
(16.79% → 17.41%). Idle USDC on Base went from $26.42 → $0.

---

## Bug 4 — Buy loop reads cash fresh per token, can over-dispatch

**Symptom.** While fixing Bug 3 it became clear the buy loop re-reads the
settlement balance on-chain *once per token*. When several tokens are under
target in the same tick, each leg sees the *same* full cash balance and queues
its full shortfall — so the agent can dispatch more USDC in buys than the SMA
actually holds. The excess legs then revert on-chain (insufficient balance),
which is the exact silent-failure mode of Bug 2, re-triggered on every deposit.

**Root cause.** The spend check is per-leg with no shared budget. `pickBuyChain`
queried `read.balance()` inside the per-token loop, so there was no accounting
for what earlier legs in the same tick had already committed.

**Fix.** Value the portfolio once up front and record idle cash per chain into a
mutable budget; decrement it as each buy is queued. Any leg that would exceed
the remaining budget is capped to it (or skipped). This guarantees the sum of
queued buys never exceeds on-chain holdings in a single tick.

**Status: FIXED (in this project).** `availableByChain` budget is computed in the
valuation pass and decremented on each accepted buy. `pickBuyChain` now takes the
budget map instead of re-reading the chain.

---

## Aggravating factor (lower severity) — rebalance band masks the shortfall

The rebalance band is ±10 percentage points (`rebalanceBandBps: 1000`). A token
3pp under target is classified **"in band"** and reported as "nothing to
rebalance." Only deviations beyond ±10pp trigger corrective action. Consider
narrowing the default band, or surfacing "under target but in band" as a
distinct report state so a silent 3pp drift is visible.

---

## Evidence — full on-chain swap sequence (Base, chain 8453)

| tx | Path | amountIn | Outcome |
|----|------|----------|---------|
| `0x63a3e79b` | USDC→cbHYPE (Aerodrome) | ~$300 | ✅ |
| `0x9ca508aa` | SKY bridge burn ($175 → ETH) | — | ✅ |
| `0xcc675911` | USDC→UNI (fee 10000) | $144.18 | ✅ |
| `0x673fc9c0` | (first AAVE/MORPHO attempt) | — | ❌ (approve-loop era) |
| `0x69171004` | USDC→AAVE (fee 3000) | $144.16 | ✅ |
| `0xc8393198` | USDC→MORPHO (fee 10000) | $144.16 | ✅ |
| `0x5ff6f26f` | SKY mint (receiveMessage, ETH) | — | ✅ |
| `0x43a7f23d` | USDC→UNI (top-up) | $33.86 | ✅ |
| `0xcf7468b5` | USDC→AAVE (top-up) | $32.22 | ✅ |
| `0xd3b2d605` | USDC→MORPHO (top-up) | $33.25 | ❌ reverted |
| `0x4444af0b` | USDC→WETH→SKY (two-hop, ETH) | $174.17 | ✅ |

---

## Impact

- A user's portfolio silently under-allocates one asset by ~3pp (≈$33 on a $1k
  account) with no visible error and no automatic recovery.
- Cost basis was also corrupted by optimistic `bought` writes (reported
  $3,446 vs. true $972.75), producing a bogus −$2,480 P&L until manually
  reconciled. (Same root cause as Bug 2: ledger entries written before on-chain
  confirmation.)
- The wide rebalance band means the report claims "all holdings in band" while
  one holding sits materially below target.

---

## Resolution — fixes applied and verified in this project

All four bugs are fixed in the runtime (`src/agent.ts`, `src/report.ts`), verified by
`npm run typecheck` and `npm test` (64/64) on 2026-09-09:

- **Bug 1 — in-flight capital invisible to valuation.** `pendingBridgeUsd()` sums the USDC
  burned on a source chain and not yet minted on its destination (the ledger's confirmed
  `bridged` entries whose mint has not landed) and the snapshot adds it to `totalValue` as
  `pendingBridgeUsdc`, so a bridge in flight no longer reads as a loss and no longer triggers a
  phantom trim.
- **Bug 2 — reverted swaps recorded as bought.** A buy/sell is written to the ledger as a
  pending *trade intent* and becomes a confirmed `bought`/`sold` only when the runner's
  `dispatch_executed` entry (with its tx hash) shows up in `.sail/activity.jsonl`; a
  reverted, denied or errored dispatch becomes a `tradeFailed` marker (no cost-basis entry),
  and the next tick re-quotes and retries with adaptive slippage.
- **Bug 3 — all-or-nothing buys.** Every buy is sized at `min(shortfall, remaining budget)`,
  so partial idle cash still moves every laggard toward target (the same rule applies to
  the bridge reserve).
- **Bug 4 — per-token fresh balance reads.** The USDC balance per chain is read once at the
  start of the tick into a shared per-chain spend budget that every buy and bridge leg
  decrements, so a tick can never dispatch more than it holds.
- **Added on the same review — unpriced holdings pause trading.** If a basket token's pool
  gives no quote, its value (and every weight) is unknown; the holding is reported as
  `unpriced` and every trim and buy is paused for that tick instead of acting on a wrong
  weight.

Final allocation after the fixes and a $10 top-up (total value $1,009.40):

| Asset   | Target | Before | After  |
|---------|--------|--------|--------|
| cbHYPE  | 30.0%  | 30.5%  | 30.14% |
| UNI     | 17.5%  | 17.6%  | 17.58% |
| AAVE    | 17.5%  | 17.5%  | 17.51% |
| MORPHO  | 17.5%  | 14.6%  | 17.41% |
| SKY     | 17.5%  | 17.5%  | 17.33% |

---

## Telegram report enhancement — for the Sailor team

**Problem.** The default report is a flat, plain-text block. Every line carries
equal visual weight, so nothing leads: the "all in band" conclusion is buried at
the bottom, a deposit reads as a market gain, and there is no sense that an agent
is actively working. For a product whose value is enforced discipline, the report
should read like an agent's account of its own work, not a spreadsheet.

**What was built (in this project):** a three-state report driven by a weekly
flow decomposition. The skeleton is fixed — *verdict → score → what the agent did
→ allocation → action* — and only the first three change by state.

| State | Verdict | Change breakdown |
|-------|---------|------------------|
| Deposit | "$X received and invested." | "+$X deposited · +$Y market" |
| Withdrawal | "$X withdrawn. Everything still on track." | "−$X withdrawn · +$Y market" |
| Normal | "Everything is on track. Nothing needs you." | "+$Z this week" |

**The key mechanic: flow decomposition via the `costBasis + idleUsdc` invariant.**
`costBasis + idleUsdc` (net USDC spent on buys minus sells, plus unspent USDC) is
invariant to the agent's own trading — a buy moves USDC from idle into costBasis
and the sum is unchanged. Its week-over-week change is therefore pure external
flow (deposits − withdrawals); the market leg is the change in unrealized P&L.
This is what lets the report split a deposit from a price move, so a $500 deposit
never masquerades as a $500 gain.

**Supporting changes:**
- Ledger `bought`/`sold` entries now carry a `symbol`, so the report can say
  "bought $35 of MORPHO" instead of an anonymous amount.
- The `reported` ledger entry now persists the snapshot values (totalValue,
  investedValue, costBasis, idleUsdc), giving the next report a baseline to
  decompose against.
- Telegram delivery switched to `parse_mode: HTML` with per-holding progress bars
  (filled `█` against a `▏` target tick) and a status emoji (🟢 in band, 🟡 buy,
  🔴 sell).

**Recommendation for the upstream Telegram flow/skill:** adopt the three-state
skeleton as the default. Two things matter most: (1) the verdict goes FIRST, not
last — a user reads one line and knows whether anything needs them; (2) deposits
and withdrawals are split from market movement, never folded into it. Per-token
news/headlines were deliberately omitted — they answer none of the report's three
questions (am I okay, what happened, do I need to act) and invite the reactive
behavior the mandate exists to prevent.
