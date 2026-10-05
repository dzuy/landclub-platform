import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {MemberInfoAutosave} from '../src/lib/member-info-autosave';
const initial={displayName:'Avery',homeRegion:'',contactPhone:''};
test('member autosave debounces edits and saves when closing before the debounce',async()=>{
 const saved:typeof initial[]=[];const saver=new MemberInfoAutosave(initial,async info=>{saved.push(info);return {message:'Saved'};},15);
 try{saver.edit({...initial,displayName:'A'});saver.edit({...initial,displayName:'Avery Morgan'});await delay(50);assert.equal(saved.length,1);assert.equal(saved[0].displayName,'Avery Morgan');saver.edit({...saver.getSnapshot().info,homeRegion:'Costa Rica'});assert.equal(await saver.flush(),true);assert.equal(saved[1].homeRegion,'Costa Rica');assert.equal(saver.dirty,false);}finally{saver.cancel();}
});
test('member autosave serializes slow requests and preserves text entered during saving',async()=>{
 let release!:(result:{message:string})=>void;const first=new Promise<{message:string}>(resolve=>{release=resolve;});
 const saved:typeof initial[]=[];const saver=new MemberInfoAutosave(initial,async info=>{saved.push(info);return saved.length===1?first:{message:'Saved'};},10000);
 try{saver.edit({...initial,displayName:'First'});const saving=saver.flush();await delay(0);saver.edit({...initial,displayName:'Latest'});const closing=saver.flush();assert.equal(saved.length,1);release({message:'Saved'});assert.equal(await saving,true);assert.equal(await closing,true);assert.deepEqual(saved.map(i=>i.displayName),['First','Latest']);assert.equal(saver.getSnapshot().info.displayName,'Latest');assert.equal(saver.dirty,false);}finally{saver.cancel();}
});
test('failed saves retain edits, cancel queued retries, and block closing until retried',async()=>{
 let release!:(result:{error:string})=>void;const first=new Promise<{error:string}>(resolve=>{release=resolve;});let calls=0;
 const saver=new MemberInfoAutosave(initial,async()=>{calls++;return calls===1?first:{message:'Saved'};},15);
 try{saver.edit({...initial,displayName:'First'});const saving=saver.flush();await delay(0);saver.edit({...initial,displayName:'Latest'});release({error:'Unable to save'});assert.equal(await saving,false);await delay(35);assert.equal(calls,1);assert.equal(saver.getSnapshot().info.displayName,'Latest');assert.equal(saver.dirty,true);assert.equal(await saver.flush(),true);assert.equal(saver.dirty,false);}finally{saver.cancel();}
});
