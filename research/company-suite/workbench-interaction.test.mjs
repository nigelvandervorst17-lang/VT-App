import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountResearchWorkbench} from './workbench-ui.mjs';

function makePage(){
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const ids=[...new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]))];
 const elements=Object.fromEntries(ids.map(id=>[id,{
  id,value:'',textContent:'',hidden:false,checked:false,disabled:false,
  style:{},listeners:{},attributes:{},children:[],
  classList:{toggle(){}},
  addEventListener(kind,callback){this.listeners[kind]=callback},
  setAttribute(name,value){this.attributes[name]=value},
  replaceChildren(...nodes){
   this.children=nodes;this.value=nodes[0]?.value??'';
  },
  append(node){this.children.push(node)},
  scrollIntoView(){}
 }]));
 const workbench=[...html.matchAll(/<button[^>]*data-workbench="([^"]+)"/g)]
  .map(([_,value])=>({
   dataset:{workbench:value},attributes:{},listeners:{},
   addEventListener(type,fn){this.listeners[type]=fn},
   setAttribute(k,v){this.attributes[k]=v}
  }));
 const materials=[...html.matchAll(/<button[^>]*data-field-material="([^"]+)"/g)]
  .map(([_,value])=>({
   dataset:{fieldMaterial:value},attributes:{},listeners:{},
   addEventListener(type,fn){this.listeners[type]=fn},
   setAttribute(k,v){this.attributes[k]=v}
  }));
 const panes=['gamma','xray','pipe','iqi','material'].map(kind=>elements['calc-'+kind]);
 const doc={
  getElementById(id){return elements[id]??null},
  createElement(tag){return {tag,value:'',textContent:''}},
  querySelectorAll(selector){
   if(selector==='[data-workbench]')return workbench;
   if(selector==='[data-field-material]')return materials;
   if(selector==='.workbench-module')return panes;
   throw Error('Unexpected selector: '+selector);
  },
  querySelector(selector){
   if(selector==='[data-tab="field"]')return {click(){}};
   return null;
  }
 };
 const storageMap=new Map(),storage={
  getItem:key=>storageMap.get(key)??null,
  setItem:(key,value)=>storageMap.set(key,value)
 };
 // Form select values that browser sets automatically on loading HTML.
 elements.gIsotope.value='Se-75';elements.gFilm.value='D4';
 elements.pipeClass.value='B';elements.qClass.value='B';
 elements.qTechnique.value='sw';elements.qSide.value='source';
 elements.qIsotope.value='Se-75';elements.wmMode.value='gamma';
 return {doc,elements,workbench,materials,storage};
}

test('Guest starts with 50 and login gate is reached on the fiftieth successful calculation',()=>{
 const page=makePage(),prior=globalThis.document;
 globalThis.document=page.doc;
 try{
  let logins=0;
  const mounted=mountResearchWorkbench({
   storage:page.storage,isAuthenticated:()=>false,
   onLogin(){logins++}
  });
  assert.equal(mounted.status().remaining,50);
  assert.match(page.elements.trialCounterLabel.textContent,/nog 50 van 50/);
  assert.equal(page.elements.trialGate.hidden,true);
  const submit=page.elements.researchWorkbenchForm.listeners.submit;
  assert.equal(typeof submit,'function');
  const event={preventDefault(){}};
  page.elements.gThickness.value='-1';
  submit(event);
  assert.equal(mounted.status().remaining,50,'invalid input is not charged');
  page.elements.gThickness.value='12';
  for(let n=1;n<=49;n++){
   submit(event);
   assert.equal(mounted.status().remaining,50-n);
  }
  assert.equal(logins,0);
  submit(event);
  assert.equal(mounted.status().remaining,0);
  assert.equal(page.elements.trialGate.hidden,false);
  assert.equal(page.elements.workbenchCompute.disabled,true);
  assert.equal(logins,1,'automatic login trigger after 50');
  assert.match(page.elements.trialCounterLabel.textContent,/nog 0 van 50/);
  submit(event);
  assert.equal(mounted.status().remaining,0);
  assert.equal(logins,2,'attempt after limit opens login rather than calculating');
  page.elements.trialGateLoginBtn.listeners.click();
  assert.equal(logins,3);
  assert.equal(page.workbench.length,5);
  assert.equal(page.materials.length,5);
 }finally{globalThis.document=prior}
});
test('An authenticated session bypasses the local guest limit without resetting it',()=>{
 const page=makePage(),prior=globalThis.document;
 globalThis.document=page.doc;
 try{
  let loggedIn=false;
  const mounted=mountResearchWorkbench({
   storage:page.storage,isAuthenticated:()=>loggedIn
  });
  for(let n=0;n<50;n++)mounted.status().remaining&&page.elements.researchWorkbenchForm.listeners.submit({preventDefault(){}});
  assert.equal(mounted.status().remaining,0);
  loggedIn=true;mounted.refresh();
  assert.equal(page.elements.trialGate.hidden,true);
  assert.equal(page.elements.workbenchCompute.disabled,false);
  assert.match(page.elements.trialCounterLabel.textContent,/Ingelogd/);
  loggedIn=false;mounted.refresh();
  assert.equal(mounted.status().remaining,0);
 }finally{globalThis.document=prior}
});
test('Mobile workbench navigation exposes five modules with visible panels',()=>{
 const page=makePage(),prior=globalThis.document;
 globalThis.document=page.doc;
 try{
  const mounted=mountResearchWorkbench({storage:page.storage});
  for(const kind of ['gamma','xray','pipe','iqi','material']){
   mounted.setKind(kind);
   assert.equal(page.elements['calc-'+kind].hidden,false);
   assert.equal(page.workbench.filter(x=>x.attributes['aria-pressed']==='true').length,1);
  }
  const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
  assert.match(css,/@media\(max-width:660px\)/);
  assert.match(css,/\.module-buttons/);
 }finally{globalThis.document=prior}
});
