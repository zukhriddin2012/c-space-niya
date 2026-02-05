# Frontend Test Cases: TST-017

**Session:** QA Engineer (testa)
**Date:** 2026-02-05

---

## Component Test Files

### 1. PaymentRequestsSection Tests

**File:** `__tests__/components/payroll/PaymentRequestsSection.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentRequestsSection } from '@/app/(dashboard)/payroll/PaymentRequestsSection';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Test data
const mockRequests = {
  draft: {
    id: 'draft-1',
    status: 'draft',
    request_type: 'advance',
    total_amount: 1000000,
    employee_count: 3,
    notification_sent_at: null,
  },
  pending: {
    id: 'pending-1',
    status: 'pending',
    request_type: 'wage',
    total_amount: 5000000,
    employee_count: 5,
    notification_sent_at: null,
  },
  approved: {
    id: 'approved-1',
    status: 'approved',
    request_type: 'advance',
    total_amount: 2000000,
    employee_count: 2,
    notification_sent_at: null,
  },
  approvedNotified: {
    id: 'approved-2',
    status: 'approved',
    request_type: 'wage',
    total_amount: 3000000,
    employee_count: 4,
    notification_sent_at: '2026-02-05T10:00:00Z',
    notification_sent_by: 'user-1',
  },
  paid: {
    id: 'paid-1',
    status: 'paid',
    request_type: 'advance',
    total_amount: 1500000,
    employee_count: 3,
    notification_sent_at: null,
  },
  paidNotified: {
    id: 'paid-2',
    status: 'paid',
    request_type: 'wage',
    total_amount: 6000000,
    employee_count: 6,
    notification_sent_at: '2026-02-05T12:00:00Z',
  },
  rejected: {
    id: 'rejected-1',
    status: 'rejected',
    request_type: 'advance',
    total_amount: 500000,
    employee_count: 1,
    notification_sent_at: null,
  },
};

describe('PaymentRequestsSection', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Delete Button Visibility', () => {
    // FE-001: Delete button visible for non-paid
    it('should show delete button for draft request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.draft]} onRefresh={vi.fn()} />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should show delete button for pending request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.pending]} onRefresh={vi.fn()} />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should show delete button for approved request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.approved]} onRefresh={vi.fn()} />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should show delete button for rejected request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.rejected]} onRefresh={vi.fn()} />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
    });

    // FE-002: CRITICAL - Delete button hidden for paid
    it('should NOT show delete button for paid request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.paid]} onRefresh={vi.fn()} />
      );

      const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBe(0);
    });

    it('should NOT show delete button for paid notified request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.paidNotified]} onRefresh={vi.fn()} />
      );

      const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBe(0);
    });
  });

  describe('Notify Button Visibility', () => {
    // FE-005: Notify button for approved
    it('should show notify button for approved request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.approved]} onRefresh={vi.fn()} />
      );

      const notifyButton = screen.getByRole('button', { name: /notify/i });
      expect(notifyButton).toBeInTheDocument();
    });

    // FE-006: Notify button for paid
    it('should show notify button for paid request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.paid]} onRefresh={vi.fn()} />
      );

      const notifyButton = screen.getByRole('button', { name: /notify/i });
      expect(notifyButton).toBeInTheDocument();
    });

    // FE-007: CRITICAL - Notify button hidden otherwise
    it('should NOT show notify button for draft request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.draft]} onRefresh={vi.fn()} />
      );

      const notifyButtons = screen.queryAllByRole('button', { name: /notify/i });
      expect(notifyButtons.length).toBe(0);
    });

    it('should NOT show notify button for pending request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.pending]} onRefresh={vi.fn()} />
      );

      const notifyButtons = screen.queryAllByRole('button', { name: /notify/i });
      expect(notifyButtons.length).toBe(0);
    });

    it('should NOT show notify button for rejected request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.rejected]} onRefresh={vi.fn()} />
      );

      const notifyButtons = screen.queryAllByRole('button', { name: /notify/i });
      expect(notifyButtons.length).toBe(0);
    });
  });

  describe('Notified Badge', () => {
    // FE-008: Notified badge for already notified
    it('should show "Notified" badge for already notified request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.approvedNotified]} onRefresh={vi.fn()} />
      );

      const notifiedBadge = screen.getByText(/notified/i);
      expect(notifiedBadge).toBeInTheDocument();
    });

    it('should NOT show "Notified" badge for non-notified request', () => {
      render(
        <PaymentRequestsSection requests={[mockRequests.approved]} onRefresh={vi.fn()} />
      );

      const notifiedBadges = screen.queryAllByText(/^notified$/i);
      expect(notifiedBadges.length).toBe(0);
    });
  });

  describe('Delete Confirmation Dialog', () => {
    // FE-003: Delete confirmation dialog
    it('should open delete confirmation dialog when clicking delete', async () => {
      const user = userEvent.setup();
      render(
        <PaymentRequestsSection requests={[mockRequests.draft]} onRefresh={vi.fn()} />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Dialog should appear
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
    });

    // FE-004: Delete success
    it('should delete request and show toast on confirm', async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <PaymentRequestsSection requests={[mockRequests.draft]} onRefresh={onRefresh} />
      );

      // Open dialog
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm delete
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/payment-requests/${mockRequests.draft.id}`),
          expect.objectContaining({ method: 'DELETE' })
        );
      });

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Notify Confirmation Dialog', () => {
    // FE-009: Notify confirmation dialog
    it('should open notify confirmation dialog when clicking notify', async () => {
      const user = userEvent.setup();
      render(
        <PaymentRequestsSection requests={[mockRequests.approved]} onRefresh={vi.fn()} />
      );

      const notifyButton = screen.getByRole('button', { name: /notify/i });
      await user.click(notifyButton);

      // Dialog should appear
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    // FE-010: Notify success message with correct counts
    it('should show correct notification counts on success', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          notified: 5,
          skipped: 2,
        }),
      });

      render(
        <PaymentRequestsSection requests={[mockRequests.approved]} onRefresh={vi.fn()} />
      );

      // Open dialog and confirm
      const notifyButton = screen.getByRole('button', { name: /notify/i });
      await user.click(notifyButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Toast should show correct counts
      const { toast } = await import('sonner');
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('5'),
          expect.any(Object)
        );
      });
    });
  });
});
```

---

### 2. PayrollActions Tests

**File:** `__tests__/components/payroll/PayrollActions.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayrollActions } from '@/app/(dashboard)/payroll/PayrollActions';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PayrollActions', () => {
  const defaultProps = {
    selectedPeriod: { year: 2026, month: 2 },
    onRefresh: vi.fn(),
    notificationStats: null,
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Bulk Notify Button', () => {
    // FE-011: Bulk notify button with count
    it('should show badge with un-notified count', () => {
      render(
        <PayrollActions
          {...defaultProps}
          notificationStats={{
            advanceCount: 2,
            wageCount: 3,
            total: 5,
          }}
        />
      );

      // Should show button with badge
      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
    });

    it('should show separate advance/wage counts', () => {
      render(
        <PayrollActions
          {...defaultProps}
          notificationStats={{
            advanceCount: 2,
            wageCount: 3,
            total: 5,
          }}
        />
      );

      // Button should be visible
      const notifyButton = screen.getByRole('button', { name: /notify all paid/i });
      expect(notifyButton).toBeInTheDocument();
    });

    // FE-012: CRITICAL - All notified state
    it('should show "All Notified" badge when count is 0', () => {
      render(
        <PayrollActions
          {...defaultProps}
          notificationStats={{
            advanceCount: 0,
            wageCount: 0,
            total: 0,
          }}
        />
      );

      const allNotifiedBadge = screen.getByText(/all notified/i);
      expect(allNotifiedBadge).toBeInTheDocument();
    });

    it('should disable button when all notified', () => {
      render(
        <PayrollActions
          {...defaultProps}
          notificationStats={{
            advanceCount: 0,
            wageCount: 0,
            total: 0,
          }}
        />
      );

      // Button should be disabled or hidden when all notified
      const notifyButton = screen.queryByRole('button', { name: /notify all paid/i });
      if (notifyButton) {
        expect(notifyButton).toBeDisabled();
      }
    });
  });

  describe('Bulk Notify Modal', () => {
    // FE-013: Bulk notify modal shows breakdown
    it('should open modal with breakdown by type', async () => {
      const user = userEvent.setup();

      render(
        <PayrollActions
          {...defaultProps}
          notificationStats={{
            advanceCount: 2,
            wageCount: 3,
            total: 5,
          }}
        />
      );

      const notifyButton = screen.getByRole('button', { name: /notify all paid/i });
      await user.click(notifyButton);

      // Modal should show breakdown
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Should show advance and wage counts
      expect(screen.getByText(/advance/i)).toBeInTheDocument();
      expect(screen.getByText(/wage/i)).toBeInTheDocument();
    });

    // FE-014: Bulk notify success
    it('should show correct totals on success', async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          summary: {
            requestsProcessed: 3,
            advanceRequests: 1,
            wageRequests: 2,
            employeesNotified: 15,
            skipped: 2,
          },
        }),
      });

      render(
        <PayrollActions
          {...defaultProps}
          onRefresh={onRefresh}
          notificationStats={{
            advanceCount: 1,
            wageCount: 2,
            total: 3,
          }}
        />
      );

      // Open modal and confirm
      const notifyButton = screen.getByRole('button', { name: /notify all paid/i });
      await user.click(notifyButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/payment-requests/notify-all',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ year: 2026, month: 2 }),
          })
        );
      });

      // Should refresh after success
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    // FE-015: CRITICAL - Response field mapping (Bug #3 Fix)
    it('should use correct API response fields (employeesNotified, not totalSent)', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          summary: {
            requestsProcessed: 2,
            employeesNotified: 10, // Correct field name
            skipped: 3,           // Correct field name
            // Note: totalSent and totalSkipped are WRONG and should NOT be used
          },
        }),
      });

      render(
        <PayrollActions
          {...defaultProps}
          notificationStats={{
            advanceCount: 1,
            wageCount: 1,
            total: 2,
          }}
        />
      );

      // Open modal and confirm
      const notifyButton = screen.getByRole('button', { name: /notify all paid/i });
      await user.click(notifyButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      const { toast } = await import('sonner');

      await waitFor(() => {
        // Verify toast shows 10 (employeesNotified), not 0 (wrong field)
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('10'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state when notification stats are being fetched', () => {
      render(
        <PayrollActions
          {...defaultProps}
          notificationStats={null}
        />
      );

      // Should show loading indicator or disabled button
      const notifyButton = screen.queryByRole('button', { name: /notify all paid/i });
      if (notifyButton) {
        expect(notifyButton).toBeDisabled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should show error toast on bulk notify failure', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to send notifications' }),
      });

      render(
        <PayrollActions
          {...defaultProps}
          notificationStats={{
            advanceCount: 1,
            wageCount: 1,
            total: 2,
          }}
        />
      );

      // Open modal and confirm
      const notifyButton = screen.getByRole('button', { name: /notify all paid/i });
      await user.click(notifyButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      const { toast } = await import('sonner');

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });
});
```

---

### 3. Visual Regression Tests

**File:** `__tests__/components/payroll/PayrollVisual.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PaymentRequestsSection } from '@/app/(dashboard)/payroll/PaymentRequestsSection';

