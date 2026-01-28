# C-Space HR Platform - QA Testing Checklist

## Overview
This document outlines the testing procedures for the C-Space HR attendance tracking system, which consists of:
- **Web App**: Next.js dashboard at https://c-space-hr.vercel.app
- **Telegram Bot**: @cspace_attendance_bot
- **Database**: Supabase (PostgreSQL)

---

## 1. Telegram Bot Testing

### 1.1 Language System
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Language selection UI | Open Settings → View language options | Current language shows ✓ checkmark | ⬜ |
| Change language | Click different language | Same message updates with new ✓, no new message sent | ⬜ |
| DB sync on change | Change language in bot → Check DB | `preferred_language` column updates in `employees` table | ⬜ |
| Russian translations | Set Russian → Navigate bot | All messages in Russian | ⬜ |
| Uzbek translations | Set Uzbek → Navigate bot | All messages in Uzbek | ⬜ |
| English translations | Set English → Navigate bot | All messages in English | ⬜ |

### 1.2 Check-in Flow
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| IP-based check-in | Click "Check-in" from office network | Auto-detects branch, records check-in | ⬜ |
| GPS fallback | Check-in from non-office IP | Prompts for GPS location | ⬜ |
| Branch detection | Check-in from configured IP | Correct branch name shown | ⬜ |
| Duplicate check-in | Try check-in when already checked in | Shows error or redirects to checkout | ⬜ |
| Late check-in flag | Check-in after shift start time | "Late" flag recorded | ⬜ |

### 1.3 Check-out Flow
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Manual checkout | Click "Checkout" button | Records checkout time, shows total hours | ⬜ |
| Checkout from status | From status page → Checkout | Same flow works | ⬜ |
| Early leave detection | Checkout before shift end | "Early leave" flag recorded | ⬜ |
| Multiple sessions | Checkout → Check-in again same day | Creates new session, shows session count | ⬜ |

### 1.4 Status Page
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| View status | Click "Status" button | Shows today's attendance in user's language | ⬜ |
| Active session display | While checked in | Shows "Current session", elapsed time, branch | ⬜ |
| Multiple sessions | After 2+ check-ins same day | Shows "Previous X sessions" summary | ⬜ |
| All sessions view | Click "All sessions" button | Expands to show all session details | ⬜ |
| Finished status | After checkout | Shows "Work finished" in user's language | ⬜ |

### 1.5 Checkout Reminders
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Reminder sent | At 18:30 (day shift) or 10:00 (night) | Reminder message with "Check" button | ⬜ |
| Mini app opens | Click "Check" button | Mini app opens, shows loading | ⬜ |
| IP verified | Open mini app from office | Original message edited with snooze options | ⬜ |
| IP not verified | Open mini app from outside | Shows "Are you at work?" with options | ⬜ |
| 45 min snooze | Click "45 min" | Confirmation shown, message deleted after 10s | ⬜ |
| 2 hours snooze | Click "2 hours" | Confirmation shown, message deleted after 10s | ⬜ |
| All day option | Click "Not leaving today" | Confirmation shown, no more reminders | ⬜ |
| "I left" option | Click "I left" | Records checkout, confirmation shown | ⬜ |
| Message editing | Complete any action | Same message is edited, no new messages | ⬜ |
| Language in reminder | User has Russian set | All reminder text in Russian | ⬜ |

### 1.6 Send Reminder to Me (Admin)
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Button visibility | Go to Telegram Bot admin page | "Send Reminder to Me" button visible | ⬜ |
| Send self reminder | Click button | Reminder sent to your Telegram | ⬜ |
| Full flow | Send → Check → Snooze | Complete flow works | ⬜ |

---

## 2. Web App Testing

### 2.1 Authentication
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Login page | Navigate to /login | Login form displayed | ⬜ |
| Valid login | Enter valid credentials | Redirects to dashboard | ⬜ |
| Invalid login | Enter wrong credentials | Error message shown | ⬜ |
| Session persistence | Refresh page after login | Stays logged in | ⬜ |
| Logout | Click logout | Redirects to login | ⬜ |

