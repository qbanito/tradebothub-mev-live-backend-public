# TradeBotHub MEV Backend v3.2

Production-oriented market intelligence backend with a multi-chain scanner and guarded Solana execution support. It exposes market snapshots, cross-DEX opportunity estimates, SSE streaming, paper simulation, Jupiter swap quoting, signer readiness, and optional live swap execution.

## Deploy on Render

Use `render.yaml`, or configure the service manually:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
- Runtime: Node 22

Set `CORS_ORIGIN` to your Netlify URL before going live.

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
- `GET /api/executions`
- `POST /api/execution/quote`
- `POST /api/execution/build`
- `POST /api/execution/execute`
- `POST /api/simulate`

## Safety notes

- The API does not infer realized arbitrage profit from rough route estimates.
- A successful quote is not a profit guarantee.
- Live execution stays blocked until mode, flags, signer, and broadcast prerequisites are all satisfied.
- Wallet-connected execution is the recommended path when you want the browser frontend to sign locally instead of storing a private key in Render.
- Multi-chain opportunities are discovery-only unless you add a real executor for that chain. The built-in executor flow remains Solana-focused.

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
