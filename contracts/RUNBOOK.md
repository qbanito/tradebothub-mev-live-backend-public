# Polygon Executor Runbook

This is the operator checklist for taking the Polygon executor from staging to fork to mainnet.

## Track A: Amoy / staging

Goal:

- Validate ownership, whitelisting, and external call sequencing without risking mainnet funds

Steps:

1. Fill `deployments/polygon-amoy.json`
2. Deploy `PolygonAaveFlashExecutor`
   Command: `contracts/scripts/deploy_polygon_executor.sh`
3. Deploy `mocks/MockPolygonSwapTarget.sol`
   Command: `contracts/scripts/deploy_mock_target.sh`
4. Set the mock target in the executor allowlist
   Command: `contracts/scripts/whitelist_target.sh`
5. Verify owner-only functions, payout flow, and revert behavior

Expected result:

- The executor shape behaves correctly as an owner-gated router shell

Limit:

- This does not prove Aave flash liquidity exists on Amoy

## Track B: Polygon mainnet fork

Goal:

- Validate the real flash-loan callback path against actual Polygon state

Steps:

1. Fill `deployments/polygon-fork.json`
2. Set `POLYGON_FORK_RPC_URL`
3. Pin `POLYGON_FORK_BLOCK_NUMBER`
4. Deploy the executor on the fork
   Command: `contracts/scripts/deploy_polygon_executor.sh`
5. Whitelist one or two router targets only
   Command: `contracts/scripts/whitelist_target.sh`
6. Use one borrowed asset only, preferably `USDC`
7. Verify:
   - flash loan request succeeds
   - callback executes approved targets only
   - repayment check passes
   - min profit check blocks bad routes
   - leftover profit is delivered to the profit receiver

Expected result:

- We prove the callback logic works with real Aave Polygon liquidity before mainnet

## Track C: Polygon mainnet

Goal:

- Start tiny and controlled

Steps:

1. Reuse the tested owner address and router allowlist
2. Deploy the same contract shape to Polygon mainnet
   Command: `contracts/scripts/deploy_polygon_executor.sh`
3. Start with small notional
4. Keep one route family only until the ledger confirms stable behavior
5. Expand target allowlist slowly

## Operational warnings

- Never widen the router allowlist casually
- Never assume planner PnL equals realized PnL
- Never treat Amoy staging as proof of real flash-loan readiness
- Always pin a fork block when reproducing a route investigation
