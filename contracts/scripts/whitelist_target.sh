#!/usr/bin/env bash
set -euo pipefail

CAST_BIN="${CAST_BIN:-$HOME/.foundry/bin/cast}"

if [[ ! -x "$CAST_BIN" ]]; then
  echo "cast not found at $CAST_BIN"
  exit 1
fi

: "${TARGET_RPC_URL:?TARGET_RPC_URL is required}"
: "${POLYGON_DEPLOYER_PRIVATE_KEY:?POLYGON_DEPLOYER_PRIVATE_KEY is required}"
: "${EXECUTOR_ADDRESS:?EXECUTOR_ADDRESS is required}"
: "${TARGET_ADDRESS:?TARGET_ADDRESS is required}"

"$CAST_BIN" send "$EXECUTOR_ADDRESS" \
  "setApprovedTarget(address,bool)" \
  "$TARGET_ADDRESS" true \
  --rpc-url "$TARGET_RPC_URL" \
  --private-key "$POLYGON_DEPLOYER_PRIVATE_KEY"
