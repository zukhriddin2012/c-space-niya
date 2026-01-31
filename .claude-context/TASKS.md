# C-Space HR - Task Tracker

> This file tracks active tasks across Cowork sessions.
> Update this file when starting/completing tasks.

---

## Active Sprint

**Sprint:** January 2026 - Week 5
**Started:** 2026-01-27
**Goal:** Translation completeness, Org chart, UI polish

---

## Task Queue

### 🟢 Completed

| Task ID | Title | Completed | Session |
|---------|-------|-----------|---------|
| T001 | Org chart with manager hierarchy | 2026-01-28 | Main |
| T002 | Translation fixes (Employees page) | 2026-01-29 | Main |
| T003 | Remote badge fix in attendance | 2026-01-29 | Main |
| T004 | Component refactoring (feature folders + UI primitives) | 2026-01-29 | Main |
| T010 | Flatten deep API routes (PATCH consolidation) | 2026-01-30 | Main |
| T011 | Split db.ts into domain modules (20 files) | 2026-01-30 | Main |
| T012 | Standardize API route naming (tg-* → telegram-*) | 2026-01-30 | Main |
| T013 | Set up Vitest testing infrastructure | 2026-01-30 | Main |
| T014 | Remote work check-in feature | 2026-01-29 | Main |
| T016 | Reception Mode Phase 1 - Admin Config | 2026-01-31 | Main |
| T017 | Reception Mode Phase 2 - Core Functionality | 2026-01-31 | Main |
| T018 | Reception Mode Phase 3 - Full Screen UI | 2026-01-31 | Main |
| T019 | Reception Mode Phase 4 - Branch Context | 2026-01-31 | Main |
| T020 | Fix "No branch assigned" in Reception Mode | 2026-01-31 | Main |
| T021 | Labzak Historical Data Import (2024-2025) | 2026-01-31 | Main |
| T022 | Clients Table for Customer Management | 2026-01-31 | Main |
| T023 | Fix Supabase 1000 Row Limit (Batch Fetching) | 2026-01-31 | Main |
| T024 | Reception Dashboard Date Picker Redesign | 2026-01-31 | Main |
| T025 | Reception Mode Persistence on Refresh | 2026-01-31 | Main |
| T026 | Transaction Filters & Client Autocomplete | 2026-01-31 | Main |

### 🟡 In Progress

| Task ID | Title | Assigned | Started |
|---------|-------|----------|---------|
| - | - | - | - |

### 🔴 Pending

| Task ID | Title | Priority | Notes |
|---------|-------|----------|-------|
| T015 | Language switching fixes | High | 8 of 12 sections have hardcoded text |
| T005 | Employee profile editing | High | Improve edit form UX |
| T006 | Recruitment pipeline filters | Medium | Filter by position, date, source |
| T007 | Shift notes feature | Medium | Allow managers to add notes to shifts |
| T008 | Attendance export to Excel | Low | Export filtered attendance data |
| T009 | Dashboard widget customization | Low | Let users reorder widgets |

---

## Task Template

When starting a new task, copy this template:

```markdown
## Task: [TASK_ID] - [Title]

**Status:** 🟡 In Progress
**Started:** [Date]
**Session:** [Cowork Session ID]

### Objective
[What needs to be done]

### Files to Modify
- [ ] `path/to/file1.tsx`
- [ ] `path/to/file2.ts`

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Notes
[Any important context]

### Completion
- **Completed:** [Date]
- **Changes Made:** [Summary]
- **PR/Commit:** [Link if applicable]
```

---

## Session Handoff Protocol

When ending a session:

1. **Update TASKS.md** - Move task to appropriate status
2. **Update PROJECT_CONTEXT.md** - Add to "Recent Changes Log"
3. **Update context.json** - Add to "recentChanges" array
4. **Commit changes** - Push to repository

When starting a session:

1. **Read .claude-context/** - Get full context
2. **Check TASKS.md** - See what's pending/in-progress
3. **Claim a task** - Move to "In Progress" with your session info
4. **Do the work**
5. **Follow handoff protocol** above

---

## Quick Reference

### Common Files by Feature

**Employees:**
- Page: `src/app/(dashboard)/employees/page.tsx`
- Filters: `src/app/(dashboard)/employees/EmployeesFilters.tsx`
- Components: `src/components/employee/` (EmployeesTable, AddEmployeeModal, EditEmployeeModal, etc.)
- Edit: `src/app/(dashboard)/employees/[id]/edit/page.tsx`

**Attendance:**
- Sheet: `src/app/(dashboard)/attendance/sheet/page.tsx`
- Table: `src/app/(dashboard)/attendance/AttendanceTable.tsx`
- Components: `src/components/attendance/` (AttendanceMap)
- Dashboard: `src/app/(dashboard)/attendance/dashboard/page.tsx`
- API: `src/app/api/attendance/*/route.ts`

**Recruitment:**
- Board: `src/app/(dashboard)/recruitment/board/page.tsx`
- Components: `src/components/recruitment/` (CandidateDetailModal, CandidatesKanban, RecruitmentFilters)
- Table: `src/app/(dashboard)/recruitment/page.tsx`
- API: `src/app/api/candidates/route.ts`

**Reception Mode (Full-Screen Interface):**
- Toggle: `src/components/layout/ReceptionModeToggle.tsx` (header button)
- Context: `src/contexts/ReceptionModeContext.tsx` (mode + branch state)
- Header: `src/components/layout/ReceptionHeader.tsx` (purple tabs + branch selector)
- Content Switcher: `src/components/layout/DashboardContent.tsx`
- Components: `src/components/reception/`
  - `ReceptionDashboard.tsx` - Stats & activity feed (branch-filtered)
  - `ReceptionTransactions.tsx` - Transaction CRUD (branch-filtered)
  - `ReceptionExpenses.tsx` - Expense CRUD (branch-filtered)
  - `ReceptionSettings.tsx` - Admin config + Branch Access management
  - `BranchSelector.tsx` - Branch switcher dropdown
  - `BranchSwitchModal.tsx` - Branch switch confirmation
- Types: `src/modules/reception/types/index.ts` (includes BranchOption, ReceptionBranchAccess)
- Constants: `src/modules/reception/lib/constants.ts`
- API: `src/app/api/reception/` (transactions, expenses, dashboard, admin, branches)
- Migration: `supabase/migrations/20260131_reception_branch_access.sql`

**Translations:**
- Types: `src/lib/i18n/types.ts`
- English: `src/lib/i18n/en.ts`
- Russian: `src/lib/i18n/ru.ts`
- Uzbek: `src/lib/i18n/uz.ts`

**Shared Components:**
- Layout: `src/components/layout/` (Sidebar, MobileNav, NotificationBell, etc.)
- UI Primitives: `src/components/ui/` (Button, Input, Card, Modal, Select, Badge)
- Auth: `src/components/auth/` (RoleGuard, PageGuard)

### Component Import Pattern

```tsx
// Import from feature folders (preferred)
import { EmployeesTable } from '@/components/employee';
import { Button, Card, Badge } from '@/components/ui';
import { Sidebar } from '@/components/layout';
```

### Testing Commands

```bash
# Run tests
npm run test:run

# Type check
npx tsc --noEmit

# Dev server
npm run dev

# Build
npm run build
```
