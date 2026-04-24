// src/components/roleSwitcher.js
import { getState, setState } from '../store.js';

export function renderRoleSwitcher(container) {
  const state = getState();
  const users = state.users;

  container.innerHTML = `
    <label for="role-select">当前身份</label>
    <select id="role-select">
      ${users.map(u => `
        <option value="${u.id}" ${u.id === state.currentUserId ? 'selected' : ''}>
          ${u.name} (${u.role === 'GROUP_LEADER' ? '组长' : 'PM'})
        </option>
      `).join('')}
    </select>
  `;

  container.querySelector('#role-select').addEventListener('change', (e) => {
    setState({ ...getState(), currentUserId: e.target.value });
  });
}
