/** Administrative mapping of the supplied 2026 SERVICE RECORD rev.26-7.
 * Never guess film consumption, service hours, film lengths, inspection approval or RT release.
 */
export const SERVICE_RECORD_COLUMNS=Object.freeze([
'Date','Name inspector','Day','Start hh:mm','End hh:mm','Description',
'Overnight/Offshore','Code','STD Hours','OVT L Hours','OVT H Hours','Break Hours',
'Films, Weld Rates & Specials','#','Inspected Items','PO no. / remarks'
]);
export const TRAVEL_COLUMNS=Object.freeze([
'Date','Name inspector','Day','Before Start','Before End','After Start','After End','Remarks','Travel hours','KM'
]);
const raw=v=>String(v??'').trim();
const time=(s)=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw(s))?raw(s):'';
const dat=(d)=>/^\d{4}-\d\d-\d\d$/.test(raw(d))?raw(d).slice(8,10)+'-'+raw(d).slice(5,7)+'-'+raw(d).slice(2,4):'';
const weekday=d=>/^\d{4}-\d\d-\d\d$/.test(raw(d))?
 ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d+'T12:00:00Z').getUTCDay()]:'';
const amsterdamTime=iso=>{
 const ms=Date.parse(raw(iso));if(!Number.isFinite(ms))return '';
 return new Intl.DateTimeFormat('nl-NL',{timeZone:'Europe/Amsterdam',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms));
};
export function isoWeek(date){
 const d=new Date(raw(date)+'T12:00:00Z');if(!Number.isFinite(d.getTime()))return '';
 d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
 const start=new Date(Date.UTC(d.getUTCFullYear(),0,1));
 return String(Math.ceil((((d-start)/86400000)+1)/7));
}
export function makeServiceRecord({bon,opnames=[],travel=null,fields={}}){
 if(!bon||typeof bon!=='object')throw Error('Kies eerst een werkbon.');
 const data=bon.data||bon,date=raw(data.datum);
 const f=k=>raw(fields[k]),logs=Array.isArray(opnames)?opnames.filter(x=>x.bon_id===bon.id):[];
 const row={
  date:dat(date),inspector:f('inspector'),day:weekday(date),
  start:time(data.starttijd),end:time(data.eindtijd),description:f('description'),
  overnight:f('overnight'),code:f('serviceCode'),
  std:f('stdHours'),ovtL:f('ovtLHours'),ovtH:f('ovtHHours'),breakHours:f('breakHours'),
  film:f('filmDescription'),filmCount:f('filmCount'),item:f('inspectedItems'),remarks:f('rowRemarks')
 };
 const t=travel?.departed_at&&travel?.arrived_at?Math.max(0,Math.round((Date.parse(travel.arrived_at)-Date.parse(travel.departed_at))/60000)):null;
 const hours=t===null||!Number.isFinite(t)?'':(Math.round(t/6)/10).toLocaleString('nl-NL',{maximumFractionDigits:1});
 const travelRow={
  date:dat(date),inspector:f('inspector'),day:weekday(date),
  beforeStart:travel?.departed_at?amsterdamTime(travel.departed_at):'',
  beforeEnd:travel?.arrived_at?amsterdamTime(travel.arrived_at):'',
  afterStart:time(f('afterStart')),afterEnd:time(f('afterEnd')),
  remarks:f('travelRemarks'),hours,km:f('km')
 };
 return {
  header:{client:raw(data.klant),location:f('serviceLocation'),office:f('office'),
   reportNo:f('reportNo'),nd:f('nd'),week:isoWeek(date),
   purchaseOrder:raw(data.ordernummer),bonnummer:raw(data.bonnummer)},
  rows:[row],travelRows:[travelRow],shotCount:logs.length,
  generalRemarks:f('generalRemarks'),preparedBy:f('inspector'),
  preparedDate:dat(date),clientDate:raw(fields.signatureDate)||dat(date)
 };
}
