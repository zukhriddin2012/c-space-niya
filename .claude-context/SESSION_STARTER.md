# Session Starter Template

> Copy the relevant section below when starting a new Cowork session.

---

## 🚀 Worker Session (Recommended for Task Work)

Use this for task-specific sessions. **No git commands allowed** - coordinator handles git.

```
C-Space HR - Worker Session

⚠️ IMPORTANT: This is a WORKER session. Do NOT use git commands.
A coordinator session handles all git operations.

Context: Read `.claude-context/PROJECT_CONTEXT.md` for project overview.

Your Task: [TASK_ID] - [TASK_TITLE]
[TASK_DESCRIPTION]

Files to work on:
- [FILE_1]
- [FILE_2]

When done:
1. Run `npx tsc --noEmit` to verify no errors
2. List all files you modified/created
3. Summarize changes made
4. DO NOT commit or push - coordinator will handle it
```

---

## 🎯 Coordinator Session

Use this for the main planning/coordination session that handles git.

```
C-Space HR - Coordinator Session

This session coordinates development:
- Manages git operations (commit, push, pull)
- Updates .claude-context/ files
- Merges changes from worker sessions

Read `.claude-context/WORKFLOW.md` for the hub-and-spoke model.
```

---

## Option 1: Full Context Load (Recommended for new sessions)

```
I'm working on the C-Space HR project. Please read the context files to understand the project:

1. Read `.claude-context/PROJECT_CONTEXT.md` for full project overview
2. Read `.claude-context/TASKS.md` for current task status
3. Read `.claude-context/context.json` for structured data

After reading, I'll tell you the specific task to work on.
```

---

## Option 2: Quick Task Assignment

```
C-Space HR Project - Task: [TASK_NAME]

Context files are in `.claude-context/` folder. Key info:
- Next.js 14 + TypeScript + Tailwind + Supabase
- Production: https://hr.cspace.uz
- Translations: src/lib/i18n/ (en.ts, ru.ts, uz.ts, types.ts)

Task: [DESCRIBE TASK]

Files likely involved:
- [LIST FILES]

Please read the context files first, then implement the task.
```

---

## Option 3: Specific Feature Work

### Employee Feature
```
C-Space HR - Employee Module Work

Read `.claude-context/PROJECT_CONTEXT.md` then work on:
- Page: src/app/(dashboard)/employees/
- Table: src/components/EmployeesTable.tsx
- API: src/app/api/employees/

Task: [DESCRIBE]
```

### Attendance Feature
```
C-Space HR - Attendance Module Work

Read `.claude-context/PROJECT_CONTEXT.md` then work on:
- Sheet: src/app/(dashboard)/attendance/sheet/page.tsx
- Table: src/app/(dashboard)/attendance/AttendanceTable.tsx
- API: src/app/api/attendance/

Task: [DESCRIBE]
```

### Recruitment Feature
```
C-Space HR - Recruitment Module Work

Read `.claude-context/PROJECT_CONTEXT.md` then work on:
- Board: src/app/(dashboard)/recruitment/board/page.tsx
- API: src/app/api/candidates/

Task: [DESCRIBE]
```

### Translation Work
```
C-Space HR - Translation Task

Read `.claude-context/PROJECT_CONTEXT.md` then work on translations:
- Types: src/lib/i18n/types.ts (add interface first)
- English: src/lib/i18n/en.ts
- Russian: src/lib/i18n/ru.ts
- Uzbek: src/lib/i18n/uz.ts

Task: [DESCRIBE what needs translation]
```

---

## Session End Checklist

Before ending your session:

- [ ] Run `npx tsc --noEmit` - no errors
- [ ] Update `.claude-context/TASKS.md` - mark task complete
- [ ] Update `.claude-context/PROJECT_CONTEXT.md` - add to changelog
- [ ] Commit and push changes
- [ ] Summarize what was done for handoff

---

## Example Task Prompts

### Example 1: Add a new filter
```
C-Space HR - Add filter to recruitment board

Read `.claude-context/PROJECT_CONTEXT.md` for context.

Task: Add a "Source" filter dropdown to the recruitment board that lets users filter candidates by their application source (LinkedIn, Referral, Website, etc.)

The source field already exists in the candidates table.
```

### Example 2: Fix a bug
```
C-Space HR - Bug Fix

Read `.claude-context/PROJECT_CONTEXT.md` for context.

Bug: When switching language on the Employees page, the "Level" filter options don't update until page refresh.

Please investigate and fix.
```

### Example 3: New feature
```
C-Space HR - New Feature: Shift Notes

Read `.claude-context/PROJECT_CONTEXT.md` for context.

Feature: Allow branch managers to add notes to employee shifts. Notes should be visible on the attendance sheet and in employee attendance history.

Requirements:
1. Add notes field to attendance table (migration)
2. Add notes display on attendance sheet
3. Add ability to edit notes (for managers only)
4. Translate UI elements to all 3 languages
```
