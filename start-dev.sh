#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$PROJECT_ROOT/.dev-runtime"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

start_service() {
  local name="$1"
  local workdir="$2"
  local command="$3"
  local log_file="$LOG_DIR/$name.log"
  local pid_file="$PID_DIR/$name.pid"

  if [[ -f "$pid_file" ]]; then
    local existing_pid
    existing_pid="$(cat "$pid_file")"
    if kill -0 "$existing_pid" >/dev/null 2>&1; then
      echo "$name: already running (PID $existing_pid)"
      return
    fi
    rm -f "$pid_file"
  fi

  echo "$name: starting..."
  (
    cd "$workdir"
    nohup bash -lc "$command" >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )
  echo "$name: started"
}

echo "[1/6] Redis starting..."
if command -v docker >/dev/null 2>&1; then
  if docker container inspect my-redis >/dev/null 2>&1; then
    docker start my-redis >/dev/null 2>&1 || true
    echo "Redis container started."
  else
    docker run --name my-redis -p 6379:6379 -d redis >/dev/null
    echo "Redis container created and started."
  fi
else
  echo "Docker is not installed. Start Redis manually if needed."
fi

echo "[2/6] backend-auth..."
start_service \
  "backend-auth" \
  "$PROJECT_ROOT/backend-auth" \
  "./gradlew bootRun"

echo "[3/6] backend-medication..."
start_service \
  "backend-medication" \
  "$PROJECT_ROOT/backend-medication" \
  "./gradlew bootRun"

echo "[4/6] backend-consultation..."
start_service \
  "backend-consultation" \
  "$PROJECT_ROOT/backend-consultation" \
  "./gradlew bootRun"

echo "[5/6] ai-server..."
if [[ -x "$PROJECT_ROOT/ai-server/.venv/bin/python" ]]; then
  AI_COMMAND="./.venv/bin/python -m uvicorn app.main:app --reload"
else
  AI_COMMAND="python3 -m uvicorn app.main:app --reload"
fi
start_service \
  "ai-server" \
  "$PROJECT_ROOT/ai-server" \
  "$AI_COMMAND"

echo "[6/6] frontend-test..."
start_service \
  "frontend-test" \
  "$PROJECT_ROOT/frontend-test" \
  "npm run dev"

echo
echo "All start requests were sent."
echo "Logs: $LOG_DIR"
echo "PIDs: $PID_DIR"
