#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FOUNDRY_BIN="${FOUNDRY_BIN:-$HOME/.foundry/bin/forge}"

if [[ ! -x "$FOUNDRY_BIN" ]]; then
  echo "forge not found at $FOUNDRY_BIN"
  exit 1
fi

: "${POLYGON_RPC_URL:?POLYGON_RPC_URL is required}"
: "${POLYGON_DEPLOYER_PRIVATE_KEY:?POLYGON_DEPLOYER_PRIVATE_KEY is required}"
: "${POLYGON_AAVE_POOL_ADDRESSES_PROVIDER:?POLYGON_AAVE_POOL_ADDRESSES_PROVIDER is required}"
: "${POLYGON_FLASH_EXECUTOR_OWNER:?POLYGON_FLASH_EXECUTOR_OWNER is required}"

cd "$ROOT_DIR"

"$FOUNDRY_BIN" create \
  --root "$ROOT_DIR" \
  --rpc-url "$POLYGON_RPC_URL" \
  --private-key "$POLYGON_DEPLOYER_PRIVATE_KEY" \
  src/PolygonAaveFlashExecutor.sol:PolygonAaveFlashExecutor \
  --constructor-args "$POLYGON_AAVE_POOL_ADDRESSES_PROVIDER" "$POLYGON_FLASH_EXECUTOR_OWNER"
