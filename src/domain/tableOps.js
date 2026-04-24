// src/domain/tableOps.js
// WBS 表格操作纯函数（TSV 复制粘贴 / Undo-Redo / 选区规整 / 增删行）

/**
 * 规整任意方向拖选为标准 {r1,c1,r2,c2}（r1≤r2, c1≤c2）
 * @param {[number, number, number, number]} range  [r1,c1,r2,c2]
 * @returns {{r1:number,c1:number,r2:number,c2:number}}
 */
export function normalizeRange([r1, c1, r2, c2]) {
  return {
    r1: Math.min(r1, r2),
    c1: Math.min(c1, c2),
    r2: Math.max(r1, r2),
    c2: Math.max(c1, c2),
  };
}

/**
 * 将选区内容序列化为 TSV 字符串（供复制）
 * @param {string[][]} cells  2D array of cell string values
 * @returns {string}
 */
export function cellsToTSV(cells) {
  return cells.map(row =>
    row.map(cell => {
      const s = String(cell ?? '');
      if (s.includes('\n') || s.includes('\t') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join('\t')
  ).join('\n');
}

/**
 * 从剪贴板文本（TSV）解析回 2D 字符串数组
 * @param {string} text
 * @returns {string[][]}
 */
export function tsvToCells(text) {
  const lines = text.split('\n');
  const result = [];
  for (const line of lines) {
    const row = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        // quoted field
        let j = i + 1;
        let val = '';
        while (j < line.length) {
          if (line[j] === '"' && line[j + 1] === '"') {
            val += '"';
            j += 2;
          } else if (line[j] === '"') {
            j++;
            break;
          } else {
            val += line[j++];
          }
        }
        row.push(val);
        i = j;
      } else if (line[i] === '\t') {
        row.push('');
        i++;
      } else {
        const j = line.indexOf('\t', i);
        if (j === -1) {
          row.push(line.slice(i));
          i = line.length;
        } else {
          row.push(line.slice(i, j));
          i = j + 1;
        }
      }
    }
    result.push(row);
  }
  return result;
}

/**
 * 粘贴映射：左上对齐，返回 overflow 信息
 * @param {string[][]} src   source cells (from clipboard)
 * @param {number} targetRows
 * @param {number} targetCols
 * @returns {{cells: string[][], overflowRows: number, overflowCols: number}}
 */
export function mapPaste(src, targetRows, targetCols) {
  const srcRows = src.length;
  const srcCols = src[0]?.length ?? 0;
  const cells = [];
  for (let r = 0; r < targetRows; r++) {
    const row = [];
    for (let c = 0; c < targetCols; c++) {
      const si = Math.min(r, srcRows - 1);
      const sj = Math.min(c, srcCols - 1);
      row.push(src[si]?.[sj] ?? '');
    }
    cells.push(row);
  }
  return {
    cells,
    overflowRows: Math.max(0, srcRows - targetRows),
    overflowCols: Math.max(0, srcCols - targetCols),
  };
}

const MAX_UNDO = 50;

/**
 * @param {{past: any[], future: any[]}} history
 * @param {any} newState
 * @returns {{past: any[], future: any[]}}
 */
export function pushUndo(history, newState) {
  const { past } = history;
  const nextPast = [...past, newState].slice(-MAX_UNDO);
  return { past: nextPast, future: [] };
}

/**
 * @param {{past: any[], future: any[]}} history
 * @returns {{history: {past: any[], future: any[]}, state: any|null, canUndo: boolean, canRedo: boolean}}
 */
export function popUndo(history) {
  if (history.past.length === 0) {
    return { history, state: null, canUndo: false, canRedo: history.future.length > 0 };
  }
  const prev = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  const newFuture = [prev, ...history.future];
  return {
    history: { past: newPast, future: newFuture },
    state: prev,
    canUndo: newPast.length > 0,
    canRedo: true,
  };
}

/**
 * @param {{past: any[], future: any[]}} history
 * @returns {{history: {past: any[], future: any[]}, state: any|null, canUndo: boolean, canRedo: boolean}}
 */
export function popRedo(history) {
  if (history.future.length === 0) {
    return { history, state: null, canUndo: history.past.length > 0, canRedo: false };
  }
  const next = history.future[0];
  const newFuture = history.future.slice(1);
  const newPast = [...history.past, next];
  return {
    history: { past: newPast, future: newFuture },
    state: next,
    canUndo: true,
    canRedo: newFuture.length > 0,
  };
}

/**
 * 在指定行索引后插入一行空白任务数据
 * @param {number} insertAtIndex  0-based row index after which to insert
 * @param {number} totalRows
 * @returns {{insertAt: number, orderIndexUpdates: [string, number][]}}
 *  orderIndexUpdates = [[taskId, newIndex], ...]
 */
export function calcInsertRowOrder(insertAtIndex, totalRows) {
  // 新行放在 insertAtIndex 之后；后续行 orderIndex +1
  const updates = [];
  for (let i = insertAtIndex + 1; i < totalRows; i++) {
    updates.push([i, i + 1]); // [oldIndex, newIndex] — actual id mapping done by caller
  }
  return { insertAt: insertAtIndex + 1, orderIndexUpdates: updates };
}
