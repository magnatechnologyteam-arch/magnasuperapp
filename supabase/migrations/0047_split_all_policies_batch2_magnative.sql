-- Tahap 45 lanjutan, batch 2: magnative_clients, magnative_content_posts,
-- magnative_project_costs, magnative_projects. Lihat penjelasan lengkap di
-- 0046_split_all_policies_batch1.sql.
begin;

-- magnative_clients (3 policy lama: akses divisi ALL, select siapa saja
-- yang login, select investor — ketiganya dipertahankan sebagai union di
-- policy select baru, insert/update/delete tetap cuma untuk divisi Magnativ)
create policy magnative_clients_select on public.magnative_clients
  for select to authenticated
  using (
    can_access_division('magnative'::text)
    or ((select auth.uid()) is not null)
    or current_user_is_investor()
  );
create policy magnative_clients_insert on public.magnative_clients
  for insert to authenticated
  with check (can_access_division('magnative'::text));
create policy magnative_clients_update on public.magnative_clients
  for update to authenticated
  using (can_access_division('magnative'::text))
  with check (can_access_division('magnative'::text));
create policy magnative_clients_delete on public.magnative_clients
  for delete to authenticated
  using (can_access_division('magnative'::text));
drop policy magnative_clients_access on public.magnative_clients;
drop policy magnative_clients_select_any_authenticated on public.magnative_clients;
drop policy magnative_clients_select_investor on public.magnative_clients;

-- magnative_content_posts
create policy magnative_content_posts_select on public.magnative_content_posts
  for select to authenticated
  using (can_access_division('magnative'::text) or current_user_is_investor());
create policy magnative_content_posts_insert on public.magnative_content_posts
  for insert to authenticated
  with check (can_access_division('magnative'::text));
create policy magnative_content_posts_update on public.magnative_content_posts
  for update to authenticated
  using (can_access_division('magnative'::text))
  with check (can_access_division('magnative'::text));
create policy magnative_content_posts_delete on public.magnative_content_posts
  for delete to authenticated
  using (can_access_division('magnative'::text));
drop policy magnative_content_posts_access on public.magnative_content_posts;
drop policy magnative_content_posts_select_investor on public.magnative_content_posts;

-- magnative_project_costs
create policy magnative_project_costs_select on public.magnative_project_costs
  for select to authenticated
  using (can_access_division('magnative'::text) or current_user_is_investor());
create policy magnative_project_costs_insert on public.magnative_project_costs
  for insert to authenticated
  with check (can_access_division('magnative'::text));
create policy magnative_project_costs_update on public.magnative_project_costs
  for update to authenticated
  using (can_access_division('magnative'::text))
  with check (can_access_division('magnative'::text));
create policy magnative_project_costs_delete on public.magnative_project_costs
  for delete to authenticated
  using (can_access_division('magnative'::text));
drop policy magnative_project_costs_access on public.magnative_project_costs;
drop policy magnative_project_costs_select_investor on public.magnative_project_costs;

-- magnative_projects
create policy magnative_projects_select on public.magnative_projects
  for select to authenticated
  using (can_access_division('magnative'::text) or current_user_is_investor());
create policy magnative_projects_insert on public.magnative_projects
  for insert to authenticated
  with check (can_access_division('magnative'::text));
create policy magnative_projects_update on public.magnative_projects
  for update to authenticated
  using (can_access_division('magnative'::text))
  with check (can_access_division('magnative'::text));
create policy magnative_projects_delete on public.magnative_projects
  for delete to authenticated
  using (can_access_division('magnative'::text));
drop policy magnative_projects_access on public.magnative_projects;
drop policy magnative_projects_select_investor on public.magnative_projects;

commit;
