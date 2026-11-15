// Minimal declarations for offline core typecheck; installed packages supply detailed types.
declare module 'pdfjs-dist' {
 export const GlobalWorkerOptions: {workerSrc:string};
 export function getDocument(options:{data:Uint8Array;isEvalSupported?:boolean}):{
  promise:Promise<{numPages:number;getPage(n:number):Promise<{getTextContent():Promise<{items:Array<{str?:string;hasEOL?:boolean;transform?:number[]}>}>}>}>;
  destroy():Promise<void>;
 };
}
declare module 'mammoth' {
 export interface ExtractResult{value:string;messages:{message:string}[]}
 export function extractRawText(arg:{arrayBuffer:ArrayBuffer}):Promise<ExtractResult>;
 const api:{extractRawText:typeof extractRawText};
 export default api;
}
