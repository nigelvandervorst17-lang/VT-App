import {loadPdfLib} from './service-record-pdf-loader.mjs';
/** Positions in PDF points, measured against the one-page 842 x 595 landscape template. */
const WORK_ROW_Y=477.5,ROW_H=11.4,TRAVEL_Y=175.5,TRAVEL_H=10.9;
async function ensureBlankTemplate(bytes){
 const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
 const doc=await pdfjs.getDocument({data:new Uint8Array(bytes.slice(0))}).promise;
 try{
  if(doc.numPages!==1)throw Error('Het Service Record-sjabloon moet één pagina hebben.');
  const p=await doc.getPage(1),txt=await p.getTextContent();
  // Reject date-bearing populated work rows; never overlay a completed customer record.
  if(txt.items.some(i=>/^\d{2}-\d{2}-\d{2}$/.test(String(i.str||'').trim())
    &&i.transform?.[5]>210&&i.transform?.[5]<500))
   throw Error('Dit PDF-bestand heeft al ingevulde werkregels. Selecteer het LEGE Service Record-sjabloon.');
 }finally{await doc.destroy();}
}
export async function generateServiceRecordPdf(template,record,signaturePng){
 if(!(template instanceof File))throw Error('Kies eerst een leeg Service Record-PDF.');
 if(template.size>6000000)throw Error('Het sjabloon is te groot (maximaal 6 MB).');
 const bytes=await template.arrayBuffer();
 await ensureBlankTemplate(bytes);
 const {PDFDocument,StandardFonts,rgb}=await loadPdfLib();
 const pdf=await PDFDocument.load(bytes),page=pdf.getPage(0);
 if(Math.abs(page.getWidth()-841.68)>4||Math.abs(page.getHeight()-595.2)>4)
  throw Error('Onjuiste Service Record-afmetingen. Verwacht liggend A4.');
 const font=await pdf.embedFont(StandardFonts.Helvetica),ink=rgb(0.05,0.12,0.18);
 function write(x,y,value,w=90,size=6.4){
  let s=String(value??'').trim().replace(/[\r\n\t]+/g,' ').replace(/[^\x20-\xFF]/g,'?');
  if(!s)return;
  while(s&&font.widthOfTextAtSize(s,size)>w)s=s.slice(0,-1);
  if(s)page.drawText(s,{x,y,size,font,color:ink});
 }
 const h=record.header||{};
 write(76,540,h.nd,70,8);write(259,551,h.office,98);write(444,551,h.reportNo,380);
 write(140,524,h.client,205);write(391,524,h.location,110);write(76,514,h.week,17);
 write(706,508,h.purchaseOrder,115);
 for(const [idx,row] of (record.rows||[]).slice(0,23).entries()){
  const y=WORK_ROW_Y-ROW_H*idx;
  for(const [x,key,w] of [[44,'date',31],[76,'inspector',61],[140,'day',20],
   [160,'start',25],[190,'end',25],[218,'description',110],[334,'overnight',26],
   [370,'code',18],[395,'std',17],[420,'ovtL',17],[446,'ovtH',17],
   [471,'breakHours',17],[497,'film',92],[601,'filmCount',14],
   [614,'item',87],[706,'remarks',108]])
   write(x,y,row[key],w,6.2);
 }
 const sums={std:0,ovtL:0,ovtH:0,breakHours:0};
 for(const row of record.rows||[])for(const k of Object.keys(sums)){
  const num=Number(String(row[k]??'').replace(',','.'));
  if(Number.isFinite(num)&&num>=0)sums[k]+=num;
 }
 for(const [x,k] of [[394,'std'],[419,'ovtL'],[445,'ovtH'],[472,'breakHours']])
  if((record.rows||[]).some(row=>String(row[k]||'').trim()))write(x,215,sums[k].toLocaleString('nl-NL',{maximumFractionDigits:2}),18,6.2);
 for(const [idx,row] of (record.travelRows||[]).slice(0,13).entries()){
  const y=TRAVEL_Y-TRAVEL_H*idx;
  for(const [x,key,w] of [[44,'date',31],[76,'inspector',61],[140,'day',20],
   [160,'beforeStart',25],[189,'beforeEnd',25],[219,'afterStart',25],
   [248,'afterEnd',25],[276,'remarks',108],[394,'hours',22],[422,'km',18]])
   write(x,y,row[key],w,6.1);
 }
 const first=(record.travelRows||[])[0];
 if(first?.hours)write(395,43.5,first.hours,24,6.2);
 if(first?.km)write(424,43.5,first.km,19,6.2);
 write(445,164,record.preparedBy,140,7);
 write(470,99,record.preparedDate,72,6.4);
 write(634,99,record.clientDate,80,6.4);
 write(445,199,record.generalRemarks,380,6.1);
 if(!signaturePng)throw Error('Handtekening klant ontbreekt.');
 const image=await pdf.embedPng(signaturePng);
 const dims=image.scaleToFit(170,42);
 page.drawImage(image,{x:620,y:115,width:dims.width,height:dims.height});
 return pdf.save();
}
