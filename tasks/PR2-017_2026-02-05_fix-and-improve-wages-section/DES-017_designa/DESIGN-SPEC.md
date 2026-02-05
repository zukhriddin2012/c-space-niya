# DES-017: UI/UX Design Specification
## Wages Section Fixes

**Version:** 1.0
**Author:** UI/UX Designer (Claude)
**Date:** 2026-02-05
**Based on:** PRD-017

---

## 1. Delete Payment Request

### 1.1 Delete Button

**Location:** Payment request card/row header, right side, next to status badge

**Appearance:**
```tsx
<button className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
  <Trash2 size={16} />
  Delete
</button>
```

**Visibility Rules:**
| Status | Show Button |
|--------|-------------|
| Draft | ✅ Yes |
| Pending Approval | ✅ Yes |
| Approved | ✅ Yes |
| Rejected | ✅ Yes |
| **Paid** | ❌ **No (hidden)** |

**States:**
- Default: `bg-red-600 text-white`
- Hover: `bg-red-700`
- Loading: Show spinner, text "Deleting...", disabled
- Disabled: `opacity-50 cursor-not-allowed`

### 1.2 Delete Confirmation Dialog

**Use existing component:** `ConfirmationDialog` with `variant="danger"`

**Content:**
```
Title: "Delete Payment Request?"

Message: "This will permanently delete the wage request for
{employeeCount} employees totaling {totalAmount} UZS.
This action cannot be undone."

Buttons:
- Cancel (secondary)
- Delete Request (danger, with Trash2 icon)
```

**Dialog Structure:**
- Red circle icon with XCircle
- Centered layout
- Employee count and amount in bold
- Amount in green color (`text-green-600`)

---

## 2. Duplicate Payment Prevention

### 2.1 PAID Column Enhancement

**Location:** Employee Wages table, after "Total Net" column

**Header:**
```tsx
<th className="px-4 py-3 text-right font-medium">
  <span className="inline-flex items-center gap-1">
    <CheckCircle size={12} className="text-green-600" />
    Paid
  </span>
</th>
```

**Cell Content:**

**If paid:**
```tsx
<span className="inline-flex items-center gap-1 text-green-600 font-medium">
  <CheckCircle size={14} />
  {formatAmount(paidAmount)}
</span>
```

**If not paid:**
```tsx
<span className="text-gray-400">-</span>
```

### 2.2 Grayed Out Rows (Already Paid)

