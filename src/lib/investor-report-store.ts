import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {database} from './database';
import {InvestorReportRepository} from './investor-reports';
const state=globalThis as unknown as {investorReportsReady?:Promise<void>};
export async function investorReportStore(){
 const db=database();
 if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development'){
  state.investorReportsReady??=(async()=>{
   const sql=await readFile(path.join(process.cwd(),'migrations/018_investor_reporting.sql'),'utf8');
   await db.transaction(async tx=>{for(const statement of sql.split('-- statement-break').filter(s=>s.replace(/^--.*$/gm,'').trim()))await tx.query(statement);});
  })().catch(error=>{state.investorReportsReady=undefined;throw error;});
  await state.investorReportsReady;
 }
 return new InvestorReportRepository(db);
}
