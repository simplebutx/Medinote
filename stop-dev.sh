#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$PROJECT_ROOT/.dev-runtime"
PID_DIR="$RUNTIME_DIR/pids"

stop_service() {
  local name="$1"
  local port="$2"
  local pid_file="$PID_DIR/$name.pid"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      if kill -0 "$pid" >/dev/null 2>&1; then
        kill -9 "$pid" >/dev/null 2>&1 || true
      fi
      echo "$name: stopped (PID $pid)"
    else
      echo "$name: stale PID file removed"
    fi
    rm -f "$pid_file"
    return
  fi

  local pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "$name: stopping by port $port"
    while IFS= read -r pid; do
      [[ -z "$pid" ]] && continue
      kill "$pid" >/dev/null 2>&1 || true
    done <<< "$pids"
  else
    echo "$name: not running"
  fi
}

echo "[1/6] frontend-test..."
stop_service "frontend-test" "5173"

echo "[2/6] ai-server..."
stop_service "ai-server" "8000"

echo "[3/6] backend-auth..."
stop_service "backend-auth" "8080"

echo "[4/6] backend-medication..."
stop_service "backend-medication" "8081"

echo "[5/6] backend-consultation..."
stop_service "backend-consultation" "8082"

echo "[6/6] Redis..."
if command -v docker >/dev/null 2>&1; then
  docker stop my-redis >/dev/null 2>&1 || true
  echo "Redis container stopped."
else
  echo "Docker is not installed."
fi
