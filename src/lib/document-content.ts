import sharp from 'sharp';
// Format validation is independent of malware scanning. Every accepted upload is quarantined.
export async function validateDocumentContent(filename:string,bytes:Uint8Array){
 const ext=filename.split('.').pop()!.toLowerCase(),buffer=Buffer.from(bytes);
 if(ext==='png'||ext==='jpg'||ext==='jpeg'){
  try{const image=sharp(buffer,{limitInputPixels:25_000_000,failOn:'warning'});const meta=await image.metadata();if(meta.format!==(ext==='png'?'png':'jpeg')||(meta.pages??1)!==1)throw new Error();await image.raw().toBuffer();}catch{throw new Error('Choose a valid PNG or JPEG image under 25 megapixels.');}
 }
}
