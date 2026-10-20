import {createHash} from 'node:crypto';
import ExcelJS from 'exceljs';
import type {Database,Queryable} from './database';
import {auditActor,auditDocument} from './document-security';

type Position={id:string;project:string;kind:string;currency:string;asOf:string|null;lines:{label:string;amount:string|null;section:string;basis:string;date:string|null;source:string}[];schedules:{label:string;date:string|null;confirmation:string;source:string;note:string}[]};
type Payload={name:string;positions:Position[]};
type Binding={document_id:string;person_id:string;content_hash:string|null;member_id:string;version:number;filename:string;content:string};
const metricLabels=new Set(['commitment amount','capital contributed','capital returned','capital outstanding','pref accrued to date','pref paid to date','pref unpaid','balance owed before profit split','principal','principal outstanding','interest earned to date','interest paid to date','interest accrued unpaid','interest prepaid','entitlement','total scheduled all waves','principal or deposits','interest earned','interest paid','balance today','amount']);

async function payload(db:Queryable,b:Binding):Promise<Payload|null>{
 const p=(await db.query<{display_name:string;auth_user_id:string|null;prepared_member_id:string|null;linked:string|null}>(`SELECT p.display_name,p.auth_user_id,p.prepared_member_id,m.auth_user_id AS linked
 FROM report_people p LEFT JOIN prepared_members m ON m.id=p.prepared_member_id WHERE p.id=$1 AND p.disabled_at IS NULL`,[b.person_id])).rows[0];
 if(!p||p.auth_user_id&&p.linked&&p.auth_user_id!==p.linked)return null;
 if(![p.auth_user_id||p.linked||p.prepared_member_id,p.prepared_member_id].includes(b.member_id))return null;
 const reports=(await db.query<{id:string;project:string;kind:string;currency:string;asOf:string|null}>(`SELECT DISTINCT ON (pos.id) r.id,pos.project_name AS project,pos.kind,pos.currency,r.as_of::text AS "asOf"
 FROM investor_access a JOIN investment_positions pos ON pos.holder_id=a.holder_id
 JOIN investor_reports r ON r.position_id=pos.id LEFT JOIN investor_source_snapshots s ON s.id=r.snapshot_id
 WHERE a.person_id=$1 AND a.revoked_at IS NULL
 ORDER BY pos.id,s.captured_at DESC NULLS LAST,r.created_at DESC,r.id DESC`,[b.person_id])).rows;
 if(!reports.length)return null;
 const positions:Position[]=[];
 for(const r of reports){
  const lines=(await db.query<Position['lines'][number]>(`SELECT label,amount::text,section,basis,effective_date::text AS date,source_reference AS source FROM investor_report_lines WHERE report_id=$1 AND section IN ('position','transactions') ORDER BY ordinal,id`,[r.id])).rows.filter(l=>l.section==='transactions'||metricLabels.has(l.label));
  const schedules=(await db.query<Position['schedules'][number]>(`SELECT label,scheduled_date::text AS date,confirmation,source_reference AS source,note FROM investor_report_schedules WHERE report_id=$1 ORDER BY scheduled_date,id`,[r.id])).rows;
  positions.push({...r,lines,schedules});
 }
 return {name:p.display_name,positions};
}
const hash=(p:Payload)=>createHash('sha256').update(JSON.stringify({generator:1,payload:p})).digest('hex');
const safe=(text:string)=>/^[=+@-]/.test(text)?"'"+text:text;
const date=(s:string|null)=>s?new Date(s+'T00:00:00Z'):null;

