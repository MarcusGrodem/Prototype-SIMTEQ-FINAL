-- Adds report template layout controls.
-- Re-runnable.

alter table public.report_templates
  add column if not exists include_front_page boolean not null default true;

alter table public.report_template_sections
  add column if not exists page_break_before boolean not null default true;
