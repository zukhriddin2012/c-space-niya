import { http, HttpResponse } from 'msw';

// Mock data
const mockEmployees = [
  {
    id: '1',
    employee_id: 'JD001',
    full_name: 'John Doe',
    email: 'john@example.com',
    position: 'Developer',
    department_id: 'dept-1',
    branch_id: 'branch-1',
    status: 'active',
  },
  {
    id: '2',
    employee_id: 'JS002',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    position: 'Designer',
    department_id: 'dept-2',
    branch_id: 'branch-1',
    status: 'active',
  },
];

const mockUser = {
  id: 'user-1',
  employee_id: 'TEST001',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'hr',
  system_role: 'hr',
};

export const handlers = [
  // Auth endpoints
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      user: mockUser,
      employee: mockUser,
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // Employee endpoints
  http.get('/api/employees', () => {
    return HttpResponse.json(mockEmployees);
  }),

  http.get('/api/employees/:id', ({ params }) => {
    const employee = mockEmployees.find((e) => e.id === params.id);
    if (!employee) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(employee);
  }),

  http.post('/api/employees', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newEmployee = {
      id: '3',
      employee_id: 'NEW003',
      ...body,
    };
    return HttpResponse.json(newEmployee, { status: 201 });
  }),

  http.patch('/api/employees/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const employee = mockEmployees.find((e) => e.id === params.id);
    if (!employee) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ ...employee, ...body });
  }),

  // Branches endpoint
  http.get('/api/branches', () => {
    return HttpResponse.json([
      { id: 'branch-1', name: 'Main Office', code: 'HQ' },
      { id: 'branch-2', name: 'Branch Office', code: 'BR1' },
    ]);
  }),

  // Departments endpoint
  http.get('/api/departments', () => {
    return HttpResponse.json([
      { id: 'dept-1', name: 'Engineering' },
      { id: 'dept-2', name: 'Design' },
    ]);
  }),
];
