// src/components/roleSwitcher.js
import { getState, setState } from '../store.js';

export function renderRoleSwitcher(container) {
  const state = getState();
  const users = state.users;
  const savedUrl = localStorage.getItem('oa.api.baseUrl') ?? '';

  container.innerHTML = `
    <label for="role-select">当前身份</label>
    <select id="role-select">
      ${users.map(u => `
        <option value="${u.id}" ${u.id === state.currentUserId ? 'selected' : ''}>
          ${u.name} (${u.role === 'GROUP_LEADER' ? '组长' : 'PM'})
        </option>
      `).join('')}
    </select>
    <div id="api-config" style="margin-top:8px;border-top:1px solid #e5e7eb;padding-top:8px">
      <label for="api-url" style="font-size:11px;color:#6b7280">API 地址</label>
      <input id="api-url" type="text" placeholder="http://localhost:3000" value="${savedUrl}"
        style="width:100%;margin-top:4px;padding:4px 8px;font-size:12px;border:1px solid #d1d5db;border-radius:4px;box-sizing:border-box">
      <button id="btn-connect-api" style="margin-top:6px;width:100%;padding:4px;cursor:pointer">连接</button>
      <div id="api-status" style="font-size:11px;margin-top:4px"></div>
    </div>
  `;

  container.querySelector('#role-select').addEventListener('change', (e) => {
    setState({ ...getState(), currentUserId: e.target.value });
  });

  container.querySelector('#btn-connect-api')?.addEventListener('click', async () => {
    const url = container.querySelector('#api-url').value.trim();
    const statusEl = container.querySelector('#api-status');
    if (!url) {
      localStorage.removeItem('oa.api.baseUrl');
      statusEl.textContent = '已切换为本地模式';
      statusEl.style.color = '#6b7280';
      return;
    }
    localStorage.setItem('oa.api.baseUrl', url);
    statusEl.textContent = '正在连接...';
    statusEl.style.color = '#6b7280';
    try {
      const resp = await fetch(url + '/api/health');
      if (resp.ok) {
        statusEl.textContent = '✓ 已连接';
        statusEl.style.color = 'green';
        setTimeout(() => location.reload(), 800);
      } else {
        statusEl.textContent = '✗ 连接失败';
        statusEl.style.color = 'red';
      }
    } catch {
      statusEl.textContent = '✗ 无法连接';
      statusEl.style.color = 'red';
    }
  });
}
