#!/bin/bash
# 停止 OA MVP 所有服务
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "停止前端 HTTP 服务..."
pkill -f "python3 -m http.server 8080" 2>/dev/null || true

echo "停止 Docker 容器..."
docker compose stop backend 2>/dev/null || true
docker compose stop postgres 2>/dev/null || true

echo "全部已停止。"
