# Polygon Rollout Plan

## Stage 1: Testnet / staging

Target:

- `Polygon Amoy` if we confirm the required liquidity and router stack

Primary objective:

- Validate ownership, target allowlist, calldata flow, profit checks, and repayment logic without risking mainnet capital

Hard blocker:

- Flash-loan execution on Amoy should not be treated as available until the liquidity source is verified

Checklist:

- Fill `deployments/polygon-amoy.json`
- Confirm RPC, chain ID `80002`, deployer, owner, and router targets
- Verify whether Aave or another usable flash-liquidity venue exists on Amoy
- If not, use Amoy only for non-flash staging and validate flash behavior on a mainnet fork

## Stage 2: Mainnet

Target:

- `Polygon mainnet`

Primary objective:

- Run the same executor shape with real Aave V3 liquidity and a tightly curated router allowlist

Checklist:

- Fill `deployments/polygon-mainnet.json`
- Reuse only battle-tested router targets from staging/fork tests
- Start with one asset family and one route archetype
- Send tiny notional before enabling larger atomic opportunities
