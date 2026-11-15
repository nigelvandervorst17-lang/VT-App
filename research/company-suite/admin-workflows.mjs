/**
 * Server-backed administration of company records.
 * UI role checks are only ergonomics: real permission comes from Supabase RLS.
 * "approved" is administrative, never validated radiation-exposure authority.
 */
export const ASSET_TABLES=Object.freeze([
 'company_tubes','company_sources','company_procedures'
]);
const SAFE_COLUMNS=Object.freeze({
 company_tubes:new Set(['name','manufacturer','model','serial_reference',
  'generator_type','beam_type','max_kv','max_ma','focal_spot_mm','data',
  'approval_status','approval_reference']),
 company_sources:new Set(['name','isotope','activity_ci','activity_reference_at',
  'source_reference','data','approval_status','approval_reference']),
 company_procedures:new Set(['name','revision','procedure_reference','data',
  'approval_status','approval_reference'])
});
export function assertAdminContext({api,member,userId,online}){
 if(!api||!userId||!member?.company_id||member.role!=='admin'||online!==true)
   throw Error('Beheer vereist een online, goedgekeurd Hoofdgebruiker-account');
 return member.company_id;
}
export function validateAdministrativeApproval(data){
 if(!data||!['draft','approved','archived'].includes(data.approval_status))
   throw Error('Ongeldige administratieve status');
 if(data.approval_status==='approved'&&String(data.approval_reference??'').trim().length<3)
   throw Error('Bij administratieve goedkeuring is een dossierreferentie nodig');
 return true;
}
export async function saveCompanyAsset({
 api,member,userId,online,table,data,recordId=null
}){
 const companyId=assertAdminContext({api,member,userId,online});
 if(!ASSET_TABLES.includes(table))throw Error('Niet-toegestane beheerresource');
 if(!data||Object.keys(data).some(key=>!SAFE_COLUMNS[table].has(key)))
   throw Error('Record bevat niet-toegestane of beveiligde velden');
 validateAdministrativeApproval(data);
 if(!String(data.name??'').trim())throw Error('Naam ontbreekt');
 let rows;
 if(recordId){
  if(!/^[0-9a-f-]{36}$/i.test(recordId))throw Error('Ongeldig record-ID');
  // The client cannot choose company_id or created_by on update.
  rows=await api.update(table,recordId,{
   ...data,updated_at:new Date().toISOString()
  });
 }else{
  rows=await api.insert(table,{
   ...data,company_id:companyId,created_by:userId
  });
 }
 if(!Array.isArray(rows)||rows.length!==1
    ||rows[0].company_id!==companyId)
   throw Error('Supabase heeft de wijziging niet bevestigd (RLS of conflict)');
 return rows[0];
}
export async function loadAdminInviteCode({api,member,userId,online}){
 const companyId=assertAdminContext({api,member,userId,online});
 const code=await api.rpc('get_company_invite_code',{p_company:companyId});
 if(typeof code!=='string'||!/^[0-9a-f]{32}$/i.test(code))
   throw Error('Geen geldige bedrijfscode ontvangen');
 return code;
}
export async function setStaffActive({api,member,userId,online,staffId,active}){
 const companyId=assertAdminContext({api,member,userId,online});
 if(!/^[0-9a-f-]{36}$/i.test(staffId)||typeof active!=='boolean')
   throw Error('Ongeldige medewerkerscontrole');
 await api.rpc('set_staff_membership_active',{
  p_company:companyId,p_staff:staffId,p_active:active
 });
 return true;
}
export async function fetchCompanyLogs({api,member,userId,online}){
 if(!api||!member?.company_id||!userId||!online)
   throw Error('Het gedeelde logboek vereist een actieve online sessie');
 // Staff sees only their own rows thanks to RLS; admin sees company-wide.
 const rows=await api.select('exposure_logs',{
  filters:{company_id:member.company_id},order:'created_at.desc'
 });
 if(!Array.isArray(rows))throw Error('Geen loglijst ontvangen');
 if(rows.some(row=>row.company_id!==member.company_id))
   throw Error('Ongeldige serverrespons: ander bedrijf');
 return rows;
}