### 2.2 Dashboard
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Dashboard loads | Login → View dashboard | Shows attendance overview | ⬜ |
| Today's stats | View dashboard | Correct check-in/out counts | ⬜ |
| Employee list | View employees section | All employees shown | ⬜ |

### 2.3 Attendance Records
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| View records | Go to Attendance page | Shows attendance history | ⬜ |
| Filter by date | Select date range | Records filtered correctly | ⬜ |
| Filter by employee | Select employee | Only their records shown | ⬜ |
| Export data | Click export (if available) | Downloads CSV/Excel | ⬜ |

### 2.4 Language Sync
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Load from DB | Login to web app | Language matches DB preference | ⬜ |
| Change in web app | Change language in settings | DB updates, bot uses new language | ⬜ |
| Change in bot | Change language in bot settings | Web app uses new language on refresh | ⬜ |

### 2.5 Telegram Bot Admin Page
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Page loads | Navigate to /telegram-bot | Admin page displayed | ⬜ |
| Reminder settings | View/edit reminder settings | Settings saved correctly | ⬜ |
| Test reminder | Send test reminder | Reminder received in Telegram | ⬜ |

---

## 3. Integration Testing

### 3.1 Bot ↔ Web App Sync
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Check-in in bot | Check-in via bot → View web app | Record appears in web dashboard | ⬜ |
| Language sync | Change language in bot | Web app reflects change | ⬜ |
| Real-time updates | Check-in → Refresh dashboard | New record visible | ⬜ |

### 3.2 Mini App Integration
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Mini app loads | Click WebApp button in bot | Mini app opens in Telegram | ⬜ |
| API communication | Mini app → checkout-check API | Returns correct response | ⬜ |
| Message editing | API edits bot message | Original message updated | ⬜ |

### 3.3 Scheduled Tasks
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Day shift reminder | Wait for 18:30 Tashkent time | Reminders sent to day shift employees | ⬜ |
| Night shift reminder | Wait for 10:00 Tashkent time | Reminders sent to night shift employees | ⬜ |
| Scheduled snooze | Snooze 45min → Wait | Follow-up reminder sent | ⬜ |

---

## 4. Edge Cases & Error Handling

### 4.1 Error Scenarios
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Network error in mini app | Disconnect network → Open mini app | Error message displayed | ⬜ |
| Invalid telegram ID | API call with wrong ID | Proper error response | ⬜ |
| DB connection failure | (Simulate) DB down | Graceful error handling | ⬜ |
| Expired session | Wait for session timeout | Redirects to login | ⬜ |

### 4.2 Boundary Conditions
| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Midnight rollover | Check-in before midnight, checkout after | Correct date handling | ⬜ |
| Multiple rapid clicks | Click button multiple times quickly | No duplicate actions | ⬜ |
| Long session | 12+ hour check-in | Correct elapsed time calculation | ⬜ |
| Empty states | New user with no records | Appropriate empty state messages | ⬜ |

---

## 5. Browser & Device Compatibility

### 5.1 Web App
| Browser/Device | Status |
|----------------|--------|
| Chrome (Desktop) | ⬜ |
| Firefox (Desktop) | ⬜ |
| Safari (Desktop) | ⬜ |
| Chrome (Mobile) | ⬜ |
| Safari (iOS) | ⬜ |

### 5.2 Telegram Mini App
| Platform | Status |
|----------|--------|
| Telegram iOS | ⬜ |
| Telegram Android | ⬜ |
| Telegram Desktop | ⬜ |

---

## Test Environment

- **Web App URL**: https://c-space-hr.vercel.app
- **Bot Username**: @cspace_attendance_bot
- **Test Accounts**: [Add test account credentials]
- **Office IPs**: [Add configured office IPs for testing]

---

## Bug Report Template

When reporting bugs, please include:

```
**Bug Title**: [Short description]

**Environment**:
- Platform: [Web/Bot/Mini App]
- Language: [uz/ru/en]
- Device: [Desktop/iOS/Android]

**Steps to Reproduce**:
1.
2.
3.

**Expected Result**:

**Actual Result**:

**Screenshots/Videos**: [Attach if applicable]

**Additional Notes**:
```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Tester | | | |
| Developer | | | |
| Product Owner | | | |
