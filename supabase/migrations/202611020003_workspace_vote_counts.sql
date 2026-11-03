create or replace function public.get_workspace_vote_counts()
returns table (vote_type text, target_id uuid, vote_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 'question'::text, q.id, count(qv.user_id)
  from public.knowledge_questions q
  left join public.question_votes qv on qv.question_id = q.id
  where auth.uid() is not null and public.is_space_member(q.space_id)
  group by q.id
  union all
  select 'answer'::text, a.id, count(av.user_id)
  from public.question_answers a
  join public.knowledge_questions q on q.id = a.question_id
  left join public.answer_votes av on av.answer_id = a.id
  where auth.uid() is not null and public.is_space_member(q.space_id)
  group by a.id;
$$;

revoke all on function public.get_workspace_vote_counts() from public, anon;
grant execute on function public.get_workspace_vote_counts() to authenticated;