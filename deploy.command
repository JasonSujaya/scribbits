#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
app_dir="$repo_root/app"
app_name="scribbits"

. "$repo_root/scripts/node-env.sh"

bold_cyan="\033[1;36m"
bold_green="\033[1;32m"
bold_red="\033[1;31m"
reset_color="\033[0m"

print_step() {
  printf "\n${bold_cyan}==> %s${reset_color}\n" "$1"
}

print_error() {
  printf "\n${bold_red}%s${reset_color}\n" "$1" >&2
}

ensure_clean_git_tree() {
  if [[ "${ALLOW_DIRTY_DEPLOY:-}" == "1" ]]; then
    return
  fi

  if ! git -C "$repo_root" diff --quiet ||
    ! git -C "$repo_root" diff --cached --quiet ||
    [[ -n "$(git -C "$repo_root" ls-files --others --exclude-standard)" ]]; then
    print_error "Git tree is dirty. Commit or stash changes before deploy."
    printf "This protects deploy from uploading local work that has not been reviewed yet.\n" >&2
    exit 1
  fi
}

run_devvit() {
  "$(local_bin devvit)" "$@"
}

ensure_node_modules
ensure_clean_git_tree

cd "$app_dir"

print_step "Type-checking"
"$(local_bin tsc)" --build

print_step "Linting"
"$(local_bin eslint)" 'src/**/*.{ts,tsx}'

print_step "Running simulations"
node scripts/test-battle.mjs

print_step "Building"
"$(local_bin vite)" build

print_step "Checking Devvit authentication"
if ! devvit_user_output="$(run_devvit whoami 2>&1)"; then
  printf "%s\n" "$devvit_user_output" >&2
  if printf "%s\n" "$devvit_user_output" | grep -Eiq "not currently logged in|not logged in|login"; then
    print_error "Devvit is not logged in."
  else
    print_error "Devvit authentication check failed."
  fi
  printf "If you are not logged in or your token expired, run this once from app/: ./node_modules/.bin/devvit login\n" >&2
  printf "Then rerun ./deploy.command.\n" >&2
  exit 1
fi
printf "%s\n" "$devvit_user_output"

print_step "Checking Devvit app registration"
if ! registered_apps_output="$(run_devvit apps list 2>&1)"; then
  printf "%s\n" "$registered_apps_output" >&2
  print_error "Could not list Devvit apps."
  printf "If your token expired, run this once from app/: ./node_modules/.bin/devvit login\n" >&2
  exit 1
fi
printf "%s\n" "$registered_apps_output"

if ! printf "%s\n" "$registered_apps_output" | grep -Fq "$app_name"; then
  print_error "Devvit app '$app_name' is not registered yet."
  printf "Run the first upload manually once from app/: ./node_modules/.bin/devvit upload\n" >&2
  printf "Reason: Reddit's first upload can require one-time interactive app registration and Terms of Service confirmation, so this script stops before automating it.\n" >&2
  exit 1
fi

print_step "Uploading patch version"
run_devvit upload --bump patch

print_step "Syncing uploaded version"
if ! uploaded_version_output="$(run_devvit view "$app_name" version 2>&1)"; then
  printf "%s\n" "$uploaded_version_output" >&2
  print_error "Upload completed, but the script could not read the uploaded Devvit version."
  printf "Run this from app/ to inspect the uploaded version: ./node_modules/.bin/devvit view %s version\n" "$app_name" >&2
  exit 1
fi

uploaded_version="$(printf "%s\n" "$uploaded_version_output" | tr -d "\r" | awk 'NF { version = $0 } END { print version }')"
if [[ ! "$uploaded_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  printf "%s\n" "$uploaded_version_output" >&2
  print_error "Could not parse the uploaded Devvit version."
  exit 1
fi

node "$repo_root/scripts/sync-devvit-version.mjs" "$repo_root" "$uploaded_version" >/dev/null
new_version="$(node -p "JSON.parse(require('fs').readFileSync('./package.json', 'utf8')).version")"

print_step "Committing and pushing v$new_version"
git -C "$repo_root" add app/package.json app/package-lock.json

if git -C "$repo_root" diff --cached --quiet; then
  printf "No changes to commit. Skipping git commit and push.\n"
  did_push="no"
else
  git -C "$repo_root" commit -m "chore: deploy v$new_version"
  git -C "$repo_root" push
  did_push="yes"
fi

printf "\n${bold_green}Deploy complete.${reset_color}\n"
printf "App: %s\n" "$app_name"
printf "Version: %s\n" "$new_version"
printf "Git push: %s\n" "$did_push"
