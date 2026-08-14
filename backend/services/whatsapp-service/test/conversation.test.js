const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizePhone}=require('../src/services/utils');
const {resolveChoiceFromList}=require('../src/services/conversation');

test('normalizes Indian WhatsApp numbers',()=>{
  assert.equal(normalizePhone('919876543210'),'9876543210');
  assert.equal(normalizePhone('+91 98765 43210'),'9876543210');
  assert.equal(normalizePhone('9876543210'),'9876543210');
});

test('accepts a valid boarding or dropping choice by number or stop name',()=>{
  const stops=[{id:'BOARD1',name:'Pune'},{id:'BOARD2',name:'Nagpur'}];
  assert.equal(resolveChoiceFromList('1',stops,'BOARD').name,'Pune');
  assert.equal(resolveChoiceFromList('Pune',stops,'BOARD').name,'Pune');
  assert.equal(resolveChoiceFromList('BOARD2',stops,'BOARD').name,'Nagpur');
});
