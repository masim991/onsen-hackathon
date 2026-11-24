-- 008_throughput.sql (R5 A1): data-only, reversible, NO deletes, NO DDL. Applied once via Supabase SQL.
-- 1) notice cadence 360 -> 1440 min (worker INTERVAL.notice is now 1440; rows store the value per target).
update public.monitor_targets set interval_minutes = 1440 where kind = 'notice' and interval_minutes = 360;
-- 2) photo discovery off: its hosts are mostly blocked by the site CSP (public 2/281). Already collected photo_assets and AI classification of them are untouched.
update public.monitor_targets set enabled = false where kind = 'photo' and enabled;

-- ===== REVERT (run to undo both) =====
-- update public.monitor_targets set interval_minutes = 360 where kind = 'notice' and interval_minutes = 1440;
-- update public.monitor_targets set enabled = true, next_check_at = now() where kind = 'photo' and not enabled;
-- (A2 heartbeat needs no DDL: rows are monitor_logs with result = 'heartbeat'. To remove them: nothing to revert; monitor_prune ages them out.)
