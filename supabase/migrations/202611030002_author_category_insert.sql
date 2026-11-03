drop policy if exists categories_insert_author on public.categories;

create policy categories_insert_author
  on public.categories for insert to authenticated
  with check (
    public.current_workspace_role() in ('Author', 'Reviewer')
    and public.is_space_member(space_id)
  );
