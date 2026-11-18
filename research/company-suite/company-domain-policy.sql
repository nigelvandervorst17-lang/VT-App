-- PR #24: staging-first. Back up database. Duplicate domains abort transaction.
begin;
create schema if not exists private;
create or replace function private.is_business_domain(p_domain text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(lower(p_domain) ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?([.][a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
 and lower(p_domain) not in ('gmail.com','googlemail.com','hotmail.com','hotmail.nl','hotmail.co.uk','outlook.com','outlook.nl','live.com','live.nl','msn.com','yahoo.com','yahoo.nl','yahoo.co.uk','ymail.com','aol.com','icloud.com','me.com','mac.com','proton.me','protonmail.com','gmx.com','gmx.de','mail.com','zoho.com','yandex.com','hey.com','fastmail.com','tutanota.com','tuta.io','qq.com','163.com'),false)
$$;
revoke all on function private.is_business_domain(text) from public,anon,authenticated;
alter table public.companies add column if not exists company_domain text;
update public.companies c set company_domain=lower(split_part(u.email,'@',2))
 from auth.users u where u.id=c.created_by and c.company_domain is null;
do $$ begin
 if exists(select 1 from public.companies where company_domain is null or not private.is_business_domain(company_domain))
 then raise exception 'Existing company without valid business domain';end if;
 if exists(select company_domain from public.companies group by company_domain having count(*)>1)
 then raise exception 'Duplicate existing company domain';end if;
end $$;
create unique index if not exists companies_one_environment_per_domain on public.companies(company_domain);
alter table public.companies alter column company_domain set not null;
create or replace function public.register_company(p_name text,p_admin_name text)
returns table(company_id uuid,company_code text)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_code text;v_actor uuid;v_domain text;v_email text;v_confirmed boolean;
begin
 v_actor:=auth.uid();
 if v_actor is null then raise exception 'Authentication required';end if;
 select lower(btrim(u.email)),u.email_confirmed_at is not null into v_email,v_confirmed
 from auth.users u where u.id=v_actor;
 v_domain:=split_part(coalesce(v_email,''),'@',2);
 if not coalesce(v_confirmed,false) or not private.is_business_domain(v_domain)
 then raise exception 'Confirmed business email required';end if;
 if length(btrim(coalesce(p_name,''))) not between 2 and 160
 or length(btrim(coalesce(p_admin_name,''))) not between 2 and 160
 then raise exception 'Invalid company/admin name';end if;
 insert into public.companies(name,created_by,company_domain)
 values(btrim(p_name),v_actor,v_domain)
 returning id,companies.company_code into v_id,v_code;
 insert into public.company_members(company_id,user_id,role,display_name,approved_by)
 values(v_id,v_actor,'admin',btrim(p_admin_name),v_actor);
 company_id:=v_id;company_code:=v_code;return next;
end $$;
revoke all on function public.register_company(text,text) from public,anon;
grant execute on function public.register_company(text,text) to authenticated;
commit;
-- Enable email confirmation in Supabase Auth before production.