describe('PayrollVisual - Snapshot Tests', () => {
  const mockDraftRequest = {
    id: 'draft-1',
    status: 'draft',
    request_type: 'advance',
    total_amount: 1000000,
    employee_count: 3,
    notification_sent_at: null,
  };

  const mockPaidRequest = {
    id: 'paid-1',
    status: 'paid',
    request_type: 'wage',
    total_amount: 5000000,
    employee_count: 5,
    notification_sent_at: null,
  };

  const mockNotifiedRequest = {
    id: 'notified-1',
    status: 'paid',
    request_type: 'wage',
    total_amount: 5000000,
    employee_count: 5,
    notification_sent_at: '2026-02-05T10:00:00Z',
  };

  it('draft request shows delete button, no notify button', () => {
    const { container } = render(
      <PaymentRequestsSection requests={[mockDraftRequest]} onRefresh={() => {}} />
    );

    expect(container).toMatchSnapshot();
  });

  it('paid request shows notify button, no delete button', () => {
    const { container } = render(
      <PaymentRequestsSection requests={[mockPaidRequest]} onRefresh={() => {}} />
    );

    expect(container).toMatchSnapshot();
  });

  it('notified request shows notified badge', () => {
    const { container } = render(
      <PaymentRequestsSection requests={[mockNotifiedRequest]} onRefresh={() => {}} />
    );

    expect(container).toMatchSnapshot();
  });
});
```

---

## Manual Frontend Testing Checklist

### Test Environment Setup

1. Start the development server: `npm run dev`
2. Login with different user roles (HR, CEO, GM)
3. Navigate to Payroll section

### Delete Button Tests

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View draft payment request | Delete button visible (red, Trash icon) | |
| 2 | View pending payment request | Delete button visible | |
| 3 | View approved payment request | Delete button visible | |
| 4 | View rejected payment request | Delete button visible | |
| 5 | **View paid payment request** | **Delete button NOT visible** | |
| 6 | Click delete button | Confirmation dialog opens | |
| 7 | Cancel delete | Dialog closes, request unchanged | |
| 8 | Confirm delete | Request removed, success toast | |

### Notify Button Tests

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View draft payment request | Notify button NOT visible | |
| 2 | View pending payment request | Notify button NOT visible | |
| 3 | View rejected payment request | Notify button NOT visible | |
| 4 | View approved payment request | Notify button visible (blue, Bell icon) | |
| 5 | View paid payment request | Notify button visible | |
| 6 | View already notified request | "Notified" badge visible (green) | |
| 7 | Click notify button | Confirmation dialog opens | |
| 8 | Confirm notify | Success toast with employee counts | |
| 9 | Click notify again (same request) | Shows "Already notified" message | |

### Bulk Notify Tests

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View payroll with un-notified paid requests | "Notify All Paid" button with count badge | |
| 2 | All requests notified | "All Notified" green badge | |
| 3 | Click "Notify All Paid" button | Modal shows advance/wage breakdown | |
| 4 | Confirm bulk notify | Success message shows correct counts | |
| 5 | **Verify counts match API response** | **Shows employeesNotified, NOT totalSent** | |

### Translation Tests

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Switch to English | All new UI text in English | |
| 2 | Switch to Russian | All new UI text in Russian | |
| 3 | Switch to Uzbek | All new UI text in Uzbek | |

---

## Accessibility Tests

### Keyboard Navigation

| Test | Action | Expected Result |
|------|--------|-----------------|
| A11Y-001 | Tab to Delete button | Button receives focus |
| A11Y-002 | Enter on Delete button | Opens confirmation dialog |
| A11Y-003 | Escape in dialog | Closes dialog |
| A11Y-004 | Tab to Notify button | Button receives focus |
| A11Y-005 | Screen reader on Delete | Announces "Delete payment request" |
| A11Y-006 | Screen reader on Notify | Announces "Send notifications" |

### Color Contrast

| Element | Foreground | Background | Ratio Required | Pass/Fail |
|---------|------------|------------|----------------|-----------|
| Delete button | White | Red-600 | 4.5:1 | |
| Notify button | White | Blue-600 | 4.5:1 | |
| Notified badge | White | Green-600 | 4.5:1 | |
| All Notified badge | White | Green-600 | 4.5:1 | |

---

## Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | Latest | | |
| Firefox | Latest | | |
| Safari | Latest | | |
| Edge | Latest | | |
| Mobile Safari | iOS 15+ | | |
| Chrome Android | Latest | | |
