import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {saveProfilePhoto} from '../src/lib/profile-photo-storage';
import {profilePhotoKey,profilePhotoUrl,MAX_PROFILE_PHOTO_BYTES} from '../src/lib/profile-photo';
import type {PhotoObjectStorage} from '../src/lib/photo-object-storage';
const id='11111111-1111-4111-8111-111111111111';
test('profile photo stores only optimized image and verifies storage',async()=>{
 const files=new Map<string,Uint8Array>();
 const storage:PhotoObjectStorage={backend:'local',put:async(k,b,m)=>{assert.equal(m,'image/webp');files.set(k,b);},get:async k=>files.get(k)!};
 const source=await sharp({create:{width:2000,height:1600,channels:3,background:'#537d63'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const key=await saveProfilePhoto(id,source,storage),bytes=files.get(key)!;
 const meta=await sharp(bytes).metadata();assert.equal(meta.width,512);assert.equal(meta.height,512);assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);assert.equal(files.size,1);assert.ok(bytes.length<source.length);
 assert.equal(profilePhotoKey(id,{land_club_avatar:key}),key);assert.ok(profilePhotoUrl(id,{land_club_avatar:key})?.startsWith('/api/profile-photo?v='));
 await assert.rejects(saveProfilePhoto(id,source,{...storage,get:async()=>Buffer.from('corrupt')}),/verification/);
 await assert.rejects(saveProfilePhoto(id,Buffer.from('bad image'),storage));
 await assert.rejects(saveProfilePhoto(id,Buffer.alloc(MAX_PROFILE_PHOTO_BYTES+1),storage));
});
test('metadata cannot select another account photo or arbitrary paths',()=>{
 const key=id+'/'+ 'a'.repeat(64)+'.webp';
 assert.equal(profilePhotoKey('22222222-2222-4222-8222-222222222222',{land_club_avatar:key}),null);
 for(const value of ['../../secret','https://example.com/image',null,{},id+'/../../secret'])assert.equal(profilePhotoKey(id,{land_club_avatar:value}),null);
 assert.equal(profilePhotoUrl(id,{}),null);
});
