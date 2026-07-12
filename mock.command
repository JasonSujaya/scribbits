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

wait_for_artifact() {
  local artifact_path="$1"
  local attempts=0

  while [[ ! -s "$artifact_path" && "$attempts" -lt 120 ]]; do
    if ! kill -0 "$watch_pid" >/dev/null 2>&1 ||
      ! kill -0 "$combat_watch_pid" >/dev/null 2>&1; then
      printf "A Scribbits watch build stopped before %s was ready.\n" "$artifact_path" >&2
      exit 1
    fi
    sleep 0.25
    attempts=$((attempts + 1))
  done

  if [[ ! -s "$artifact_path" ]]; then
    printf "Timed out waiting for build artifact: %s\n" "$artifact_path" >&2
    exit 1
  fi
}

# Vite clears dist before each watch build. Wait for both outputs before the
# mock server starts so the first browser request cannot hit a half-built app.
wait_for_artifact "$app_dir/dist/client/game.html"
wait_for_artifact "$app_dir/dist/mock-runtime/battle.mjs"

MOCK_AUTO_RELOAD=1 node --watch-preserve-output --watch scripts/dev-mock.mjs