/** Values-only XLSX: never import source sheets, formulas, hidden rows or attachments. */
export async function generateInvestorWorkbook(data:Payload){
 const book=new ExcelJS.Workbook();book.creator='Land Club';book.created=new Date();
 for(const [index,p] of data.positions.entries()){
  const name=(p.project.replace(/^Land Club /,'').replace(/ LLC$/,'')+' '+p.kind).replace(/[\\/*?:\[\]]/g,'').slice(0,27);
  const sheet=book.addWorksheet(`${index+1} ${name}`,{views:[{state:'frozen',ySplit:6,showGridLines:false}]});
  sheet.columns=[{width:46},{width:21},{width:18},{width:38},{width:85}];
  sheet.addRow([]);sheet.addRow([safe(data.name+' — '+p.project)]);
  sheet.addRow([`As of ${p.asOf||'date not supplied'}. ${p.currency}. Draft, unaudited.`]);
  sheet.addRow(['Automatically refreshed from recorded investment data. Not a live accrual calculation.']);
  sheet.addRow(['Reported amounts and payment dates remain subject to confirmation. Not a signed statement.']);
  const header=(cells:string[])=>{const row=sheet.addRow(cells);row.height=26;row.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF304C3B'}};c.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};});};
  header(['Item',`Amount (${p.currency})`,'Date','Basis / status','Source reference']);
  for(const l of p.lines.filter(l=>l.section==='position'))sheet.addRow([safe(l.label),l.amount===null?'Not supplied':Number(l.amount),date(l.date),safe(l.basis),safe(l.source)]);
  sheet.addRow([]);header(['Activity',`Amount (${p.currency})`,'Date','Basis / status','Source reference']);
  for(const l of p.lines.filter(l=>l.section==='transactions')){
   const event=l.label.split(' · ')[1]||'Reported transaction';
   const label=['capital contribution','return of capital','loan funding','interest payment','loan payment','reserve deposit'].includes(event)?event:'Reported transaction';
   sheet.addRow([label,l.amount===null?'Not supplied':Number(l.amount),date(l.date),l.basis==='internal_transfer'?'Internal transfer; not external cash':'Reported; evidence pending',safe(l.source)]);
  }
  sheet.addRow([]);
  if(p.schedules.length){
   header(['Schedule reference',`Amount (${p.currency})`,'Source date','Status','Source reference']);
   for(const s of p.schedules){
    const parts=s.label.split(' · '),amount=parts[1]?.match(/^(\d+(?:\.\d+)?)\s+[A-Z]{3}$/);
    sheet.addRow([safe(parts[0]),amount?Number(amount[1]):'Not supplied',date(s.date),s.confirmation==='confirmed'?'Confirmed':'Pending confirmation',safe(s.source)]);
   }
   const row=sheet.addRow(['Schedules may repeat the same economic payment across sources. Do not sum these rows. Conflicting dates remain pending.']);sheet.mergeCells(row.number,1,row.number,5);
  }else{const row=sheet.addRow(['No future payment schedule supplied.']);sheet.mergeCells(row.number,1,row.number,5);}
  for(let r=2;r<=5;r++)sheet.mergeCells(r,1,r,5);
  sheet.eachRow(row=>{if(!row.height)row.height=40;row.eachCell(cell=>{if(!cell.font)cell.font={name:'Arial',size:11,color:{argb:'FF25372B'}};cell.alignment={vertical:'middle',wrapText:true};if(typeof cell.value==='number')cell.numFmt='#,##0.00;(#,##0.00);0.00';if(cell.value instanceof Date)cell.numFmt='mmm d, yyyy';});});
  sheet.getRow(2).height=30;sheet.getCell('A2').font={name:'Arial',size:16,bold:true};
  for(let r=3;r<=5;r++)sheet.getCell(`A${r}`).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF4DA'}};
 }
 return Buffer.from(await book.xlsx.writeBuffer());
}

/** Refresh only explicitly enrolled private documents. A revoked source never serves stale bytes. */
export async function refreshInvestorDocument(db:Database,id:string):Promise<'ordinary'|'available'|'unavailable'>{
 if(!(await db.query<{ready:boolean}>("SELECT to_regclass('automatic_investor_documents') IS NOT NULL AS ready")).rows[0]?.ready)return 'ordinary';
 return db.transaction(async tx=>{
  const b=(await tx.query<Binding>(`SELECT a.*,d.member_id,d.version,d.filename,d.content FROM automatic_investor_documents a JOIN member_documents d ON d.id=a.document_id WHERE a.document_id=$1 FOR UPDATE OF a,d`,[id])).rows[0];
  if(!b)return 'ordinary';
  const data=await payload(tx,b);if(!data)return 'unavailable';
  const digest=hash(data);if(digest===b.content_hash)return 'available';
  const bytes=await generateInvestorWorkbook(data);if(bytes.length>20*1024*1024)throw new Error('Investor workbook exceeds document limit');
  // Recheck grants, mapping and source data after generation before saving any bytes.
  const fresh=await payload(tx,b);if(!fresh||hash(fresh)!==digest)throw new Error('Investment data changed during refresh. Please retry.');
  await tx.query('INSERT INTO investor_document_versions(document_id,version,filename,content) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,b.version,b.filename,b.content]);
  const filename=data.name.replace(/[^a-z0-9 _-]/gi,'').replaceAll(' ','_')+'_Investment_Details_CURRENT_DRAFT.xlsx';
  await auditActor(tx,'system:investor-document-refresh');
  await tx.query('UPDATE member_documents SET filename=$2,byte_size=$3,content=$4,version=version+1,tags=$5 WHERE id=$1',[id,filename,bytes.length,bytes.toString('base64'),['Private investor extract','Automatically updated','Draft · unaudited']]);
  await tx.query('UPDATE automatic_investor_documents SET content_hash=$2,refreshed_at=now() WHERE document_id=$1',[id,digest]);
  await auditDocument(tx,'system:investor-document-refresh','member_documents',id,'automatically_refreshed');
  return 'available';
 });
}
