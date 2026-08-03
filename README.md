# TradeBotHub MEV Backend v3.5

Production-oriented market intelligence backend with a multi-chain scanner, guarded Solana execution support, demo execution validation, and a persistent trade ledger. It exposes market snapshots, cross-DEX opportunity estimates, SSE streaming, paper simulation, Jupiter swap quoting, signer readiness, wallet execution reporting, and optional live swap execution.

## Deploy on Render

Use `render.yaml`, or configure the service manually:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
- Runtime: Node 22

Set `CORS_ORIGIN` to your Netlify URL before going live.

## What's new in v3.5

- Multi-chain execution planner endpoint for Base, Arbitrum, BNB Chain, Ethereum, and the existing Solana path.
- Flash-loan provider catalog with fee, borrow-size, and readiness metadata.
- Advanced simulation endpoint that writes planner-stage results into the trade ledger.
- Frontend-ready EVM wallet planning support and advanced route selection flow.
- A first Polygon contract workspace scaffold for an Aave V3 flash-loan executor under `contracts/`.

## Still true from v3.4

- Demo execution endpoint for validating the best ready opportunity with live Jupiter quotes.
- Trade ledger endpoint with realized and quoted PnL tracking.
- Risk status endpoint with cooldowns, exposure, daily loss, and kill switch state.
- Wallet execution reporting so browser-signed transactions feed back into backend analytics.
- Frontend-ready controls for demo mode and kill switch management.

## Execution modes

- `EXECUTION_MODE=paper`: dashboard and quote endpoints work, but live execution is blocked.
- `EXECUTION_MODE=live`: backend becomes eligible to execute, but only if the rest of the safety switches are also satisfied.
- `LIVE_TRADING_ENABLED=true`: second explicit safety switch required for `/api/execution/execute`.
- `SIMULATE_ONLY=true`: keeps the service quote-ready while hard-blocking transaction broadcast.

## Required secrets for live execution

- `SOLANA_RPC_URL`
- `SIGNER_PRIVATE_KEY_BASE58` or `SIGNER_PRIVATE_KEY_JSON`

## Optional execution tuning

- `JUPITER_API_KEY`
- `TX_BROADCAST_MODE=rpc` or `helius-sender`
- `HELIUS_API_KEY` when using `helius-sender`
- `HELIUS_SENDER_URL`
- `SWAP_SLIPPAGE_BPS`
- `MAX_EXECUTION_USD`
- `MAX_PRIORITY_FEE_LAMPORTS`
- `SENDER_TIP_LAMPORTS`
- `DEMO_EXECUTION_ENABLED`
- `GUARDRAIL_KILL_SWITCH`
- `EXECUTION_COOLDOWN_MS`
- `MAX_DAILY_LOSS_USD`
- `MAX_CONSECUTIVE_FAILURES`
- `MAX_TOKEN_EXPOSURE_USD`
- `MAX_PRICE_IMPACT_PCT`
- `MIN_QUOTE_OUT_USD`
- `ADVANCED_PLANNER_LIMIT`
- `FLASH_LOAN_MIN_NET_USD`
- `FLASH_LOAN_MAX_BORROW_USD`
- `EVM_WALLET_EXECUTION_ENABLED`
- `POLYGON_RPC_URL`
- `POLYGON_AMOY_RPC_URL`
- `POLYGON_AMOY_CHAIN_ID`
- `POLYGON_FORK_RPC_URL`
- `POLYGON_FORK_BLOCK_NUMBER`
- `POLYGON_FORK_CHAIN_ID`
- `POLYGON_CHAIN_ID`
- `POLYGON_AAVE_POOL_ADDRESSES_PROVIDER`
- `POLYGON_AAVE_POOL`
- `POLYGON_AMOY_AAVE_POOL_ADDRESSES_PROVIDER`
- `POLYGON_AMOY_AAVE_POOL`
- `POLYGON_FLASH_EXECUTOR_OWNER`
- `POLYGON_FLASH_EXECUTOR_ADDRESS`
- `POLYGON_AMOY_FLASH_EXECUTOR_ADDRESS`
- `POLYGON_FORK_FLASH_EXECUTOR_ADDRESS`
- `POLYGON_EXECUTOR_APPROVED_TARGETS`
- `POLYGON_DEPLOYER_PRIVATE_KEY`
- `TRADE_LEDGER_MAX_ENTRIES`
- `TRADE_LEDGER_PATH`
- `EXECUTION_BLACKLIST_ASSETS`
- `EXECUTION_BLACKLIST_DEXES`
- `SKIP_PREFLIGHT`

