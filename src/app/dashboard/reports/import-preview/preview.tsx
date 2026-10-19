'use client';
import {useState} from 'react';
export function ImportPreview(){
 const [input,setInput]=useState(''),[result,setResult]=useState(''),[busy,setBusy]=useState(false);
 async function preview(event:React.FormEvent){event.preventDefault();setBusy(true);setResult('');try{const response=await fetch('/api/investor-reports/import-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:input});setResult(JSON.stringify(await response.json(),null,2));}catch{setResult('Preview unavailable. No import was performed.');}finally{setBusy(false);}}
 return <form onSubmit={preview}><label htmlFor="import-records">Normalized import JSON</label><p>Use explicit source IDs, decimal money strings and YYYY-MM-DD dates. Source roles never grant account privileges.</p><textarea id="import-records" value={input} onChange={e=>setInput(e.target.value)} rows={18} required style={{width:'100%',fontFamily:'monospace'}}/><button type="submit" disabled={busy}>{busy?'Checking…':'Validate preview'}</button><pre role="status" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{result}</pre></form>;
}
