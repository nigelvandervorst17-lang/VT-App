/**
 * Private company / Planning exposure-chart DOCUMENT LIBRARY.
 * Critical safety boundary: images/PDFs are NEVER registered as exposure curves,
 * interpolated, digitized, or automatically used by the RT calculator.
 * Entirely separate from owner-only private Naslag.
 */
import {createSupabaseConnection,PUBLIC_CONFIG_KEY} from './research/company-suite/supabase-rest.mjs';
import {DEFAULT_SUPABASE_PROJECT} from './research/company-suite/project-config.mjs';
const $=id=>document.getElementById(id);
const BUCKET='ndt-company-chart-library';
const types=Object.freeze({'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','image/webp':'webp'});
const MAX_BYTES=12000000;
const state={api:null,user:null,planner:false,companyAdmins:[],companyNames:[],charts:[],
 busy:false,previewUrl:null};
const text=(id,value)=>{if($(id))$(id).textContent=String(value??'');};
function notice(value,error=false){
 text('companyChartsStatus',value);
 if($('companyChartsStatus'))$('companyChartsStatus').dataset.error=String(error);
}
function config(){
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem(PUBLIC_CONFIG_KEY)||'null');}catch{}
 return saved?.url&&saved?.key?saved:DEFAULT_SUPABASE_PROJECT;
}
function element(tag,cls,textContent){
 const result=document.createElement(tag);if(cls)result.className=cls;
 if(textContent!==undefined)result.textContent=String(textContent);return result;
}
function authorizedScopes(){
 return [
  ...(state.planner?[{id:'',name:'Planning · gedeelde bedrijfsgrafieken'}]:[]),
  ...state.companyAdmins.map(m=>({
   id:m.company_id,
   name:state.companyNames.find(c=>c.id===m.company_id)?.name||'Bedrijf '+m.company_id.slice(0,8)
  }))
 ];
}
function clear(){
 state.api=null;state.user=null;state.planner=false;state.companyAdmins=[];
 state.companyNames=[];state.charts=[];render();
}
async function auth(){
 if(!navigator.onLine)throw Error('Privégrafieken vereisen internet. De onderzoeksrekenmachine blijft offline beschikbaar.');
 const api=createSupabaseConnection(config());
 if(!api.restore())throw Error('Log eerst in om bedrijfsgrafieken te bekijken.');
 const user=await api.user();if(!user?.id)throw Error('Gebruiker niet geverifieerd.');
 const [plan,company,companies]=await Promise.all([
  api.select('planning_members',{filters:{user_id:user.id}}),
  api.select('company_members',{filters:{user_id:user.id}}),
  api.select('companies')
 ]);
 state.api=api;state.user=user;
 state.planner=plan?.some(x=>x.role==='planning'&&x.user_id===user.id)||false;
 state.companyAdmins=(company||[]).filter(x=>x.user_id===user.id&&x.active&&x.role==='admin');
 state.companyNames=companies||[];
}
async function refresh(){
 if(state.busy)return;state.busy=true;
 try{
  await auth();
  state.charts=await state.api.select('ndt_company_charts',{order:'created_at.desc'})||[];
  notice('Privé-naslag. Deze bestanden zijn geen gevalideerde belichtingscurves en beïnvloeden nooit de berekening.');
 }catch(e){
  clear();notice(String(e?.message||e),true);
 }finally{state.busy=false;render();}
}
function render(){
 const scopes=authorizedScopes(),canUpload=scopes.length>0;
 $('companyChartsUploadPanel').hidden=!canUpload;
 const picker=$('companyChartScope');picker.replaceChildren();
 for(const s of scopes)picker.add(new Option(s.name,s.id));
 const box=$('companyChartsList');box.replaceChildren();
 const ready=state.charts.filter(x=>x.file_status==='ready');
 if(!ready.length){box.append(element('p','small-muted','Nog geen privébedrijfsgrafieken beschikbaar.'));return;}
 for(const chart of ready){
  const card=element('div','company-chart-row');
  card.append(element('strong','',chart.title),
   element('small','',(chart.device||'Toestel niet opgegeven')+' · Rev. '+(chart.revision||'—')),
   element('small','',chart.company_id?
    'Bedrijf · '+(state.companyNames.find(c=>c.id===chart.company_id)?.name||'eigen bedrijf'):
    'Planning · gedeeld met toegewezen onderzoekers'),
   element('small','',chart.note||'NASLAG ALLEEN · niet gevalideerd'));
  const button=element('button','outline-button','Privégrafiek bekijken');
  button.type='button';button.addEventListener('click',()=>void preview(chart));
  card.append(button);box.append(card);
 }
}
async function storage(path,{method='GET',file=null}={}){
 if(!state.api||!state.user)throw Error('Geen ingelogde gebruiker.');
 await state.api.user(); // Auth adapter handles access token refresh.
 const token=state.api.token();
 if(!token)throw Error('Je beveiligde sessie is verlopen.');
 const uri=state.api.root+'/storage/v1/object/'+(method==='GET'?'authenticated/':'')+
  BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');
 const response=await fetch(uri,{
  method,headers:{
   apikey:config().key,Authorization:'Bearer '+token,
   ...(file?{'Content-Type':file.type,'x-upsert':'false'}:{})
  },...(file?{body:file}:{})
 });
 if(!response.ok){
  const obj=await response.json().catch(()=>({}));
  throw Error(obj.message||obj.error||'Privébestand niet beschikbaar (HTTP '+response.status+').');
 }
 return response;
}
async function upload(event){
 event.preventDefault();if(state.busy||!state.api)return;
 const file=$('companyChartFile').files?.[0];
 if(!file||!Object.hasOwn(types,file.type)||file.size>MAX_BYTES||file.size===0){
  notice('Gebruik uitsluitend PDF, JPG, PNG of WEBP (maximaal 12 MB).',true);return;
 }
 const title=$('companyChartTitle').value.trim();
 if(!title||title.length>120){notice('Geef de grafiek een duidelijke naam.',true);return;}
 const selected=$('companyChartScope').value||null;
 if(!authorizedScopes().some(c=>(c.id||null)===selected)){
  notice('Geen rechten voor deze bedrijfsmap.',true);return;
 }
 state.busy=true;$('companyChartUpload').disabled=true;
 try{
  const id=crypto.randomUUID(),path=id+'/'+crypto.randomUUID()+'.'+types[file.type];
  const rows=await state.api.insert('ndt_company_charts',{
   id,created_by:state.user.id,company_id:selected,title,
   device:$('companyChartDevice').value.trim().slice(0,120)||null,
   revision:$('companyChartRevision').value.trim().slice(0,40)||null,
   note:$('companyChartNote').value.trim().slice(0,500)||null,
   file_path:path,file_status:'pending'
  });
  if(!rows?.length)throw Error('Grafiekregistratie werd niet bevestigd door de server.');
  // Privacy: upload directly to a private RLS bucket, never GitHub or public URLs.
  await storage(path,{method:'POST',file});
  const ready=await state.api.update('ndt_company_charts',id,{file_status:'ready',updated_at:new Date().toISOString()});
  if(!ready?.length)throw Error('Bestand geüpload, maar nog niet gepubliceerd in de privébibliotheek.');
  $('companyChartsUploadForm').reset();
  notice('Privégrafiek opgeslagen. Alleen zichtbaar voor bevoegde Planning/bedrijfsleden; nooit gebruikt als rekenreferentie.');
  state.charts=await state.api.select('ndt_company_charts',{order:'created_at.desc'})||[];
 }catch(e){notice('Upload mislukt: '+String(e?.message||e),true);}
 finally{state.busy=false;$('companyChartUpload').disabled=false;render();}
}
function closePreview(){
 if(state.previewUrl){URL.revokeObjectURL(state.previewUrl);state.previewUrl=null;}
 $('companyChartImage').hidden=true;$('companyChartImage').removeAttribute('src');
 $('companyChartPdf').hidden=true;$('companyChartPdf').removeAttribute('src');
 $('companyChartDownload').removeAttribute('href');
}
async function preview(chart){
 const dialog=$('companyChartPreview');
 closePreview();dialog.showModal();
 text('companyChartPreviewHeading',chart.title);
 text('companyChartPreviewStatus','Privébestand ophalen…');
 try{
  if(!state.api||chart.file_status!=='ready')throw Error('Geen beschikbare grafiek.');
  const r=await storage(chart.file_path);
  const blob=await r.blob();
  const url=URL.createObjectURL(blob);state.previewUrl=url;
  const pdf=blob.type==='application/pdf'||/\.pdf$/i.test(chart.file_path);
  const target=$(pdf?'companyChartPdf':'companyChartImage');
  target.src=url;target.hidden=false;
  const download=$('companyChartDownload');download.href=url;
  download.download='NDT-Bedrijfsgrafiek-'+chart.id+(pdf?'.pdf':'.'+(types[blob.type]||'png'));
  text('companyChartPreviewStatus','NASLAG ALLEEN · controleer herkomst, as-schaal en geldende procedure. Geen RT-vrijgave.');
 }catch(e){text('companyChartPreviewStatus','Privébestand niet beschikbaar: '+String(e?.message||e));}
}
function init(){
 if(!$('companyChartsList'))return;
 $('companyChartsRefresh')?.addEventListener('click',()=>void refresh());
 $('companyChartsUploadForm')?.addEventListener('submit',upload);
 $('companyChartClose')?.addEventListener('click',()=>$('companyChartPreview').close());
 $('companyChartPreview')?.addEventListener('close',closePreview);
 // The existing curve page is untouched. These images never enter app.mjs curves.
 document.querySelectorAll('[data-nav="curves"]').forEach(b=>b.addEventListener('click',()=>void refresh()));
 window.addEventListener('ndt-auth-scope-changed',clear);
 window.addEventListener('offline',clear);
 render();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
