import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {randomBytes} from 'node:crypto';
import {optimizeGalleryPhoto,GALLERY_MAX_BYTES,GALLERY_MAX_EDGE} from '../src/lib/photo-image-processing';
import {createThumbnail,readPhotoThumbnail,thumbnailKey} from '../src/lib/photo-thumbnails';
import {photoThumbnailUrl} from '../src/lib/photo-thumbnail-url';
import {checksum,validateObjectKey,type PhotoObjectStorage} from '../src/lib/photo-object-storage';
import type {StoredPhoto} from '../src/lib/property-photo-storage';

test('gallery optimization bounds noisy images by bytes and dimensions, strips metadata and rotates',async()=>{
 const source=await sharp(randomBytes(3000*2600*3),{raw:{width:3000,height:2600,channels:3}}).jpeg({quality:100}).withMetadata({orientation:6}).toBuffer();
 const gallery=await optimizeGalleryPhoto(source),meta=await sharp(gallery).metadata();
 assert.equal(meta.format,'webp');assert.ok(gallery.length<=GALLERY_MAX_BYTES);assert.ok(gallery.length<source.length);
 assert.ok(meta.width!<=GALLERY_MAX_EDGE);assert.ok(meta.height!<=GALLERY_MAX_EDGE);assert.ok(meta.height!>meta.width!);assert.equal(meta.exif,undefined);
 const small=await sharp({create:{width:40,height:20,channels:4,background:'#537d6380'}}).png().toBuffer();
 const smallMeta=await sharp(await optimizeGalleryPhoto(small)).metadata();assert.equal(smallMeta.width,40);assert.equal(smallMeta.hasAlpha,true);
 await assert.rejects(optimizeGalleryPhoto(Buffer.from('not an image')));
});

test('thumbnail is bounded, correctly oriented WebP with no enlargement or EXIF',async()=>{
 const source=await sharp({create:{width:2400,height:1600,channels:3,background:'#538461'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const thumb=await createThumbnail(source,640),meta=await sharp(thumb).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,427);assert.equal(meta.height,640);assert.equal(meta.exif,undefined);assert.ok(thumb.length<source.length);
 const tiny=await sharp({create:{width:20,height:10,channels:3,background:'#538461'}}).png().toBuffer();
 assert.equal((await sharp(await createThumbnail(tiny,160)).metadata()).width,20);
});
test('stored derivatives are reused without reading originals and preserve original bytes',async()=>{
 const original=await sharp({create:{width:1200,height:800,channels:3,background:'#538461'}}).png().toBuffer();
 const propertyId='11111111-1111-4111-8111-111111111111',hash=checksum(original),key=`${propertyId}/${hash}.png`;
 const objects=new Map<string,Uint8Array>([[key,original]]);let originalReads=0;
 const storage:PhotoObjectStorage={backend:'local',get:async k=>{if(k===key)originalReads++;const bytes=objects.get(k);if(!bytes)throw new Error('Missing');return bytes;},put:async(k,bytes)=>{validateObjectKey(k);objects.set(k,bytes);}};
 const photo:StoredPhoto={id:propertyId,property_id:propertyId,mime:'image/png',content:null,storage_backend:'local',storage_key:key,checksum:hash,byte_size:original.length,staff_only:true};
 const first=await readPhotoThumbnail(photo,160,storage);
 assert.deepEqual(await readPhotoThumbnail(photo,160,storage),first);assert.equal(originalReads,1);assert.deepEqual(objects.get(key),original);
 assert.equal(objects.has(thumbnailKey(key,160)),true);
 const legacy={...photo,storage_key:null,storage_backend:null,content:original.toString('base64')};
 assert.equal((await sharp(await readPhotoThumbnail(legacy,640,storage)).metadata()).width,640);
 assert.throws(()=>validateObjectKey(`${propertyId}/${hash}.thumb-999-v1.webp`));
});
test('thumbnail URLs leave external images and canonical originals unchanged',()=>{
 const url='/api/property-photos/11111111-1111-4111-8111-111111111111';
 assert.equal(photoThumbnailUrl(url,160),url+'?thumbnail=160');
 assert.equal(photoThumbnailUrl('/images/landscape.png'),'/images/landscape.thumb-640-v1.webp');
 assert.equal(photoThumbnailUrl('https://example.com/photo.jpg'),'https://example.com/photo.jpg');
 assert.equal(photoThumbnailUrl('/images/other.jpg'),'/images/other.jpg');
});
