# Onchain Finance Portfolio

A self-custodied agent that holds a weighted basket of the companies whose product is money, and
keeps it rebalanced across Base and Ethereum inside on-chain permissions only you control. Built on
[Sailor](https://github.com/sail-money/Sailor) and Sail Protocol.

| Vertical | Asset | Weight | Chain |
|---|---|---|---|
| Exchange | HYPE (as cbHYPE) | 25% | Base |
| Exchange | UNI | 17.5% | Base |
| Credit | AAVE | 17.5% | Base |
| Credit | MORPHO | 17.5% | Base |
| Yield | SKY | 17.5% | Ethereum |
| Privacy | ZAMA | 5% | Ethereum |

## The thesis

**Onchain finance is undervalued as a sector.** The total addressable market of these protocols is
money itself: every trade, loan, deposit and settlement that today runs through banks, brokers and
exchanges. Six protocols cover the verticals a financial system needs, they already run at
institutional scale, and the whole set trades for about what one mid-sized exchange is worth.

The mental model is the one Bitwise uses for crypto as an asset class: treat each protocol as a
company. Ask four questions. How big is the market it serves? Is it winning share? Does the token
capture the cash flow? What multiple does that cash flow trade at? Buy the category leaders, size by
conviction, hold through cycles, and rebalance mechanically so the position never depends on timing.

Numbers below are from DefiLlama and CoinGecko as of 2026-09-07. Fees are what users paid the
protocol over the last twelve months; revenue is the share that reaches the protocol or its token.

| Protocol | Fees (1y) | Revenue (1y) | Market cap | Cap / revenue | Token value accrual |
|---|---|---|---|---|---|
| Hyperliquid | $946M | $710M | $18.9B | 27x | ~98% of fees buy back HYPE |
| Uniswap | $885M | $42M since Dec 2025 (~$140M run-rate) | $4.3B | 30x on run-rate | Fee switch on; 100M UNI burned, ongoing burn |
| Aave | $795M | $103M | $2.0B | 20x | Aavenomics 3.0 routes all revenue to buybacks |
| Morpho | $208M | $0 | $1.7B | n/a (8x on fees) | Fee switch not yet on; governance option |
| Sky | $400M | $216M | $1.6B | 7x | Smart Burn Engine buys and burns SKY |
| Zama | pre-revenue | pre-revenue | $0.13B ($0.58B FDV) | n/a | Fees paid in ZAMA and burned |

Together: about $3.2B of annual fees, about $1.1B of annual revenue, $28.7B of market value. The
sector trades at roughly 9x fees and 27x revenue, with revenue growing and four of the six already
returning it to holders. That is a growth multiple on businesses that settle with software instead of
branches, and it is the reason for holding the basket rather than picking one name.

### Exchange: HYPE and UNI (42.5%)

Exchanges are the first vertical a financial system monetises, and the two winners are structurally
different bets. **Hyperliquid** is the profitable one: a perpetuals exchange running its own chain,
about $950M in fees over the last year, and the most aggressive value-accrual model in the sector,
with roughly 98% of fees buying HYPE on the open market through the Assistance Fund (over $1.3B
deployed by mid-2026, about 7% of market cap per year). The risk is concentration: one venue, one
team, and an 81B fully diluted valuation against a 19B float, so unlocks matter. The position is held
as cbHYPE on Base, Coinbase's wrapped HYPE, which is why it trades on Aerodrome.

**Uniswap** is the spot venue of record, with about $885M of annual fees that until December 2025
went entirely to liquidity providers. The UNIfication vote flipped the fee switch and burned 100M UNI,
so the token now owns a claim on the largest spot DEX's revenue for the first time. At 30x a
run-rate that is still ramping, it is priced as an early-stage business rather than a nine-year-old
market leader. The thesis is simple: the multiple compresses as the revenue history accumulates.

### Credit: AAVE and MORPHO (35%)

Lending is where the TAM is largest and where onchain has the clearest structural advantage:
over-collateralised, liquidated by code, transparent in real time. **Aave** is the incumbent, about
$17.5B of deposits and $795M of annual fees, and since June 2026 Aavenomics 3.0 routes protocol and
GHO revenue to AAVE holders through a non-discretionary buyback. At 20x revenue with a 12B-deposit
balance sheet, it is the cheapest large credit franchise in the sector.

**Morpho** is the challenger: a minimal lending primitive with curated vaults on top, about $9.7B
in deposits and $208M of annual fees, and the rails behind Coinbase's onchain bitcoin-backed loans.
Nothing reaches the token yet, so the position is an option on the fee switch, deliberately sized
the same as Aave: if the protocol keeps taking share, governance has every incentive to turn it on,
and the token re-rates from 8x fees toward the peers.

### Yield: SKY (17.5%)

**Sky**, formerly Maker, issues USDS and DAI, about $11.4B of stablecoins, and earns the spread
between what its collateral yields and what it pays savers. It is the closest thing onchain to a
bank's net interest margin, with about $400M of annual fees, $216M of revenue, and the Smart Burn
Engine buying SKY with the surplus. At 7x revenue it is the cheapest cash flow in the basket, and
the one most exposed to rates: falling yields compress the spread, rising stablecoin supply expands
it.

### Privacy: ZAMA (5%)

Institutions will not put balance sheets on a public ledger where every counterparty can read them.
**Zama** builds fully homomorphic encryption for the EVM: contracts compute on encrypted state, and
ZAMA is the fee and staking token of that confidentiality layer, with fees priced in dollars, paid
in ZAMA and burned. The token launched in February 2026 and mainnet throughput is still ramping, so
this is the venture position: small, pre-revenue, and there because the next decade of onchain
finance needs a privacy layer that this sector does not yet price.

### What would change the thesis

Fee switches that never turn on (Morpho), a durable loss of exchange share to a new venue (HYPE),
a regulatory outcome that pushes stablecoin issuance back to banks (SKY), or a valuation reset
that makes onchain finance expensive relative to the fees it earns. The agent does not react to any
of that; it rebalances to the weights above. Changing the weights is a human decision, made in
`basket.json`.

## What the agent does

- **Invests every deposit.** Send USDC to your Safe on Base; the next run buys the basket in
  proportion to the target weights, bridging USDC to Ethereum through CCTP for the assets that
  live there.
- **Rebalances weekly.** Any holding more than 3 percentage points over target is trimmed back to
  USDC; anything under target is bought with whatever USDC is idle, in basket order.
- **Runs until settled.** A scheduled run keeps ticking until nothing is left to do, so a trim that
  needs a bridge and a mint finishes in the same run instead of over four days.
- **Reports.** A weekly Telegram note that separates what you deposited from what the market did.

Every transaction is checked on-chain by the mandate before it executes:

| Permission | Bounds |
|---|---|
| `ExactInputSwapPermission` | Uniswap V3 / Aerodrome routers only; USDC in, basket tokens out and back; recipient must be the Safe; 1,000 USDC per buy |
| `BoundedErc20Approve` | `approve()` only, on USDC and basket tokens, to the routers and the CCTP messenger |
| `CctpBridgePermission` | `depositForBurn` of USDC only, 1,000 USDC per transaction, to Base or Ethereum, and only to the Safe's own address |

The agent's code can change without your signature; the permissions cannot.

## Run it

```bash
sailor harbor create onchain-finance-portfolio my-portfolio
cd my-portfolio
```

Onboarding creates your Safe on Base and Ethereum, deploys and registers the three permissions
(you sign in the browser), and writes the basket from `basket.json`. Then:

```bash
npm run settle        # one full run: invest, rebalance, bridge, mint, buy, until nothing is left
npm run dashboard:start
sailor ui start
```

`npm run settle` is what the scheduler should call. `sailor service install` or a launchd / cron
entry pointed at `scripts/run-until-settled.sh` gives you the daily run; the wrapper stops when the
portfolio is settled or after 90 minutes, and the next run resumes from the ledger.

The dashboard at `http://localhost:4123` shows value, amounts, weights and targets; the Sailor
dashboard shows the mandate, signing requests and activity.

## Layout

| Path | What |
|---|---|
| `basket.json` | The basket: assets, weights, chains, routes. The one file that encodes the thesis. |
| `src/agent.ts` | The runtime: valuation, trims, buys, pooled bridges, mint completion, ledger confirmation |
| `src/report.ts` | Snapshot and the three-state Telegram report |
| `contracts/mandates/` | The three permission contracts, with Foundry tests |
| `scripts/run-until-settled.sh` | The scheduled entry point; `scripts/settled.mjs` decides when a run is done |
| `dashboard/server.mjs` | Read-only local dashboard with live on-chain amounts |
| `.agents/skills/` | The Sailor skills that onboard, plan the mandate and operate the agent |

## Sources

Hyperliquid buybacks: [AMINA](https://aminagroup.com/research/hyperliquid-hype-etf-buyback-staking-yield-institutional-access-2026/), [crypto.news](https://crypto.news/why-hype-is-different-inside-hyperliquids-buyback/), [Blockonomi](https://blockonomi.com/hyperliquid-launches-new-hype-buyback-revenue-engine/) ·
Uniswap UNIfication: [The Defiant](https://thedefiant.io/news/defi/uniswap-passes-unification-fee-switch-proposal), [CoinDesk](https://www.coindesk.com/business/2025/12/26/uniswap-s-token-burn-protocol-fee-proposal-backed-overwhelmingly-by-voters), [Uniswap Agora](https://vote.uniswapfoundation.org/proposals/93) ·
Aavenomics 3.0: [The Defiant](https://thedefiant.io/news/defi/aave-confirms-aavenomics-3-0-live-buybacks-dao-spending-cut), [Aave governance](https://governance.aave.com/t/aave-dao-funding-insights/24192) ·
Morpho: [DefiLlama](https://defillama.com/protocol/morpho), [CryptoDaily](https://cryptodaily.co.uk/2026/06/morpho-lending-thesis-smaller-defi-tokens-revenue-proof) ·
Sky: [CoinDesk](https://www.coindesk.com/markets/2026/03/05/sky-jumps-nearly-10-after-governance-vote-cuts-emissions-while-buybacks-tighten-supply), [Tokenomics.com](https://tokenomics.com/articles/sky-tokenomics-how-the-smart-burn-engine-destroys-102m-in-sky-per-year), [sky.money](https://sky.money/blog/understanding-the-sky-token) ·
Zama: [zama.org](https://www.zama.org/post/zama-token-launch), [Messari](https://messari.io/report/understanding-zama-a-comprehensive-overview), [Figment](https://www.figment.io/insights/zama-first-look-bringing-compliant-confidentiality-on-chain/) ·
Fees, revenue, TVL and stablecoin supply: [DefiLlama](https://defillama.com) · Prices and market caps: [CoinGecko](https://www.coingecko.com)

This is a description of one portfolio and the reasoning behind it, not investment advice.
