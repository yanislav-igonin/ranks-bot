# Rank Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete rank and assignment management to the Telegram Mini App.

**Architecture:** Extend the current controller/service/DAO stack and current
React app directly. Reuse existing entities, Telegraf instance, changelog
records, and visual system.

**Tech Stack:** Node.js 22, TypeScript 6, TypeORM 1.1, Telegraf 4, React 19,
Vitest, Node test runner.

## Global Constraints

- Keep production changes local to existing modules.
- Rank title length: 1–120 trimmed characters.
- Assignment comment length: 0–500 trimmed characters.
- Assigned ranks sort newest first.
- Deleting an assigned rank returns HTTP 409.
- Telegram delivery is best-effort after database commit.

---

### Task 1: Backend contract and mutation behavior

**Files:**
- Modify: `test/tg-app/service.test.js`
- Modify: `test/tg-app/http.test.js`
- Modify: `test/integration/tg-app-dao.test.js`
- Modify: `src/modules/tg-app/tg-app.controller.ts`
- Modify: `src/modules/tg-app/tg-app.service.ts`
- Modify: `src/modules/tg-app/tg-app.dao.ts`

- [ ] Add failing tests for comments, timestamps, descending order, input
  validation, create/delete/unassign routes, changelogs, and notifications.
- [ ] Run targeted backend tests and confirm new assertions fail.
- [ ] Extend controller routes and bodies.
- [ ] Extend service ports, validation, mapping, notifications, and mutations.
- [ ] Implement transactional DAO operations and newest-first query order.
- [ ] Run targeted backend and integration tests.

### Task 2: Telegram publication and startup port

**Files:**
- Modify: `test/tg-app/lifecycle.test.js`
- Modify: `src/modules/bot/bot.module.ts`
- Modify: `src/modules/tg-app/tg-app.module.ts`
- Modify: `src/index.ts`

- [ ] Add failing lifecycle tests for listening-port reporting.
- [ ] Expose a best-effort `sendMessage` method from the running bot.
- [ ] Make Mini App launch resolve with the actual listening port.
- [ ] Remove release startup output and log/report the actual port.
- [ ] Run lifecycle and module tests.

### Task 3: React management interface

**Files:**
- Modify: `src/tg-app/contract.ts`
- Modify: `src/tg-app/web/App.tsx`
- Modify: `src/tg-app/web/main.tsx`
- Modify: `src/tg-app/web/styles.css`
- Modify: `src/tg-app/test/App.test.tsx`

- [ ] Add failing UI tests for visible comments, confirmation/comment entry,
  creation, deletion, and unassignment.
- [ ] Extend the frontend API contract and client.
- [ ] Implement confirmation and destructive-action dialogs.
- [ ] Implement rank management screen and assigned-rank controls.
- [ ] Refine responsive styling, focus states, motion, and pending states.
- [ ] Run frontend tests, typecheck, and build.

### Task 4: Full verification and review

- [ ] Run root and frontend tests.
- [ ] Run formatting checks, lint/checks, typechecks, and production build.
- [ ] Smoke-test the rendered Mini App.
- [ ] Run read-only Cursor review.
- [ ] Validate each Cursor finding, fix real issues, and rerun affected checks.
