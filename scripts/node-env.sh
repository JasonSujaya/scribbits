#!/usr/bin/env bash

# Shared Node resolver for local command files.
# OpenCode/Codex shells on this Mac may not have Node or pnpm on PATH, so command
# files source this and then call local binaries from app/node_modules/.bin.

resolve_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

repo_root="${repo_root:-$(resolve_repo_root)}"
app_dir="${app_dir:-$repo_root/app}"

prepend_path_if_exists() {
  local candidate="$1"
  if [[ -d "$candidate" ]]; then
    case ":$PATH:" in
      *":$candidate:"*) ;;
      *) PATH="$candidate:$PATH" ;;
    esac
  fi
}

prepend_path_if_exists "/opt/homebrew/bin"
prepend_path_if_exists "/usr/local/bin"
prepend_path_if_exists "$HOME/.nvm/current/bin"
prepend_path_if_exists "$HOME/.local/share/mise/shims"
prepend_path_if_exists "$HOME/.asdf/shims"

codex_node_dir="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
codex_bin_dir="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin"
codex_fallback_bin_dir="$codex_bin_dir/fallback"
if [[ -x "$codex_node_dir/node" ]]; then
  prepend_path_if_exists "$codex_node_dir"
  prepend_path_if_exists "$codex_fallback_bin_dir"
  prepend_path_if_exists "$codex_bin_dir"
fi

export PATH

if ! command -v node >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Node.js is not available on PATH.

Install Node 22.2.0+ or run from a shell that can see the Codex bundled runtime.
This repo's command files will use local app/node_modules binaries once Node is visible.
EOF
  exit 127
fi

read -r node_major node_minor node_patch < <(
  node -p "process.versions.node.split('.').join(' ')"
)
if (( node_major < 22 || (node_major == 22 && node_minor < 2) )); then
  printf "Node 22.2.0+ is required; found %s.\n" "$(node --version)" >&2
  exit 1
fi

run_pnpm() {
  local required_pnpm_version="11.7.0"
  local detected_pnpm_version=""
  if command -v pnpm >/dev/null 2>&1; then
    detected_pnpm_version="$(command pnpm --version 2>/dev/null || true)"
  fi
  if [[ "$detected_pnpm_version" == "$required_pnpm_version" ]]; then
    command pnpm "$@"
    return
  fi
  if command -v corepack >/dev/null 2>&1; then
    detected_pnpm_version="$(corepack pnpm --version 2>/dev/null || true)"
    if [[ "$detected_pnpm_version" == "$required_pnpm_version" ]]; then
      corepack pnpm "$@"
      return
    fi
  fi
  cat >&2 <<'EOF'
pnpm 11.7.0 is not available.

Install pnpm 11.7.0, enable Corepack, or use the Codex bundled runtime.
EOF
  return 127
}

ensure_node_modules() {
  if [[ -x "$app_dir/node_modules/.bin/devvit" && -x "$app_dir/node_modules/.bin/vite" ]]; then
    return
  fi

  printf "Installing app dependencies with pnpm...\n"
  (cd "$app_dir" && run_pnpm install --frozen-lockfile)
  if [[ -x "$app_dir/node_modules/.bin/devvit" && -x "$app_dir/node_modules/.bin/vite" ]]; then
    return
  fi

  cat >&2 <<EOF
app/node_modules is still missing required local binaries.

Run:
  cd "$app_dir"
  pnpm install --frozen-lockfile
EOF
  return 127
}

local_bin() {
  local name="$1"
  local path="$app_dir/node_modules/.bin/$name"
  if [[ ! -x "$path" ]]; then
    printf "Missing local binary: %s\n" "$path" >&2
    exit 127
  fi
  printf "%s" "$path"
}
