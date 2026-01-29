# C-Space HR - Credentials & Access

> ⚠️ **SECURITY NOTE:** This file contains references only. Actual secrets are in `.env.local` (gitignored).

---

## Environment Variables Required

Copy to `.env.local`:

```env
# Supabase - Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Telegram Bot Integration (optional for web-only development)
TELEGRAM_BOT_WEBHOOK_URL=https://[bot-server]/api
TELEGRAM_BOT_WEBHOOK_SECRET=[webhook-secret]
```

---

## Access Credentials

### Supabase Dashboard
- **URL:** https://supabase.com/dashboard/project/[project-id]
- **Access:** Ask project owner for invite

### Vercel Dashboard
- **URL:** https://vercel.com/[team]/c-space-hr
- **Access:** Ask project owner for invite

### GitHub Repository
- **URL:** https://github.com/zukhriddin2012/c-space-hr
- **Branch:** main

---

## Test Accounts

For local development/testing:

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| super_admin | admin@cspace.uz | [ask owner] | Full access |
| hr | hr@cspace.uz | [ask owner] | HR operations |
| employee | test@cspace.uz | [ask owner] | Self-service only |

---

## API Keys & Tokens

### Telegram Bot
- **Bot Username:** @cspace_hr_bot
- **Bot Token:** Stored in bot server, not needed for web

### External Services
- Currently no external API integrations beyond Supabase

---

## Database Access

### Direct SQL Access
- Use Supabase Dashboard > SQL Editor
- Or connect via `psql` with connection string from Supabase

### Migration Files
- Location: `supabase/migrations/`
- Run via Supabase Dashboard or CLI

---

## Development Setup

1. Clone repo
2. Copy `.env.local.example` to `.env.local` (or ask for credentials)
3. Run `npm install`
4. Run `npm run dev`
5. Access http://localhost:3000

---

## Production Deployment

- Automatic via Vercel on push to `main`
- Environment variables configured in Vercel dashboard
- No manual deployment needed

---

## Requesting Access

Contact: Zuhriddin (zuhriddin2012@gmail.com)
- Supabase dashboard access
- Vercel dashboard access
- Test account credentials
- Production environment variables
