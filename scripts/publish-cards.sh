#!/usr/bin/env bash
# Publish the curated card registry to the seed host.
#
#   bash scripts/publish-cards.sh            # validate, upload, verify
#   bash scripts/publish-cards.sh --no-build # upload the existing index
#
# The registry is static files under /srv/genkaku-cards/v1 on the staging VM,
# served by Caddy at https://seed.genkaku.app/cards/v1/. There is no upload
# endpoint and no database: publishing is this script, run by a maintainer after
# merging a pull request into cards/.
#
# The Caddy block this depends on is installed by scripts/patch-caddy-cards.py
# (see the header of that file); it is idempotent and only needs to run once.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTANCE="${INSTANCE:-genkaku-web3}"
ZONE="${ZONE:-asia-east1-a}"
REMOTE_DIR="/srv/genkaku-cards/v1"
ORIGIN="https://seed.genkaku.app/cards/v1"
BUILD=1

for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=0 ;;
    *) echo "publish-cards: unknown option: $arg" >&2; exit 1 ;;
  esac
done

if [ "$BUILD" = "1" ]; then
  echo "publish-cards: validating cards"
  node "$REPO_ROOT/scripts/build-cards.mjs"
else
  echo "publish-cards: using the existing cards/index.json"
fi

echo "publish-cards: uploading to $INSTANCE:$REMOTE_DIR"
gcloud compute ssh "$INSTANCE" --zone "$ZONE" --command "sudo mkdir -p $REMOTE_DIR && sudo chmod 755 /srv/genkaku-cards $REMOTE_DIR"
gcloud compute scp --recurse "$REPO_ROOT/cards" "$INSTANCE:/tmp/cards-publish" --zone "$ZONE" >/dev/null
gcloud compute ssh "$INSTANCE" --zone "$ZONE" --command "sudo cp /tmp/cards-publish/*.json $REMOTE_DIR/ && sudo chmod 644 $REMOTE_DIR/*.json && rm -rf /tmp/cards-publish"

echo "publish-cards: verifying"
index="$(curl -fsS -m 15 "$ORIGIN/index.json")"
count="$(printf '%s' "$index" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["cards"]))')"
echo "publish-cards: index lists $count card(s)"

for id in $(printf '%s' "$index" | python3 -c 'import json,sys; [print(c["id"]) for c in json.load(sys.stdin)["cards"]]'); do
  code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$ORIGIN/$id.json")"
  if [ "$code" != "200" ]; then
    echo "publish-cards: $id answered $code" >&2
    exit 1
  fi
done

echo "publish-cards: published $ORIGIN/index.json"
