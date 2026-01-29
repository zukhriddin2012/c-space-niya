import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmployees, getEmployeeById, getEmployeesByBranch, updateEmployee } from './employees';

// Mock data
const mockEmployees = [
  {
    id: '1',
    employee_id: 'JD001',
    full_name: 'John Doe',
    email: 'john@example.com',
    position: 'Developer',
    branch_id: 'branch-1',
    branches: { name: 'Main Office' },
  },
  {
    id: '2',
    employee_id: 'JS002',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    position: 'Designer',
    branch_id: 'branch-1',
    branches: { name: 'Main Office' },
  },
];

// Mock Supabase chain functions
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('./connection', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
    })),
  },
  isSupabaseAdminConfigured: vi.fn(() => true),
}));

describe('employees db functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default chain setup - supports both select->order and select->eq->single patterns
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, single: mockSingle });
    mockOrder.mockResolvedValue({ data: mockEmployees, error: null });
    mockEq.mockReturnValue({ single: mockSingle, order: mockOrder, select: mockSelect });
    mockSingle.mockResolvedValue({ data: mockEmployees[0], error: null });
    // Update chain: update->eq->select->single
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  describe('getEmployees', () => {
    it('returns list of employees', async () => {
      const employees = await getEmployees();
      expect(employees).toHaveLength(2);
      expect(employees[0].full_name).toBe('John Doe');
      expect(employees[1].full_name).toBe('Jane Smith');
    });

    it('returns empty array on error', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const employees = await getEmployees();
      expect(employees).toEqual([]);
    });
  });

  describe('getEmployeeById', () => {
    it('returns employee by id', async () => {
      const employee = await getEmployeeById('1');
      expect(employee?.full_name).toBe('John Doe');
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    it('returns null on error', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      const employee = await getEmployeeById('999');
      expect(employee).toBeNull();
    });
  });

  describe('getEmployeesByBranch', () => {
    it('filters by branch_id', async () => {
      await getEmployeesByBranch('branch-1');
      expect(mockEq).toHaveBeenCalledWith('branch_id', 'branch-1');
    });

    it('returns empty array on error', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const employees = await getEmployeesByBranch('branch-1');
      expect(employees).toEqual([]);
    });
  });

  describe('updateEmployee', () => {
    it('updates employee successfully', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { ...mockEmployees[0], full_name: 'John Updated' },
        error: null,
      });

      const result = await updateEmployee('1', { full_name: 'John Updated' });
      expect(result.success).toBe(true);
      expect(result.employee?.full_name).toBe('John Updated');
    });

    it('returns error on failure', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await updateEmployee('1', { full_name: 'John Updated' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
