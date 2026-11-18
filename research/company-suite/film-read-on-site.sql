-- Staging-only until reviewed; company admin can manage the film-on-site flag.
begin;
alter table public.companies add column if not exists film_read_on_site boolean not null default true;
create or replace function public.set_company_film_read_on_site(p_company_id uuid,p_enabled boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_company_admin(p_company_id) then
  raise exception 'Only an active company administrator can change this';
 end if;
 if p_enabled is null then raise exception 'Invalid setting';end if;
 update public.companies set film_read_on_site=p_enabled where id=p_company_id;
 if not found then raise exception 'Unknown company';end if;
 return true;
end $$;
revoke all on function public.set_company_film_read_on_site(uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_company_film_read_on_site(uuid,boolean) to authenticated;
commit;
