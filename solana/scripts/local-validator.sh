#!/bin/sh
# Start a throwaway Solana validator for local testing.
#
# Two macOS quirks are handled here rather than in the caller:
#
#   * COPYFILE_DISABLE=1 — without it macOS `tar` records extended attributes as
#     AppleDouble `._name` entries, and the validator's *hardened* genesis
#     unpack refuses any entry it does not recognise ("extra entry found:
#     ._genesis.bin"). The ledger then never finishes opening.
#   * the ledger lives outside the repo so a `git status` stays clean.
#
# Usage: scripts/local-validator.sh [ledger-dir]
#        scripts/local-validator.sh --stop

set -eu

LEDGER="${1:-${TMPDIR:-/tmp}/genkaku-ledger}"
RPC_PORT="${GENKAKU_RPC_PORT:-8899}"
FAUCET_PORT="${GENKAKU_FAUCET_PORT:-9901}"

stop() {
  pkill -f "solana-test-validator .*--ledger $LEDGER" 2>/dev/null || true
  sleep 1
  pkill -9 -f "solana-test-validator .*--ledger $LEDGER" 2>/dev/null || true
}

if [ "${1:-}" = "--stop" ]; then
  stop
  echo "stopped validator on ledger $LEDGER"
  exit 0
fi

stop
rm -rf "$LEDGER"

export COPYFILE_DISABLE=1
nohup solana-test-validator \
  --reset --quiet \
  --ledger "$LEDGER" \
  --rpc-port "$RPC_PORT" \
  --faucet-port "$FAUCET_PORT" \
  >"$LEDGER.log" 2>&1 &

i=0
while [ "$i" -lt 60 ]; do
  if solana --url "http://127.0.0.1:$RPC_PORT" cluster-version >/dev/null 2>&1; then
    echo "validator ready: http://127.0.0.1:$RPC_PORT (ledger $LEDGER)"
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done

echo "validator did not come up; see $LEDGER.log" >&2
exit 1
