import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock data
const mockEmployees = [
  { id: '1', employee_id: 'JD001', full_name: 'John Doe', position: 'Developer' },
  { id: '2', employee_id: 'JS002', full_name: 'Jane Smith', position: 'Designer' },
];

const mockNewEmployee = {
  id: '3',
  employee_id: 'NE003',
  full_name: 'New Employee',
  position: 'Manager',
};

// Mock dependencies
vi.mock('@/lib/api-auth', () => ({
  withAuth: (handler: Function) => handler,
}));

vi.mock('@/lib/db', () => ({
  getEmployees: vi.fn(() => Promise.resolve(mockEmployees)),
  createEmployee: vi.fn(() =>
    Promise.resolve({ success: true, employee: mockNewEmployee })
  ),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: null,
  isSupabaseAdminConfigured: vi.fn(() => false),
}));

// Import after mocking
import { GET, POST } from './route';
import { getEmployees, createEmployee } from '@/lib/db';

describe('GET /api/employees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of employees', async () => {
    const request = new NextRequest('http://localhost/api/employees');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.employees).toHaveLength(2);
    expect(data.employees[0].full_name).toBe('John Doe');
    expect(getEmployees).toHaveBeenCalled();
  });

  it('returns 500 on error', async () => {
    vi.mocked(getEmployees).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/employees');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch employees');
  });
});

describe('POST /api/employees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new employee', async () => {
    const request = new NextRequest('http://localhost/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        full_name: 'New Employee',
        position: 'Manager',
        level: 'senior',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.employee.full_name).toBe('New Employee');
    expect(createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'New Employee',
        position: 'Manager',
        level: 'senior',
      })
    );
  });

  it('returns 400 when full_name is missing', async () => {
    const request = new NextRequest('http://localhost/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        position: 'Manager',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Full name and position are required');
  });

  it('returns 400 when position is missing', async () => {
    const request = new NextRequest('http://localhost/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        full_name: 'New Employee',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Full name and position are required');
  });

  it('returns 400 when createEmployee fails', async () => {
    vi.mocked(createEmployee).mockResolvedValueOnce({
      success: false,
      error: 'Employee ID already exists',
    });

    const request = new NextRequest('http://localhost/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        full_name: 'New Employee',
        position: 'Manager',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Employee ID already exists');
  });

  it('uses default values for optional fields', async () => {
    const request = new NextRequest('http://localhost/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        full_name: 'New Employee',
        position: 'Manager',
      }),
    });

    await POST(request);

    expect(createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'junior',
        branch_id: null,
        salary: 0,
        phone: null,
        email: null,
        status: 'active',
        employment_type: 'full-time',
        system_role: 'employee',
      })
    );
  });
});
