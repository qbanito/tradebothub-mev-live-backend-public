# Polygon Contracts Workspace

This folder is the first EVM contract workspace for TradeBotHub. It starts with Polygon because gas is relatively manageable and Aave V3 offers a straightforward `flashLoanSimple()` path for a first atomic executor.

## Rollout order

1. Polygon Amoy or another safe staging network
2. Polygon mainnet

That is the right sequence operationally, but there is an important caveat:

- As of August 3, 2026, we have confirmed official Aave Polygon mainnet addresses.
- We have not confirmed an official Aave V3 Polygon Amoy deployment from Aave's public addresses registry.
- So "Amoy first" is currently a staging track, not yet proof that the same flash-loan path is available there.

## What is included

- `src/PolygonAaveFlashExecutor.sol`
- `src/mocks/MockPolygonSwapTarget.sol`
- Minimal local Aave interfaces
- `deployments/polygon-fork.json` for mainnet-fork validation
- `deployments/polygon-mainnet.json` with current Aave V3 Polygon core addresses
- `deployments/polygon-amoy.json` for testnet-first staging
- `remix/PolygonAaveFlashExecutor.remix.sol` for browser-native deployment
- `REMIX_DEPLOY.md` for a MetaMask-first deploy path
- `RUNBOOK.md` with the staged rollout procedure
- `scripts/` with direct deploy and allowlist commands
- `foundry.toml` for a standard Foundry layout

## What it does today

- Borrows a single asset with Aave V3 flash liquidity
- Executes a caller-defined sequence of whitelisted swap/router calls
- Requires the borrowed asset to be back in the contract before the callback ends
- Repays principal plus premium and forwards leftover profit to a receiver
- Provides a tiny mock target to validate owner gates and allowlist behavior in staging

For the mock target, fund it by sending test tokens to the contract address directly, then use `payout()` and `sweep()` as the owner.

## What it does not do yet

- It is not deployed yet
- It does not auto-discover DEX routes
- It does not simulate calldata onchain before send
- It does not protect you from bad router calldata, stale pricing, or MEV by itself
- It does not prove a profitable arbitrage route exists
- It does not assume Aave flash liquidity exists on Amoy unless we confirm or supply the addresses ourselves

## Deployment prerequisites

- A Polygon RPC URL
- A Polygon Amoy RPC URL if staging on testnet first
- A deployer private key in a local secure environment
- A wallet address to own the executor
- A curated allowlist of Polygon router targets you want this contract to call
- An offchain builder that converts planner output into swap calldata

## Direct deploy commands

Once the required env vars are filled, the intended entry points are:

- `contracts/scripts/deploy_polygon_executor.sh`
- `contracts/scripts/deploy_mock_target.sh`
- `contracts/scripts/whitelist_target.sh`

## Testnet-first plan

If you want testnet before mainnet, the safest sequence is:

1. Use `deployments/polygon-amoy.json` as a staging manifest
2. Confirm whether the chosen flash-liquidity source really exists on Amoy
3. Deploy the executor with a very small whitelist of router targets
4. Dry-run swap calldata against staging targets
5. Only then mirror the same ownership and allowlist model to `polygon-mainnet.json`

If Amoy does not have the flash-liquidity source we need, the fallback is:

1. Test contract behavior on Amoy with mocked or non-flash capital paths
2. Test real flash-loan behavior on a Polygon mainnet fork
3. Deploy to Polygon mainnet only after fork validation

## Preferred next move

The best next execution lane is now:

1. Amoy for ownership and allowlist behavior
2. Polygon fork for true Aave flash-loan validation
3. Polygon mainnet for controlled rollout

## Suggested first Polygon route

Start with one borrowed stablecoin route and one router family only:

- Borrow `USDC` from Aave V3
- Execute a two-leg route across one audited router stack
- End the callback holding more `USDC` than `principal + premium + minProfit`

That keeps the first live deployment narrower and easier to verify.

## Safety stance

This contract is intentionally owner-gated and target-whitelisted. That is restrictive on purpose. The offchain planner can evolve fast, but the onchain executor should stay small and conservative.
