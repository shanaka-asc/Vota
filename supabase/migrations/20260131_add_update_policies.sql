-- Migration: Add UPDATE policies to allow creators to edit their polls
-- Created: 2026-01-31

-- Polls: Creators can update their own polls
create policy "Creators can update own polls" on polls
  for update using (auth.uid() = creator_id);

-- Poll Questions: Creators can update questions on their own polls
create policy "Creators can update questions on own polls" on poll_questions
  for update using (
    exists (
      select 1 from polls
      where polls.id = poll_questions.poll_id
      and polls.creator_id = auth.uid()
    )
  );

-- Poll Options: Creators can update options on their own polls
create policy "Creators can update options on own polls" on poll_options
  for update using (
    exists (
      select 1 from poll_questions
      join polls on polls.id = poll_questions.poll_id
      where poll_questions.id = poll_options.question_id
      and polls.creator_id = auth.uid()
    )
  );
