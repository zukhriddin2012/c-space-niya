# C-Space HR System - Project Context

> **Last Updated:** 2026-01-31
> **Updated By:** Claude (Reception Mode Phase 2 - Core Functionality)

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
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Custom session-based (Supabase) |
| Testing | Vitest + React Testing Library + MSW |
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
│   ├── test/                   # Test infrastructure
│   │   ├── setup.ts            # Vitest setup
│   │   ├── mocks/              # MSW handlers
│   │   └── utils/              # Test utilities
│   └── lib/                    # Utilities
│       ├── db.ts               # Database re-exports (backwards compat)
│       ├── db/                 # Modular database functions
│       │   ├── index.ts        # Barrel export
│       │   ├── connection.ts   # Supabase client & shared utils
│       │   ├── employees.ts    # Employee functions
│       │   ├── attendance.ts   # Attendance functions
│       │   ├── payroll.ts      # Payroll functions
│       │   └── ...             # 20 domain modules
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
- remote_work_enabled: boolean (allows remote check-in without GPS)
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

### 2026-01-31 (Reception Mode Phase 2)
- **Reception Mode Core Functionality**: Complete transaction and expense management
  - Dashboard page (`/reception`): Stats overview, income/expense breakdowns, recent activity
  - Transactions page (`/reception/transactions`): Record sales, filters, search, void with reason
  - Expenses page (`/reception/expenses`): Record expenses, filters, search, void with reason
- **API Endpoints**:
  - `GET/POST /api/reception/transactions` - List and create transactions
  - `GET/DELETE /api/reception/transactions/[id]` - View and void transactions
  - `GET/POST /api/reception/expenses` - List and create expenses
  - `GET/DELETE /api/reception/expenses/[id]` - View and void expenses
  - `GET /api/reception/dashboard` - Aggregated statistics
- **Features**: Auto-numbering (TXN/EXP-YYYYMM-XXXX), soft delete, payment validation, pagination

### 2026-01-31 (Reception Mode Phase 1)
- **Reception Mode Admin Configuration**: Foundation for transaction/expense tracking
  - Database migration with 5 new tables: service_types, expense_types, payment_methods, transactions, expenses
  - Auto-numbering sequences (TXN-YYYYMM-XXXX, EXP-YYYYMM-XXXX)
  - 11 default service types, 9 expense types, 6 payment methods
- **Admin API Routes**: Full CRUD for service types, expense types, payment methods
  - `/api/reception/admin/service-types/` - List, create, update, delete
  - `/api/reception/admin/expense-types/` - List, create, update, delete
  - `/api/reception/admin/payment-methods/` - List, create, update, delete
- **Admin UI** (`/reception/admin`): Tab-based configuration management
  - Emoji picker, search, soft delete, active/inactive toggle
- **New Module**: `src/modules/reception/` with types and constants
- **Permissions**: Added reception:* permissions for appropriate roles

### 2026-01-29 (Remote Work Feature)
- **Remote Work Check-in**: Employees with `remote_work_enabled` can check in remotely
  - When IP doesn't match office, remote-enabled employees see choice buttons
  - Options: "I'm in the office" (GPS flow) or "Working remotely" (no GPS needed)
  - `verification_type: 'remote'` stored in attendance table
  - Remote badge displayed in attendance UI with blue styling
- **API Changes**: Added `remoteCheckin` flag to `/api/attendance/ip-checkin`
- **Employee API**: Updated `/api/employees/[id]` to save `remote_work_enabled` field
- **UI Updates**: VerificationBadge components updated to display "Remote" badge
- **Translations**: Added 'remote' translations to all 3 languages

### 2026-01-30
- **Testing Infrastructure**: Set up Vitest with React Testing Library and MSW
  - Created test setup, utilities, and mock handlers
  - Added 28 example tests (Button, employees db, employees API)
  - Scripts: `npm run test`, `npm run test:coverage`
- **db.ts Modularization**: Split 5400-line db.ts into 20 domain modules
  - Created `src/lib/db/` with connection.ts, employees.ts, attendance.ts, etc.
  - Backwards compatible via re-exports
- **API Route Flattening**: Consolidated action routes into PATCH handlers
  - payment-requests, leaves, accounting/requests, candidates/documents, dev-board/sprints
- **API Route Naming**: Renamed `tg-action` → `telegram-action`, `tg-check` → `telegram-check`

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

## Testing

### Running Tests

```bash
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage
npm run test:ui       # Interactive UI
```

### Test Structure

```
src/
├── test/
│   ├── setup.ts              # Global setup, Next.js mocks
│   ├── mocks/handlers.ts     # MSW API mocks
│   └── utils/test-utils.tsx  # Custom render with providers
├── components/ui/Button.test.tsx
├── lib/db/employees.test.ts
└── app/api/employees/route.test.ts
```

### Writing Tests

```tsx
// Component test
import { render, screen } from '@/test/utils/test-utils';
import Button from './Button';

it('renders button', () => {
  render(<Button>Click</Button>);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

---

## Pre-Deploy Checklist

1. `npm run test:run` - All tests pass
2. `npx tsc --noEmit` - No TypeScript errors
3. Test all three languages (EN/RU/UZ)
4. Test on mobile viewport
5. Verify Supabase queries work
6. Check role-based permissions

---

## Useful Commands

```bash
# Development
npm run dev

# Type check
npx tsc --noEmit

# Run tests
npm run test:run

# Build for production
npm run build

# Database migrations (run in Supabase dashboard or CLI)
# Migration files are in supabase/migrations/
```
