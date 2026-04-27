# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OA Project Management MVP — a single-file HTML application with zero build tools, zero dependencies, and zero backend. Users run it locally with a browser via HTTP server. The app implements a complete GL (Group Leader) edit → submit → PM (Project Manager) approve/reject → master table sync workflow.

## Run Commands

```bash
# Serve locally (ES Modules require http:// protocol, not file://)
python3 -m http.server 8080
# Then open http://localhost:8080

# Run tests (Node.js built-in test runner)
node --test

# Import/export are in-browser UI buttons; data persists to localStorage key: oa.state.v1
```

## Architecture

### State Management (`src/store.js`)
Central pub/sub store with localStorage persistence. `setState()` triggers `_persist()` + notifies all subscribers. No framework — pure reactive pattern. State shape:

```js
{ users, groups, projects, iterations, schedules, tasks, activityLog,
  currentUserId, activeIterationId, activeGroupId, viewMode, holidays }
```

### Domain Layer (`src/domain/`)
Pure functions, no side effects, fully testable:

- **stateMachine.js** — `canTransition(from, action, actor, ctx)` and `nextStatus()` implement the schedule status workflow: PENDING → REVIEWING → APPROVED/REJECTED. The truth table covers submit/withdraw/approve/reject/reschedule per role.
- **calendar.js** — `isWeekend`, `isWorkDay`, `addWorkDays` (skips weekends + holidays), `calcEndDate`
- **dependency.js** — 1-to-1 dependency constraint, `checkDependencyCycle` (DFS), `propagateFinishChange` (topological cascade of start/end dates downstream)
- **permissions.js** — Row deletion/edit eligibility checks
- **tableOps.js** — Undo/redo stack operations

### Components (`src/components/`)
DOM-first UI with render functions that replace innerHTML. Each component is a pure render function + event setup. Key components:

- **wbsTable.js** — The main data grid. Uses `_isEditing` flag to guard against re-entrant renders during cell editing. Supports: cell dblclick edit, Ctrl+C/V/Z/Y, right-click context menu (insert/delete rows), dependency picker overlay, date/duration linkage (changing duration recomputes endDate using work days). **Important**: do NOT call `renderWBSTable` directly after `setState` — the store subscriber in `main.js` handles re-render.
- **roleSwitcher.js** — Dropdown to switch between GROUP_LEADER and PROJECT_MANAGER roles for current user
- **projectTree.js** — Hierarchical sidebar for project/iteration/group navigation
- **activityLog.js** — Append-only log of schedule transitions and actions

### Hooks (`src/hooks/`)
- **autoSave.js** — Schedules periodic auto-save; also handles Ctrl+S manual trigger

### IO (`src/io/`)
- **importExport.js** — JSON file download/upload via browser File API

### Rendering Flow (`src/main.js`)
```
init() → getState() → if empty, load seed data
       → render() → (if cell editing: only update shell components, skip table)
                  → if viewMode === 'MASTER': renderMasterView()
                  → else: renderGroupView() + approval panel
       → subscribe(render) — store subscribers trigger re-render on any state change
```

### Data Model
- **Schedule** has status: `PENDING` | `REVIEWING` | `APPROVED` | `REJECTED`
- **Task** has `source`: `'GROUP'` (created by GL) or `'MASTER'` (created by PM in master view)
- Tasks have optional `dependencyTaskId` (1-to-1 predecessor link)
- When a task's endDate/duration changes, `propagateFinishChange` cascades the new start/end to all downstream dependents via DFS

### Testing
Pure function tests use `node --test`. Domain files (`src/domain/*.js`) are directly importable in Node since they have no DOM dependencies. Component tests require jsdom or similar.

## Important Patterns

1. **Never call render functions directly after `setState`** — the store subscriber pattern handles re-rendering. Breaking this causes double-renders and state inconsistencies.
2. **Guard `_isEditing` before table re-render** — when a cell is being edited, `renderWBSTable` returns early to preserve the live input DOM.
3. **Dependency cycle detection** is done by simulating the new edge then running DFS on `buildDownstreamGraph`.
4. **Time propagation** flows from predecessor's `endDate` → dependent's `startDate` (+1 work day), then `endDate` recomputed from `durationDays - 1`.
