alter table public.profiles
  add column if not exists password_setup_required boolean not null default false;

update public.profiles
set password_setup_required = true
where status = 'Invited' and password_setup_required = false;
