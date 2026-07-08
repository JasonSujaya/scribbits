#!/usr/bin/env bash

# Shared Node resolver for local command files.
# OpenCode/Codex shells on this Mac may not have node/npm on PATH, so command
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
if [[ -x "$codex_node_dir/node" ]]; then
  prepend_path_if_exists "$codex_node_dir"
  prepend_path_if_exists "$codex_bin_dir"
fi

export PATH

if ! command -v node >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Node.js is not available on PATH.

Install Node 22+ or run from a shell that can see the Codex bundled runtime.
This repo's command files will use local app/node_modules binaries once Node is visible.
EOF
  exit 127
fi

node_major="$(node -p "Number(process.versions.node.split('.')[0])")"
if (( node_major < 22 )); then
  printf "Node 22+ is required; found %s.\n" "$(node --version)" >&2
  exit 1
fi

ensure_node_modules() {
  if [[ -x "$app_dir/node_modules/.bin/devvit" && -x "$app_dir/node_modules/.bin/vite" ]]; then
    return
  fi

  if command -v npm >/dev/null 2>&1; then
    printf "Installing app dependencies with npm ci...\n"
    (cd "$app_dir" && npm ci)
    return
  fi

  cat >&2 <<EOF
app/node_modules is missing or incomplete, and npm is not available.

Install Node 22+ with npm, then run:
  cd "$app_dir"
  npm ci
EOF
  exit 127
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
