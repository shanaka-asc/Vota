-- Refine RLS policy for poll_votes to prevent voting on closed or expired polls
drop policy if exists "Anyone can vote" on poll_votes;
drop policy if exists "Anyone can vote on active polls" on poll_votes;

create policy "Anyone can vote on active polls" on poll_votes for insert with check (
  exists (
    select 1 from polls
    where polls.id = poll_votes.poll_id
    and polls.is_closed = false
    and (polls.expires_at is null or polls.expires_at > now())
  )
);
