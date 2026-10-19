'use client';

import {useEffect,useRef,useState} from 'react';
import s from './ian-statement-modals.module.css';

type Row = [string,string,boolean?];
type MockDocument = {id:string;title:string;label:string;date:string;subtitle:string;rows?:Row[];sections?:string[]};
const documents:MockDocument[]=[
 {id:'capital-account',title:'Capital account statement',label:'Capital account statement · Norden Cross',date:'Oct 16, 2026',subtitle:'Land Club Norden Cross LLC · As of Oct 16, 2026 · Placeholder document',rows:[['Contributed, May 2, 2025','$250,000.00'],['Principal returned, May 19, 2026','−$100,000.00'],['Remaining principal','$150,000.00',true],['Preferred return, May 2, 2025 to May 19, 2026','$26,164.38'],['Preferred return, May 19, 2026 to Oct 16, 2026','$6,164.38'],['Preferred return paid','$0.00'],['Capital account balance','$182,328.76',true]]},
 {id:'2025-k1',title:'2025 Schedule K-1',label:'2025 K-1 · Land Club Norden Cross LLC',date:'Mar 12, 2026',subtitle:'Land Club Norden Cross LLC · Tax year 2025 · Placeholder document',sections:['Part I. Information about the partnership','Part II. Information about the partner','Part III. Partner’s share of income, deductions and credits']},
 {id:'operating-agreement',title:'Operating Agreement',label:'Operating Agreement · Land Club Norden Cross LLC',date:'May 1, 2025',subtitle:'Land Club Norden Cross LLC · Placeholder document',sections:['Operating Agreement · Document content placeholder']},
 {id:'subscription-agreement',title:'Subscription Agreement',label:'Subscription Agreement · Norden Cross',date:'May 2, 2025',subtitle:'Land Club Norden Cross LLC · Signed May 2, 2025 · Placeholder document',rows:[['Subscriber','Ian Kenny'],['Interest','Member, Ownership Interest, Land Club Norden Cross LLC'],['Capital commitment','$250,000'],['Preferred return','10% a year, simple'],['Profit split','70% investors / 30% Land Club'],['Signed','May 2, 2025']]},
];
const widths=[100,96,92,98,60];

// Generated only from the same Figma placeholder content shown in the modal.
async function downloadMock(doc:MockDocument){
 const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');
 const pdf=await PDFDocument.create(),page=pdf.addPage([792,612]);
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(9/255,15/255,7/255),line=rgb(226/255,223/255,216/255);
 const safe=(text:string)=>text.replaceAll('−','-').replaceAll('’',"'");
 const text=(value:string,x:number,y:number,size=11,strong=false)=>page.drawText(safe(value),{x,y,size,font:strong?bold:regular,color:ink});
 text(doc.title,48,550,25,true);text(doc.subtitle,48,520,10);
 let y=480;
 for(const [label,value,strong] of doc.rows??[]){page.drawLine({start:{x:48,y:y+16},end:{x:744,y:y+16},thickness:.6,color:line});text(label,48,y,11,strong);const font=strong?bold:regular;text(value,744-font.widthOfTextAtSize(safe(value),11),y,11,strong);y-=39;}
 for(const heading of doc.sections??[]){text(heading,48,y,11,true);y-=23;for(const width of widths){page.drawRectangle({x:48,y,width:580*width/100,height:6,color:rgb(223/255,219/255,210/255)});y-=14;}y-=25;}
 text('MOCK / PLACEHOLDER — Not an official financial, tax or legal document.',48,40,10);
 const bytes=await pdf.save();const url=URL.createObjectURL(new Blob([Uint8Array.from(bytes)],{type:'application/pdf'}));
 const link=document.createElement('a');link.href=url;link.download=`mock-${doc.id}.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function DocumentModal({doc,onClose}:{doc:MockDocument;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const dialog=ref.current!,previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;dialog.showModal();document.body.style.overflow='hidden';return()=>{dialog.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};},[]);
 return <dialog ref={ref} className={s.modal} aria-labelledby="statement-title" aria-describedby="statement-subtitle" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
 <header className={s.header}><h2 id="statement-title">{doc.title}</h2><button className={s.close} type="button" autoFocus onClick={onClose}>Close</button></header>
 <p className={s.subtitle} id="statement-subtitle">{doc.subtitle}</p>
 {doc.rows&&<dl className={s.rows}>{doc.rows.map(([label,value,strong])=><div className={strong?s.strong:undefined} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
 {doc.sections&&<div className={s.sections}>{doc.sections.map(heading=><section key={heading}><h3>{heading}</h3><div className={s.placeholder} aria-label="Placeholder document text">{widths.map((width,i)=><span key={i} style={{width:`${width}%`}} aria-hidden="true"/>)}</div></section>)}</div>}
 <footer><button className={s.download} type="button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await downloadMock(doc);}catch{setError('The placeholder PDF could not be created. Please try again.');}finally{setBusy(false);}}}>{busy?'Preparing PDF…':'Download PDF'}</button>{error&&<p role="alert">{error}</p>}</footer>
 </dialog>;
}

export function IanStatementModals(){
 const [selected,setSelected]=useState<MockDocument|null>(null);
 return <><div>{documents.map(doc=><button className={s.document} key={doc.id} type="button" aria-haspopup="dialog" onClick={()=>setSelected(doc)}><span>{doc.label}</span><time>{doc.date}</time></button>)}</div>{selected&&<DocumentModal doc={selected} onClose={()=>setSelected(null)}/>}</>;
}
