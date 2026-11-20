drop policy if exists "anon read settings" on public.settings;
drop policy if exists "read settings" on public.settings;
create policy "active read settings" on public.settings for select to authenticated
  using (id = 1 and public.is_active(auth.uid()));
revoke select on public.settings from anon;

create or replace function public.get_favicon()
returns text language sql stable security definer set search_path = public
as $$ select favicon_url from public.settings where id = 1 $$;
grant execute on function public.get_favicon() to anon, authenticated;

drop policy if exists "public read site assets" on storage.objects;