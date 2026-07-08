#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
app_dir="$repo_root/app"

. "$repo_root/scripts/node-env.sh"
ensure_node_modules

cd "$app_dir"

"$(local_bin vite)" build

printf "\nScribbits browser mock will run at http://localhost:%s\n" "${PORT:-8902}"
printf "This is the no-Reddit-login path for OpenCode/browser iteration.\n\n"

node scripts/dev-mock.mjs
