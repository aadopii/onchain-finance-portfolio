# Onchain Finance Portfolio

A self-custodied agent that holds the companies whose product is money, and keeps the basket
rebalanced across Base, Ethereum and Robinhood Chain inside on-chain permissions only the owner
controls. Built on
[Sailor](https://github.com/sail-money/Sailor) and Sail Protocol; published in the
[harbor](https://github.com/sail-money/harbor) registry as `onchain-finance-portfolio`.

One sentence: **onchain finance is undervalued as a sector, so hold the category leader of every
vertical a financial system needs, and let a machine keep the weights honest.**

- [The portfolio today](#the-portfolio-today)
- [The thesis](#the-thesis)
- [How the agent works](#how-the-agent-works)
- [Run it yourself](#run-it-yourself)
- [Operating it](#operating-it)
- [What can go wrong](#what-can-go-wrong)
- [Repository layout](#repository-layout)
- [Sources](#sources)

---

## The portfolio today

Seven names, five verticals, three chains. Weights are global targets; the chain is wherever the
asset's liquidity lives.

| Vertical | Asset | Target | Chain | Why this one |
|---|---|---|---|---|
| Exchange | HYPE (held as cbHYPE) | 20% | Base | The profitable perp exchange; ~98% of fees buy the token |
| Payments | CRCL (Robinhood stock token) | 20% | Robinhood | The issuer of USDC, $73B of onchain dollars; the sector's payment rail as an equity |
| Exchange | UNI | 14% | Base | The spot venue of record; fee switch on since Dec 2025 |
| Credit | AAVE | 14% | Base | The incumbent lender; revenue routed to buybacks since Jun 2026 |
| Credit | MORPHO | 14% | Base | The challenger lender; an option on its fee switch |
| Yield | SKY | 14% | Ethereum | The stablecoin issuer; the closest thing onchain to net interest margin |
| Privacy | ZAMA | 4% | Ethereum | The confidentiality layer institutions will need; venture-sized |

CRCL and the new weights were added on 2026-09-08. The agent buys toward them from new deposits;
nothing is sold to make room, because the moves are inside the ±10pp band. Live state of the
author's account on 2026-09-07, before that change:

| Asset | Amount | Value | Weight | Target |
|---|---|---|---|---|
| ZAMA | 991.99 | $50.42 | 5.0% | 5.0% |
| cbHYPE | 2.9731 | $252.39 | 25.0% | 25.0% |
| UNI | 27.91 | $189.15 | 18.7% | 17.5% |
| AAVE | 1.3311 | $174.99 | 17.3% | 17.5% |
| MORPHO | 70.05 | $171.23 | 16.9% | 17.5% |
| SKY | 2,515.53 | $171.51 | 17.0% | 17.5% |

Portfolio value $1,010.30, all holdings inside the ±10pp band; CRCL at 0% is the position the next
deposits fund. Idle USDC is not shown because the agent invests it on the next run. The numbers come from the local dashboard (see below), which
reads amounts live from the chain and values from the agent's last tick.

The basket is one file, [`basket.json`](basket.json). Everything else in the repository exists to
hold it safely.

---

## The thesis

### The sector

The total addressable market of these protocols is money: every trade, loan, deposit and settlement
that today runs through exchanges, banks and brokers. Stablecoins alone are already $311B of
onchain dollars (DefiLlama, 2026-09-07), and the protocols in this basket are where those dollars
get traded, lent, saved and, soon, kept private.

The mental model is the one Bitwise uses for crypto as an asset class: treat each protocol as a
company and ask four questions.

1. **How big is the market it serves?** Money, in every case. The question is only which slice.
2. **Is it winning share?** Each name below is the leader or the fastest-growing challenger of its
   vertical, measured by fees users actually pay, not by token price.
3. **Does the token capture the cash flow?** This is the question crypto skipped for a decade and
   answered in 2025 and 2026. Four of the six now return revenue to holders by buyback or burn; one
   is an explicit option on turning that on; one is pre-revenue by design.
4. **What multiple does that cash flow trade at?** Compared with what these businesses earn, the
   sector is priced like early-stage software, not like the market infrastructure it has become.

Numbers below are from DefiLlama and CoinGecko as of 2026-09-07. Fees are what users paid the
protocol over the last twelve months; revenue is the share that reaches the protocol or its token.

| Protocol | Deposits / scale | Fees (1y) | Revenue (1y) | Market cap (FDV) | Cap / revenue | Value accrual |
|---|---|---|---|---|---|---|
| Hyperliquid | $6.7B bridged | $946M | $710M | $18.9B ($81.3B) | 27x | ~98% of fees buy back HYPE |
| Uniswap | $3.6B TVL | $885M | $42M since Dec 2025, ~$140M run-rate | $4.3B ($6.1B) | 30x on run-rate | Fee switch on; 100M UNI burned, ongoing burn |
| Aave | $17.5B TVL | $795M | $103M | $2.0B ($2.1B) | 20x | Aavenomics 3.0: all revenue to buybacks |
| Morpho | $9.7B TVL | $208M | $0 | $1.7B ($2.5B) | 8x on fees | Fee switch not on; governance option |
| Sky | $11.4B stablecoins | $400M | $216M | $1.6B ($1.6B) | 7x | Smart Burn Engine buys and burns SKY |
| Zama | pre-mainnet | pre-revenue | pre-revenue | $0.13B ($0.58B) | n/a | Fees paid in ZAMA and burned |
| Circle (CRCL, equity) | $73B USDC in circulation | $701M in Q2 2026 alone | $48M net income Q2; $143M adj. EBITDA | $26B | ~9x annualised revenue | A listed company: earnings, not a token mechanism |

Together, the six tokens: about $3.2B of annual fees, about $1.1B of annual revenue, $28.7B of
market value. The sector trades at roughly 9x fees and 27x revenue, with revenue growing and
buybacks live at four of six. Circle sits beside them as the one payments company that is already a
public stock, held as a Robinhood tokenized share. That is the whole thesis in two numbers, and it
is why the position is a basket rather than a single name: the multiple compresses for the sector,
and nobody knows which vertical re-rates first.

### Exchange: HYPE and UNI (34%)

Exchanges are the first business a financial system monetises, and the two leaders are structurally
different bets, which is why both are held.

**Hyperliquid** is the profitable one. A perpetuals exchange running on its own chain, about $950M of
fees in the last twelve months, and the most aggressive value-accrual model in the sector: the
Assistance Fund routes roughly 98% of fees into open-market HYPE purchases, over $1.3B deployed by
mid-2026, about 7% of market cap per year, and since August 2026 the yield on the protocol's USDC
reserves flows there too. Value capture is not a promise here; it is a running program. The risks are
concentration and supply: one venue, one team, and an $81B fully diluted valuation against a $19B
float, so the unlock schedule matters more than for any other name in the basket. The position is
held as cbHYPE on Base, Coinbase's wrapped HYPE, which trades on Aerodrome.

**Uniswap** is the spot venue of record. About $885M of annual fees that, until December 2025, went
entirely to liquidity providers. The UNIfication vote passed with 125M votes for and 742 against:
it flipped the fee switch, burned 100M UNI, and turned Uniswap Labs into a protocol team funded by
the treasury rather than by front-end fees. UNI now owns a claim on the largest spot DEX for the first
time in its history, and ongoing burns run at roughly 4 to 5M UNI a year. At 30x a run-rate that is
still ramping, it is priced as an early-stage business rather than a nine-year-old market leader.
The thesis is that the multiple compresses as the revenue history accumulates.

### Credit: AAVE and MORPHO (28%)

Lending is where the TAM is largest and where onchain has the clearest structural advantage:
over-collateralised, liquidated by code, auditable by anyone in real time. Two names, equal weight,
one incumbent and one challenger.

**Aave** is the incumbent: about $17.5B of deposits, $795M of annual fees, and since June 2026
Aavenomics 3.0 routes protocol and GHO revenue to AAVE holders through a non-discretionary buyback,
roughly 292 AAVE removed from circulation every day. Governance cut the buyback budget from $50M to
$30M in March 2026 when borrow revenue fell from its peak, which is exactly the discipline you want
from a lender. At 20x revenue with a balance sheet that size, it is the cheapest large credit
franchise in the sector.

**Morpho** is the challenger: a minimal, immutable lending primitive with curated vaults on top,
about $9.7B in deposits and $208M of annual fees, and the rails behind Coinbase's onchain
bitcoin-backed loans. Nothing reaches the token yet, so the position is priced as governance
optionality, and it is deliberately sized the same as Aave: if the protocol keeps taking share,
governance has every incentive to turn the fee switch on, and the token re-rates from 8x fees toward
the peers. The Morpho Association's non-profit structure means value must come through the token or
not at all, which is the right kind of pressure.

### Yield: SKY (14%)

**Sky**, formerly Maker, issues USDS and DAI, about $11.4B of stablecoins, with sUSDS at $5.5B the
largest rate-bearing stablecoin by supply. It earns the spread between what its collateral yields and
what it pays savers, which is the closest thing onchain to a bank's net interest margin: about $400M
of annual fees, $216M of revenue, a Q2 2026 gross protocol revenue of $107M and net surplus of $33M,
and the Smart Burn Engine buying SKY with the surplus (55% of each cycle to buybacks since August
2026, the rest to stakers). At 7x revenue it is the cheapest cash flow in the basket. It is also the
most rate-sensitive: falling yields compress the spread, rising stablecoin supply expands it, and
governance has shown it will cut buybacks when surplus falls.

### Payments: CRCL (20%)

Every vertical above runs on dollars, and the dollar of onchain finance is USDC. **Circle** issues
it: $73.3B in circulation at the end of Q2 2026, up 19% in a year, moving $14.8T of onchain volume
in the quarter. The business is simple and enormous: reserve income on the float ($668M in Q2) plus
a growing services line, $701M of quarterly revenue, $143M of adjusted EBITDA and a first profitable
quarter as a public company. At about $26B it trades near 9x annualised revenue, a low multiple for
the toll booth of the sector, and the reason is the risk: the float earns Treasury yields, so
falling rates compress revenue directly, and Coinbase takes a large share of that income under their
distribution agreement. It is held as CRCL on Robinhood Chain, Robinhood's tokenized share backed
one-to-one by the stock, which trades against USDG on Uniswap v3. That makes it the one position
denominated in a second dollar, and the reason the agent learned to bridge with Across.

### Privacy: ZAMA (4%)

Institutions will not put balance sheets on a public ledger where every counterparty can read every
position. **Zama** builds fully homomorphic encryption for the EVM: contracts compute on encrypted
state, and ZAMA is the fee and staking token of that confidentiality layer. Fees are priced in
dollars, paid in ZAMA and burned; operators stake to run coprocessors and key-management nodes with
about 5% initial emissions. The token launched in February 2026 through a sealed-bid auction run on
the protocol itself, and mainnet throughput is still ramping through Q3 2026. This is the venture
position: small, pre-revenue, and here because the next decade of onchain finance needs a privacy
layer that this sector does not yet price. It is 5% because a thesis about the future should never
be able to sink the present.

### Sizing

Exchange and payments get the most because they are the verticals with proven value capture today:
one through buybacks, one through earnings. Credit sits just behind, split evenly between the name
that has turned revenue on and the one that has not. Yield is a single name because there is one
clear leader. Privacy is a single small name because it is a bet on adoption, not on cash flow.

### What would change the thesis

Fee switches that never turn on (Morpho); a durable loss of exchange share to a new venue (HYPE);
a regulatory outcome that pushes stablecoin issuance back to banks (SKY and Circle both); a rate
cycle that guts float income (Circle); or a valuation reset that
makes onchain finance expensive relative to the fees it earns. The agent does not react to any of
that. It rebalances to the weights above; changing them is a human decision made in `basket.json`.

---

## How the agent works

### The custody model

Your assets live in a Safe (the SMA) that only you own, deployed at the same address on Base,
Ethereum and Robinhood Chain. The agent holds a separate manager key that can only act through the Sail kernel, and the
kernel executes a call only if one of the permissions you registered says yes. The agent's code can
change without your signature; the permissions cannot. That is the entire safety argument, and it is
enforced on-chain, not by the agent being well-behaved.

| Permission | What it allows | What it refuses |
|---|---|---|
| `ExactInputSwapPermission` | Uniswap V3 and Aerodrome swaps, USDC in and basket tokens out, or the reverse, with the Safe as recipient, up to 1,000 USDC per buy | Any other router, token, recipient or selector; zero min-out; native value |
| `BoundedErc20Approve` | `approve()` on USDC and basket tokens to the routers and the CCTP messenger | Any other spender, token or function |
| `CctpBridgePermission` | `depositForBurn` of USDC, up to 1,000 USDC, to Base or Ethereum, mint recipient pinned to the Safe's own address; `receiveMessage` to complete a mint | Any other token, destination or recipient |
| `AcrossBridgePermission` | `depositV3` on the Across SpokePool: USDC on Base to USDG on Robinhood Chain and back, depositor and recipient pinned to the Safe, up to 1,000 per transaction, output at least 99.7% of input, fresh quote, deadline within 6 hours, empty message | Any other token, chain, recipient, relayer exclusivity, or any cross-chain message |

There is no registered path by which the manager key can move value to any address other than the
Safe itself. The residual risk is a bad fill: the on-chain min-out is a dust guard, the 1% slippage
floor is computed by the agent from a live quote. Source and tests are in
[`contracts/`](contracts/).

### One tick

Every run of the agent is a sequence of ticks. A tick reads the world and emits at most one round of
transactions; the runner executes them and records the outcome. In order:

1. **Reconcile.** Every pending intent from the previous tick (a buy, a sell, a bridge burn) is
   matched against the runner's outcome and confirmed into the ledger, or marked failed. Nothing is
   ever recorded as done before the chain says so.
2. **Complete bridges.** For every confirmed CCTP burn, fetch Circle's attestation, wait while it
   is pending, record the mint once the destination transmitter reports the nonce as used, otherwise
   emit `receiveMessage`. For every confirmed Across deposit, ask Across for its status and record
   the arrival only after the fill transaction is verified on the destination SpokePool; an expired
   deposit is recorded as refunded to the Safe.
3. **Value.** Read idle USDC on every chain, quote every holding through its own pool, and count USDC
   still in flight across a bridge as part of total value, so buys sized during a bridge window do
   not undershoot.
4. **Trim.** Once a week, sell the excess of any holding more than 10 percentage points over target,
   back to USDC on its own chain.
5. **Buy toward target**, in basket order. Each shortfall is bought with the idle USDC on a chain
   where the asset trades, sized to `min(shortfall, cash)`, against a shared per-chain budget so one
   tick never spends more than it holds. Shortfalls on a chain with no cash reserve their share and
   are pooled into one bridge per source and destination: CCTP between USDC chains, Across into and
   out of Robinhood Chain, where the dollar is USDG.
6. **Report.** Write the snapshot the dashboard reads, and once a week send the Telegram report,
   which splits the week's change into what you deposited or withdrew and what the market did.

### Why it runs until settled

A rebalance that crosses chains is four rounds: sell, bridge, arrive, buy, with Circle's
attestation (minutes to about an hour Base to Ethereum) or an Across fill (seconds) in the middle. A single tick cannot wait. So the
scheduled entry point is [`scripts/run-until-settled.sh`](scripts/run-until-settled.sh): it ticks,
pauses 90 seconds, and repeats until [`scripts/settled.mjs`](scripts/settled.mjs) reports that the
last tick dispatched nothing, no burn is waiting for its mint, and no trade is waiting for
confirmation. It gives up after 90 minutes and the next run resumes from the ledger. One daily run
leaves the portfolio ready.

### The ledger

`.sail/memory/ledger.jsonl` is the agent's memory across runs: intents, confirmations, bridges,
mints, cost basis, report baselines. It is append-only and reconciled against the runner's activity
log. Cost basis and unrealized P&L come from confirmed buys and sells only, which is what makes the
Telegram report's deposit-versus-market split honest.

---

## Run it yourself

You need Node 22+, [Foundry](https://book.getfoundry.sh/getting-started/installation), an RPC
endpoint for Base and one for Ethereum (a free Alchemy or Infura key is enough), and a wallet you
control for the owner signatures. Sailor runs the whole onboarding.

```bash
npm install -g @sail.money/sailor@dev
sailor harbor create onchain-finance-portfolio my-portfolio
cd my-portfolio
```

Onboarding walks five stations:

1. **Account.** Create your Safe on Base and deploy it on Ethereum and Robinhood Chain. You sign once per chain in the
   browser; the agent's manager key is generated locally and encrypted with a passphrase.
2. **Strategy.** The basket comes from `basket.json`; you confirm the weights, the rebalance band and
   the report cadence. You can edit the weights before confirming.
3. **Mandate.** Compile and deploy the permissions on each chain (swap, approve, CCTP bridge on
   the USDC chains; swap, approve and Across bridge on Robinhood Chain; Across bridge on Base), simulate them against the
   probe sets (must-pass and must-fail calls, off-chain, no gas), then register them on your Safe.
   Each deploy and the registration are signatures in the browser; the protocol charges a small
   registration fee per permission, paid by the agent wallet.
4. **Build.** The runtime is already here. `npm test` runs 45 tests; `forge test` in `contracts/`
   runs 61.
5. **Run.** Fund the agent wallet with a little ETH on each chain for gas, deposit USDC to your Safe
   on Base, and:

```bash
npm run settle
```

That is one full run: invest the deposit across the basket, bridge what Ethereum needs, complete the
mint, buy, and stop when nothing is left to do. Leave the terminal open; the bridge attestation is
the slow part.

### Scheduling

The agent has no daemon of its own. Point any scheduler at the settle script:

```bash
sailor service install --interval 86400    # Sailor-managed launchd / systemd service
```

or a plain launchd, cron or GitHub Actions entry that runs `scripts/run-until-settled.sh` once a
day. On macOS, keep the project outside `~/Desktop` and `~/Documents`, or launchd cannot read it.

### Dashboards

```bash
npm run dashboard:start    # http://localhost:4123  value, amounts, weights, targets
sailor ui start            # the Sailor dashboard: mandate, signing requests, activity
```

The custom dashboard is read-only and reads token amounts live from the chain. It never touches keys
or dispatch.

### Telegram

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.sail/.env.local` and the agent sends a weekly
report: a one-line verdict first (deposit received, withdrawal made, or nothing needs you), the
portfolio value with the week's change split into flow and market, what the agent traded, and one
progress bar per holding against its target.

---

## Operating it

**Deposit.** Send USDC to your Safe on Base. The next run invests it in proportion to the shortfalls,
bridging to Ethereum for SKY and ZAMA and to Robinhood Chain for CRCL.

**Change the weights.** Edit `basket.json` and `.sail/portfolio.json` (the runtime reads the latter;
the former is the published source of truth), keep the weights summing to 1.0, and run `npm run
settle`. A holding that ends up more than 10pp over target is trimmed on the next weekly rebalance;
buys toward target happen on every run. Adding a token that is not in the swap permission's
allowlist means redeploying that permission with the new token, which is one more signature.

**Exit.** Every swap permission authorises the reverse leg, so selling a holding to USDC is inside
the mandate. Withdrawing is an owner action on the Safe, outside the agent entirely.

**Revoke.** `sailor mandate revoke --address <permission> --sma <safe>` removes a permission; with
all three gone the agent can do nothing at all, and your assets are still in your Safe.

**Check state.** `sailor status`, `sailor doctor` (RPC, gas balances, permission health) and
`node scripts/settled.mjs` (is anything in flight).

---

## What can go wrong

- **A thin pool.** cbHYPE and UNI on Base trade in pools of tens of thousands of dollars. The agent
  quotes before every swap and refuses fills worse than 1%, but a large rebalance can move those
  pools. Size deposits accordingly, or spread them.
- **A slow attestation.** Circle can take up to an hour Base to Ethereum. The settle run waits 90
  minutes, then hands over to the next run. Money in flight is counted in total value throughout.
- **An unfilled Across deposit.** Relayers fill in seconds; if none does, Across refunds the Safe
  after the two-hour deadline and the agent records it. Exposure is one capped deposit at a time.
- **Robinhood Chain is young.** Two months old, with Robinhood holding the sequencer and upgrade
  keys, and stock-token liquidity that follows market hours. That is venue risk on a 20% sleeve.
- **Gas.** The manager wallet pays gas on both chains and the registration fees. `sailor doctor`
  flags it when it runs low; an empty wallet stalls a leg, it never loses funds.
- **A reverted swap.** Recorded as failed, never as bought; the next tick retries with a slightly
  wider slippage floor, up to +3pp.
- **A compromised manager key.** The attacker can trade inside the mandate: sell holdings to USDC at
  bad prices into thin pools. They cannot move anything out of the Safe. Revoke and rotate.

---

## Repository layout

| Path | What |
|---|---|
| [`basket.json`](basket.json) | The basket: assets, weights, chains, routes. The one file that encodes the thesis. |
| [`src/agent.ts`](src/agent.ts) | The runtime: reconcile, mints, valuation, trims, buys, pooled bridges, snapshot, report |
| [`src/report.ts`](src/report.ts) | The snapshot and the three-state Telegram report |
| [`contracts/mandates/`](contracts/mandates/) | The four permission contracts (swap, approve, CCTP, Across); tests in `contracts/test/` |
| [`scripts/run-until-settled.sh`](scripts/run-until-settled.sh) | The scheduled entry point; `settled.mjs` decides when a run is done |
| [`dashboard/server.mjs`](dashboard/server.mjs) | The read-only local dashboard |
| [`.agents/skills/`](.agents/skills/) | The Sailor skills that onboard, plan the mandate and operate the agent |
| [`docs/reports/`](docs/reports/) | The bug report, UX log and permissions review written while operating this portfolio |

Operator state (`.sail/keys`, `.env.local`, account, mandate, activity, ledger, args, probes) is
gitignored and never leaves the machine.

---

## Sources

Hyperliquid: [AMINA](https://aminagroup.com/research/hyperliquid-hype-etf-buyback-staking-yield-institutional-access-2026/), [crypto.news](https://crypto.news/why-hype-is-different-inside-hyperliquids-buyback/), [Blockonomi](https://blockonomi.com/hyperliquid-launches-new-hype-buyback-revenue-engine/), [CF Benchmarks](https://www.cfbenchmarks.com/blog/pricing-the-perp-dex-leader-a-valuation-framework-for-hyperliquid) ·
Uniswap: [The Defiant](https://thedefiant.io/news/defi/uniswap-passes-unification-fee-switch-proposal), [CoinDesk](https://www.coindesk.com/business/2025/12/26/uniswap-s-token-burn-protocol-fee-proposal-backed-overwhelmingly-by-voters), [Uniswap Agora](https://vote.uniswapfoundation.org/proposals/93), [Talos](https://www.talos.com/insights/state-of-the-network-346) ·
Aave: [The Defiant](https://thedefiant.io/news/defi/aave-confirms-aavenomics-3-0-live-buybacks-dao-spending-cut), [Aave governance](https://governance.aave.com/t/aave-dao-funding-insights/24192) ·
Morpho: [DefiLlama](https://defillama.com/protocol/morpho), [CryptoDaily](https://cryptodaily.co.uk/2026/06/morpho-lending-thesis-smaller-defi-tokens-revenue-proof) ·
Sky: [CoinDesk](https://www.coindesk.com/markets/2026/03/05/sky-jumps-nearly-10-after-governance-vote-cuts-emissions-while-buybacks-tighten-supply), [Tokenomics.com](https://tokenomics.com/articles/sky-tokenomics-how-the-smart-burn-engine-destroys-102m-in-sky-per-year), [sky.money](https://sky.money/blog/understanding-the-sky-token) ·
Zama: [zama.org](https://www.zama.org/post/zama-token-launch), [Messari](https://messari.io/report/understanding-zama-a-comprehensive-overview), [Figment](https://www.figment.io/insights/zama-first-look-bringing-compliant-confidentiality-on-chain/) ·
Circle: [Q2 2026 results](https://www.circle.com/pressroom/circle-reports-second-quarter-2026-results), [SEC filing](https://www.sec.gov/Archives/edgar/data/1876042/000187604226000246/augustepr-circle_q22026f.htm) ·
Across: [security model](https://docs.across.to/introduction/security), [Robinhood Chain route](https://across.to/blog/bridge-to-robinhood-chain-with-across) ·
Fees, revenue, TVL, stablecoin supply: [DefiLlama](https://defillama.com) · Prices and market caps: [CoinGecko](https://www.coingecko.com)

This describes one portfolio and the reasoning behind it. It is not investment advice, and the
author holds every asset listed.
