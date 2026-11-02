create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  department text not null default '',
  role text not null default 'Viewer' check (role in ('Super Admin', 'Space Admin', 'Author', 'Reviewer', 'Viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  color text not null default 'green',
  visibility text not null default 'members' check (visibility in ('members', 'workspace')),
  owner_id uuid references public.profiles (id) on delete set null,
  parent_id uuid references public.spaces (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, name)
);

create table public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'Member' check (role in ('Space Admin', 'Member')),
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null,
  parent_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (space_id, parent_id, name)
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title text not null,
  summary text not null default '',
  body text not null default '',
  content_format text not null default 'markdown' check (content_format in ('markdown', 'html')),
  status text not null default 'Draft' check (status in ('Draft', 'Under review', 'Published', 'Archived')),
  owner_id uuid references public.profiles (id) on delete set null,
  author_id uuid not null references public.profiles (id) on delete restrict,
  visibility text not null default 'members' check (visibility in ('members', 'workspace')),
  tags text[] not null default '{}',
  view_count bigint not null default 0 check (view_count >= 0),
  search_document tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(body, '') || ' ' || array_to_string(tags, ' '))
  ) stored,
  review_due_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  title text not null,
  body text not null,
  status text not null check (status in ('Draft', 'Under review', 'Published', 'Archived')),
  author_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  parent_id uuid references public.article_comments (id) on delete cascade,
  mentioned_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.article_feedback (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  helpful boolean not null,
  feedback text not null default '',
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create table public.bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table public.knowledge_assets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  name text not null,
  kind text not null check (kind in ('PDF', 'DOCX', 'Spreadsheet', 'Slides', 'Image', 'Diagram', 'Video', 'Audio', 'OpenAPI', 'Release notes')),
  storage_path text not null unique,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  extracted_text text not null default '',
  tags text[] not null default '{}',
  search_document tsvector generated always as (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(extracted_text, '') || ' ' || array_to_string(tags, ' '))
  ) stored,
  status text not null default 'Processing' check (status in ('Indexed', 'Processing', 'Synced', 'Failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_questions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  accepted_answer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.knowledge_questions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  verified_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_questions
  add constraint knowledge_questions_accepted_answer_fk
  foreign key (accepted_answer_id) references public.question_answers (id) on delete set null;

create table public.question_votes (
  question_id uuid not null references public.knowledge_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table public.answer_votes (
  answer_id uuid not null references public.question_answers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);

create table public.taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.article_taxonomy_terms (
  article_id uuid not null references public.articles (id) on delete cascade,
  term_id uuid not null references public.taxonomy_terms (id) on delete cascade,
  primary key (article_id, term_id)
);

create table public.knowledge_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format text not null,
  description text not null default '',
  owner_id uuid references public.profiles (id) on delete set null,
  audience text not null default '',
  coverage text not null default '',
  status text not null default 'Draft' check (status in ('Managed', 'Ready for review', 'Draft')),
  use_cases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null check (category in ('Repository', 'API catalog', 'Operations')),
  connected boolean not null default false,
  last_synced_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.integration_sync_logs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.knowledge_integrations (id) on delete cascade,
  status text not null check (status in ('Started', 'Succeeded', 'Failed')),
  message text not null default '',
  records_synced integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.search_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  query text not null,
  result_count integer not null default 0 check (result_count >= 0),
  created_at timestamptz not null default now()
);

create table public.workspace_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles (id) on delete cascade,
  asset_id uuid references public.knowledge_assets (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (article_id is not null or asset_id is not null)
);

create index articles_space_status_updated_idx on public.articles (space_id, status, updated_at desc);
create index articles_tags_idx on public.articles using gin (tags);
create index articles_search_document_idx on public.articles using gin (search_document);
create index knowledge_assets_space_created_idx on public.knowledge_assets (space_id, created_at desc);
create index knowledge_assets_search_document_idx on public.knowledge_assets using gin (search_document);
create index questions_space_created_idx on public.knowledge_questions (space_id, created_at desc);
create index audit_events_created_idx on public.audit_events (created_at desc);
create index search_queries_created_idx on public.search_queries (created_at desc);
create index knowledge_chunks_space_idx on public.knowledge_chunks (space_id);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger spaces_set_updated_at before update on public.spaces for each row execute function public.set_updated_at();
create trigger articles_set_updated_at before update on public.articles for each row execute function public.set_updated_at();
create trigger article_comments_set_updated_at before update on public.article_comments for each row execute function public.set_updated_at();
create trigger knowledge_questions_set_updated_at before update on public.knowledge_questions for each row execute function public.set_updated_at();
create trigger question_answers_set_updated_at before update on public.question_answers for each row execute function public.set_updated_at();
create trigger knowledge_assets_set_updated_at before update on public.knowledge_assets for each row execute function public.set_updated_at();
create trigger knowledge_models_set_updated_at before update on public.knowledge_models for each row execute function public.set_updated_at();

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

insert into public.profiles (id, email, display_name)
select id, coalesce(email, ''), coalesce(raw_user_meta_data->>'full_name', split_part(coalesce(email, ''), '@', 1))
from auth.users
on conflict (id) do update set email = excluded.email;

insert into public.spaces (name, slug, description, color)
values
  ('Engineering', 'engineering', 'Build, ship, and operate our products.', 'green'),
  ('Product & Design', 'product-design', 'Research, product direction, and design systems.', 'orange'),
  ('People & Finance', 'people-finance', 'The policies and practices that support our team.', 'blue'),
  ('Customer Success', 'customer-success', 'Help customers get lasting value from our work.', 'pink'),
  ('Security', 'security', 'Security practices, controls, and compliance.', 'purple')
on conflict (slug) do nothing;

insert into public.categories (space_id, name)
select s.id, category.name
from public.spaces s
cross join lateral unnest(case s.slug
  when 'engineering' then array['Onboarding', 'Runbooks', 'Architecture', 'SOPs']
  when 'product-design' then array['Product specs', 'Research', 'Guides', 'Design system']
  when 'people-finance' then array['Policies', 'Benefits', 'Expenses', 'Onboarding']
  when 'customer-success' then array['Playbooks', 'FAQs', 'Handoffs', 'Troubleshooting']
  when 'security' then array['SOPs', 'Access', 'Compliance', 'Incident response']
  else array[]::text[] end) as category(name)
on conflict (space_id, parent_id, name) do nothing;

create function public.current_workspace_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'Viewer');
$$;

create function public.is_workspace_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_workspace_role() = 'Super Admin';
$$;

create function public.is_space_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    public.is_workspace_admin()
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = target_space_id and sm.user_id = auth.uid()
    )
  );
