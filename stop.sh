#!/bin/bash
# 停止 OA MVP 所有服务
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "停止所有 Docker 服务..."
docker compose down

echo "全部已停止。"
