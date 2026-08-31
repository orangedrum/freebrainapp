# Supabase Migrations

All database schema changes live here. Run them in order in the **Supabase SQL Editor**.

## Setup (run once, in order)

| # | File | Description |
|---|------|-------------|
| 01 | `01_caregiver_links_and_teams.sql` | Caregiver links, teams, team_members tables + RLS |
| 02 | `02_managed_subaccounts.sql` | Managed sub-accounts for no-email FreeBrainers, bulk invite support |
| 03 | `03_brainlover_posts.sql` | Community post attribution columns for BrainLovers/Pros |
| 04 | `04_account_deletion_grace_period.sql` | 48hr deletion grace period column on profiles |
| 05 | `05_playlists_setup.sql` | Supabase-backed playlist config (admin-managed, propagates to all devices) |

## Utilities (run as needed)

| # | File | Description |
|---|------|-------------|
| 99 | `99_reset_users_and_data.sql` | **DESTRUCTIVE** — wipes all users and test data for fresh testing |

## How to run

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Copy the contents of each migration file and paste it into the editor.
4. Click **Run**.
5. Repeat for each migration in order.

## Notes

- Migrations use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` so they're safe to re-run.
- The `99_reset` script is destructive — only run it when you want a clean slate.
- The old `.sql` files in the project root are deprecated; always use the copies here.
