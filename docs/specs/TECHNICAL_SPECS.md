# C-Space Niya - Technical Specifications

## Overview

**C-Space Niya** is a comprehensive HR & operations management web application built for C-Space coworking company. It provides employee management, attendance tracking, payroll processing, leave management, and role-based access control.

**Repository:** https://github.com/zukhriddin2012/c-space-niya
**Branch:** test
**Live URL:** Deployed on Vercel

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.1.2 |
| UI Library | React | 19.2.3 |
| Styling | Tailwind CSS | 4.x |
| Icons | Lucide React | 0.562.0 |
| Maps | Leaflet | 1.9.4 |
| Database | Supabase (PostgreSQL) | - |
| Auth | JWT with JOSE | 6.1.3 |
| Password Hashing | bcryptjs | 3.0.3 |
| Excel Export | ExcelJS | 4.4.0 |
| Performance | Vercel Speed Insights | 1.3.1 |
| Language | TypeScript | 5.x |

---

## Project Structure

```
c-space-niya/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/login/             # Login page
│   │   ├── (dashboard)/              # Protected dashboard routes
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   ├── employees/            # Employee management
│   │   │   ├── branches/             # Branch management
│   │   │   ├── attendance/           # Attendance tracking
│   │   │   ├── payroll/              # Payroll processing
│   │   │   ├── departments/          # Department management
│   │   │   ├── recruitment/          # Recruitment pipeline (stub)
│   │   │   ├── reports/              # Analytics & reports
│   │   │   ├── settings/             # System settings
│   │   │   └── my-portal/            # Employee self-service
│   │   │       ├── attendance/       # Personal attendance
│   │   │       ├── leaves/           # Leave requests
│   │   │       ├── payments/         # Payment history
│   │   │       ├── payslips/         # Payslips
│   │   │       └── profile/          # Profile management
│   │   ├── api/                      # REST API routes
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home redirect
│   ├── components/                   # Reusable React components
│   ├── contexts/
│   │   └── AuthContext.tsx           # Auth state management
│   ├── hooks/
│   │   └── usePermissions.ts         # Permission checking hook
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client
│   │   ├── auth.ts                   # JWT utilities
│   │   ├── auth-server.ts            # Server-side auth
│   │   ├── api-auth.ts               # API route protection
│   │   ├── db.ts                     # Database layer (1900+ lines)
│   │   ├── permissions.ts            # RBAC definitions
│   │   ├── telegram-notifications.ts # Telegram integration
│   │   └── employee-data.ts          # Employee utilities
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces
│   └── globals.css                   # Global styles
├── supabase/
│   └── migrations/                   # Database migrations
├── public/                           # Static assets
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Environment Variables

```env
# REQUIRED - JWT Authentication
JWT_SECRET=your_jwt_secret_here          # Generate: openssl rand -base64 32

# REQUIRED - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...         # Service role key

