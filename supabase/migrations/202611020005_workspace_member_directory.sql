create or replace function public.get_workspace_member_directory()
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct p.id, coalesce(p.display_name, '')
  from public.profiles p
  where p.status = 'Active'
    and (
      p.id = auth.uid()
      or public.is_workspace_admin()
      or exists (
        select 1
        from public.space_members mine
        join public.space_members theirs on theirs.space_id = mine.space_id
        where mine.user_id = auth.uid() and theirs.user_id = p.id
      )
    );
$$;

revoke all on function public.get_workspace_member_directory() from public, anon;
grant execute on function public.get_workspace_member_directory() to authenticated;