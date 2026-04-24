// src/io/importExport.js
// JSON 导入 / 导出功能

/**
 * 触发浏览器下载 JSON 文件
 * @param {string} json  - JSON.stringify(state)
 * @param {string} filename
 */
export function downloadJSON(json, filename = 'oa-backup.json') {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 触发隐藏的 <input type=file> 选择器
 * @param {string} inputId
 * @returns {Promise<string|null>}  文件内容或 null
 */
export function pickJSONFile(inputId = 'file-import') {
  return new Promise((resolve) => {
    const input = document.getElementById(inputId);
    if (!input) { resolve(null); return; }

    const handler = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
      input.removeEventListener('change', handler);
    };
    input.addEventListener('change', handler);
    input.click();
  });
}
