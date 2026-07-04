#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
app_dir="$repo_root/app"

cd "$app_dir"

# This stays running for live reload and log streaming; press Ctrl+C to stop it.
npx devvit playtest "$@"
