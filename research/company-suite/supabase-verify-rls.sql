-- Non-destructive staging verification for NDT/Supabase. Run in SQL Editor.
-- SECURITY NOTE: checks schema/GRANT/RLS setup, NOT an end-to-end real-user audit.
with required(table_name) as (
 values ('companies'),('company_members'),('join_requests'),
        ('company_tubes'),('company_sources'),
        ('company_procedures'),('exposure_logs')
),
rls as (
 select r.table_name,
   coalesce(c.relrowsecurity,false) as rls_enabled,
   (select count(*) from pg_policies p where p.schemaname='public'
      and p.tablename=r.table_name) as policy_count
 from required r
 left join pg_class c on c.relname=r.table_name
   and c.relnamespace='public'::regnamespace
)
select 'RLS '||table_name as check_name,
 (rls_enabled and policy_count>0) as passes
from rls
union all
select 'Company code column hidden from authenticated',
 not has_column_privilege('authenticated','public.companies','company_code','SELECT')
union all
select 'Company name selectable by authenticated',
 has_column_privilege('authenticated','public.companies','name','SELECT')
union all
select 'Invite-code RPC denied to anon',
 not has_function_privilege('anon','public.get_company_invite_code(uuid)','EXECUTE')
union all
select 'Staff-revocation RPC denied to anon',
 not has_function_privilege('anon','public.set_staff_membership_active(uuid,uuid,boolean)','EXECUTE')
union all
select 'Staff-revocation RPC available with personal JWT',
 has_function_privilege('authenticated','public.set_staff_membership_active(uuid,uuid,boolean)','EXECUTE')
order by check_name;
