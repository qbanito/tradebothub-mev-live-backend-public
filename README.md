# TradeBotHub MEV Backend v3

Production-oriented Solana market intelligence backend. It exposes live market snapshots, cross-DEX opportunity estimates, SSE streaming, an optional Helius transaction stream, candidate searcher clustering and paper simulation.

## Deploy on Render

Use `render.yaml`, or configure:

- Build: `npm install`
- Start: `npm start`
- Health: `/health`

Set `CORS_ORIGIN` to your Netlify URL. Add `HELIUS_API_KEY` and comma-separated `DEX_PROGRAM_IDS` to activate transaction streaming.

## Accuracy boundary

The API never labels a transaction as realized profit unless exact decoder and historical token valuation are available. Multi-DEX transactions are returned as `candidate` until fully decoded.