# REQUIRED - Telegram Bot (for notifications)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# OPTIONAL
ENABLE_DEMO_USERS=true                    # Enable demo user fallback
NODE_ENV=production
```

---

## Database Schema

### Core Tables

#### `employees`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | VARCHAR | Human-readable ID (e.g., "JD001") |
| full_name | VARCHAR | Employee name |
| email | VARCHAR | Email address |
| phone | VARCHAR | Phone number |
| date_of_birth | DATE | Birth date |
| gender | VARCHAR | male/female |
| position | VARCHAR | Job title |
| level | VARCHAR | junior/middle/senior/executive |
| branch_id | VARCHAR | FK to branches |
| salary | DECIMAL | Net monthly salary |
| base_salary | DECIMAL | Gross salary |
| employment_type | VARCHAR | full-time/part-time/contract/intern |
| status | VARCHAR | active/inactive/terminated/probation |
| telegram_id | VARCHAR | For notifications |
| system_role | VARCHAR | For RBAC |
| hire_date | DATE | Employment start date |
| notes | TEXT | Special notes (e.g., termination dates) |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

#### `branches`
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR | Slug-based PK (e.g., "yunusabad") |
| name | VARCHAR | Display name |
| address | VARCHAR | Physical address |
| latitude | DECIMAL | GPS latitude |
| longitude | DECIMAL | GPS longitude |
| geofence_radius | INTEGER | Allowed check-in radius (meters) |
| is_active | BOOLEAN | Branch status |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

#### `attendance`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | FK to employees |
| date | DATE | Attendance date |
| check_in | TIME | Check-in time (HH:MM) |
| check_in_timestamp | TIMESTAMP | Full check-in timestamp |
| check_in_branch_id | VARCHAR | FK to branches |
| check_in_latitude | DECIMAL | GPS latitude |
| check_in_longitude | DECIMAL | GPS longitude |
| check_out | TIME | Check-out time |
| check_out_timestamp | TIMESTAMP | Full check-out timestamp |
| check_out_branch_id | VARCHAR | FK to branches |
| check_out_latitude | DECIMAL | GPS latitude |
| check_out_longitude | DECIMAL | GPS longitude |
| shift_id | VARCHAR | day/night |
| status | VARCHAR | present/late/absent/early_leave |
| total_hours | DECIMAL | Hours worked |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

#### `leave_requests`
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| employee_id | UUID | FK to employees |
| leave_type | VARCHAR | Type of leave |
| start_date | DATE | Leave start |
| end_date | DATE | Leave end |
| reason | TEXT | Leave reason |
| status | VARCHAR | pending/approved/rejected |
| reviewed_by | UUID | Reviewer employee ID |
| reviewed_at | TIMESTAMP | Review timestamp |
| review_note | TEXT | Reviewer comments |
| created_at | TIMESTAMP | Request creation |
| updated_at | TIMESTAMP | Last update |

#### `payment_requests`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| request_type | VARCHAR | advance/wage |
| year | INTEGER | Payment year |
| month | INTEGER | Payment month |
| legal_entity_id | VARCHAR | FK to legal_entities |
| total_amount | DECIMAL | Total payment amount |
| employee_count | INTEGER | Number of employees |
| status | VARCHAR | draft/pending_approval/approved/rejected/paid |
| created_by | UUID | Creator employee ID |
| submitted_at | TIMESTAMP | Submission time |
| approved_by | UUID | Approver employee ID |
| approved_at | TIMESTAMP | Approval time |
| rejection_reason | TEXT | Rejection reason |
| paid_at | TIMESTAMP | Payment time |
| payment_reference | VARCHAR | Transaction reference |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | Record creation |

#### `payment_request_items`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| payment_request_id | UUID | FK to payment_requests |
| employee_id | UUID | FK to employees |
| legal_entity_id | VARCHAR | FK to legal_entities |
| amount | DECIMAL | Payment amount |
| net_salary | DECIMAL | Employee net salary |
| advance_paid | DECIMAL | Previous advances |
| notes | TEXT | Item notes |
| created_at | TIMESTAMP | Record creation |

#### `employee_wages`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | FK to employees |
| legal_entity_id | VARCHAR | FK to legal_entities |
| wage_amount | DECIMAL | Amount from this entity |
| wage_type | VARCHAR | official/bonus |
| notes | TEXT | Notes |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

#### `legal_entities`
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR | Primary key |
| name | VARCHAR | Full legal name |
| short_name | VARCHAR | Short name |
| inn | VARCHAR | Tax ID |
| address | VARCHAR | Legal address |
| bank_name | VARCHAR | Bank name |
| bank_account | VARCHAR | Account number |
| mfo | VARCHAR | Bank code |
| oked | VARCHAR | Economic activity code |
| nds_code | VARCHAR | VAT code |
| director_name | VARCHAR | Director name |
| director_employee_id | UUID | FK to employees |
| branch_id | VARCHAR | FK to branches |
| status | VARCHAR | active/inactive |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

#### `payslips`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | FK to employees |
| month | INTEGER | Payslip month |
| year | INTEGER | Payslip year |
| base_salary | DECIMAL | Base salary |
| bonuses | DECIMAL | Bonus amount |
| net_salary | DECIMAL | Net salary |
| advance_paid | DECIMAL | Advances paid |
| wage_paid | DECIMAL | Wages paid |
| status | VARCHAR | draft/approved/paid |
| payment_date | DATE | Payment date |
| created_at | TIMESTAMP | Record creation |

#### `departments`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Department name |
| description | TEXT | Description |
| manager_id | UUID | FK to employees |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

---

## Authentication & Authorization

### Role-Based Access Control (RBAC)

| Role | Hierarchy | Permissions |
|------|-----------|-------------|
| general_manager | 100 | Full system access |
| ceo | 90 | Strategic view, reports |
| hr | 70 | Employee management, payroll |
| branch_manager | 60 | Branch-level management |
| recruiter | 50 | Recruitment pipeline |
| employee | 10 | Personal portal only |

### Permission Groups
- `employees` - View, create, edit, delete employees
- `attendance` - View, manage attendance
- `branches` - Manage branches
- `payroll` - Process payroll, payments
- `leaves` - Manage leave requests
- `reports` - View analytics
- `settings` - System settings
- `recruitment` - Recruitment features

### Authentication Flow
1. User submits email/password to `/api/auth/login`
2. Server validates credentials against employees table
3. JWT token generated with 7-day expiry
4. Token stored in HTTP-only cookie
5. `withAuth()` middleware validates token on protected routes
6. AuthContext provides user state to React components

---

## API Routes

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/auth/logout | User logout |
| GET | /api/auth/me | Get current user |

### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/employees | List employees |
| POST | /api/employees | Create employee |
| GET | /api/employees/[id] | Get employee |
| PUT | /api/employees/[id] | Update employee |
| DELETE | /api/employees/[id] | Delete employee |
| GET | /api/employees/[id]/wages | Get employee wages |
| POST | /api/employees/[id]/wages | Update wages |

### Branches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/branches | List branches |
| POST | /api/branches | Create branch |
| GET | /api/branches/[id] | Get branch |
| PUT | /api/branches/[id] | Update branch |
| DELETE | /api/branches/[id] | Delete branch |

### Payment Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/payment-requests | List requests |
| POST | /api/payment-requests | Create request |
| GET | /api/payment-requests/[id] | Get request |
| POST | /api/payment-requests/[id]/submit | Submit for approval |
| POST | /api/payment-requests/[id]/approve | Approve request |
| POST | /api/payment-requests/[id]/reject | Reject request |
| POST | /api/payment-requests/[id]/pay | Mark as paid |
| GET | /api/payment-requests/export | Export to Excel |

### Leave Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/my-portal/leaves | Personal leaves |
| POST | /api/leaves/[id]/approve | Approve leave |
| POST | /api/leaves/[id]/reject | Reject leave |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/import-employees | Bulk import |
| POST | /api/admin/run-migration | Run migrations |
| POST | /api/admin/run-sql | Execute SQL |

---

## Key Components

### UI Components
| Component | Purpose |
|-----------|---------|
| Sidebar | Main navigation with role-based filtering |
| MobileNav | Mobile navigation menu |
| EmployeesTable | Sortable, paginated employee list |
| AddEmployeeModal | Employee creation form |
| EditEmployeeModal | Employee profile editor |
| EmployeeWagesSection | Multi-entity wage distribution |
| AttendanceMap | Leaflet map for attendance visualization |
| BranchMap | Interactive branch location map |
| NotificationBell | Pending notifications indicator |
| RoleGuard | Permission-based component rendering |
| ConfirmationDialog | Generic confirmation modal |
| AttendanceFilters | Date/branch/status filters |

### Page Components
| Page | Description |
|------|-------------|
| Dashboard | Role-specific overview |
| Employees | Employee directory |
| Branches | Branch management with maps |
| Attendance | Daily/monthly attendance |
| Payroll | Payment request management |
| My Portal | Employee self-service |
| Departments | Department listing |
| Reports | Analytics and reporting |
| Settings | System configuration |

---

## Key Features

### 1. Employee Management
- CRUD operations with validation
- Employee ID generation (initials + number)
- Multi-entity wage distribution
- Employment type and level tracking
- Status management (active, probation, terminated)
- Telegram ID linking for notifications

### 2. Attendance Tracking
- GPS-based check-in/check-out
- Geofence validation per branch
- Status detection (late, early leave)
- Multiple check-ins per day support
- Monthly attendance summaries
- Tashkent timezone (UTC+5)

### 3. Payroll Processing
- Multi-legal entity wage distribution
- Tax calculation (12% on top of net)
- Advance vs wage payment separation
- Approval workflow: Draft → Pending → Approved → Paid
- Excel export functionality
- Telegram notifications at each stage

### 4. Leave Management
- Request submission with dates and reason
- HR approval/rejection workflow
- Telegram notifications to employees
- Leave history tracking

### 5. Notifications
- Telegram bot integration
- Uzbek language messages
- Formatted currency and dates
- Rate-limited bulk notifications

---

## Patterns & Conventions

### Code Organization
- Server Components for data-fetching pages
- Client Components with `'use client'` directive
- Types centralized in `src/types/index.ts`
- Database operations in `src/lib/db.ts`
- Auth logic in `src/lib/auth*.ts`

### Data Handling
- Supabase as primary, static data as fallback
- Tashkent timezone normalization
- Currency: UZS (Uzbek Som)
- Date format: Intl API

### Security
- JWT in HTTP-only cookies
- Password hashing with bcryptjs
- RBAC with permission middleware
- Route protection via `withAuth()`

---

## Future Enhancements (TODO)

1. **Recruitment Module** - Full hiring pipeline
2. **Performance Reviews** - Employee evaluations
3. **Training & Development** - Course tracking
4. **Document Management** - Employee documents
5. **Mobile App** - React Native companion
6. **Advanced Reports** - Custom report builder
7. **Integration APIs** - External system connections
8. **Audit Logging** - Action history tracking
9. **Bulk Operations** - Mass employee updates
10. **Calendar View** - Visual attendance calendar

---

## Related Projects

- **C-Space Time** (Telegram Bot) - Employee attendance via Telegram
  - Repository: https://github.com/zukhriddin2012/c-space-attendance-bot
  - Shares: Supabase database, employee records, attendance data

---

*Last Updated: January 2026*
*Version: 1.0.0*
