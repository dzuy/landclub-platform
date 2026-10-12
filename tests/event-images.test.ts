import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {saveEventImage} from '../src/lib/event-images';
import {localPhotoStorage} from '../src/lib/photo-object-storage';
import {eventSchema} from '../src/lib/events';
test('event images validate real image bytes and store a normalized cover',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'event-image-'));const previous=process.env.PHOTO_STORAGE_DIR,backend=process.env.PHOTO_STORAGE_BACKEND;
 process.env.PHOTO_STORAGE_DIR=root;process.env.PHOTO_STORAGE_BACKEND='local';
 try{await assert.rejects(()=>saveEventImage(Buffer.from('not an image')));
 const input=await sharp({create:{width:1800,height:1200,channels:3,background:'#334422'}}).png().toBuffer();
 const url=await saveEventImage(input);const saved=await localPhotoStorage(root).get(url.replace('/api/event-images/',''));const info=await sharp(saved).metadata();assert.equal(info.format,'webp');assert.ok(info.width!<=1600);assert.ok(info.height!<=1000);
 const details={title:'Gathering',description:'Dinner',startsAt:'2026-12-01T18:00:00Z',endsAt:'2026-12-01T19:00:00Z',timeZone:'UTC',location:'Club',meetingUrl:'',status:'scheduled',imageUrl:url,imageAlt:'Outdoor dinner'};
 assert.equal(eventSchema.parse(details).imageUrl,url);assert.equal(eventSchema.safeParse({...details,imageUrl:'https://external.example/image'}).success,false);
 }finally{if(previous===undefined)delete process.env.PHOTO_STORAGE_DIR;else process.env.PHOTO_STORAGE_DIR=previous;if(backend===undefined)delete process.env.PHOTO_STORAGE_BACKEND;else process.env.PHOTO_STORAGE_BACKEND=backend;await rm(root,{recursive:true,force:true});}
});
