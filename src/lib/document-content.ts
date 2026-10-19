import sharp from 'sharp';
import {PDFDocument,PDFDict,PDFArray,PDFName,PDFRawStream,PDFRef,type PDFObject} from 'pdf-lib';
// Structural checks reduce risk; they are not malware scanning or sanitization.
const activePdfNames=new Set(['javascript','js','launch','embeddedfile','embeddedfiles','filespec','richmedia','xfa','encrypt','openaction','aa','acroform','uri','gotor','gotoe','submitform','importdata','sound','movie','rendition','3d']);
async function validatePdf(bytes:Uint8Array){
 try{
  const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,throwOnInvalidObject:true,updateMetadata:false});
  if(pdf.isEncrypted)throw new Error();
  const objects=pdf.context.enumerateIndirectObjects();if(objects.length>20000)throw new Error();
  const pending:PDFObject[]=objects.map(([,object])=>object),seen=new Set<PDFObject>();let examined=0;
  while(pending.length){
   const object=pending.pop()!;if(seen.has(object))continue;seen.add(object);if(++examined>100000)throw new Error();
   if(object instanceof PDFName){if(activePdfNames.has(object.decodeText().replace(/#([0-9a-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))).toLowerCase()))throw new Error();}
   else if(object instanceof PDFRawStream)pending.push(object.dict);
   else if(object instanceof PDFDict){for(const [key,value] of object.entries())pending.push(key,value);}
   else if(object instanceof PDFArray)pending.push(...object.asArray());
   else if(object instanceof PDFRef){const resolved=pdf.context.lookup(object);if(!resolved)throw new Error();pending.push(resolved);}
  }
  // Check the page tree with bounded traversal instead of recursive getPages().
  const pages:PDFObject[]=[pdf.catalog.get(PDFName.of('Pages'))!],visited=new Set<PDFObject>();let count=0;
  while(pages.length){const node=pdf.context.lookup(pages.pop()!);if(!(node instanceof PDFDict)||visited.has(node))throw new Error();visited.add(node);if(visited.size>20000)throw new Error();const type=node.get(PDFName.of('Type'));
   if(type===PDFName.of('Page')){if(++count>1000)throw new Error();}
   else if(type===PDFName.of('Pages')){const kids=pdf.context.lookup(node.get(PDFName.of('Kids')));if(!(kids instanceof PDFArray))throw new Error();pages.push(...kids.asArray());}
   else throw new Error();
  }
  if(!count)throw new Error();
 }catch{throw new Error('Choose a valid, unencrypted PDF without forms, scripts, links or embedded files (up to 1,000 pages).');}
}
export async function validateDocumentContent(filename:string,bytes:Uint8Array){
 const ext=filename.split('.').pop()!.toLowerCase(),buffer=Buffer.from(bytes);
 if(ext==='pdf')await validatePdf(bytes);
 if(ext==='png'||ext==='jpg'||ext==='jpeg'){
  try{const image=sharp(buffer,{limitInputPixels:25_000_000,failOn:'warning'});const meta=await image.metadata();if(meta.format!==(ext==='png'?'png':'jpeg')||(meta.pages??1)!==1)throw new Error();await image.raw().toBuffer();}catch{throw new Error('Choose a valid PNG or JPEG image under 25 megapixels.');}
 }
}
