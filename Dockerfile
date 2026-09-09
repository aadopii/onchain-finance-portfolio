FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN chmod +x scripts/run-until-settled.sh
# `sailor` (from @sail.money/sailor) must be on PATH for scripts/run-until-settled.sh.
ENV PATH="/app/node_modules/.bin:${PATH}"

# Seconds between settle runs. The agent settles once a day: each run ticks
# `sailor run --once` until scripts/settled.mjs reports nothing in flight (a
# rebalance that needs sell → bridge → mint → buy spans several ticks), then sleeps.
# SETTLE_MAX_SEC / SETTLE_SLEEP_SEC tune the per-run budget (see the script header).
ENV AGENT_INTERVAL=86400

# The operator must provide `ci-keystore.json` — the agent (manager) wallet's
# encrypted keystore, exported from `.sail/keys/manager.json` — at the build
# context root or as a bind mount at /app/ci-keystore.json. It is NOT in the repo.
# `.sail/` (account, mandate, portfolio, activity ledger) is expected mounted too.
CMD ["sh", "-c", "\
  mkdir -p .sail/keys && \
  cp ci-keystore.json .sail/keys/manager.json && \
  while true; do \
    scripts/run-until-settled.sh scheduled; \
    sleep ${AGENT_INTERVAL}; \
  done"]
