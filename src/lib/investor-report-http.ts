import type {InvestorReportRepository,ReportActor,InvestorReport} from './investor-reports';
export const reportHeaders={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'};
function json(body:unknown,status:number){return Response.json(body,{status,headers:reportHeaders});}
// Spreadsheet consumers must not execute source labels as formulas.
function cell(value:unknown){let s=value==null?'Not supplied':String(value);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function reportCsv(r:InvestorReport){
 const rows:unknown[][]=[['Report',r.title],['Project',r.project_name],['Position',r.position_name],['Holder',r.holder_name],['Review',r.review_state,'Unaudited'],['As of',r.as_of],['Source',r.source_reference],[],['Section','Item','Amount','Currency','Basis','Date','Source']];
 for(const l of r.lines)rows.push([l.section,l.label,l.amount,r.currency,l.basis,l.effective_date,l.source_reference]);
 rows.push([],['Schedule','Date','Confirmation','Source','Note']);
 for(const s of r.schedules)rows.push([s.label,s.scheduled_date,s.confirmation,s.source_reference,s.note]);
 rows.push([],['Reconciliation finding','Source value','Comparison value (not a replacement)','Status','Source','Resolution']);
 for(const f of r.findings)rows.push([f.description,f.source_value,f.comparison_value,f.status,f.source_reference,f.resolution]);
 return rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
export async function serveInvestorReport(repo:InvestorReportRepository,id:string,actor:ReportActor,format:'json'|'csv'='json'){
 if(!actor)return json({error:'Please sign in.'},401);
 const report=await repo.get(id,actor);if(!report)return json({error:'Not found.'},404);
 if(format==='json')return json({report},200);
 return new Response(reportCsv(report),{headers:{...reportHeaders,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="investor-report.csv"'}});
}
export async function serveInvestorDocument(repo:InvestorReportRepository,id:string,actor:ReportActor){
 if(!actor)return json({error:'Please sign in.'},401);
 const doc=await repo.download(id,actor);if(!doc)return json({error:'Not found.'},404);
 // Safe fixed filename and attachment-only response; never issue public object URLs.
 return new Response(new Uint8Array(doc.content),{headers:{...reportHeaders,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(doc.filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`,'Content-Security-Policy':"sandbox; default-src 'none'"}});
}
