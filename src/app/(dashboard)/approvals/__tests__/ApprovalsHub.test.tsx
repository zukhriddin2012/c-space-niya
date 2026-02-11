import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalsHub } from '../ApprovalsHub';

// Mock the LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({
    t: {
      nav: { approvals: 'Approvals' },
    },
    locale: 'en',
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.prompt
const mockPrompt = vi.fn();
global.prompt = mockPrompt;

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

describe('ApprovalsHub', () => {
  const mockCounts = {
    terminations: 2,
    wageChanges: 3,
    paymentRequests: 3,
    total: 8,
  };

  const mockTerminationRequests = [
    {
      id: 'term-1',
      requested_date: '2026-02-15',
      reason: 'Poor performance',
      status: 'pending',
      created_at: '2026-02-05T10:00:00Z',
      employee: {
        id: 'emp-1',
        full_name: 'John Doe',
        employee_id: 'EMP001',
        position: 'Developer',
      },
      requester: { full_name: 'Jane Manager' },
    },
    {
      id: 'term-2',
      requested_date: '2026-02-20',
      reason: 'Contract ended',
      status: 'pending',
      created_at: '2026-02-04T10:00:00Z',
      employee: {
        id: 'emp-2',
        full_name: 'Alice Smith',
        employee_id: 'EMP002',
        position: 'Designer',
      },
      requester: { full_name: 'Bob Director' },
    },
  ];

  const mockWageChangeRequests = [
    {
      id: 'wage-1',
      wage_type: 'primary',
      current_amount: 5000000,
      proposed_amount: 6000000,
      change_type: 'increase',
      reason: 'Annual review',
      effective_date: '2026-03-01',
      status: 'pending',
      created_at: '2026-02-05T09:00:00Z',
      employee: {
        id: 'emp-3',
        full_name: 'Charlie Brown',
        employee_id: 'EMP003',
        position: 'Senior Developer',
      },
      requester: { full_name: 'HR Manager' },
      legal_entity: { name: 'Main Company' },
      branch: null,
    },
    {
      id: 'wage-2',
      wage_type: 'primary',
      current_amount: 0, // Edge case: zero current amount
      proposed_amount: 3000000,
      change_type: 'increase',
      reason: 'New hire starting wage',
      effective_date: '2026-03-01',
      status: 'pending',
      created_at: '2026-02-05T08:00:00Z',
      employee: {
        id: 'emp-4',
        full_name: 'Diana Prince',
        employee_id: 'EMP004',
        position: 'Intern',
      },
      requester: { full_name: 'HR Manager' },
      legal_entity: { name: 'Main Company' },
      branch: null,
    },
  ];

  const mockPaymentRequests = [
    {
      id: 'pay-1',
      request_type: 'vendor_payment',
      total_amount: 10000000,
      description: 'Office supplies',
      status: 'pending_review',
      created_at: '2026-02-05T11:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==================== RENDERING TESTS ====================

  describe('Rendering', () => {
    it('renders the page header correctly', () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={mockPaymentRequests}
        />
      );

      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      expect(screen.getByText('Review and approve requests across all categories')).toBeInTheDocument();
      expect(screen.getByText('8 pending requests')).toBeInTheDocument();
    });

    it('renders summary cards with correct counts', () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={mockPaymentRequests}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument(); // terminations
      expect(screen.getByText('Termination Requests')).toBeInTheDocument();
      expect(screen.getByText('Wage Change Requests')).toBeInTheDocument();
      expect(screen.getByText('Payment Requests')).toBeInTheDocument();
    });

    it('renders termination requests with employee info', () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={mockPaymentRequests}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Developer • EMP001')).toBeInTheDocument();
      expect(screen.getByText(/Poor performance/)).toBeInTheDocument();
    });

    it('renders wage change requests with salary info', () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={mockPaymentRequests}
        />
      );

      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      expect(screen.getByText('5,000,000 UZS')).toBeInTheDocument();
      expect(screen.getByText('6,000,000 UZS')).toBeInTheDocument();
    });

    it('renders empty state when no requests', () => {
      render(
        <ApprovalsHub
          counts={{ terminations: 0, wageChanges: 0, paymentRequests: 0, total: 0 }}
          terminationRequests={[]}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      expect(screen.getByText('All caught up!')).toBeInTheDocument();
      expect(screen.getByText('No pending requests to review')).toBeInTheDocument();
    });
  });

  // ==================== TAB FILTERING TESTS ====================

  describe('Tab Filtering', () => {
    it('shows all request types by default (All tab)', () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={mockPaymentRequests}
        />
      );

      // All sections should be visible
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      expect(screen.getByText('PAY-001')).toBeInTheDocument();
    });

    it('filters to only terminations when Terminations tab clicked', () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={mockPaymentRequests}
        />
      );

      const terminationsTab = screen.getByRole('button', { name: /Terminations/i });
      fireEvent.click(terminationsTab);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
      expect(screen.queryByText('PAY-001')).not.toBeInTheDocument();
    });

    it('filters to only wage changes when Wage Changes tab clicked', () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={mockPaymentRequests}
        />
      );

      const wageTab = screen.getByRole('button', { name: /Wage Changes/i });
      fireEvent.click(wageTab);

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      expect(screen.queryByText('PAY-001')).not.toBeInTheDocument();
    });
  });

  // ==================== TERMINATION ACTION TESTS ====================

  describe('Termination Actions', () => {
    it('calls approve API with correct action when Approve clicked', async () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/termination-requests/term-1',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' }),
          })
        );
      });
    });

    it('prompts for reason when Reject clicked', async () => {
      mockPrompt.mockReturnValue('Not suitable for role');

      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      const rejectButtons = screen.getAllByRole('button', { name: /Reject/i });
      fireEvent.click(rejectButtons[0]);

      expect(mockPrompt).toHaveBeenCalledWith('Please provide a reason for rejection:');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/termination-requests/term-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ action: 'reject', rejection_reason: 'Not suitable for role' }),
          })
        );
      });
    });

    it('does not call API when rejection prompt is cancelled', async () => {
      mockPrompt.mockReturnValue(null);

      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      const rejectButtons = screen.getAllByRole('button', { name: /Reject/i });
      fireEvent.click(rejectButtons[0]);

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not call API when rejection reason is empty', async () => {
      mockPrompt.mockReturnValue('');

      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      const rejectButtons = screen.getAllByRole('button', { name: /Reject/i });
      fireEvent.click(rejectButtons[0]);

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('shows success message after approve', async () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Termination request approved')).toBeInTheDocument();
      });
    });

    it('shows error message on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Permission denied' }),
      });

      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });
  });

  // ==================== WAGE CHANGE ACTION TESTS ====================

  describe('Wage Change Actions', () => {
    it('calls approve API with correct action when Approve clicked', async () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={[]}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={[]}
        />
      );

      const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/wage-change-requests/wage-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ action: 'approve' }),
          })
        );
      });
    });

    it('prompts for reason when wage change Reject clicked', async () => {
      mockPrompt.mockReturnValue('Budget constraints');

      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={[]}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={[]}
        />
      );

      const rejectButtons = screen.getAllByRole('button', { name: /Reject/i });
      fireEvent.click(rejectButtons[0]);

      expect(mockPrompt).toHaveBeenCalledWith('Please provide a reason for rejection:');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/wage-change-requests/wage-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ action: 'reject', rejection_reason: 'Budget constraints' }),
          })
        );
      });
    });
  });

  // ==================== EDGE CASE TESTS ====================

  describe('Edge Cases', () => {
    it('handles division by zero in percentage calculation (current_amount = 0)', () => {
      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={[]}
          wageChangeRequests={mockWageChangeRequests}
          paymentRequests={[]}
        />
      );

      // When current_amount is 0, it should show 100%
      expect(screen.getByText('+100%')).toBeInTheDocument();
    });

    it('handles missing employee data gracefully', () => {
      const requestsWithMissingData = [
        {
          ...mockTerminationRequests[0],
          employee: null,
          requester: null,
        },
      ];

      render(
        <ApprovalsHub
          counts={{ ...mockCounts, terminations: 1, total: 1 }}
          terminationRequests={requestsWithMissingData}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      expect(screen.getByText('Unknown Employee')).toBeInTheDocument();
      expect(screen.getByText(/By: Unknown/)).toBeInTheDocument();
    });

    it('handles missing legal entity/branch data gracefully', () => {
      const requestsWithMissingData = [
        {
          ...mockWageChangeRequests[0],
          legal_entity: null,
        },
      ];

      render(
        <ApprovalsHub
          counts={{ ...mockCounts, wageChanges: 1, total: 1 }}
          terminationRequests={[]}
          wageChangeRequests={requestsWithMissingData}
          paymentRequests={[]}
        />
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  // ==================== LOADING STATE TESTS ====================

  describe('Loading States', () => {
    it('disables buttons during API call', async () => {
      // Make fetch take time
      mockFetch.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      render(
        <ApprovalsHub
          counts={mockCounts}
          terminationRequests={mockTerminationRequests}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
      fireEvent.click(approveButtons[0]);

      // Buttons should be disabled during processing
      expect(approveButtons[0]).toBeDisabled();
    });
  });
});

// ==================== UTILITY FUNCTION TESTS ====================

describe('Utility Functions', () => {
  describe('formatSalary', () => {
    it('formats salary with UZS suffix', () => {
      // Testing through component rendering
      render(
        <ApprovalsHub
          counts={{ terminations: 0, wageChanges: 1, paymentRequests: 0, total: 1 }}
          terminationRequests={[]}
          wageChangeRequests={[
            {
              id: 'wage-1',
              wage_type: 'primary',
              current_amount: 5000000,
              proposed_amount: 6000000,
              change_type: 'increase',
              reason: 'Test',
              effective_date: '2026-03-01',
              status: 'pending',
              created_at: '2026-02-05T09:00:00Z',
              employee: { id: '1', full_name: 'Test', employee_id: 'T1', position: 'Test' },
              requester: { full_name: 'Test' },
              legal_entity: { name: 'Test' },
              branch: null,
            },
          ]}
          paymentRequests={[]}
        />
      );

      expect(screen.getByText('5,000,000 UZS')).toBeInTheDocument();
      expect(screen.getByText('6,000,000 UZS')).toBeInTheDocument();
    });

    it('shows 0 UZS for zero amount', () => {
      render(
        <ApprovalsHub
          counts={{ terminations: 0, wageChanges: 1, paymentRequests: 0, total: 1 }}
          terminationRequests={[]}
          wageChangeRequests={[
            {
              id: 'wage-1',
              wage_type: 'primary',
              current_amount: 0,
              proposed_amount: 3000000,
              change_type: 'increase',
              reason: 'Test',
              effective_date: '2026-03-01',
              status: 'pending',
              created_at: '2026-02-05T09:00:00Z',
              employee: { id: '1', full_name: 'Test', employee_id: 'T1', position: 'Test' },
              requester: { full_name: 'Test' },
              legal_entity: { name: 'Test' },
              branch: null,
            },
          ]}
          paymentRequests={[]}
        />
      );

      expect(screen.getByText('0 UZS')).toBeInTheDocument();
    });
  });

  describe('formatRelativeTime', () => {
    it('shows "Today" for current date', () => {
      const today = new Date().toISOString();

      render(
        <ApprovalsHub
          counts={{ terminations: 1, wageChanges: 0, paymentRequests: 0, total: 1 }}
          terminationRequests={[
            {
              id: 'term-1',
              requested_date: '2026-02-15',
              reason: 'Test',
              status: 'pending',
              created_at: today,
              employee: { id: '1', full_name: 'Test', employee_id: 'T1', position: 'Test' },
              requester: { full_name: 'Test' },
            },
          ]}
          wageChangeRequests={[]}
          paymentRequests={[]}
        />
      );

      expect(screen.getByText(/Submitted: Today/)).toBeInTheDocument();
    });
  });
});