$$;

create function public.can_manage_space(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_workspace_admin()
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = target_space_id and sm.user_id = auth.uid() and sm.role = 'Space Admin'
    );
$$;

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.article_versions enable row level security;
alter table public.article_comments enable row level security;
alter table public.article_feedback enable row level security;
alter table public.bookmarks enable row level security;
alter table public.knowledge_assets enable row level security;
alter table public.knowledge_questions enable row level security;
alter table public.question_answers enable row level security;
alter table public.question_votes enable row level security;
alter table public.answer_votes enable row level security;
alter table public.taxonomy_terms enable row level security;
alter table public.article_taxonomy_terms enable row level security;
alter table public.knowledge_models enable row level security;
alter table public.knowledge_integrations enable row level security;
alter table public.integration_sync_logs enable row level security;
alter table public.audit_events enable row level security;
alter table public.search_queries enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.knowledge_chunks enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_workspace_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_workspace_admin()) with check (id = auth.uid() or public.is_workspace_admin());
revoke update on public.profiles from anon, authenticated;
grant update (display_name, department) on public.profiles to authenticated;

create policy spaces_select on public.spaces for select to authenticated using (public.is_space_member(id));
create policy spaces_insert on public.spaces for insert to authenticated with check (public.is_workspace_admin());
create policy spaces_update on public.spaces for update to authenticated using (public.can_manage_space(id)) with check (public.can_manage_space(id));
create policy spaces_delete on public.spaces for delete to authenticated using (public.is_workspace_admin());

create policy space_members_select on public.space_members for select to authenticated using (user_id = auth.uid() or public.can_manage_space(space_id));
create policy space_members_admin_all on public.space_members for all to authenticated using (public.can_manage_space(space_id)) with check (public.can_manage_space(space_id));

create policy categories_select on public.categories for select to authenticated using (public.is_space_member(space_id));
create policy categories_manage on public.categories for all to authenticated using (public.can_manage_space(space_id)) with check (public.can_manage_space(space_id));

