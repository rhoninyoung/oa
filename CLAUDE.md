# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OA Project Management MVP — A browser-based project scheduling system with a NestJS backend and PostgreSQL database. The app implements a complete GL (Group Leader) edit → submit → PM (Project Manager) approve/reject workflow with status machine: PENDING → REVIEWING → APPROVED / REJECTED.

## Run Commands

```bash
# Start the full API stack (default for development)
./start.sh
# Opens http://localhost

# Run E2E tests (requires services to be running)
npx playwright test

# Run a specific test file
npx playwright test tests/e2e/progress.spec.js

# Run backend unit tests
cd packages/backend && npx jest
```

## Development Workflow — TDD

**This project follows Test-Driven Development. Every new feature or bug fix must follow this cycle:**

1. **Understand requirements** — Clarify what the feature should do, who triggers it, and what the expected output is.
2. **Write a failing test first** — Before touching any implementation, write a test that captures the expected behavior.
3. **Run the test** — Confirm it fails (red).
4. **Implement the feature** — Write only the code needed to make the test pass.
5. **Run the test again** — Confirm it passes (green).
6. **Refactor if needed** — Clean up code while keeping tests green.

**Do not merge or ship any change where tests are failing.**

## Architecture

### Frontend (`src/`)
Pure HTML/JS, ES Modules, no framework, served via nginx. State is fully API-driven (no localStorage fallback).

| File | Role |
|------|------|
| `main.js` | Bootstrap, render dispatch (GROUP vs MASTER view), approval handlers |
| `store.js` | Reactive pub/sub state — `getState()`, `setState()`, `subscribe()`, `initState()`, `mergeAPIData()` |
| `api/client.js` | All HTTP calls to backend (`/api/*`) |
| `domain/stateMachine.js` | `canTransition()` — schedule status transition truth table |
| `domain/permissions.js` | `permit()`, `getFieldPermissions()` — row/field edit eligibility |
| `domain/dependency.js` | `propagateFinishChange()` — topological cascade of date changes downstream |
| `hooks/autoSave.js` | Periodic save + Ctrl+S trigger, API-only |

### Components (`src/components/`)
DOM-first render functions replacing innerHTML. Each is a pure render + event setup. Key:

- `wbsTable.js` — The main scheduling grid. Uses `_isEditing` flag to guard against re-entrant renders during cell editing. **Never call `renderWBSTable` directly after `setState`** — the store subscriber handles re-rendering.
- `roleSwitcher.js` — Role (GL/PM) switcher dropdown
- `projectTree.js` — Left sidebar project/iteration/group navigation
- `activityLog.js` — Append-only log of schedule transitions

### Backend (`packages/backend/src/`)
NestJS modules. Key endpoints:

- `GET /api/init?userId=` — Full app initialization payload
- `PATCH /api/tasks/:id/progress` — Update task progress
- `POST /api/schedules/:id/submit|approve|reject|reschedule`

### Database (`packages/backend/prisma/`)
Prisma ORM schema + seed data. Tables: User, Group, Project, Iteration, GroupSchedule, Task, Holiday.

## State Shape

```js
{ users, groups, projects, iterations, schedules, tasks, activityLog,
  holidays, currentUserId, activeIterationId, activeGroupId, viewMode }
```

## Important Patterns

1. **Never call render functions directly after `setState`** — the store subscriber handles re-rendering.
2. **`_isEditing` guard in wbsTable** — during cell editing, `renderWBSTable` returns early to preserve the live input DOM.
3. **Dependency cycle detection** — simulate the new edge then DFS on `buildDownstreamGraph`.
4. **Time propagation** — flows from predecessor's `endDate` → dependent's `startDate` (+1 work day).
5. **API-only mode** — `fetchInitData()` in `init()`, no localStorage fallback.

## Testing

- **E2E tests**: `tests/e2e/*.spec.js` — Playwright with chromium, browser-based simulation of user workflows.
- **Unit tests**: Domain files (`src/domain/*.js`) are pure functions, directly testable via `node --test`.

## Known Issues

See the plan file (`/root/.claude/plans/sunny-orbiting-nest.md`) for migration status and two known issues:
- **BUG-1**: `./start.sh` unconditionally starts all containers even without `--api` flag
- **BUG-2**: `python3 -m http.server 8080` standalone mode is broken after seed.js deletion

## Rampup Guide

See `RAMPUP.md` — onboarding guide for non-technical接手者.
