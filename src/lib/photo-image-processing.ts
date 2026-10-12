import sharp from 'sharp';
import {THUMBNAIL_WIDTHS,type ThumbnailWidth} from './photo-thumbnail-url';

export const GALLERY_MAX_EDGE=2560;
export const GALLERY_MAX_BYTES=1536*1024;
export function thumbnailKey(sourceKey:string,width:ThumbnailWidth){
 if(!THUMBNAIL_WIDTHS.includes(width))throw new Error('Invalid thumbnail width.');
 return sourceKey.replace(/\.(jpg|png|gif|webp)$/,`.thumb-${width}-v1.webp`);
}
export async function createThumbnail(bytes:Uint8Array,width:ThumbnailWidth){
 if(!THUMBNAIL_WIDTHS.includes(width))throw new Error('Invalid thumbnail width.');
 return sharp(bytes,{limitInputPixels:80_000_000}).rotate().resize({width,height:width,fit:'inside',withoutEnlargement:true}).webp({quality:76,effort:4}).toBuffer();
}

// Store a display-quality still, not the camera original. Decode before any
// writes, apply orientation, strip metadata, and bound dimensions AND bytes.
export async function optimizeGalleryPhoto(bytes:Uint8Array){
 for(const quality of [82,74,66]){
  const image=await sharp(bytes,{limitInputPixels:80_000_000}).rotate().resize({width:GALLERY_MAX_EDGE,height:GALLERY_MAX_EDGE,fit:'inside',withoutEnlargement:true}).webp({quality,effort:4}).toBuffer();
  if(image.length<=GALLERY_MAX_BYTES)return image;
 }
 for(const edge of [1920,1440,1080,810,608,456,320]){
  const image=await sharp(bytes,{limitInputPixels:80_000_000}).rotate().resize({width:edge,height:edge,fit:'inside',withoutEnlargement:true}).webp({quality:66,effort:4}).toBuffer();
  if(image.length<=GALLERY_MAX_BYTES)return image;
 }
 throw new Error('Unable to optimize photo within the gallery storage limit.');
}
