#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
app_dir="$repo_root/app"

. "$repo_root/scripts/node-env.sh"
ensure_node_modules

cd "$app_dir"
run_pnpm verify
