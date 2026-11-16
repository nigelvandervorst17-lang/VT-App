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
