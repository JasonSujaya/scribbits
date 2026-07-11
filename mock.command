#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
app_dir="$repo_root/app"

. "$repo_root/scripts/node-env.sh"
ensure_node_modules

cd "$app_dir"

node scripts/make-test-drawing.mjs
"$(local_bin vite)" build
node scripts/build-mock-combat.mjs

printf "\nScribbits browser mock will run at http://localhost:%s\n" "${PORT:-8902}"
printf "Auto rebuild and browser reload are enabled.\n"
printf "This is the no-Reddit-login path for OpenCode/browser iteration.\n\n"

"$(local_bin vite)" build --watch --clearScreen false &
watch_pid="$!"
node scripts/build-mock-combat.mjs --watch &
combat_watch_pid="$!"

cleanup() {
  kill "$watch_pid" >/dev/null 2>&1 || true
  kill "$combat_watch_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

MOCK_AUTO_RELOAD=1 node --watch-preserve-output --watch scripts/dev-mock.mjs
