#!/bin/bash
# 一键启动 OA MVP
# 用法: ./start.sh [选项]
#   --api    启动 API 模式（postgres + backend + nginx）
#   (无参数) 仅启动 nginx 前端（localStorage 模式）

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

API_MODE=false
if [[ "$*" == *"--api"* ]]; then
  API_MODE=true
fi

echo "=========================================="
echo "OA MVP 启动脚本"
echo "=========================================="

# 1. 停止旧容器（如果存在）
docker compose down 2>/dev/null || true

# 2. 启动数据库（所有模式都需要）
echo ""
echo "[1/3] 启动 PostgreSQL..."
docker compose up -d postgres
docker compose ps postgres

# 3. 启动服务
if $API_MODE; then
  echo ""
  echo "[2/3] 启动后端 API..."
  docker compose up -d backend

  echo ""
  echo "[3/3] 启动 nginx..."
  docker compose up -d nginx
else
  echo ""
  echo "[2/3] 启动 nginx..."
  docker compose up -d nginx
fi

# 4. 等待 nginx 就绪
echo ""
echo "等待服务就绪..."
for i in {1..10}; do
  if curl -sf http://localhost:80/ > /dev/null 2>&1; then
    echo "nginx 就绪 (http://localhost)"
    break
  fi
  sleep 1
done

if $API_MODE; then
  for i in {1..10}; do
    if curl -sf http://localhost:3000/api/projects > /dev/null 2>&1; then
      echo "后端 API 就绪 (http://localhost:3000)"
      break
    fi
    sleep 1
  done
fi

# 5. 输出状态
echo ""
echo "=========================================="
echo "服务状态"
echo "=========================================="
docker compose ps
echo ""
echo "前端: http://localhost"
if $API_MODE; then
  echo "后端: http://localhost:3000"
  echo "API 代理: http://localhost/api/* → backend:3000"
else
  echo "后端: 未启动 (localStorage 模式)"
fi
echo ""
echo "按 Ctrl+C 停止所有服务"

# 6. 等待 SIGINT/SIGTERM → 停止所有容器
trap 'echo "停止服务..."; docker compose down; echo "全部已停止。"; exit 0' SIGINT SIGTERM

# 保持脚本运行（前台等待 docker compose）
docker compose wait
