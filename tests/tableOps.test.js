// tests/tableOps.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeRange, cellsToTSV, tsvToCells, mapPaste,
  pushUndo, popUndo, popRedo
} from '../src/domain/tableOps.js';

// DT-TBL-01: normalizeRange
it('normalizeRange: [3,5,1,7] → {r1:1,c1:5,r2:3,c2:7}', () => {
  assert.deepStrictEqual(normalizeRange([3, 5, 1, 7]), { r1: 1, c1: 5, r2: 3, c2: 7 });
});
it('normalizeRange: already ordered → same', () => {
  assert.deepStrictEqual(normalizeRange([1, 2, 3, 4]), { r1: 1, c1: 2, r2: 3, c2: 4 });
});

// DT-TBL-02: cellsToTSV escapes newlines/quotes
it('cellsToTSV: plain → no quotes', () => {
  assert.strictEqual(cellsToTSV([['A', 'B'], ['C', 'D']]), 'A\tB\nC\tD');
});
it('cellsToTSV: cell with newline → quoted field', () => {
  assert.strictEqual(cellsToTSV([['line1\nline2']]), '"line1\nline2"');
});
it('cellsToTSV: cell with tab → quoted field', () => {
  assert.strictEqual(cellsToTSV([['a\tb']]), '"a\tb"');
});

// DT-TBL-03: mapPaste overflow
it('mapPaste: 3x2 into 2x3 → overflowRows=1, overflowCols=0', () => {
  const src = [['a', 'b'], ['c', 'd'], ['e', 'f']];
  const r = mapPaste(src, 2, 3);
  assert.strictEqual(r.overflowRows, 1);
  assert.strictEqual(r.overflowCols, 0);
  assert.strictEqual(r.cells[0][0], 'a');
  assert.strictEqual(r.cells[1][1], 'd');
});

// DT-TBL-04: undo/redo stack limit 50
it('pushUndo: past capped at 50', () => {
  let h = { past: [], future: [] };
  for (let i = 0; i < 60; i++) {
    h = pushUndo(h, { v: i });
  }
  assert.strictEqual(h.past.length, 50);
  assert.strictEqual(h.past[0].v, 10); // first 10 dropped
});

it('popUndo: restores previous state', () => {
  let h = pushUndo({ past: [], future: [] }, { v: 1 });
  h = pushUndo(h, { v: 2 });
  const { history, state, canUndo, canRedo } = popUndo(h);
  assert.strictEqual(state.v, 2);
  assert.strictEqual(canUndo, true);
  assert.strictEqual(canRedo, true);
});

it('popRedo: restores future state', () => {
  let h = { past: [{ v: 1 }], future: [{ v: 2 }] };
  const { history, state, canRedo } = popRedo(h);
  assert.strictEqual(state.v, 2);
  assert.strictEqual(canRedo, false);
});

// tsvToCells roundtrip
it('tsvToCells roundtrip: "A\tB\\nC\tD" → same array', () => {
  const src = [['A', 'B'], ['C', 'D']];
  assert.deepStrictEqual(tsvToCells(cellsToTSV(src)), src);
});

it('tsvToCells: quoted field with embedded quote', () => {
  const cells = [['a"b']];
  const tsv = cellsToTSV(cells);
  assert.strictEqual(tsv, '"a""b"'); // RFC 4180: embedded " → ""
  assert.deepStrictEqual(tsvToCells(tsv), cells);
});

// DT-TBL-09: popUndo on empty history → state:null, does not throw
it('popUndo: empty history → state null, no throw', () => {
  const { state, canUndo, canRedo } = popUndo({ past: [], future: [] });
  assert.strictEqual(state, null);
  assert.strictEqual(canUndo, false);
  assert.strictEqual(canRedo, false);
});

// DT-TBL-10: mapPaste overflowCols (src wider than target)
it('mapPaste: 3x3 into 2x2 → overflowCols=1', () => {
  const src = [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']];
  const r = mapPaste(src, 2, 2);
  assert.strictEqual(r.overflowCols, 1);
  assert.strictEqual(r.overflowRows, 1);
  // target is 2x2, only top-left 2x2 of src is used
  assert.strictEqual(r.cells[0][0], 'a');
  assert.strictEqual(r.cells[0][1], 'b');
  assert.strictEqual(r.cells[1][0], 'd');
  assert.strictEqual(r.cells[1][1], 'e');
});
