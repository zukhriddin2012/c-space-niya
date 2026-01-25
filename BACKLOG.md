# C-Space HR Platform - Feature Backlog

> Last Updated: January 2026
> Source: Team Feedback Document (January 2026)

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0 - Quick Wins | 6 | Low effort, high value - can implement quickly |
| P1 - High Priority | 12 | Important features, moderate effort |
| P2 - Medium Priority | 14 | Nice to have, larger effort |
| P3 - Future/Complex | 17 | Complex features requiring significant work |

---

## P0 - Quick Wins (1-2 days each)

These features have low complexity and can be implemented quickly with existing infrastructure.

| # | Feature | Description | Effort | Notes |
|---|---------|-------------|--------|-------|
| 3 | **Employee Self-Service Profile Editing** | Allow employees to edit contact info, personal details | 1 day | My Portal already exists, just need to add edit capability |
| 32 | **My Schedule View** | Employees see their upcoming shifts | 1 day | Extends existing attendance data |
| 29 | **Branch-by-Branch View** | Filter shifts by location | 0.5 day | Already have branch filtering in attendance |
| 38 | **Shift Notes** | Add instructions/notes to specific shifts | 1 day | Simple field addition to attendance |
| 48 | **Pipeline Filters** | Filter by stage, source, date, recruiter | 1 day | Recruitment page exists, add filters |
| 45 | **Bulk Actions (Candidates)** | Move/reject multiple candidates at once | 1 day | Add checkboxes to existing table |

---

## P1 - High Priority (3-5 days each)

Important features that align with current system architecture.

| # | Feature | Description | Effort | Dependencies | Notes |
|---|---------|-------------|--------|--------------|-------|
| 44 | **Pipeline View (Kanban)** | Kanban board view of all candidates | 3 days | None | `/recruitment/board` exists but may need enhancement |
| 25 | **Visual Shift Calendar** | See all shifts across all branches | 4 days | None | Calendar component needed |
| 28 | **Daily Shift View** | See who was working on any specific day | 2 days | #25 | Part of shift calendar |
| 30 | **Historical Shift Data** | Look up past shifts by date/branch | 2 days | None | Query existing attendance data |
| 31 | **No-Show Tracking** | Flag when employees don't show up | 3 days | None | Compare scheduled vs actual attendance |
| 5 | **Employee Timeline** | Track promotions, achievements, role changes | 4 days | None | New table for employee events |
| 46 | **Stage Duration Tracking** | How long candidates stay in each stage | 2 days | None | Add timestamps to stage changes |
| 49 | **Time-in-Stage** | Analytics on candidate pipeline | 2 days | #46 | Dashboard widget |
| 47 | **Bottleneck Alerts** | Warnings when candidates stuck too long | 2 days | #46 | Notification system |
| 42 | **Stage Requirements** | Required actions before moving to next stage | 3 days | None | Checklist per stage |
| 4 | **Employee Directory & Org Chart** | Visual company structure with search | 5 days | None | New page with tree visualization |
| 39 | **Branch Comparison** | Compare staffing levels across locations | 3 days | None | Dashboard analytics |

---

## P2 - Medium Priority (1-2 weeks each)

Valuable features requiring more significant development effort.

| # | Feature | Description | Effort | Dependencies | Notes |
|---|---------|-------------|--------|--------------|-------|
| 1 | **1:1 Meetings Tracking** | Track meeting history and notes | 1 week | None | New module: meetings table, UI |
| 14 | **Meeting Notes** | Archive of all past 1:1 conversations | 3 days | #1 | Part of meetings module |
| 13 | **Shared Agenda** | Both manager and employee can add topics | 3 days | #1 | Part of meetings module |
| 15 | **Private Notes** | Separate private notes for manager/employee | 2 days | #1 | Visibility flags on notes |
| 26 | **Recurring Shifts** | Set up repeating schedules | 1 week | #25 | Shift scheduling system |
| 33 | **Availability Setting** | Employees set when they can/can't work | 4 days | None | New availability table |
| 34 | **Shift Swap Requests** | Request to trade shifts with colleagues | 1 week | #26 | Approval workflow |
| 36 | **Shift Confirmation** | Employees confirm upcoming shifts | 3 days | #26, #35 | Telegram bot integration |
| 37 | **Replacement Finder** | Find available employees to cover shifts | 4 days | #33 | Query availability + notifications |
| 27 | **Open Shift** | Post unfilled shifts for employees to claim | 5 days | #26, #33 | Self-service shift claiming |
| 6 | **Custom Fields** | Add custom data fields per location/department | 1 week | None | Dynamic field system |
| 21 | **Engagement Surveys** | Pulse checks and anonymous feedback | 1 week | None | Survey builder + anonymous submission |
| 7 | **Mentor Assignment** | Automatically assign mentors to new hires | 4 days | None | Onboarding enhancement |
| 43 | **Auto-Advance (Candidates)** | Automatically move candidates based on actions | 4 days | #42 | Workflow automation |

---

## P3 - Future/Complex (2+ weeks each)

Larger features requiring significant planning and development.

