-- Add is_required column to poll_questions
alter table poll_questions add column is_required boolean default false;