**Row styling for paid employees:**
```tsx
<tr className={`border-b border-gray-100 ${isPaid ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
```

**Text color for paid rows:**
- Name: `text-gray-500` (instead of `text-gray-900`)
- All other cells: normal but grayed by row opacity

### 2.3 Blocked Input Fields

**When employee is already paid, replace inputs with:**
```tsx
<span className="px-3 py-1 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed">
  Blocked
</span>
```

**Placement:** Both Advance and Wage input columns

### 2.4 Tooltip on Hover

**Trigger:** Hover over PAID amount cell for paid employees

**Content:**
```
{paymentType} Payment
Paid {amount} UZS on {date}
```

**Styling:**
```tsx
<div className="absolute right-0 bottom-full mb-2 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
  <div className="font-medium">{type} Payment</div>
  <div>Paid {amount} on {date}</div>
</div>
```

---

## 3. Manual Telegram Notifications

### 3.1 Notify Button

**Location:** Payment request card header, next to status badge (or delete button if shown)

**Visibility:** Only when status is `approved` or `paid`

**State 1 - Ready to Send:**
```tsx
<button className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
  <Bell size={16} />
  Notify {employeeCount} Employees
</button>
```

**State 2 - Already Sent:**
```tsx
<button disabled className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium cursor-not-allowed">
  <CheckCircle size={16} />
  Notified
</button>
```

**Additional info when sent:**
```tsx
<span className="inline-flex items-center gap-2 text-xs text-green-600">
  <BellRing size={14} />
  Telegram notifications sent on {date} at {time}
</span>
```

### 3.2 Notify Confirmation Dialog

**Use existing component:** `ConfirmationDialog` with `variant="info"`

**Content:**
```
Icon: Send (in blue circle)

Title: "Send Telegram Notifications?"

Message: "This will send payment notifications to {employeeCount}
employees about their wage payment of {totalAmount} UZS
for {month} {year}."

Preview Box:
  💵 To'lov amalga oshirildi!
  Oylik to'lovi: {amount} UZS
  Davr: {month} {year}

Buttons:
- Cancel (secondary)
- Send Notifications (blue, with Send icon)
```

---

## 4. Bulk Notifications

### 4.1 "Notify All Paid" Button

**Location:** Payroll dashboard header, between Export and Process Payroll buttons

**State 1 - Has Un-notified:**
```tsx
<button className="inline-flex items-center gap-2 px-4 py-2.5 border border-purple-300 bg-purple-50 text-purple-700 rounded-lg font-medium hover:bg-purple-100 transition-colors">
  <BellRing size={20} />
  Notify All Paid
  <span className="ml-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">
    {count}
  </span>
</button>
```

**State 2 - All Notified:**
```tsx
<button disabled className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-100 text-green-700 border border-green-200 rounded-lg font-medium cursor-not-allowed">
  <CheckCircle size={20} />
  All Notified
</button>
```

**State 3 - No Paid Requests:**
```tsx
<button disabled className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed opacity-50">
  <BellRing size={20} />
  Notify All Paid
</button>
```

### 4.2 Bulk Notify Confirmation Dialog

**Content:**
```
Icon: Users (in purple circle)

Title: "Notify All Paid Requests?"

Message: "This will send Telegram notifications for all
un-notified paid requests in {month} {year}."

Summary Box:
  Advance Requests: {count} requests ({employees} employees)
  Wage Requests: {count} requests ({employees} employees)
  ─────────────────────────────────────
  Total: {totalEmployees} employees will be notified

Buttons:
- Cancel (secondary)
- Notify All (purple, with BellRing icon)
```

---

## 5. Color Reference

| Element | Color Class | Hex |
|---------|-------------|-----|
| Delete/Danger | `bg-red-600` | #DC2626 |
| Paid/Success | `bg-green-600` | #16A34A |
| Paid Light | `bg-green-100` | #DCFCE7 |
| Notify/Info | `bg-blue-600` | #2563EB |
| Bulk Notify | `bg-purple-600` | #7C3AED |
| Warning/Advance | `bg-orange-600` | #EA580C |
| Disabled | `bg-gray-100` | #F3F4F6 |
| Blocked Text | `text-gray-400` | #9CA3AF |

---

## 6. Icons Used (Lucide React)

| Feature | Icon | Usage |
|---------|------|-------|
| Delete | `Trash2` | Delete button |
| Paid Status | `CheckCircle` | PAID column, success states |
| Bell | `Bell` | Notify button (ready state) |
| Bell Ring | `BellRing` | Bulk notify, notification sent |
| Send | `Send` | Notify dialog |
| Users | `Users` | Bulk notify dialog |
| Clock | `Clock` | Pending states |
| X Circle | `XCircle` | Delete dialog, rejected status |
| Info | `Info` | Info tooltips |

---

## 7. Responsive Considerations

- Buttons should stack vertically on mobile
- Tables should have horizontal scroll on small screens
- Dialogs use `max-w-md w-full mx-4` for consistent mobile sizing
- Hide text labels on mobile, show icons only where space is tight

---

## 8. Translation Keys Needed

```typescript
// Delete
'payroll.delete.button': 'Delete',
'payroll.delete.title': 'Delete Payment Request?',
'payroll.delete.message': 'This will permanently delete the {type} request for {count} employees totaling {amount} UZS. This action cannot be undone.',
'payroll.delete.confirm': 'Delete Request',
'payroll.delete.deleting': 'Deleting...',

// Duplicate Prevention
'payroll.paid.column': 'Paid',
'payroll.paid.blocked': 'Blocked',
'payroll.paid.tooltip.advance': 'Advance Payment',
'payroll.paid.tooltip.wage': 'Wage Payment',
'payroll.paid.tooltip.date': 'Paid {amount} on {date}',

// Notifications
'payroll.notify.button': 'Notify {count} Employees',
'payroll.notify.notified': 'Notified',
'payroll.notify.title': 'Send Telegram Notifications?',
'payroll.notify.message': 'This will send payment notifications to {count} employees about their {type} payment of {amount} UZS for {period}.',
'payroll.notify.confirm': 'Send Notifications',
'payroll.notify.sending': 'Sending...',
'payroll.notify.sent': 'Telegram notifications sent on {date} at {time}',

// Bulk Notifications
'payroll.notifyAll.button': 'Notify All Paid',
'payroll.notifyAll.allNotified': 'All Notified',
'payroll.notifyAll.title': 'Notify All Paid Requests?',
'payroll.notifyAll.message': 'This will send Telegram notifications for all un-notified paid requests in {period}.',
'payroll.notifyAll.summary.advance': 'Advance Requests',
'payroll.notifyAll.summary.wage': 'Wage Requests',
'payroll.notifyAll.summary.total': 'Total',
'payroll.notifyAll.summary.employees': '{count} employees will be notified',
'payroll.notifyAll.confirm': 'Notify All',
```

---

## 9. Implementation Notes

1. **Button Order in Header:** Delete → Notify → (other actions)
2. **Use Existing Components:** Leverage `ConfirmationDialog` from `@/components/ui`
3. **Loading States:** Always show spinner and "...ing" text during async operations
4. **Accessibility:** Ensure all buttons have proper focus states with `focus:ring-2`
5. **Error Handling:** If notification fails, show error toast and keep button enabled for retry
