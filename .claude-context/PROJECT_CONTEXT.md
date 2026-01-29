# C-Space HR System - Project Context

> **Last Updated:** 2026-01-29
> **Updated By:** Claude (Component refactoring, UI primitives)

## Quick Start for New Sessions

```bash
# Project location
cd "/path/to/c-space-hr"

# Install dependencies (if needed)
npm install

# Run development server
npm run dev

# Type check
npx tsc --noEmit
```

## Project Overview

**C-Space HR** is a comprehensive HR management system for C-Space coworking spaces in Tashkent, Uzbekistan.

### Key Features
- Employee management with multi-branch support
- Attendance tracking via Telegram bot (GPS/IP/Remote verification)
- Payroll management
- Recruitment pipeline (Kanban board)
- Accounting requests workflow
- Organization chart with manager hierarchy
- Multi-language support (English, Russian, Uzbek)

### Production URLs
- **Web App:** https://hr.cspace.uz
- **Hosted on:** Vercel
- **Database:** Supabase (PostgreSQL)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Custom session-based (Supabase) |
| Hosting | Vercel |
| Bot | Telegram Bot (separate repo) |

---

## Project Structure

```
c-space-hr/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── employees/      # Employee management
│   │   │   ├── attendance/     # Attendance tracking
│   │   │   ├── recruitment/    # Recruitment pipeline
│   │   │   ├── accounting/     # Accounting requests
│   │   │   ├── branches/       # Branch management
│   │   │   ├── org-chart/      # Organization chart
│   │   │   ├── reports/        # Reports
│   │   │   └── my-portal/      # Employee self-service
│   │   ├── api/                # API routes
│   │   └── login/              # Auth pages
│   ├── components/             # Feature-based component organization
│   │   ├── employee/           # Employee-related components
│   │   ├── recruitment/        # Recruitment components
│   │   ├── attendance/         # Attendance components
│   │   ├── branch/             # Branch components
│   │   ├── layout/             # Layout components (Sidebar, Nav, etc.)
│   │   ├── ui/                 # UI primitives & shared UI
│   │   ├── profile/            # Profile components
│   │   ├── auth/               # Auth guards & components
│   │   └── index.ts            # Main barrel export
│   ├── contexts/               # React contexts (Language, etc.)
│   └── lib/                    # Utilities
│       ├── db.ts               # Database queries
│       ├── supabase.ts         # Supabase client
│       ├── auth-server.ts      # Server-side auth
│       ├── permissions.ts      # Role permissions
│       └── i18n/               # Translations
├── supabase/
│   └── migrations/             # Database migrations
└── docs/                       # Documentation & mockups
```

---

## Component Organization

Components are organized by feature with barrel exports (index.ts files).

### Component Folders

| Folder | Contents | Components |
|--------|----------|------------|
| `employee/` | Employee management | AddEmployeeModal, EditEmployeeModal, EmployeesTable, EmployeeWagesSection, EmployeePayslipsSection, WageTrendChart |
| `recruitment/` | Hiring pipeline | CandidateDetailModal, CandidatesKanban, RecruitmentFilters |
| `attendance/` | Time tracking | AttendanceMap |
| `branch/` | Branch management | BranchMap |
| `layout/` | App layout | Sidebar, MobileNav, NotificationBell, SidebarToggle, QuickSwitch |
| `ui/` | UI primitives | Button, Input, Card, Modal, Select, Badge, ConfirmationDialog, etc. |
| `profile/` | User profile | MyProfileClient, ProfilePictureUpload |
| `auth/` | Auth guards | RoleGuard, PageGuard |

### Import Patterns

```tsx
// Import from feature folders
import { EmployeesTable, AddEmployeeModal } from '@/components/employee';
import { CandidateDetailModal } from '@/components/recruitment';
import { Sidebar, MobileNav } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import { RoleGuard } from '@/components/auth';

// Or import from main barrel
import { EmployeesTable, Button, Sidebar } from '@/components';
```

### UI Primitives

Reusable UI components with consistent styling:

| Component | Props | Variants |
|-----------|-------|----------|
| `Button` | variant, size, loading, disabled | primary, secondary, danger, ghost / sm, md, lg |
| `Input` | label, error, helperText, leftIcon | - |
| `Card` | title, description, footer, noPadding | - |
| `Modal` | isOpen, onClose, title, size | sm, md, lg, xl |
| `Select` | label, error, options, placeholder | - |
| `Badge` | variant, size | default, success, warning, danger, info, purple / sm, md |

---

## Database Schema (Key Tables)

### employees
```sql
- id: uuid (PK)
- employee_id: text (e.g., "EMP001")
- full_name: text
- position: text
- level: text ('junior', 'middle', 'senior', 'executive', 'specialist', 'manager')
- branch_id: uuid (FK -> branches)
- department_id: uuid (FK -> departments)
- manager_id: uuid (FK -> employees, for org chart)
- salary: numeric
- employment_type: text ('full-time', 'part-time', 'contract', 'internship')
- status: text ('active', 'probation', 'inactive', 'terminated')
- telegram_id: text (for bot integration)
- preferred_language: text ('en', 'ru', 'uz')
- hire_date: date
- email, phone, date_of_birth, gender, notes
```

### attendance
```sql
- id: uuid (PK)
- employee_id: uuid (FK -> employees)
- date: date
- check_in: time
- check_out: time
- check_in_branch_id: uuid (FK -> branches)
- verification_type: text ('ip', 'gps', 'remote')
- status: text ('present', 'late', 'absent', 'early_leave')
- total_hours: numeric
- shift_id: text ('day', 'night')
- is_overnight: boolean
- overnight_from_date: date
```

