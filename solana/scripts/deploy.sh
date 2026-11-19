#!/bin/sh
# Deploy the built program.
#
# The program keypair is what fixes the address, so it is passed explicitly and
# lives outside the repo. Both clusters use the same key, which is why the PDAs —
# and therefore every account address the plugins know — are identical on devnet
# and mainnet. 0.3 changed the instruction set and was never on mainnet, so it
# deploys from its own key; the pre-0.3 escrow key remains only as history.
#
# Usage:
#   scripts/deploy.sh                      # GENKAKU_RPC_URL, else devnet
#   scripts/deploy.sh --url http://127.0.0.1:8899
#   scripts/deploy.sh --keypair ~/.config/solana/team-dev.json

set -eu

cd "$(dirname "$0")/.."

URL="${GENKAKU_RPC_URL:-https://api.devnet.solana.com}"
PAYER="${SOLANA_KEYPAIR:-$HOME/.config/solana/team-dev.json}"
PROGRAM_KEYPAIR="${GENKAKU_PROGRAM_KEYPAIR:-$HOME/.config/solana/genkaku-0.3-program.json}"
SO="${GENKAKU_SO:-target/sbf-solana-solana/release/genkaku.so}"

while [ $# -gt 0 ]; do
  case "$1" in
    --url) URL="$2"; shift 2 ;;
    --keypair) PAYER="$2"; shift 2 ;;
    --program-keypair) PROGRAM_KEYPAIR="$2"; shift 2 ;;
    --so) SO="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ ! -f "$SO" ]; then
  echo "$SO not found; run scripts/build.sh first" >&2
  exit 1
fi

echo "deploying $SO to $URL"
exec solana program deploy \
  --url "$URL" \
  --keypair "$PAYER" \
  --program-id "$PROGRAM_KEYPAIR" \
  "$SO"
