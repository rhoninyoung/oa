/**
 * Docker 集成测试 — 验证后端容器能正确启动并响应 API
 *
 * 这类测试在以下场景特别有价值：
 * - Dockerfile CMD 路径是否正确
 * - 新增的 API 端点是否在容器中可访问
 * - Docker 构建产物是否包含最新代码
 *
 * 运行方式（需要 Docker）：
 *   npx playwright test tests/integration/docker.spec.ts
 *
 * 或者手动验证：
 *   docker compose up -d backend
 *   sleep 5
 *   curl http://localhost:3000/api/health
 */

import { test, expect } from '@playwright/test';

test.describe('Docker Backend Integration', () => {
  test.beforeEach(() => {
    // 这些测试需要 Docker 环境，检查 docker 是否可用
  });

  test('health endpoint is reachable after docker compose up', async ({ page }) => {
    // 验证健康检查端点
    const response = await page.evaluate(async () => {
      const r = await fetch('http://localhost:3000/api/health');
      return { status: r.status, body: await r.json() };
    });

    expect(response.status, 'health endpoint should return 200').toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  test('projects endpoint returns valid data', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const r = await fetch('http://localhost:3000/api/projects');
      const data = await r.json();
      return { status: r.status, isArray: Array.isArray(data), length: data.length };
    });

    expect(response.status).toBe(200);
    expect(response.isArray).toBe(true);
    expect(response.length).toBeGreaterThan(0);
  });

  test('no 404 on health or projects endpoints', async ({ page }) => {
    const failedUrls: string[] = [];
    page.on('response', resp => {
      if (!resp.ok() && ['/api/health', '/api/projects'].some(p => resp.url().includes(p))) {
        failedUrls.push(`${resp.status()} ${resp.url()}`);
      }
    });

    await page.goto('http://localhost:3000/api/health');
    await page.goto('http://localhost:3000/api/projects');

    expect(failedUrls, `Unexpected 404s: ${JSON.stringify(failedUrls)}`).toHaveLength(0);
  });
});
