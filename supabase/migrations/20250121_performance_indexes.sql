-- Performance optimization indexes
-- Addresses slow routes: /attendance/sheet, /branches, /employees/[id], /payroll

-- Attendance table indexes (most impactful - /attendance routes are slowest)
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_date ON attendance(check_in_branch_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_shift_date ON attendance(shift_id, date);

-- Employee table indexes
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_branch_status ON employees(branch_id, status);

-- Wage table indexes
CREATE INDEX IF NOT EXISTS idx_employee_wages_active ON employee_wages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_employee_wages_employee ON employee_wages(employee_id);
CREATE INDEX IF NOT EXISTS idx_branch_wages_active ON employee_branch_wages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_branch_wages_employee ON employee_branch_wages(employee_id);

-- Payslip indexes
CREATE INDEX IF NOT EXISTS idx_payslips_year_month ON payslips(year, month);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_year_month ON payslips(employee_id, year, month);
