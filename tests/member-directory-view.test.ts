import test from 'node:test';
import assert from 'node:assert/strict';
import {memberDirectoryView,type DirectoryMember,type MemberColumn} from '../src/lib/member-directory-view';

const rows:DirectoryMember[]=[
 {id:'a',name:'Zoe',email:'a@example.com',roles:['owner'],status:'active',joinedAt:'2026-01-01',lastActiveAt:'2026-09-01',roleTarget:{kind:'user',id:'a'},rolesLocked:false,propertyIds:['north','south']},
 {id:'b',name:'Amy',email:'z@example.com',roles:['member','investor'],status:'invited',joinedAt:'2026-03-01',lastActiveAt:null,roleTarget:{kind:'invitation',id:'b'},rolesLocked:false,propertyIds:['south']},
 {id:'c',name:'Ben',email:'b@example.com',roles:['admin'],status:'draft',joinedAt:'2026-02-01',lastActiveAt:'2026-08-01',roleTarget:{kind:'prepared',id:'c'},rolesLocked:false,propertyIds:[]},
];
const empty={search:'',properties:[],roles:[],statuses:[]};
const sort={column:'name' as const,direction:'asc' as const};
test('directory combines case-insensitive name/email search with OR selections within each filter and AND across filters',()=>{
 assert.deepEqual(memberDirectoryView(rows,{search:'  AMY   example ',properties:['north','south'],roles:['owner','investor'],statuses:['invited','draft']},sort).map(row=>row.id),['b']);
 assert.deepEqual(memberDirectoryView(rows,{...empty,properties:['north','south']},sort).map(row=>row.id),['b','a']);
 assert.deepEqual(memberDirectoryView(rows,{...empty,roles:['admin'],statuses:['active']},sort),[]);
 assert.equal(memberDirectoryView(rows,empty,sort).length,3);
});
test('every column sorts in both directions and activity uses dates with Never last',()=>{
 const expected:Record<MemberColumn,string[]>={name:['b','c','a'],email:['a','c','b'],roles:['c','b','a'],status:['a','c','b'],lastActiveAt:['c','a','b'],joinedAt:['a','c','b'],actions:['a','c','b']};
 for(const column of Object.keys(expected) as MemberColumn[]){
  assert.deepEqual(memberDirectoryView(rows,empty,{column,direction:'asc'}).map(row=>row.id),expected[column],column);
  const descending=memberDirectoryView(rows,empty,{column,direction:'desc'}).map(row=>row.id);
  if(column==='lastActiveAt')assert.deepEqual(descending,['a','c','b']);
  else if(column==='actions')assert.deepEqual(descending,['b','a','c']);
  else assert.deepEqual(descending,[...expected[column]].reverse(),column);
 }
 assert.deepEqual(rows.map(row=>row.id),['a','b','c']);
});
