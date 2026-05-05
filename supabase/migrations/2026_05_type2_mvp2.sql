-- ============================================================
-- Type 2 MVP 2: Evidence Review Workflow
-- Run after 2026_05_type2_mvp1.sql.
-- Re-runnable.
-- ============================================================

-- Add reviewer fields to documents
alter table public.documents
  add column if not exists reviewer_status  text not null default 'pending',
    -- pending | approved | rejected
  add column if not exists reviewer_comment text,
  add column if not exists reviewed_by_name text,
  add column if not exists reviewed_date     date;
