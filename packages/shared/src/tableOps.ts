// packages/shared/src/tableOps.ts
// WBS 表格操作纯函数（TSV 复制粘贴 / Undo-Redo / 选区规整 / 增删行）

export interface Range {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

/**
 * Normalize a selection range so r1<=r2 and c1<=c2
 * @param range - [r1, c1, r2, c2]
 * @returns Normalized range
 */
export function normalizeRange([r1, c1, r2, c2]: [number, number, number, number]): Range {
  return {
    r1: Math.min(r1, r2),
    c1: Math.min(c1, c2),
    r2: Math.max(r1, r2),
    c2: Math.max(c1, c2),
  };
}

/**
 * Serialize cell selection to TSV string (for copy)
 * @param cells - 2D array of cell string values
 * @returns TSV string
 */
export function cellsToTSV(cells: (string | null | undefined)[][]): string {
  return cells.map(row =>
    row.map(cell => {
      const s = String(cell ?? '');
      if (s.includes('\n') || s.includes('\t') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join('\t'),
  ).join('\n');
}

/**
 * Parse TSV clipboard text back to 2D string array
 * @param text - TSV text
 * @returns 2D string array
 */
export function tsvToCells(text: string): string[][] {
  const lines = text.split('\n');
  const result: string[][] = [];
  for (const line of lines) {
    const row: string[] = [];
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

export interface PasteResult {
  cells: string[][];
  overflowRows: number;
  overflowCols: number;
}

/**
 * Map paste area to target dimensions (top-left alignment)
 * @param src - Source cells (from clipboard)
 * @param targetRows - Target row count
 * @param targetCols - Target column count
 * @returns PasteResult with cells and overflow info
 */
export function mapPaste(src: string[][], targetRows: number, targetCols: number): PasteResult {
  const srcRows = src.length;
  const srcCols = src[0]?.length ?? 0;
  const cells: string[][] = [];
  for (let r = 0; r < targetRows; r++) {
    const row: string[] = [];
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

export interface UndoHistory {
  past: unknown[];
  future: unknown[];
}

const MAX_UNDO = 50;

/**
 * Push a new state onto the undo stack
 * @param history - Current undo history
 * @param newState - New state to push
 * @returns Updated history
 */
export function pushUndo(history: UndoHistory, newState: unknown): UndoHistory {
  const { past } = history;
  const nextPast = [...past, newState].slice(-MAX_UNDO);
  return { past: nextPast, future: [] };
}

export interface PopResult {
  history: UndoHistory;
  state: unknown | null;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Pop the most recent state from undo stack
 * @param history - Current undo history
 * @returns PopResult with previous state
 */
export function popUndo(history: UndoHistory): PopResult {
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
 * Pop from redo stack (undo an undo)
 * @param history - Current undo history
 * @returns PopResult with next state
 */
export function popRedo(history: UndoHistory): PopResult {
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

export interface InsertRowResult {
  insertAt: number;
  orderIndexUpdates: [number, number][];
}

/**
 * Calculate insertion point and order index updates for a new row
 * @param insertAtIndex - 0-based index after which to insert
 * @param totalRows - Current total number of rows
 * @returns InsertRowResult
 */
export function calcInsertRowOrder(insertAtIndex: number, totalRows: number): InsertRowResult {
  const updates: [number, number][] = [];
  for (let i = insertAtIndex + 1; i < totalRows; i++) {
    updates.push([i, i + 1]);
  }
  return { insertAt: insertAtIndex + 1, orderIndexUpdates: updates };
}
