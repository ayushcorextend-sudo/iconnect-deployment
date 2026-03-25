-- Phase 5: Spaced Repetition Cards
-- Run this in the Supabase SQL editor

create table if not exists spaced_repetition_cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  front           text not null,
  back            text not null,
  subject         text,
  difficulty      text default 'medium',
  -- SM-2 fields
  easiness        numeric(4,2) default 2.5,
  interval        integer default 0,       -- days until next review
  repetitions     integer default 0,       -- consecutive correct reviews
  next_review_at  date not null default current_date,
  last_reviewed_at timestamptz,
  source_question_id uuid,                 -- optional link to exam_questions
  created_at      timestamptz default now()
);
alter table spaced_repetition_cards enable row level security;
create policy "Users manage own SR cards"
  on spaced_repetition_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- Index for efficient due-card queries
create index if not exists idx_sr_cards_user_due
  on spaced_repetition_cards (user_id, next_review_at);
