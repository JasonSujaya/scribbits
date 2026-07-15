#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
app_dir="$repo_root/app"

. "$repo_root/scripts/node-env.sh"
ensure_node_modules

cd "$app_dir"

port="${PORT:-8902}"
mock_api_port="${MOCK_API_PORT:-$((port + 1))}"
runtime_dir="$app_dir/node_modules/.cache/scribbits-mock"
pid_file="$runtime_dir/command.pid"
reload_file="$runtime_dir/backend.reload"
combat_build_dir="$runtime_dir/combat-build"

mkdir -p "$runtime_dir"
if [[ -s "$pid_file" ]]; then
  previous_pid="$(<"$pid_file")"
  previous_command="$(ps -p "$previous_pid" -o command= 2>/dev/null || true)"
  previous_cwd="$(
    lsof -a -p "$previous_pid" -d cwd -Fn 2>/dev/null |
      sed -n 's/^n//p' || true
  )"
  if [[ "$previous_pid" =~ ^[0-9]+$ ]] &&
    [[ "$previous_command" == *"mock.command"* ]] &&
    [[ "$previous_cwd" == "$app_dir" ]] &&
    kill -0 "$previous_pid" 2>/dev/null; then
    printf "Stopping the previous Scribbits dev server (PID %s)...\n" "$previous_pid"
    kill "$previous_pid" 2>/dev/null || true
    for _ in {1..40}; do
      if ! kill -0 "$previous_pid" 2>/dev/null; then
        break
      fi
      sleep 0.1
    done
    if kill -0 "$previous_pid" 2>/dev/null; then
      printf "Could not stop the previous Scribbits dev server (PID %s).\n" "$previous_pid" >&2
      exit 1
    fi
  fi
fi
printf "%s\n" "$$" >"$pid_file"
printf "0\n" >"$reload_file"

cleanup() {
  trap - EXIT INT TERM
  kill "${vite_pid:-}" >/dev/null 2>&1 || true
  kill "${mock_server_pid:-}" >/dev/null 2>&1 || true
  kill "${combat_watch_pid:-}" >/dev/null 2>&1 || true
  wait "${vite_pid:-}" "${mock_server_pid:-}" "${combat_watch_pid:-}" 2>/dev/null || true
  if [[ -f "$pid_file" && "$(<"$pid_file")" == "$$" ]]; then
    rm -f "$pid_file"
  fi
}
trap cleanup EXIT INT TERM

node scripts/build-mock-combat.mjs

printf "\nStarting Scribbits at http://localhost:%s\n" "$port"
printf "Client live updates and safe backend rebuilds are enabled.\n"
printf "This is the no-Reddit-login path for OpenCode/browser iteration.\n\n"

# Build server code away from dist, then publish only complete bundles. A failed
# rebuild leaves the running backend and its last-good production rules intact.
node scripts/build-mock-combat.mjs \
  --watch \
  --out-dir "$combat_build_dir" \
  --publish-dir "$app_dir/dist/mock-runtime" \
  --reload-file "$reload_file" &
combat_watch_pid="$!"

PORT="$mock_api_port" \
MOCK_BACKEND_RELOAD_FILE="$reload_file" \
node scripts/run-mock-backend.mjs &
mock_server_pid="$!"

PORT="$port" \
MOCK_API_PORT="$mock_api_port" \
"$(local_bin vite)" \
  --config vite.mock.config.ts \
  --clearScreen false &
vite_pid="$!"

for _ in {1..120}; do
  if ! kill -0 "$vite_pid" 2>/dev/null || ! kill -0 "$mock_server_pid" 2>/dev/null; then
    printf "Scribbits stopped before the dev server was ready.\n" >&2
    exit 1
  fi
  if curl --silent --fail "http://127.0.0.1:$port/" >/dev/null 2>&1 &&
    curl --silent --fail "http://127.0.0.1:$port/api/arena" >/dev/null 2>&1; then
    printf "\nScribbits is ready: http://localhost:%s\n" "$port"
    break
  fi
  sleep 0.25
done

if ! curl --silent --fail "http://127.0.0.1:$port/" >/dev/null 2>&1; then
  printf "Timed out waiting for Scribbits on port %s.\n" "$port" >&2
  exit 1
fi

wait "$vite_pid"
