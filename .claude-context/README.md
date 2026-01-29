# .claude-context/

This folder contains project context for AI-assisted development sessions.

## Files

| File | Purpose |
|------|---------|
| `PROJECT_CONTEXT.md` | Full project documentation (architecture, patterns, conventions) |
| `context.json` | Structured data for programmatic parsing |
| `TASKS.md` | Task tracker across sessions |
| `CREDENTIALS.md` | Access credentials reference (no secrets) |
| `SESSION_STARTER.md` | Templates for starting new sessions |

## Usage

### Starting a New Session

1. Upload or mount the project folder
2. Tell Claude to read `.claude-context/PROJECT_CONTEXT.md`
3. Assign the task
4. Work on the task
5. Before ending, update `TASKS.md` and `PROJECT_CONTEXT.md`

### Keeping Context Updated

After each session:
1. Update "Recent Changes Log" in `PROJECT_CONTEXT.md`
2. Update "recentChanges" in `context.json`
3. Update task status in `TASKS.md`
4. Commit and push

### Sprint Planning

Use `TASKS.md` to:
- Plan sprint tasks
- Track progress across sessions
- Hand off work between sessions

## Version Control

This folder IS tracked in git (except actual secrets).
- `CREDENTIALS.md` has references only, not actual secrets
- Actual secrets go in `.env.local` (gitignored)
