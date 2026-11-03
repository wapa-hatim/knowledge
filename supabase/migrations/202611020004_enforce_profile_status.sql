create or replace function public.current_workspace_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when p.status = 'Active' then p.role else 'Viewer' end
  from public.profiles p
  where p.id = auth.uid()
  union all
  select 'Viewer'
  where not exists (select 1 from public.profiles p where p.id = auth.uid())
  limit 1;
$$;

create or replace function public.is_space_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'Active')
    and (
      public.is_workspace_admin()
      or exists (
        select 1 from public.space_members sm
        where sm.space_id = target_space_id and sm.user_id = auth.uid()
      )
    );
$$;

create or replace function public.can_manage_space(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'Active')
    and (
      public.is_workspace_admin()
      or exists (
        select 1 from public.space_members sm
        where sm.space_id = target_space_id and sm.user_id = auth.uid() and sm.role = 'Space Admin'
      )
    );
$$;

create or replace function public.activate_invited_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at) then
    update public.profiles
    set status = 'Active'
    where id = new.id and status = 'Invited';
  end if;
  return new;
end;
$$;

drop trigger if exists auth_user_confirmation_activates_profile on auth.users;
create trigger auth_user_confirmation_activates_profile
  after update of email_confirmed_at on auth.users
  for each row execute function public.activate_invited_profile();