create policy articles_select on public.articles for select to authenticated using (public.is_space_member(space_id));
create policy articles_insert on public.articles for insert to authenticated with check (public.is_space_member(space_id) and author_id = auth.uid());
create policy articles_update on public.articles for update to authenticated using (public.can_manage_space(space_id) or (owner_id = auth.uid() and public.is_space_member(space_id))) with check (public.can_manage_space(space_id) or (owner_id = auth.uid() and public.is_space_member(space_id)));
create policy articles_delete on public.articles for delete to authenticated using (public.is_space_member(space_id) and (public.can_manage_space(space_id) or author_id = auth.uid()));

create policy article_versions_select on public.article_versions for select to authenticated using (exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id)));
create policy article_versions_insert on public.article_versions for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id) and (public.can_manage_space(a.space_id) or a.owner_id = auth.uid() or a.author_id = auth.uid())));

create policy article_comments_select on public.article_comments for select to authenticated using (exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id)));
create policy article_comments_insert on public.article_comments for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id)));
create policy article_comments_update_own on public.article_comments for update to authenticated using (author_id = auth.uid() and exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id))) with check (author_id = auth.uid() and exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id)));
create policy article_comments_delete_own on public.article_comments for delete to authenticated using (author_id = auth.uid() or public.is_workspace_admin());

create policy article_feedback_self on public.article_feedback for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id))) with check (user_id = auth.uid() and exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id)));
create policy bookmarks_self on public.bookmarks for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id))) with check (user_id = auth.uid() and exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id)));

create policy knowledge_assets_select on public.knowledge_assets for select to authenticated using (public.is_space_member(space_id));
create policy knowledge_assets_insert on public.knowledge_assets for insert to authenticated with check (uploaded_by = auth.uid() and public.is_space_member(space_id));
create policy knowledge_assets_update on public.knowledge_assets for update to authenticated using (public.is_space_member(space_id) and (public.can_manage_space(space_id) or uploaded_by = auth.uid())) with check (public.is_space_member(space_id) and (public.can_manage_space(space_id) or uploaded_by = auth.uid()));
create policy knowledge_assets_delete on public.knowledge_assets for delete to authenticated using (public.is_space_member(space_id) and (public.can_manage_space(space_id) or uploaded_by = auth.uid()));

create policy questions_select on public.knowledge_questions for select to authenticated using (public.is_space_member(space_id));
create policy questions_insert on public.knowledge_questions for insert to authenticated with check (author_id = auth.uid() and public.is_space_member(space_id));
create policy questions_update on public.knowledge_questions for update to authenticated using (public.is_space_member(space_id) and (author_id = auth.uid() or public.can_manage_space(space_id))) with check (public.is_space_member(space_id) and (author_id = auth.uid() or public.can_manage_space(space_id)));
create policy questions_delete on public.knowledge_questions for delete to authenticated using (public.is_space_member(space_id) and (author_id = auth.uid() or public.can_manage_space(space_id)));

create policy answers_select on public.question_answers for select to authenticated using (exists (select 1 from public.knowledge_questions q where q.id = question_id and public.is_space_member(q.space_id)));
create policy answers_insert on public.question_answers for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from public.knowledge_questions q where q.id = question_id and public.is_space_member(q.space_id)));
create policy answers_update on public.question_answers for update to authenticated using (
  exists (
    select 1 from public.knowledge_questions q
    where q.id = question_id
      and public.is_space_member(q.space_id)
      and (author_id = auth.uid() or public.can_manage_space(q.space_id) or public.current_workspace_role() = 'Reviewer')
  )
) with check (
  exists (
    select 1 from public.knowledge_questions q
    where q.id = question_id
      and public.is_space_member(q.space_id)
      and (author_id = auth.uid() or public.can_manage_space(q.space_id) or public.current_workspace_role() = 'Reviewer')
  )
);
create policy answers_delete on public.question_answers for delete to authenticated using (author_id = auth.uid() or (public.is_workspace_admin() and exists (select 1 from public.knowledge_questions q where q.id = question_id and public.is_space_member(q.space_id))));

