#!/bin/bash
# 一键启动 OA MVP
# 用法: ./start.sh [选项]
#   --api    启动 API 模式（需要 Docker 后端）
#   (无参数) 仅启动前端（localStorage 模式）

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

# 1. 启动 Docker 后端（API 模式必需）
if $API_MODE; then
  echo ""
  echo "[1/3] 检查 Docker 容器..."
  if ! docker compose ps postgres 2>/dev/null | grep -q "Up"; then
    echo "启动 PostgreSQL..."
    docker compose up -d postgres
  else
    echo "PostgreSQL 已运行"
  fi

  if ! docker compose ps backend 2>/dev/null | grep -q "Up"; then
    echo "启动后端 API 服务..."
    docker compose up -d backend
  else
    echo "后端 API 已运行"
  fi

  # 等待后端就绪
  echo "等待后端启动..."
  for i in {1..10}; do
    if curl -sf http://localhost:3000/api/projects > /dev/null 2>&1; then
      echo "后端 API 就绪 (http://localhost:3000)"
      break
    fi
    sleep 1
  done
fi

# 2. 启动前端
echo ""
echo "[$(( API_MODE ? 3 : 1 ))/$(($API_MODE ? 3 : 1))] 启动前端服务..."
# 杀掉现有 frontend 进程
pkill -f "python3 -m http.server 8080" 2>/dev/null || true
sleep 0.5
python3 -m http.server 8080 --directory "$SCRIPT_DIR" &
FRONTEND_PID=$!
echo "前端就绪 (http://localhost:8080)"
echo ""

# 3. 输出状态
echo "=========================================="
echo "服务状态"
echo "=========================================="
echo "前端: http://localhost:8080"
if $API_MODE; then
  echo "后端: http://localhost:3000"
  echo "API 模式: 已启用"
  echo ""
  echo "提示: 在页面右上角输入 http://localhost:3000 并点击"连接""
else
  echo "后端: 未启动 (localStorage 模式)"
  echo ""
  echo "启动 API 模式: ./start.sh --api"
fi
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待信号
trap "echo '停止服务...'; pkill -f 'python3 -m http.server 8080' 2>/dev/null; exit 0" SIGINT SIGTERM
wait $FRONTEND_PID
