# Remix Deploy For Polygon

This path is for deploying with MetaMask instead of exposing a private key to the backend runtime.

## Contract file

Use:

- `contracts/remix/PolygonAaveFlashExecutor.remix.sol`

This file is self-contained for Remix and does not rely on local imports.

## Mainnet constructor values

Network:

- `Polygon Mainnet`

Constructor argument 1:

- `provider = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb`

Constructor argument 2:

- `initialOwner = 0xa617cc0998c0bc4bf86301003ff2c172d57b506e`

These values match the current local deployment manifest and the MetaMask owner already connected in the frontend session.

## Recommended Remix settings

- Compiler: `0.8.24`
- EVM version: default is fine
- Optimization: enabled
- Runs: `200`
- Deploy with: `Injected Provider - MetaMask`

## Safe deploy order

1. Switch MetaMask to `Polygon Mainnet`
2. Open Remix
3. Create a new file and paste `PolygonAaveFlashExecutor.remix.sol`
4. Compile with Solidity `0.8.24`
5. Deploy with:
   - `provider = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb`
   - `initialOwner = 0xa617cc0998c0bc4bf86301003ff2c172d57b506e`
6. Save the deployed contract address into:
   - `contracts/deployments/polygon-mainnet.json`
   - local secure notes for the frontend/backend wiring

## Immediate post-deploy steps

After deployment, do not run flash-loan routes yet. First:

1. Call `owner()` and confirm it matches `0xa617cc0998c0bc4bf86301003ff2c172d57b506e`
2. Add one approved target only with `setApprovedTarget`
3. Keep the allowlist tiny until fork and live tests confirm behavior
4. Do not fund the executor with unnecessary balances

## Important limitation

Deploying this contract does not mean arbitrage is live. It only puts the executor onchain. Real execution still needs:

- a route builder
- whitelisted routers
- flash-loan call data generation
- fork validation
- a small first live run
