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

# 2. 启动数据库
echo ""
echo "[1/2] 启动 PostgreSQL..."
docker compose up -d postgres
docker compose ps postgres

# 3. 启动后端和 nginx
echo ""
echo "[2/2] 启动 backend + nginx..."
docker compose up -d backend nginx

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
  echo "API 模式: 已启用 (nginx 反向代理 /api/* 到后端)"
else
  echo "后端: http://localhost:3000 (后台运行，前端使用 localStorage)"
fi
echo ""
echo "按 Ctrl+C 停止所有服务"

# 6. 保持脚本运行（前台跟踪日志），Ctrl+C 触发停止
trap 'echo "停止服务..."; docker compose down; echo "全部已停止。"; exit 0' SIGINT SIGTERM

echo "所有服务已在后台运行..."
docker compose logs --follow --tail=0