## Main endpoints

- `GET /health`
- `GET /api/stats`
- `GET /api/market`
- `GET /api/opportunities`
- `GET /api/transactions`
- `GET /api/arbitrages`
- `GET /api/searchers`
- `GET /api/errors`
- `GET /api/tokens`
- `GET /api/execution/status`
- `GET /api/execution/planner`
- `GET /api/executions`
- `GET /api/flash-loans/providers`
- `GET /api/trade-ledger`
- `GET /api/risk/status`
- `POST /api/execution/quote`
- `POST /api/execution/build`
- `POST /api/execution/execute`
- `POST /api/opportunities/demo-execute`
- `POST /api/opportunities/advanced-plan`
- `POST /api/opportunities/advanced-simulate`
- `POST /api/execution/report`
- `POST /api/risk/kill-switch`
- `POST /api/simulate`

## Safety notes

- The API does not infer realized arbitrage profit from rough route estimates.
- A successful quote is not a profit guarantee.
- Demo execution uses live quote validation and records a simulated realized result. It is not an on-chain fill.
- Advanced planner and flash-loan simulation provide execution planning metadata, not deployed atomic flash-loan contracts.
- Live execution stays blocked until mode, flags, signer, and broadcast prerequisites are all satisfied.
- Wallet-connected execution is the recommended path when you want the browser frontend to sign locally instead of storing a private key in Render.
- Multi-chain opportunities are discovery-only unless you add a real executor for that chain. The built-in executor flow remains Solana-focused.
- The Polygon contract scaffold is only a starting point. You still need audited router calldata generation, whitelisted targets, and a real deployment before sending mainnet value through it.
- If `TRADE_LEDGER_PATH` points to `/tmp`, the ledger is runtime-local and can be lost after restart or redeploy.

## Polygon contract path

If we start with Polygon, the backend repo now includes `contracts/` as the first EVM contract workspace.

- `contracts/src/PolygonAaveFlashExecutor.sol` is a minimal owner-controlled flash-loan receiver built around Aave V3 `flashLoanSimple()`.
- `contracts/deployments/polygon-mainnet.json` stores the Polygon market config and deployment placeholders.
- `contracts/deployments/polygon-amoy.json` stores the testnet-first staging manifest.
- `contracts/deployments/polygon-fork.json` stores the preferred fork-validation manifest.
- `contracts/DEPLOYMENT_PLAN.md` documents the recommended `testnet -> mainnet` rollout.
- `contracts/RUNBOOK.md` gives the operator checklist for Amoy, fork, and mainnet.
- The planner can treat Polygon as a flash-loan simulation path, but this does not mean the executor is deployed or live.
- As of August 3, 2026, this repo has confirmed official Polygon mainnet Aave references, but not a confirmed public Aave Polygon Amoy deployment reference.

## Scanner tuning

- `MIN_SPREAD_BPS`
- `MAX_SPREAD_BPS`
- `MIN_PAIR_LIQUIDITY_USD`
- `MIN_OPPORTUNITY_CAPITAL_USD`
- `MAX_PAIRS_PER_TOKEN`
- `MAX_MEDIAN_DEVIATION_BPS`
- `MAX_MARKET_ROWS`
- `MAX_OPPORTUNITIES`
- `SCANNER_CHAIN_IDS`
- `SCANNER_ASSET_KEYS`

These filters are used to reject low-liquidity and outlier markets so the opportunity board shows more realistic spreads instead of impossible stablecoin anomalies.

## Multi-chain scanner notes

- The scanner can now watch a configurable catalog across Solana, Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and Avalanche.
- `SCANNER_CHAIN_IDS` lets you reduce or expand the active chain set without editing code.
- `SCANNER_ASSET_KEYS` lets you narrow the catalog to specific keys such as `solana:SOL,base:AERO,arbitrum:ARB`.
- The execution endpoints and wallet workflow are still intentionally scoped to Solana while the discovery layer expands across more chains.
