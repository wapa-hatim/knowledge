alter table public.spaces alter column visibility set default 'workspace';

update public.spaces
set visibility = 'workspace'
where owner_id is not null and visibility = 'members';

create or replace function public.is_space_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'Active'
    )
    and (
      public.is_workspace_admin()
      or exists (
        select 1 from public.space_members sm
        where sm.space_id = target_space_id and sm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.spaces s
        where s.id = target_space_id and s.visibility = 'workspace'
      )
    );
$$;

drop policy if exists categories_insert_workspace_member on public.categories;
create policy categories_insert_workspace_member
  on public.categories for insert to authenticated
  with check (
    public.current_workspace_role() in ('Super Admin', 'Space Admin', 'Author', 'Reviewer')
    and public.is_space_member(space_id)
  );
