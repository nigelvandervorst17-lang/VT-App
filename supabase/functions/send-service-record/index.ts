// Deno Edge Function: deploy only after setting RESEND_API_KEY,
// SERVICE_RECORD_WORK_EMAIL, SERVICE_RECORD_FROM_EMAIL, SERVICE_RECORD_ALLOWED_ORIGIN.
// Secrets, recipient and service-role key must NEVER be sent to browser or git.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const env=(name:string)=>Deno.env.get(name)||'';
const json=(data:Record<string,unknown>,status=200,origin='')=>
 new Response(JSON.stringify(data),{status,headers:{
  'content-type':'application/json','cache-control':'no-store',
  ...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})
 }});
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',allowed=env('SERVICE_RECORD_ALLOWED_ORIGIN');
 const corsOrigin=origin===allowed?origin:'';
 if(req.method==='OPTIONS'){
  if(!corsOrigin)return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{
   'access-control-allow-origin':corsOrigin,'access-control-allow-methods':'POST, OPTIONS',
   'access-control-allow-headers':'apikey,authorization,content-type',
   'access-control-max-age':'300','vary':'Origin'
  }});
 }
 if(req.method!=='POST')return json({error:'Method not allowed'},405,corsOrigin);
 if(origin&&!corsOrigin)return json({error:'Origin not permitted'},403);
 const required=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY','SERVICE_RECORD_WORK_EMAIL','SERVICE_RECORD_FROM_EMAIL',
  'SERVICE_RECORD_ALLOWED_ORIGIN'];
 if(required.some(k=>!env(k)))return json({error:'Mailserver nog niet ingesteld.'},503,corsOrigin);
 const bearer=/^Bearer (.+)$/.exec(req.headers.get('authorization')||'');
 if(!bearer)return json({error:'Authenticatie vereist'},401,corsOrigin);
 let input;
 try{input=await req.json();}catch{return json({error:'Ongeldig JSON-verzoek'},400,corsOrigin);}
 const bonId=String(input?.bon_id||'');
 const pdfBase64=String(input?.pdf_base64||'');
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(bonId)||
  pdfBase64.length<140||pdfBase64.length>5600000||!/^[A-Za-z0-9+/]+={0,2}$/.test(pdfBase64))
  return json({error:'Ongeldig Service Record bestand of werkbon'},400,corsOrigin);
 let bytes:Uint8Array;
 try{bytes=Uint8Array.from(atob(pdfBase64),c=>c.charCodeAt(0));}
 catch{return json({error:'Ongeldige bestandsinhoud'},400,corsOrigin);}
 const magic=new TextDecoder().decode(bytes.slice(0,5));
 if(magic!=='%PDF-'||bytes.length>4200000)
  return json({error:'Een geldige PDF van maximaal 4,2 MB is vereist.'},400,corsOrigin);
 const userClient=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),
  {auth:{persistSession:false}});
 const {data:{user},error:authError}=await userClient.auth.getUser(bearer[1]);
 if(authError||!user)return json({error:'Onbekende of verlopen sessie'},401,corsOrigin);
 const admin=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),
  {auth:{persistSession:false}});
 const {data:member,error:memberError}=await admin.from('planning_members')
  .select('role').eq('user_id',user.id).maybeSingle();
 if(memberError||!member||!['planning','researcher'].includes(member.role))
  return json({error:'Geen planningsrechten'},403,corsOrigin);
 const {data:bon,error:bonError}=await admin.from('planning_workbonnen')
  .select('id,assigned_to,data').eq('id',bonId).maybeSingle();
 if(bonError||!bon)return json({error:'Werkbon niet gevonden'},404,corsOrigin);
 if(member.role==='researcher'&&bon.assigned_to!==user.id)
  return json({error:'Werkbon niet aan jou toegewezen'},403,corsOrigin);
 const sha=await crypto.subtle.digest('SHA-256',bytes);
 const hex=[...new Uint8Array(sha)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const num=String(bon.data?.bonnummer||bon.id).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,60);
 const sent=await fetch('https://api.resend.com/emails',{
  method:'POST',headers:{
   'authorization':'Bearer '+env('RESEND_API_KEY'),'content-type':'application/json',
   'idempotency-key':'service-record-'+bon.id+'-'+hex
  },body:JSON.stringify({
   from:env('SERVICE_RECORD_FROM_EMAIL'),to:[env('SERVICE_RECORD_WORK_EMAIL')],
   subject:'Service Record '+num,
   text:'Service Record voor werkbon '+num+'. Ingevuld en door de klant op het scherm getekend. Controleer vóór administratieve verwerking.',
   attachments:[{filename:'Service_Record_'+num+'.pdf',content:pdfBase64}]
  })
 });
 if(!sent.ok){
  // Do not expose provider response or secrets.
  return json({error:'E-mailprovider heeft de verzending niet bevestigd.'},502,corsOrigin);
 }
 const receipt=await sent.json().catch(()=>({}));
 return json({sent:true,message_id:String(receipt.id||'')},200,corsOrigin);
});
