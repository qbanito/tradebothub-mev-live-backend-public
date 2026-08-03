# Polygon Contracts Workspace

This folder is the first EVM contract workspace for TradeBotHub. It starts with Polygon because gas is relatively manageable and Aave V3 offers a straightforward `flashLoanSimple()` path for a first atomic executor.

## What is included

- `src/PolygonAaveFlashExecutor.sol`
- Minimal local Aave interfaces
- `deployments/polygon-mainnet.json` with current Aave V3 Polygon core addresses
- `foundry.toml` for a standard Foundry layout

## What it does today

- Borrows a single asset with Aave V3 flash liquidity
- Executes a caller-defined sequence of whitelisted swap/router calls
- Requires the borrowed asset to be back in the contract before the callback ends
- Repays principal plus premium and forwards leftover profit to a receiver

## What it does not do yet

- It is not deployed yet
- It does not auto-discover DEX routes
- It does not simulate calldata onchain before send
- It does not protect you from bad router calldata, stale pricing, or MEV by itself
- It does not prove a profitable arbitrage route exists

## Deployment prerequisites

- A Polygon RPC URL
- A deployer private key in a local secure environment
- A wallet address to own the executor
- A curated allowlist of Polygon router targets you want this contract to call
- An offchain builder that converts planner output into swap calldata

## Suggested first Polygon route

Start with one borrowed stablecoin route and one router family only:

- Borrow `USDC` from Aave V3
- Execute a two-leg route across one audited router stack
- End the callback holding more `USDC` than `principal + premium + minProfit`

That keeps the first live deployment narrower and easier to verify.

## Safety stance

This contract is intentionally owner-gated and target-whitelisted. That is restrictive on purpose. The offchain planner can evolve fast, but the onchain executor should stay small and conservative.
