# DEB-053 Architecta + Deva Review

**Module:** PR2-053 Metronome Sync UX Improvements & Bug Fixes
**Role:** Architecta (Architecture Review) + Deva (Developer Iteration)
**Date:** 2026-02-11
**Status:** `complete`
**Reviewing:** DEB-053 Debuga Handover (commit `b7d2d0c`)

---

## Architecta Findings

### F1: BUG-1 Fix Has "Sticky Clamping" Drift — DISAGREE WITH APPROACH

**Debuga's fix:** Added overflow detection in `advanceDate()` using `setMonth()` + `setDate(0)` clamp.

**Problem:** The fix chains from the *clamped* result. Once Jan 31 → Feb 28 is clamped, subsequent calls start from Feb 28 and produce Mar 28 → Apr 28 → May 28 instead of the correct Mar 31 → Apr 30 → May 31. The function loses "memory" of the original day-of-month.

**Severity:** MEDIUM — monthly recurring events on the 29th/30th/31st permanently drift downward after the first clamp, producing incorrect calendar positions for all future months.

**Resolution:** Refactored to `computeNthOccurrence()` which always computes from the original start date + N months. This preserves the original day-of-month intent across all months. Uses the `new Date(year, month, day)` constructor which handles month > 11 via automatic year wrapping (verified empirically).

**Trace verification (Scenario A — Jan 31 monthly):**
- n=1: new Date(2026, 1, 31) → overflow → clamp to Feb 28 ✓
- n=2: new Date(2026, 2, 31) → Mar 31 (no overflow) ✓
- n=3: new Date(2026, 3, 31) → overflow → clamp to Apr 30 ✓
- n=4: new Date(2026, 4, 31) → May 31 (no overflow) ✓
- n=5: new Date(2026, 5, 31) → overflow → clamp to Jun 30 ✓

**Trace verification (Scenario C — Dec 31 year boundary):**
- n=1: new Date(2025, 12, 31) → Jan 31 2026 ✓
- n=2: new Date(2025, 13, 31) → overflow → clamp via new Date(2025, 14, 0) = Feb 28 2026 ✓
- n=3: new Date(2025, 14, 31) → Mar 31 2026 ✓

### F2: BUG-2 Fix (UTC Timezone) — AGREE

Correct approach. `toISOString().split('T')[0]` → local date components is the right pattern, consistent with the F4 fix from SEC-053.

Minor note: creates 3 separate `new Date()` instances in the template literal. Theoretically could cross midnight between calls, but probability is negligible. Not worth fixing.

### F3: BUG-3 Fix (Dead Destructure) — AGREE

Trivial cleanup. Correct.

### F4: Triage of "Onboarding Selectors" — DISAGREE (Reclassified)

**Debuga classified as:** FALSE POSITIVE — "Graceful degradation already implemented."

**Architecta verdict:** Not a false positive. It's a **missing implementation** from DEV-053 (AT-19/AT-20). Three of seven `data-onboarding` selectors are never set in the JSX:

| Selector | Expected Location | Status |
|----------|-------------------|--------|
| `pulse-bar` | MetronomeDashboard.tsx | ✓ Present |
| `tab-decide-track` | MetronomeDashboard.tsx | ✓ Present |
| `tab-calendar-plan` | MetronomeDashboard.tsx | ✓ Present |
| `decisions-panel` | MetronomeDashboard.tsx | ✓ Present |
| `initiative-card` | InitiativeCard.tsx | ✗ MISSING |
| `action-items` | InitiativeCard.tsx | ✗ MISSING |
| `next-sync` | PulseBar.tsx | ✗ MISSING |

**Severity:** LOW — onboarding works but 3 steps show centered fallback instead of element spotlight.

**Resolution:** Added all 3 missing `data-onboarding` attributes.

### F5: All Other Triage Decisions — AGREE

All other triage decisions are well-reasoned:
- False positives (shallow copy, useState init, key collisions) — confirmed correct
- By-design items (toggle vs cycle, key-dates DELETE, unused props) — confirmed intentional
- Accepted risk items (N+1, unvalidated params, resize debounce) — reasonable trade-offs

### Additional Checks

| Item | Result |
|------|--------|
| `ReorderActionItemsSchema` has `.min(1)` | ✓ Confirmed — no crash risk for `items[0]` |
| `CreateKeyDateSchema` has cross-field `.refine()` | ✓ Confirmed — MISSED-1 fix from DEV-053b intact |
| `getActionItems()` handles no-params correctly | ✓ Returns all items sorted by sort_order |
| `reorderActionItems()` DB function lacks internal auth | ✓ Accepted — API layer has SEC-C2 ownership check |

---

## Deva Changes (2 fixes, 3 files)

### Fix 1: Refactor Monthly Recurrence — Eliminate Sticky Clamping

**File:** `src/lib/utils/recurrence.ts`
**Change:** Replaced `advanceDate()` with `computeNthOccurrence()`. Changed the `expandRecurringEvents` loop to always compute from the original `startDate + N months` instead of chaining from the clamped result.

Key differences:
- `advanceDate(current, rule)` → `computeNthOccurrence(startDate, rule, instanceCount)`
- Monthly case uses `new Date(startDate.getFullYear(), targetMonthIndex, startDate.getDate())` constructor
- Year boundary handled automatically by JS Date constructor (month > 11 wraps years)
- Overflow detection: `candidate.getMonth() !== targetMonthIndex % 12`
- Clamp: `new Date(startDate.getFullYear(), targetMonthIndex + 1, 0)` = last day of target month
- Weekly/biweekly also compute from startDate (simpler, no drift possible)

### Fix 2: Add Missing Onboarding Attributes

| File | Attribute Added |
|------|-----------------|
| `src/components/metronome/InitiativeCard.tsx` | `data-onboarding="initiative-card"` on root div |
| `src/components/metronome/InitiativeCard.tsx` | `data-onboarding="action-items"` on action items section |
| `src/components/metronome/PulseBar.tsx` | `data-onboarding="next-sync"` on Next Sync display div |

---

## Files Changed (3 files)

| File | Change | Lines |
|------|--------|-------|
| `src/lib/utils/recurrence.ts` | Replace `advanceDate` → `computeNthOccurrence` | +26/-15 |
| `src/components/metronome/InitiativeCard.tsx` | Add 2 `data-onboarding` attributes | +2/-2 |
| `src/components/metronome/PulseBar.tsx` | Add 1 `data-onboarding` attribute | +1/-0 |

---

## Verification

- TypeScript compilation: `npx tsc --noEmit` → 0 errors
- Empirical trace of `computeNthOccurrence`: All 4 scenarios pass (Jan 31, Jan 30, Dec 31 year boundary, Feb 28 non-snap)
- Node.js runtime verification of JS Date constructor month wrapping behavior confirmed

## Blockers

None.
