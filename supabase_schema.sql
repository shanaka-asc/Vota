-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Linked to Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- POLLS
create table polls (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references profiles(id),
  title text not null,
  description text,
  is_public boolean default true,
  allow_anonymous boolean default true,
  requires_login boolean default false,
  allowed_domains text[], -- Array of domains like ['google.com', 'ascentic.se']
  show_results_instant boolean default true,
  allow_multiple_votes boolean default false, -- One person can vote multiple times? Usually false.
  expires_at timestamp with time zone,
  template_type text default 'generic', -- 'event', 'date', 'nomination', 'generic'
  is_closed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- POLL QUESTIONS
create table poll_questions (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid references polls(id) on delete cascade not null,
  question_text text not null,
  question_type text default 'single', -- 'single', 'multiple', 'text'
  order_index integer default 0
);

-- POLL OPTIONS (For single/multiple choice)
create table poll_options (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references poll_questions(id) on delete cascade not null,
  option_text text not null,
  order_index integer default 0
);

-- POLL VOTES
create table poll_votes (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid references polls(id) on delete cascade not null,
  question_id uuid references poll_questions(id) on delete cascade,
  option_id uuid references poll_options(id) on delete cascade, -- Nullable if text answer
  voter_id uuid references auth.users(id), -- Nullable if anonymous
  voter_ip text, -- Basic abuse prevention
  text_response text, -- If question_type is 'text'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (poll_id, question_id, option_id, voter_id),
  unique (poll_id, question_id, option_id, voter_ip)
);

-- RLS POLICIES (Simplified for initial setup)
alter table profiles enable row level security;
alter table polls enable row level security;
alter table poll_questions enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Public polls are viewable by everyone" on polls for select using (true);
create policy "Everyone can create polls" on polls for insert with check (true);
create policy "Questions are public" on poll_questions for select using (true);
create policy "Everyone can create questions" on poll_questions for insert with check (true);
create policy "Options are public" on poll_options for select using (true);
create policy "Everyone can create options" on poll_options for insert with check (true);
create policy "Anyone can vote on active polls" on poll_votes for insert with check (
  exists (
    select 1 from polls
    where polls.id = poll_votes.poll_id
    and polls.is_closed = false
    and (polls.expires_at is null or polls.expires_at > now())
  )
);
create policy "Anyone can view votes" on poll_votes for select using (true); 
-- Note: 'Anyone can vote' needs refinement for production based on poll settings

-- TRIGGER FOR NEW USERS
-- This ensures that when a user signs up via Supabase Auth, a row is created in public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ENABLE REALTIME
-- You may need to run this manually in the Supabase SQL Editor if it doesn't apply.
-- ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;

