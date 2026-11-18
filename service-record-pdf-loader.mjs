/** Pinned PDF utility loaded only when the user exports a record. */
let pending=null;
export async function loadPdfLib(){
 if(globalThis.PDFLib?.PDFDocument)return globalThis.PDFLib;
 if(pending)return pending;
 pending=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
  script.crossOrigin='anonymous';
  script.onload=()=>globalThis.PDFLib?.PDFDocument?resolve(globalThis.PDFLib):reject(Error('PDF-module niet beschikbaar.'));
  script.onerror=()=>reject(Error('PDF-module niet geladen. Controleer internet.'));
  document.head.append(script);
 }).catch(e=>{pending=null;throw e;});
 return pending;
}
