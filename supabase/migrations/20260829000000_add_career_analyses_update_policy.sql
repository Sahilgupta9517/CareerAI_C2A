-- Add UPDATE policy for career_analyses so authenticated users can update their own rows
drop policy if exists "Users can update their own career analyses" on public.career_analyses;
create policy "Users can update their own career analyses"
  on public.career_analyses for update to authenticated
  using (exists (select 1 from public.profiles where profiles.id = career_analyses.profile_id and profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = career_analyses.profile_id and profiles.user_id = auth.uid()));
