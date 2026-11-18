import test from 'node:test';import assert from 'node:assert/strict';
import {businessEmailDomain} from './company-domain.mjs';
test('free email blocked',()=>{for(const email of ['a@gmail.com','b@Hotmail.nl','a@outlook.com','a@icloud.com'])assert.equal(businessEmailDomain(email),null);});
test('business domain normalized and validated',()=>{assert.equal(businessEmailDomain(' Employee@Example-BV.nl '),'example-bv.nl');for(const bad of ['','x','a@localhost','a@@example.com','a@-company.nl'])assert.equal(businessEmailDomain(bad),null);});
