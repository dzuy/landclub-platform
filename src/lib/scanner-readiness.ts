import {readFile,writeFile,rename} from 'node:fs/promises';
export const scannerHealthFile='/tmp/land-club-scanner-health.json';
export type ScannerHealth={ready:boolean;heartbeat:number;lastProbe:number;signatureDate:number};
export function healthyScanner(value:unknown,now=Date.now()):boolean{
 if(!value||typeof value!=='object')return false;
 const h=value as Partial<ScannerHealth>;
 return h.ready===true&&typeof h.heartbeat==='number'&&typeof h.lastProbe==='number'&&typeof h.signatureDate==='number'&&h.heartbeat<=now&&h.lastProbe<=now&&now-h.heartbeat<180_000&&now-h.lastProbe<7*60*60*1000&&h.signatureDate<=now&&now-h.signatureDate<7*24*60*60*1000;
}
export async function scannerReady(file=scannerHealthFile){try{return healthyScanner(JSON.parse(await readFile(file,'utf8')));}catch{return false;}}
export async function writeScannerHealth(health:ScannerHealth,file=scannerHealthFile){await writeFile(file+'.new',JSON.stringify(health),{mode:0o600});await rename(file+'.new',file);}

export async function documentServiceReady(nodeEnv=process.env.NODE_ENV,readiness:()=>Promise<boolean>=scannerReady){return nodeEnv!=='production'||await readiness();}