| # | Feature | Description | Effort | Dependencies | Notes |
|---|---------|-------------|--------|--------------|-------|
| 2 | **Calendar Integration** | Integrate calendar for scheduling | 2 weeks | None | Google Calendar API, OAuth |
| 22 | **Calendar Sync** | Google Calendar, Outlook integration | 2 weeks | #2 | Bi-directional sync |
| 20 | **Team Calendar** | Shared view of events, time off, meetings | 2 weeks | #2 | Aggregate calendar |
| 16 | **Meeting Scheduling** | Built-in scheduling with calendar integration | 2 weeks | #2, #1 | Calendar + availability |
| 9 | **Goal Setting (OKRs/KPIs)** | Set and track individual and team goals | 3 weeks | None | Major new module |
| 10 | **Performance Reviews** | 360-degree feedback, self-assessments | 4 weeks | #9 | Review cycles, forms |
| 11 | **Skills Matrix** | Track employee competencies and skill gaps | 2 weeks | None | Skill taxonomy + assessments |
| 12 | **Career Development Plans** | Map growth paths and track progress | 3 weeks | #11, #9 | Career pathing module |
| 17 | **Progress Tracking (Mentorship)** | Track sessions, milestones, goals | 2 weeks | #7, #1 | Mentorship module |
| 18 | **Mentorship Reports** | Analytics on program participation | 1 week | #17 | Reporting dashboard |
| 8 | **Training Schedule Integration** | Link onboarding tasks to training calendar | 2 weeks | #2, #40 | Calendar + LMS |
| 40 | **Knowledge Base** | Central repository of training materials | 3 weeks | None | Document management system |
| 19 | **Company Newsfeed** | Announcements, updates, social features | 2 weeks | None | Social feed module |
| 23 | **Communication Tools Integration** | Microsoft Teams integration | 2 weeks | None | Teams API, webhooks |
| 24 | **Video Conferencing** | Zoom, Google Meet for 1:1s | 2 weeks | #1, #2 | Meeting links integration |
| 35 | **Shift Reminders** | Push notifications before shift starts | 1 week | #26 | Telegram bot enhancement |
| 41 | **Pipeline Stages Enhancement** | Full stage workflow as specified | 1 week | None | May already exist partially |

---

## Already Implemented (Partial/Full)

Features that already exist in some form:

| # | Feature | Current Status | Enhancement Needed |
|---|---------|----------------|-------------------|
| 44 | Pipeline View | `/recruitment/board` exists | May need Kanban drag-drop |
| 48 | Pipeline Filters | Basic filtering exists | Add more filter options |
| 41 | Pipeline Stages | Stages exist in recruitment | Review if matches requested stages |
| 29 | Branch-by-Branch View | Branch filtering exists | Minor UI improvements |

---

## Technical Dependencies

### Infrastructure Needed

1. **Calendar System** - Required for: #2, #8, #16, #20, #22
   - Google Calendar API integration
   - OAuth flow for user calendars
   - Event sync service

2. **Notification System Enhancement** - Required for: #35, #36, #47
   - Push notifications (Telegram bot)
   - Email notifications
   - In-app notifications

3. **Shift/Schedule Tables** - Required for: #25, #26, #27, #31, #33, #34
   - New `shifts` table (separate from attendance)
   - `availability` table
   - `shift_swaps` table

4. **Meeting Module** - Required for: #1, #13, #14, #15, #16
   - `meetings` table
   - `meeting_notes` table
   - `meeting_agendas` table

5. **Performance Module** - Required for: #9, #10, #11, #12
   - `goals` table
   - `reviews` table
   - `skills` table
   - `career_paths` table

---

## Recommended Implementation Order

### Phase 1: Quick Wins (Week 1-2)
- [ ] Employee Self-Service Profile Editing (#3)
- [ ] Pipeline Filters Enhancement (#48)
- [ ] Bulk Actions for Candidates (#45)
- [ ] Shift Notes (#38)

### Phase 2: Shift Management Foundation (Week 3-5)
- [ ] Visual Shift Calendar (#25)
- [ ] Daily Shift View (#28)
- [ ] Historical Shift Data (#30)
- [ ] Branch Comparison Dashboard (#39)

### Phase 3: Recruitment Enhancement (Week 6-7)
- [ ] Stage Duration Tracking (#46, #49)
- [ ] Bottleneck Alerts (#47)
- [ ] Stage Requirements (#42)
- [ ] Kanban Board Enhancement (#44)

### Phase 4: 1:1 Meetings Module (Week 8-10)
- [ ] 1:1 Meetings Tracking (#1)
- [ ] Meeting Notes & Agenda (#13, #14)
- [ ] Private Notes (#15)

### Phase 5: Employee Development (Week 11-14)
- [ ] Employee Timeline (#5)
- [ ] Employee Directory & Org Chart (#4)
- [ ] Custom Fields (#6)

### Phase 6: Advanced Shift Management (Week 15-18)
- [ ] Recurring Shifts (#26)
- [ ] Availability Setting (#33)
- [ ] Shift Swap Requests (#34)
- [ ] No-Show Tracking (#31)

### Future Phases
- Calendar Integration & Sync
- Performance Reviews & Goals
- Skills Matrix & Career Development
- Knowledge Base & Training

---

## Notes

- Effort estimates assume single developer
- Dependencies should be built before dependent features
- Calendar integration is a major unlock for many features
- Telegram bot already exists for check-in - can extend for shift reminders
- Current recruitment module provides good foundation for ATS enhancements

---

## Changelog

| Date | Changes |
|------|---------|
| Jan 2026 | Initial backlog created from team feedback |
