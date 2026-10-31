#!/bin/bash
# Installed on the server as /usr/local/bin/ci-deploy, the forced command of the GitHub Actions deploy keys.
# The target comes from the key, the action from the client:
#   env           prints the project's .env for the build
#   deploy <sha>  reads a .output tarball from stdin, swaps it in, rolls back if unhealthy
set -euo pipefail

case "${1:-}" in
  prod) dir=/opt/front-trading-platform ;;
  dev) dir=/opt/front-trading-platform-dev ;;
  *) echo "unknown target" >&2; exit 2 ;;
esac

read -r action sha rest <<<"${SSH_ORIGINAL_COMMAND:-}"
cd "$dir"

case "$action" in
  env)
    exec cat .env
    ;;
  deploy)
    [[ "${sha:-}" =~ ^[0-9a-f]{40}$ && -z "${rest:-}" ]] || { echo "usage: deploy <sha>" >&2; exit 2; }
    ;;
  *)
    echo "unknown action" >&2
    exit 2
    ;;
esac

exec 9>"/run/lock/ci-deploy-$1.lock"
flock -n 9 || { echo "another deploy is running" >&2; exit 1; }

rm -rf .output.new .output.prev
mkdir .output.new
tar -xz --no-same-owner -C .output.new
[ -f .output.new/server/index.mjs ] || { echo "archive has no server entry" >&2; rm -rf .output.new; exit 1; }

mv .output .output.prev
mv .output.new .output

if ! docker compose up -d --build --wait --wait-timeout 120; then
  echo "unhealthy, rolling back" >&2
  docker compose logs --tail 30 frontend >&2 || true
  rm -rf .output
  mv .output.prev .output
  docker compose up -d --build
  exit 1
fi

rm -rf .output.prev
docker image prune -f >/dev/null
git fetch -q origin && git merge -q --ff-only "$sha" || echo "warning: checkout not moved to $sha" >&2
echo "deployed $sha"
