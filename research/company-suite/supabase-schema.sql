-- NDT Radiography Pro — Supabase Auth + company RLS (RESEARCH/STAGING ONLY)
-- Run once in a NEW, EMPTY Supabase development project, SQL Editor.
-- Does NOT certify exposure calculations. Back up before rerunning on real data.
-- Personal Supabase Auth accounts remain required; the company code is ONLY a join-request secret.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table if not exists public.companies (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name)) between 2 and 160),
 company_code text not null unique default encode(extensions.gen_random_bytes(16),'hex'),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.company_members (
 company_id uuid not null references public.companies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','staff')),
 display_name text not null check(length(btrim(display_name)) between 2 and 160),
 certificate_code text,
 active boolean not null default true,
 approved_by uuid references auth.users(id),
 joined_at timestamptz not null default now(),
 primary key(company_id,user_id)
);
create index if not exists members_user_idx on public.company_members(user_id);
create table if not exists public.join_requests (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null,
 certificate_code text,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 requested_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 unique(company_id,user_id)
);
create index if not exists join_requests_company_idx on public.join_requests(company_id,status);

-- "Approved" here is an ADMINISTRATIVE company-record state, not RT calibration release.
create table if not exists public.company_tubes (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,
 manufacturer text,
 model text,
 serial_reference text, -- use an internal document reference; avoid real SN in public GitHub
 generator_type text check(generator_type in ('CONSTANT_POTENTIAL','HALF_WAVE')),
 beam_type text check(beam_type in ('RICHTSTRALER','RONDSTRALER')),
 max_kv numeric check(max_kv>0),
 max_ma numeric check(max_ma>0),
 focal_spot_mm numeric check(focal_spot_mm>0),
 research_factor numeric not null default 1 check(research_factor>0),
 data jsonb not null default '{}'::jsonb,
 approval_status text not null default 'draft' check(approval_status in ('draft','approved','archived')),
 approval_reference text,
 updated_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id),
 constraint tube_approved_needs_reference check(approval_status<>'approved' or length(btrim(coalesce(approval_reference,'')))>=3)
);
create index if not exists tubes_company_status_idx on public.company_tubes(company_id,approval_status);
create table if not exists public.company_sources (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,
 isotope text not null check(isotope in ('Se-75','Ir-192')),
 activity_ci numeric not null check(activity_ci>0),
 activity_reference_at timestamptz not null,
 source_reference text,
 data jsonb not null default '{}'::jsonb,
 approval_status text not null default 'draft' check(approval_status in ('draft','approved','archived')),
 approval_reference text,
 updated_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id),
 constraint source_approved_needs_reference check(approval_status<>'approved' or length(btrim(coalesce(approval_reference,'')))>=3)
);
create index if not exists sources_company_status_idx on public.company_sources(company_id,approval_status);
create table if not exists public.company_procedures (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,
 revision text not null,
 procedure_reference text,
 data jsonb not null default '{}'::jsonb,
 approval_status text not null default 'draft' check(approval_status in ('draft','approved','archived')),
 approval_reference text,
 updated_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id),
 constraint procedure_approved_needs_reference check(approval_status<>'approved' or length(btrim(coalesce(approval_reference,'')))>=3)
);
create index if not exists procedures_company_status_idx on public.company_procedures(company_id,approval_status);
create table if not exists public.exposure_logs (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null unique,
 company_id uuid not null references public.companies(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 status text not null default 'draft' check(status in ('draft','submitted','reviewed')),
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists logs_company_created_idx on public.exposure_logs(company_id,created_at desc);

-- Private owner-executed membership checks prevent policy recursion.
create or replace function private.is_company_member(p_company uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(
  select 1 from public.company_members m
  where m.company_id=p_company and m.user_id=(select auth.uid()) and m.active
 )
$$;
create or replace function private.is_company_admin(p_company uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(
  select 1 from public.company_members m
  where m.company_id=p_company and m.user_id=(select auth.uid())
    and m.active and m.role='admin'
 )
$$;
revoke all on function private.is_company_member(uuid) from public,anon;
revoke all on function private.is_company_admin(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.is_company_member(uuid) to authenticated;
grant execute on function private.is_company_admin(uuid) to authenticated;

-- Company creation: only caller can become the first admin.
create or replace function public.register_company(p_name text,p_admin_name text)
returns table(company_id uuid,company_code text)
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_code text; v_actor uuid;
begin
 v_actor:=auth.uid();
 if v_actor is null then raise exception 'Authentication required'; end if;
 if length(btrim(coalesce(p_name,''))) not between 2 and 160 or
    length(btrim(coalesce(p_admin_name,''))) not between 2 and 160 then
    raise exception 'Invalid company/admin name';
 end if;
 insert into public.companies(name,created_by)
 values(btrim(p_name),v_actor) returning id,companies.company_code into v_id,v_code;
 insert into public.company_members(company_id,user_id,role,display_name,approved_by)
 values(v_id,v_actor,'admin',btrim(p_admin_name),v_actor);
 company_id:=v_id;company_code:=v_code;return next;
end $$;
-- Staff with a company code can only REQUEST membership.
create or replace function public.request_company_join(
 p_company_code text,p_display_name text,p_certificate_code text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_company uuid;v_actor uuid;
begin
 v_actor:=auth.uid();
 if v_actor is null then raise exception 'Authentication required'; end if;
 if length(btrim(coalesce(p_display_name,''))) not between 2 and 160 then
   raise exception 'Invalid display name';
 end if;
 if p_company_code is null or p_company_code !~ '^[a-fA-F0-9]{32}$' then
   raise exception 'Invalid company code';
 end if;
 select c.id into v_company from public.companies c
 where c.company_code=lower(p_company_code);
 if v_company is null then raise exception 'Company code not found'; end if;
 if exists(select 1 from public.company_members m where
   m.company_id=v_company and m.user_id=v_actor and m.active)
 then raise exception 'Already a company member';end if;
 insert into public.join_requests(company_id,user_id,display_name,certificate_code)
 values(v_company,v_actor,btrim(p_display_name),nullif(btrim(p_certificate_code),''))
 on conflict(company_id,user_id) do update
 set display_name=excluded.display_name,certificate_code=excluded.certificate_code,
 status='pending',requested_at=now(),reviewed_at=null,reviewed_by=null;
 return v_company;
end $$;
-- Only an existing admin of the request's company can approve it.
create or replace function public.approve_company_join(p_request_id uuid,p_approve boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_req public.join_requests%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into v_req from public.join_requests where id=p_request_id for update;
 if not found then raise exception 'Request not found'; end if;
 if not private.is_company_admin(v_req.company_id) then
   raise exception 'Permission denied';end if;
 if v_req.status<>'pending' then raise exception 'Request already processed';end if;
 if p_approve then
  insert into public.company_members
   (company_id,user_id,role,display_name,certificate_code,approved_by)
  values(v_req.company_id,v_req.user_id,'staff',v_req.display_name,
         v_req.certificate_code,auth.uid())
  on conflict(company_id,user_id) do nothing;
 end if;
 update public.join_requests set status=case when p_approve then 'approved' else 'rejected' end,
 reviewed_by=auth.uid(),reviewed_at=now()
 where id=p_request_id;
end $$;
revoke all on function public.register_company(text,text) from public,anon;
revoke all on function public.request_company_join(text,text,text) from public,anon;
revoke all on function public.approve_company_join(uuid,boolean) from public,anon;
grant execute on function public.register_company(text,text) to authenticated;
grant execute on function public.request_company_join(text,text,text) to authenticated;
grant execute on function public.approve_company_join(uuid,boolean) to authenticated;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.company_tubes enable row level security;
alter table public.company_sources enable row level security;
alter table public.company_procedures enable row level security;
alter table public.exposure_logs enable row level security;

drop policy if exists companies_read on public.companies;
create policy companies_read on public.companies for select to authenticated
using ((select private.is_company_member(id)));
drop policy if exists members_read on public.company_members;
create policy members_read on public.company_members for select to authenticated
using (user_id=(select auth.uid()) or (select private.is_company_admin(company_id)));
drop policy if exists requests_read on public.join_requests;
create policy requests_read on public.join_requests for select to authenticated
using (user_id=(select auth.uid()) or (select private.is_company_admin(company_id)));

-- Administrators can see drafts; staff can see approved records ONLY within their company.
drop policy if exists tubes_read on public.company_tubes;
create policy tubes_read on public.company_tubes for select to authenticated
using ((select private.is_company_admin(company_id)) or
 (approval_status='approved' and (select private.is_company_member(company_id))));
drop policy if exists tubes_insert on public.company_tubes;
create policy tubes_insert on public.company_tubes for insert to authenticated
with check ((select private.is_company_admin(company_id)) and created_by=(select auth.uid()));
drop policy if exists tubes_update on public.company_tubes;
create policy tubes_update on public.company_tubes for update to authenticated
using ((select private.is_company_admin(company_id)))
with check ((select private.is_company_admin(company_id)));

drop policy if exists sources_read on public.company_sources;
create policy sources_read on public.company_sources for select to authenticated
using ((select private.is_company_admin(company_id)) or
 (approval_status='approved' and (select private.is_company_member(company_id))));
drop policy if exists sources_insert on public.company_sources;
create policy sources_insert on public.company_sources for insert to authenticated
with check ((select private.is_company_admin(company_id)) and created_by=(select auth.uid()));
drop policy if exists sources_update on public.company_sources;
create policy sources_update on public.company_sources for update to authenticated
using ((select private.is_company_admin(company_id)))
with check ((select private.is_company_admin(company_id)));

drop policy if exists procedures_read on public.company_procedures;
create policy procedures_read on public.company_procedures for select to authenticated
using ((select private.is_company_admin(company_id)) or
 (approval_status='approved' and (select private.is_company_member(company_id))));
drop policy if exists procedures_insert on public.company_procedures;
create policy procedures_insert on public.company_procedures for insert to authenticated
with check ((select private.is_company_admin(company_id)) and created_by=(select auth.uid()));
drop policy if exists procedures_update on public.company_procedures;
create policy procedures_update on public.company_procedures for update to authenticated
using ((select private.is_company_admin(company_id)))
with check ((select private.is_company_admin(company_id)));

drop policy if exists logs_read on public.exposure_logs;
create policy logs_read on public.exposure_logs for select to authenticated
using ((select private.is_company_admin(company_id)) or
 ((select private.is_company_member(company_id)) and created_by=(select auth.uid())));
drop policy if exists logs_staff_insert on public.exposure_logs;
create policy logs_staff_insert on public.exposure_logs for insert to authenticated
with check ((select private.is_company_member(company_id))
 and created_by=(select auth.uid()) and status='draft');
drop policy if exists logs_staff_update on public.exposure_logs;
create policy logs_staff_update on public.exposure_logs for update to authenticated
using ((select private.is_company_member(company_id))
 and created_by=(select auth.uid()) and status='draft')
with check ((select private.is_company_member(company_id))
 and created_by=(select auth.uid()) and status='draft');
-- Staff can never approve their own log; no DELETE grant on any dataset.

revoke all on public.companies,public.company_members,public.join_requests,
 public.company_tubes,public.company_sources,public.company_procedures,
 public.exposure_logs from anon;
grant select on public.companies,public.company_members,public.join_requests to authenticated;
grant select,insert,update on public.company_tubes,public.company_sources,
 public.company_procedures,public.exposure_logs to authenticated;

-- Privacy/operations: enable Auth email confirmation + redirect allowlist,
-- configure rate limits, MFA and backups separately in Supabase dashboard.
-- This SQL doesn't deploy itself or establish a connection to a Supabase project.


-- Integrated fresh-install hardening (staging baseline v2)
-- NDT Radiography Pro / Basic NDT — non-destructive v2 security and administration
-- Apply AFTER supabase-schema.sql v1. No existing company records are deleted.
-- AUTH: only an active company admin can see invite codes or activate/deactivate staff.
-- Run via apply_migration; append this content to the one-click starter script.

-- Keep the company code out of staff-readable company rows. The table-level
-- SELECT privilege must be revoked before granting explicitly safe columns.
revoke select on table public.companies from authenticated;
grant select(id,name,created_by,created_at) on table public.companies to authenticated;

create or replace function public.get_company_invite_code(p_company uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_code text;
begin
 if auth.uid() is null or not private.is_company_admin(p_company) then
   raise exception 'Permission denied';
 end if;
 select c.company_code into v_code
 from public.companies c where c.id=p_company;
 if v_code is null then raise exception 'Company not found'; end if;
 return v_code;
end $$;

create or replace function public.set_staff_membership_active(
 p_company uuid,p_staff uuid,p_active boolean
) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_company_admin(p_company) then
   raise exception 'Permission denied';
 end if;
 if p_staff is null or p_active is null then raise exception 'Invalid input'; end if;
 update public.company_members m set active=p_active
 where m.company_id=p_company and m.user_id=p_staff and m.role='staff';
 if not found then raise exception 'Staff member not found'; end if;
end $$;

-- The app deliberately uses only the two RPCs above for sensitive operations.
revoke all on function public.get_company_invite_code(uuid) from PUBLIC,anon;
revoke all on function public.set_staff_membership_active(uuid,uuid,boolean) from PUBLIC,anon;
grant execute on function public.get_company_invite_code(uuid) to authenticated;
grant execute on function public.set_staff_membership_active(uuid,uuid,boolean) to authenticated;

-- No additional table write grants; the previously installed RLS remains.
