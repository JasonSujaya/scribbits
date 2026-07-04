#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
app_dir="$repo_root/app"
app_name="scribbits"

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

cd "$app_dir"

print_step "Type-checking"
npm run type-check

print_step "Linting"
npm run lint

print_step "Building"
npm run build

print_step "Checking Devvit authentication"
if ! devvit_user_output="$(npx devvit whoami 2>&1)"; then
  printf "%s\n" "$devvit_user_output" >&2
  if printf "%s\n" "$devvit_user_output" | grep -Eiq "not currently logged in|not logged in|login"; then
    print_error "Devvit is not logged in."
  else
    print_error "Devvit authentication check failed."
  fi
  printf "If you are not logged in or your token expired, run this once from app/: npx devvit login\n" >&2
  printf "Then rerun ./deploy.command.\n" >&2
  exit 1
fi
printf "%s\n" "$devvit_user_output"

print_step "Checking Devvit app registration"
if ! registered_apps_output="$(npx devvit apps list 2>&1)"; then
  printf "%s\n" "$registered_apps_output" >&2
  print_error "Could not list Devvit apps."
  printf "If your token expired, run this once from app/: npx devvit login\n" >&2
  exit 1
fi
printf "%s\n" "$registered_apps_output"

if ! printf "%s\n" "$registered_apps_output" | grep -Fq "$app_name"; then
  print_error "Devvit app '$app_name' is not registered yet."
  printf "Run the first upload manually once from app/: npx devvit upload\n" >&2
  printf "Reason: Reddit's first upload can require one-time interactive app registration and Terms of Service confirmation, so this script stops before automating it.\n" >&2
  exit 1
fi

print_step "Uploading patch version"
npx devvit upload --bump patch

print_step "Syncing uploaded version"
if ! uploaded_version_output="$(npx devvit view "$app_name" version 2>&1)"; then
  printf "%s\n" "$uploaded_version_output" >&2
  print_error "Upload completed, but the script could not read the uploaded Devvit version."
  printf "Run this from app/ to inspect the uploaded version: npx devvit view %s version\n" "$app_name" >&2
  exit 1
fi

uploaded_version="$(printf "%s\n" "$uploaded_version_output" | tr -d "\r" | awk 'NF { version = $0 } END { print version }')"
if [[ ! "$uploaded_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  printf "%s\n" "$uploaded_version_output" >&2
  print_error "Could not parse the uploaded Devvit version."
  exit 1
fi

npm version --no-git-tag-version --allow-same-version "$uploaded_version" >/dev/null
new_version="$(node -p "require('./package.json').version")"

print_step "Committing and pushing v$new_version"
git -C "$repo_root" add -A

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
