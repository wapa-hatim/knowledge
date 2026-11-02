alter table public.profiles
  add column if not exists status text not null default 'Active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('Active', 'Invited', 'Suspended'));
  end if;
end;
$$;