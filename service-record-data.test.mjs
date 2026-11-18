import test from 'node:test';import assert from 'node:assert/strict';
import {SERVICE_RECORD_COLUMNS,TRAVEL_COLUMNS,makeServiceRecord} from './service-record-data.mjs';
test('fixed Service Record schema is not inferred from films or shots',()=>{
 assert.equal(SERVICE_RECORD_COLUMNS.length,16);assert.equal(TRAVEL_COLUMNS.length,10);
 const bon={id:'work1',data:{bonnummer:'W1',klant:'Test BV',ordernummer:'123',datum:'2026-11-18',starttijd:'08:00',eindtijd:'12:00'}};
 const row=makeServiceRecord({bon,opnames:[{bon_id:'work1'},{bon_id:'work1'}],fields:{inspector:'Jan',filmCount:'',stdHours:'4'}});
 assert.equal(row.shotCount,2);assert.equal(row.rows[0].filmCount,'');assert.equal(row.rows[0].std,'4');
 assert.equal(row.header.client,'Test BV');assert.equal(row.header.purchaseOrder,'123');
});
test('travel auto-fill needs a confirmed arrival',()=>{
 const bon={id:'w',data:{datum:'2026-11-18'}};
 const partial=makeServiceRecord({bon,travel:{departed_at:'2026-11-18T08:00:00Z'}});
 assert.equal(partial.travelRows[0].hours,'');
 const done=makeServiceRecord({bon,travel:{departed_at:'2026-11-18T08:00:00Z',arrived_at:'2026-11-18T09:30:00Z'}});
 assert.equal(done.travelRows[0].hours,'1,5');
});
