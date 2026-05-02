-- ============================================================
-- MIGRATION: Add answered_by column to questions table
-- PURPOSE: Track which ustadz answered each question
-- ============================================================

-- Add the answered_by column to track the ustadz who answered
alter table public.questions 
add column if not exists answered_by uuid references public.profiles(id);

-- Add index for better performance on queries
create index if not exists idx_questions_answered_by 
on public.questions(answered_by);

-- Update existing answered questions to set answered_by to null
-- (This preserves existing data while allowing future answers to track the ustadz)
update public.questions 
set answered_by = null 
where answered_by is null;

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant select on public.questions to authenticated;
grant update on public.questions to authenticated;

-- Update RLS policy for Ustadz to allow setting answered_by
drop policy if exists "Ustadz can answer" on public.questions;

create policy "Ustadz can answer"
  on public.questions
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'ustadz'
    )
    and status = 'verified'  -- can only answer verified questions
  )
  with check (
    status = 'answered'
    and answered_by = auth.uid()  -- must set themselves as the answerer
  );

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check the column was added
\d public.questions

-- Check existing questions
select id, status, answer, answered_by 
from public.questions 
where status = 'answered' 
limit 5;

-- ============================================================
-- DONE
-- ============================================================