create policy question_votes_self on public.question_votes for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.knowledge_questions q where q.id = question_id and public.is_space_member(q.space_id))) with check (user_id = auth.uid() and exists (select 1 from public.knowledge_questions q where q.id = question_id and public.is_space_member(q.space_id)));
create policy answer_votes_self on public.answer_votes for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.question_answers a join public.knowledge_questions q on q.id = a.question_id where a.id = answer_id and public.is_space_member(q.space_id))) with check (user_id = auth.uid() and exists (select 1 from public.question_answers a join public.knowledge_questions q on q.id = a.question_id where a.id = answer_id and public.is_space_member(q.space_id)));

create policy taxonomy_terms_select on public.taxonomy_terms for select to authenticated using (true);
create policy taxonomy_terms_manage on public.taxonomy_terms for all to authenticated using (public.current_workspace_role() in ('Super Admin', 'Space Admin')) with check (public.current_workspace_role() in ('Super Admin', 'Space Admin'));
create policy article_taxonomy_select on public.article_taxonomy_terms for select to authenticated using (exists (select 1 from public.articles a where a.id = article_id and public.is_space_member(a.space_id)));
create policy article_taxonomy_manage on public.article_taxonomy_terms for all to authenticated using (exists (select 1 from public.articles a where a.id = article_id and (public.can_manage_space(a.space_id) or a.owner_id = auth.uid()))) with check (exists (select 1 from public.articles a where a.id = article_id and (public.can_manage_space(a.space_id) or a.owner_id = auth.uid())));

create policy knowledge_models_select on public.knowledge_models for select to authenticated using (true);
create policy knowledge_models_manage on public.knowledge_models for all to authenticated using (public.current_workspace_role() in ('Super Admin', 'Space Admin', 'Author')) with check (public.current_workspace_role() in ('Super Admin', 'Space Admin', 'Author'));
create policy integrations_admin_all on public.knowledge_integrations for all to authenticated using (public.current_workspace_role() in ('Super Admin', 'Space Admin')) with check (public.current_workspace_role() in ('Super Admin', 'Space Admin'));
create policy integration_logs_admin_select on public.integration_sync_logs for select to authenticated using (public.current_workspace_role() in ('Super Admin', 'Space Admin'));
create policy integration_logs_admin_insert on public.integration_sync_logs for insert to authenticated with check (public.current_workspace_role() in ('Super Admin', 'Space Admin'));

create policy audit_events_admin_select on public.audit_events for select to authenticated using (public.current_workspace_role() in ('Super Admin', 'Space Admin'));
create policy audit_events_insert_actor on public.audit_events for insert to authenticated with check (actor_id = auth.uid());
create policy search_queries_insert_self on public.search_queries for insert to authenticated with check (user_id = auth.uid());
create policy search_queries_admin_select on public.search_queries for select to authenticated using (public.current_workspace_role() in ('Super Admin', 'Space Admin'));
create policy workspace_settings_select on public.workspace_settings for select to authenticated using (true);
create policy workspace_settings_manage on public.workspace_settings for all to authenticated using (public.is_workspace_admin()) with check (public.is_workspace_admin());

create policy knowledge_chunks_select on public.knowledge_chunks for select to authenticated using (public.is_space_member(space_id));
create policy knowledge_chunks_manage on public.knowledge_chunks for all to authenticated using (public.is_space_member(space_id) and (public.can_manage_space(space_id) or public.current_workspace_role() = 'Author')) with check (public.is_space_member(space_id) and (public.can_manage_space(space_id) or public.current_workspace_role() = 'Author'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('knowledge-assets', 'knowledge-assets', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = 104857600;

create policy knowledge_objects_select on storage.objects for select to authenticated using (
  bucket_id = 'knowledge-assets'
  and exists (
    select 1 from public.spaces s
    where s.slug = (storage.foldername(name))[1]
      and public.is_space_member(s.id)
  )
);

create policy knowledge_objects_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'knowledge-assets'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.spaces s
    where s.slug = (storage.foldername(name))[1]
      and public.is_space_member(s.id)
  )
);

create policy knowledge_objects_update on storage.objects for update to authenticated using (
  bucket_id = 'knowledge-assets'
  and ((storage.foldername(name))[2] = auth.uid()::text or public.is_workspace_admin())
) with check (
  bucket_id = 'knowledge-assets'
  and ((storage.foldername(name))[2] = auth.uid()::text or public.is_workspace_admin())
);

create policy knowledge_objects_delete on storage.objects for delete to authenticated using (
  bucket_id = 'knowledge-assets'
  and ((storage.foldername(name))[2] = auth.uid()::text or public.is_workspace_admin())
);
