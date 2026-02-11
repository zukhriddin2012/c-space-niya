// src/lib/utils/recurrence.ts
// PR2-053 AT-23: Client-side recurring event generation engine
// Design Decision AD-01: Compute recurring instances on the client, not stored in DB

import type { MetronomeKeyDateRow, MetronomeRecurrenceRule } from '@/lib/db/metronome';

export interface VirtualKeyDate extends MetronomeKeyDateRow {
  isVirtualInstance: boolean;    // true = generated from recurrence
  parentId: string | null;       // original recurring event's ID
  instanceDate: string;          // this specific instance's date
}

/**
 * Expands recurring key dates into individual instances within a view range.
 * Non-recurring events are passed through with isVirtualInstance=false.
 * Safety cap: max 500 total instances to prevent infinite loops.
 */
export function expandRecurringEvents(
  keyDates: MetronomeKeyDateRow[],
  viewStart: Date,
  viewEnd: Date
): VirtualKeyDate[] {
  const results: VirtualKeyDate[] = [];

  for (const kd of keyDates) {
    if (!kd.recurrence_rule) {
      // Non-recurring: include as-is if within view range
      const d = new Date(kd.date);
      if (d >= viewStart && d <= viewEnd) {
        results.push({
          ...kd,
          isVirtualInstance: false,
          parentId: null,
          instanceDate: kd.date,
        });
      }
      continue;
    }

    // Recurring: generate instances within view range
    const startDate = new Date(kd.date);
    const endDate = kd.recurrence_end ? new Date(kd.recurrence_end) : viewEnd;
    const effectiveEnd = endDate < viewEnd ? endDate : viewEnd;

    let current = new Date(startDate);
    let instanceCount = 0;

    while (current <= effectiveEnd) {
      if (current >= viewStart && current <= viewEnd) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        results.push({
          ...kd,
          isVirtualInstance: current.getTime() !== startDate.getTime(),
          parentId: kd.id,
          instanceDate: dateStr,
          // Override the date field for display
          date: dateStr,
        });
      }

      // Advance to next occurrence — pass startDate to avoid monthly day-of-month drift
      instanceCount++;
      current = computeNthOccurrence(startDate, kd.recurrence_rule, instanceCount);

      // Safety: break if we've generated more than 500 instances (prevents infinite loop)
      if (instanceCount > 500) break;
    }
  }

  return results;
}

/**
 * Compute the Nth occurrence from a start date by recurrence rule.
 * For monthly: always computes from the original start date to avoid
 * "sticky clamping" drift (e.g., Jan 31 → Feb 28 → Mar 31, not Mar 28).
 * For weekly/biweekly: simple day arithmetic from start date.
 */
function computeNthOccurrence(startDate: Date, rule: MetronomeRecurrenceRule, n: number): Date {
  switch (rule) {
    case 'weekly': {
      const next = new Date(startDate);
      next.setDate(next.getDate() + 7 * n);
      return next;
    }
    case 'biweekly': {
      const next = new Date(startDate);
      next.setDate(next.getDate() + 14 * n);
      return next;
    }
    case 'monthly': {
      // Compute target month from the ORIGINAL start date (not from clamped previous)
      // This preserves the original day-of-month intent across all months
      const targetMonthIndex = startDate.getMonth() + n;
      const candidate = new Date(startDate.getFullYear(), targetMonthIndex, startDate.getDate());
      // Check if day overflowed into the next month (e.g., Feb 31 → Mar 3)
      const expectedMonth = targetMonthIndex % 12;
      if (candidate.getMonth() !== expectedMonth) {
        // Clamp to last day of the intended month: day 0 of next month = last day of target month
        return new Date(startDate.getFullYear(), targetMonthIndex + 1, 0);
      }
      return candidate;
    }
  }
}

/**
 * Get human-readable label for a recurrence rule.
 */
export function getRecurrenceLabel(rule: MetronomeRecurrenceRule | null): string {
  if (!rule) return 'Does not repeat';
  switch (rule) {
    case 'weekly': return 'Repeats weekly';
    case 'biweekly': return 'Repeats every 2 weeks';
    case 'monthly': return 'Repeats monthly';
  }
}
