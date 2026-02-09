#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS=()

cleanup() {
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
}

trap cleanup EXIT INT TERM

(cd "$ROOT_DIR/backend/api" && npm run dev) &
PIDS+=("$!")

(cd "$ROOT_DIR/backend/orchestrator" && npm run dev) &
PIDS+=("$!")

(cd "$ROOT_DIR/frontend" && npm run dev) &
PIDS+=("$!")

wait -n "${PIDS[@]}"
