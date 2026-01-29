# Hub-and-Spoke Development Workflow

> **Model:** One coordinator session handles git, worker sessions focus on code.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   COORDINATOR SESSION                        │
│  • Handles all git operations (commit, push, pull)          │
│  • Manages branches                                          │
│  • Merges changes from worker sessions                       │
│  • Updates context files                                     │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │ Worker A  │       │ Worker B  │       │ Worker C  │
    │ Task: X   │       │ Task: Y   │       │ Task: Z   │
    │ No git!   │       │ No git!   │       │ No git!   │
    └───────────┘       └───────────┘       └───────────┘
```

---

## Worker Session Rules

### ✅ DO
- Read/write files directly
- Run `npx tsc --noEmit` to check types
- Run `npm run dev` to test
- Create new files
- Edit existing files
- Report changes when done

### ❌ DON'T
- Run any `git` commands
- Modify `.claude-context/` files (coordinator does this)
- Push to remote

---

## Worker Session Starter Prompt

Copy this to start a worker session:

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
4. DO NOT commit or push
```

---

## Coordinator Session Commands

### Check for changes from workers
```bash
git status
git diff
```

### Commit worker changes
```bash
git add [files]
git commit -m "Task [ID]: [description]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push
```

### Update context after task completion
1. Edit `TASKS.md` - mark task complete
2. Edit `PROJECT_CONTEXT.md` - add to changelog
3. Commit context updates

---

## Task Handoff Format

Workers should end their session with this format:

```markdown
## Task Complete: [TASK_ID]

### Files Modified
- `src/path/to/file1.tsx` - [what changed]
- `src/path/to/file2.ts` - [what changed]

### Files Created
- `src/path/to/newfile.tsx` - [purpose]

### TypeScript Check
✅ `npx tsc --noEmit` passed

### Summary
[2-3 sentences describing what was done]

### Ready for Commit
Coordinator can now commit these changes.
```

---

## Example Sprint Flow

```
Day 1:
├── Coordinator: Create tasks in TASKS.md, assign to workers
├── Worker A: Starts Task 1 (Employee editing)
├── Worker B: Starts Task 2 (Pipeline filters)
└── Worker C: Starts Task 3 (Shift notes)

Day 1 End:
├── Workers: Report changes in handoff format
├── Coordinator: Review, commit, push all changes
└── Coordinator: Update TASKS.md and context

Day 2:
├── Coordinator: Pull latest, check status
├── Workers: Continue or start new tasks
└── Repeat...
```

---

## Conflict Prevention

1. **Assign files to tasks** - Each task owns specific files
2. **Coordinate shared files** - If multiple tasks need same file, one worker does it
3. **Translation files** - Only one worker edits i18n files at a time
4. **Database migrations** - Coordinator creates migration files

### File Ownership Example

```
Task 1 (Employee Editing):
- src/app/(dashboard)/employees/[id]/edit/page.tsx ← OWNED
- src/components/employee/*.tsx ← OWNED

Task 2 (Pipeline Filters):
- src/app/(dashboard)/recruitment/board/page.tsx ← OWNED
- src/components/recruitment/*.tsx ← OWNED

Task 3 (UI Improvements):
- src/components/ui/*.tsx ← OWNED

Shared (Coordinator manages):
- src/lib/i18n/*.ts
- src/components/index.ts (main barrel)
- .claude-context/*
```

### Component Import Rules

When adding new components:
1. Place in appropriate feature folder (`employee/`, `ui/`, etc.)
2. Add export to that folder's `index.ts`
3. Import via feature folder: `import { X } from '@/components/feature'`

---

## Quick Reference

| Action | Who Does It |
|--------|-------------|
| Edit code files | Worker |
| Create new files | Worker |
| Run type check | Worker |
| Run dev server | Worker |
| Git commit | Coordinator |
| Git push | Coordinator |
| Update TASKS.md | Coordinator |
| Create branches | Coordinator |
| Merge branches | Coordinator |
