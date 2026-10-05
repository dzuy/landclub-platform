import test from 'node:test';
import assert from 'node:assert/strict';
import {homeEvents,homePropertyPhoto} from '../src/lib/member-home';
import {readDraft} from '../src/lib/schema';
import seeds from '../src/lib/seed-properties.json';
import type {ClubEvent} from '../src/lib/events';
const event=(id:string,date:string,patch:Partial<ClubEvent['details']>={}):ClubEvent=>({id,version:1,details:{title:'Club gathering',description:'Meet the club.',location:'Town hall',startsAt:date+'T10:00:00Z',endsAt:date+'T12:00:00Z',timeZone:'UTC',meetingUrl:'',status:'scheduled',...patch}});
test('Home uses the selected cover, then gallery or imported image, without stock demo imagery',()=>{
 const p={...readDraft(seeds[0]),isDemo:false,hero:'',gallery:[],media:[{id:'photo',kind:'image' as const,role:'gallery' as const,url:'/api/property-photos/imported',alt:'Imported property photo',caption:'',state:'Actual' as const}]};
 assert.equal(homePropertyPhoto(p)?.src,'/api/property-photos/imported');
 assert.equal(homePropertyPhoto({...p,gallery:[{src:'/gallery.jpg',alt:'Gallery',caption:'',type:'Current property'}]})?.src,'/gallery.jpg');
 assert.equal(homePropertyPhoto({...p,hero:'/cover.jpg'})?.src,'/cover.jpg');
 assert.equal(homePropertyPhoto({...p,media:[]}),null);
 assert.equal(homePropertyPhoto(readDraft(seeds[0])),null);
 assert.equal(homePropertyPhoto({...p,isDemo:true,hero:'/api/property-photos/selected'})?.src,'/api/property-photos/selected');
});
test('Home shows next three real scheduled events, excluding cancelled, archived, past and explicit sample content',()=>{
 const rows=[event('late','2026-11-10'),event('past','2026-09-01'),event('first','2026-10-06'),event('cancelled','2026-10-07',{status:'cancelled'}),event('archived','2026-10-07',{status:'archived'}),event('sample','2026-10-07',{location:'Fictional test venue'}),event('third','2026-10-09'),event('second','2026-10-08')];
 assert.deepEqual(homeEvents(rows,Date.parse('2026-10-05T12:00:00Z')).map(e=>e.id),['first','second','third']);
 assert.deepEqual(homeEvents([],Date.now()),[]);
});
