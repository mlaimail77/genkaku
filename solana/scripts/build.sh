#!/bin/sh
# Build the program without `cargo-build-sbf`.
#
# `cargo-build-sbf` blocks forever on this machine: it is an unsigned binary
# that macOS suspends on launch, and the platform-tools it downloads are already
# unpacked under ~/.cache/solana. Driving `cargo` against the `sbf-solana-solana`
# target produces the same ELF and takes about two seconds.
#
# Usage: scripts/build.sh [--features fast-claim] [extra cargo flags]

set -eu

cd "$(dirname "$0")/.."

TOOLS="${SOLANA_PLATFORM_TOOLS:-$HOME/.cache/solana/v1.43/platform-tools}"
SBF_SDK="${SBF_SDK_PATH:-$HOME/.local/share/solana/install/active_release/bin/sdk/sbf}"

if [ ! -x "$TOOLS/rust/bin/cargo" ]; then
  echo "platform-tools not found at $TOOLS" >&2
  echo "set SOLANA_PLATFORM_TOOLS to the directory that contains rust/ and llvm/" >&2
  exit 1
fi

PATH="$TOOLS/rust/bin:$TOOLS/llvm/bin:$PATH"
SBF_SDK_PATH="$SBF_SDK"
CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-target}"
export PATH SBF_SDK_PATH CARGO_TARGET_DIR

exec cargo build --release --target sbf-solana-solana "$@"
