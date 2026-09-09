# Test Accounts — Reference

> **Purpose:** document the FreeBrain test accounts (emails, roles, relationships) so the director can verify role behavior without digging through Supabase.
> The accounts are rendered visually on the admin page (`/admin-controls` → **Test Accounts**) from `src/features/admin/testAccounts.ts`.
> Keep this file, that data file, and the panel in sync.

## Snapshot (Sep 2026)

| Email | Role | Display name | Onboarding | Relationship |
|-------|------|--------------|------------|--------------|
| jeankaluza@gmail.com | admin (+ freebrainer) | jeankaluza | completed | Main account — switch roles via Dev menu |
| jeankaluza+freebrainer@gmail.com | freebrainer | JeanBrain | completed | Linked to jeankaluza+brainlover@gmail.com |
| jeankaluza+brainlover@gmail.com | caregiver | — | unknown | Linked to JeanBrain |
| jeankaluza+brainlover_subog@gmail.com | caregiver | Brainlover Sub OG | completed | Manages managed sub "Freebrainer Sub" |
| jeankaluza+brainlover3@gmail.com | caregiver | — | unknown | Manages managed sub "Johnny smithers" |
| jeankaluza+bl1sub@gmail.com | caregiver | Sub Brainlover1 | completed | No FreeBrainer linked |
| jeankaluza+bl2sub@gmail.com | caregiver | Brainlover Sub 2 | completed | No FreeBrainer linked |
| jeankaluza+laurenog@gmail.com | caregiver | LaurenOG | completed | No FreeBrainer linked |

**Managed sub-accounts (no login):** "Freebrainer Sub" (owned by brainlover_subog), "Johnny smithers" (owned by brainlover3).

**Not shown on the panel (messy/orphan rows):**
- `jeankaluza+brainlover1@gmail.com` — caregiver, no display name, no relationship.
- `jeankaluza+brainloverinvite@gmail.com` — role `user`, never completed onboarding (invite test).
- `jeankaluza@orangedrum.com` — role `user`, never completed onboarding.
- `jrkaluza@gmail.com` (Janice Kaluza) — caregiver linked to JeanBrain, but not a `jeankaluza+` test account.

## How to refresh the snapshot

Run both queries in the Supabase **SQL Editor** (Authentication → SQL Editor → New query → Run), then update
`src/features/admin/testAccounts.ts` and this table. The admin panel reads `TEST_ACCOUNTS`, so it updates automatically.

Query 1 — accounts and roles:

```sql
SELECT
  au.email,
  COALESCE(ur.role::text, 'no role') AS role,
  p.display_name,
  p.onboarding_completed
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
LEFT JOIN public.profiles   p  ON p.user_id  = au.id
WHERE au.email ILIKE 'jeankaluza%'
ORDER BY au.email;
```

Query 2 — relationships (caregiver links + managed sub-accounts):

```sql
SELECT
  'caregiver link' AS link_type,
  caregiver.email  AS user_email,
  caregiver_name.display_name AS user_name,
  patient.email    AS linked_email,
  patient_name.display_name   AS linked_name,
  cl.status        AS status
FROM public.caregiver_links cl
LEFT JOIN auth.users caregiver       ON caregiver.id = cl.caregiver_id
LEFT JOIN public.profiles caregiver_name ON caregiver_name.user_id = cl.caregiver_id
LEFT JOIN auth.users patient         ON patient.id   = cl.patient_id
LEFT JOIN public.profiles patient_name   ON patient_name.user_id   = cl.patient_id
WHERE caregiver.email ILIKE 'jeankaluza%'
   OR patient.email   ILIKE 'jeankaluza%'

UNION ALL

SELECT
  'managed freebrainer' AS link_type,
  manager.email  AS user_email,
  manager_name.display_name AS user_name,
  NULL           AS linked_email,
  mf.display_name AS linked_name,
  'managed'      AS status
FROM public.managed_freebrainers mf
LEFT JOIN auth.users manager       ON manager.id = mf.managed_by
LEFT JOIN public.profiles manager_name ON manager_name.user_id = mf.managed_by
WHERE manager.email ILIKE 'jeankaluza%'
ORDER BY user_email;
```

## Background

- Roles live in `public.user_roles` (`user_id`, `role` — role is the `user_role` enum: `admin`, `freebrainer`, `caregiver`, `user`, ...). The app resolves the logged-in role in `src/contexts/AuthContext.tsx`.
- Relationships: `public.caregiver_links` (caregiver_id → patient_id) for accounts with login; `public.managed_freebrainers` (managed_by → sub-account) for no-login sub-accounts.
- The admin check is hardcoded to `jeankaluza@gmail.com` (`src/contexts/AuthContext.tsx:154`).