### branches
```sql
- id: uuid (PK)
- name: text
- address: text
- latitude, longitude: numeric (for geofencing)
- geofence_radius: integer (meters)
- allowed_ips: text[] (for IP verification)
- status: text ('operational', 'under_construction', 'rented')
- monthly_budget: numeric
```

### positions
```sql
- id: uuid (PK)
- name: text
- name_uz: text
- name_ru: text
- description: text
- level: text
```

### departments
```sql
- id: uuid (PK)
- name: text
- name_uz: text
- name_ru: text
- description: text
```

### candidates (recruitment)
```sql
- id: uuid (PK)
- name, email, phone: text
- position_id: uuid
- stage: text ('screening', 'interview1', 'interview2', 'under_review', 'probation', 'hired', 'rejected')
- source: text
- resume_url: text
- notes: text
- rating: integer
```

### accounting_requests
```sql
- id: uuid (PK)
- request_number: text
- request_type: text ('reconciliation', 'payment', 'confirmation')
- requester_id: uuid (FK -> employees)
- status: text ('pending', 'in_progress', 'needs_info', 'pending_approval', 'approved', 'completed', 'rejected')
- priority: text ('normal', 'urgent')
- amount: numeric
- (many other fields for different request types)
```

---

## Authentication & Roles

### Roles Hierarchy
1. **super_admin** - Full access
2. **ceo** - Executive access
3. **hr** - HR management
4. **chief_accountant** - Accounting head
5. **accountant** - Accounting staff
6. **recruiter** - Recruitment only
7. **branch_manager** - Branch-specific access
8. **legal** - Legal department
9. **employee** - Self-service only

### Key Permissions (from lib/permissions.ts)
- `EMPLOYEES_VIEW`, `EMPLOYEES_EDIT`, `EMPLOYEES_CREATE`
- `ATTENDANCE_VIEW`, `ATTENDANCE_EDIT`
- `SALARY_VIEW`, `SALARY_EDIT`
- `RECRUITMENT_VIEW`, `RECRUITMENT_EDIT`
- `ACCOUNTING_VIEW`, `ACCOUNTING_APPROVE`
- `REPORTS_VIEW`

---

## API Routes

### Attendance
- `GET/POST /api/attendance/dashboard` - Dashboard stats
- `POST /api/attendance/ip-checkin` - IP-based check-in
- `POST /api/attendance/remote-checkin` - Remote work check-in
- `POST /api/attendance/[id]/checkout` - Manual checkout
- `POST /api/attendance/[id]/remind` - Send reminder

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `PATCH /api/employees/[id]` - Update employee

### Org Chart
- `GET /api/org-chart` - Get organization hierarchy

### Recruitment
- `GET /api/candidates` - List candidates
- `PATCH /api/candidates/[id]/stage` - Move candidate stage

---

## Internationalization (i18n)

### Files
- `src/lib/i18n/en.ts` - English
- `src/lib/i18n/ru.ts` - Russian
- `src/lib/i18n/uz.ts` - Uzbek
- `src/lib/i18n/types.ts` - TypeScript interfaces

### Usage
```tsx
import { useTranslation } from '@/contexts/LanguageContext';

function Component() {
  const { t, language, setLanguage } = useTranslation();
  return <h1>{t.dashboard.title}</h1>;
}
```

### Adding New Translations
1. Add key to `types.ts`
2. Add translations to `en.ts`, `ru.ts`, `uz.ts`
3. Use via `t.section.key`

---

## Environment Variables

Required in `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Telegram Bot (optional for web)
TELEGRAM_BOT_WEBHOOK_URL=xxx
TELEGRAM_BOT_WEBHOOK_SECRET=xxx
```

---

## Common Patterns

### Server Components with Auth
```tsx
import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export default async function Page() {
  const user = await getSession();
  if (!user) redirect('/login');

  const canEdit = hasPermission(user.role, PERMISSIONS.EMPLOYEES_EDIT);
  // ...
}
```

### API Routes with Auth
```tsx
import { withAuth } from '@/lib/api-auth';

export const GET = withAuth(async (request, user) => {
  // user is authenticated
  return NextResponse.json({ data });
});
```

### Database Queries
```tsx
import { supabaseAdmin } from '@/lib/supabase';

const { data, error } = await supabaseAdmin
  .from('employees')
  .select('*, branches(name)')
  .eq('status', 'active');
```

---

## Recent Changes Log

### 2026-01-29
- **Component Refactoring**: Reorganized 24 components into 8 feature-based folders
  - Created barrel exports (index.ts) for each folder
  - Updated 11 files with new import paths
  - Fixed cross-folder imports (recruitment → employee)
- **UI Primitives**: Created 6 new reusable components (Button, Input, Card, Modal, Select, Badge)
- Fixed translations for Employees page (Level, All Levels, position levels, employment types)
- Fixed Remote badge display in attendance table (verificationType interface)
- Added verificationType to AttendanceSession and AttendanceRecord interfaces

### 2026-01-28
- Added new positions (Assistant Operations Manager, Supervisor, etc.)
- Implemented expandable org chart with dotted connectors
- Removed contact buttons from org chart cards
- Added manager_id column for org chart hierarchy

---

## Current Sprint / Backlog

See `docs/specs/CURRENT_SPRINT.md` and `docs/specs/BACKLOG.md` for detailed tasks.

### Priority Items
1. Employee profile editing improvements
2. Recruitment pipeline filters
3. Shift notes feature
4. Attendance report enhancements

---

## Testing Checklist

Before deploying:
1. Run `npx tsc --noEmit` - No TypeScript errors
2. Test all three languages (EN/RU/UZ)
3. Test on mobile viewport
4. Verify Supabase queries work
5. Check role-based permissions

---

## Useful Commands

```bash
# Development
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Database migrations (run in Supabase dashboard or CLI)
# Migration files are in supabase/migrations/
```
