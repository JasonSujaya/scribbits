#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
app_dir="$repo_root/app"
. "$repo_root/scripts/node-env.sh"

bold_cyan="\033[1;36m"
bold_green="\033[1;32m"
reset_color="\033[0m"

print_step() {
  printf "\n${bold_cyan}==> %s${reset_color}\n" "$1"
}

ensure_clean_git_tree() {
  if [[ "${ALLOW_DIRTY_DEPLOY:-}" == "1" ]]; then
    return
  fi

  if ! git -C "$repo_root" diff --quiet ||
    ! git -C "$repo_root" diff --cached --quiet ||
    [[ -n "$(git -C "$repo_root" ls-files --others --exclude-standard)" ]]; then
    printf "Git tree is dirty. Commit or stash changes before deploy.\n" >&2
    printf "This protects deploy from uploading local work that has not been reviewed yet.\n" >&2
    exit 1
  fi
}

ensure_node_modules
ensure_clean_git_tree
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=4096"

cd "$app_dir"

print_step "Running the canonical verified Devvit upload"
run_pnpm deploy

printf "\n${bold_green}Deploy complete.${reset_color}\n"
