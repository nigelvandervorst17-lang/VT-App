import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './src/index.mjs';

const ORIGIN='https://nigelvandervorst17-lang.github.io';
const conf={ALLOWED_ORIGIN:ORIGIN, TURNSTILE_HOSTNAME:'nigelvandervorst17-lang.github.io',
  TURNSTILE_SECRET:'test-secret',GEMINI_API_KEY:'test-key',GEMINI_MODEL:'gemini-2.5-flash',
  AI_LIMITER:{async limit(){return {success:true};}}};
const makeRequest = (payload,origin=ORIGIN) => new Request('https://basic-rt-pro-ai.example.workers.dev/chat',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)});
const payload={question:'Welke filmfouten zijn mogelijk?',turnstileToken:'valid-token',
  context:{film:'D4',appCalculation:{status:'ONDERZOEK'}},history:[]};

test('rejects foreign origins without contacting provider',async()=>{
  const response=await worker.fetch(makeRequest(payload,'https://evil.example'),conf);
  assert.equal(response.status,403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
});
test('fails closed if no secrets or limiter',async()=>{
  const response=await worker.fetch(makeRequest(payload),{...conf,GEMINI_API_KEY:''});
  assert.equal(response.status,503);
});
test('CORS preflight only for allowed origin',async()=>{
  const response=await worker.fetch(new Request('https://x.workers.dev/chat',{method:'OPTIONS',headers:{Origin:ORIGIN}}),conf);
  assert.equal(response.status,204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),ORIGIN);
});
test('validates Turnstile, sends grounded prompt, returns plain text',async()=>{
  let requests=0;
  const saved=globalThis.fetch;
  globalThis.fetch=async (url,options)=>{
    requests++;
    if(url.includes('/siteverify')){
      assert.equal(new URLSearchParams(options.body).get('secret'),'test-secret');
      return Response.json({success:true,hostname:'nigelvandervorst17-lang.github.io'});
    }
    assert.equal(options.headers['x-goog-api-key'],'test-key');
    const body=JSON.parse(options.body);
    assert.equal(body.contents.at(-1).role,'user');
    assert.match(body.systemInstruction.parts[0].text,/GEEN definitieve afzettingsafstand/);
    assert.match(body.contents.at(-1).parts[0].text,/ONDERZOEK/);
    return Response.json({candidates:[{content:{parts:[{text:'Mogelijke filmfout: controleer de verwerking.'}]}}]});
  };
  try{
    const response=await worker.fetch(makeRequest(payload),conf);
    assert.equal(response.status,200);
    assert.equal((await response.json()).answer,'Mogelijke filmfout: controleer de verwerking.');
    assert.equal(requests,2);
  }finally{globalThis.fetch=saved;}
});
test('rejects Turnstile hostname mismatch',async()=>{
  const saved=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({success:true,hostname:'other.github.io'});
  try{
    const response=await worker.fetch(makeRequest(payload),conf);
    assert.equal(response.status,403);
  }finally{globalThis.fetch=saved;}
});
test('does not allow an empty question',async()=>{
  const response=await worker.fetch(makeRequest({...payload,question:'  '}),conf);
  assert.equal(response.status,400);
});
test('enforces rate limiter',async()=>{
  const response=await worker.fetch(makeRequest(payload),{...conf,AI_LIMITER:{async limit(){return {success:false};}}});
  assert.equal(response.status,429);
});
