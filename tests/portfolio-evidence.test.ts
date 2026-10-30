import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {portfolioEvidence} from '../src/lib/portfolio-evidence';
test('portfolio uses dated source terms, reconciles calculation, and excludes other investor details',async t=>{
 let books;try{books=JSON.parse(await readFile(new URL('../.data/investor-review/workbooks.json',import.meta.url),'utf8'));}catch{t.skip('Private workbook unavailable');return;}
 const evidence=portfolioEvidence(books,'POS-001','2026-10-16')!;
 assert.equal(evidence.profitShare,50);assert.equal(evidence.ownership,60);
 assert.equal(evidence.debt,'750000.00');assert.equal(evidence.equity,'250000.00');assert.equal(evidence.otherEquity,'100000.00');assert.equal(evidence.total,'1000000.00');
 assert.deepEqual(evidence.segments.map(s=>s.interest),['26164.38','6164.38']);assert.equal(evidence.daily,'41.10');
 assert.match(evidence.waterfall!,/preferred return, then capital/);
 assert.doesNotMatch(JSON.stringify(evidence),/Scott|Sutton|Farrauto|email|investor_id/);
 assert.equal(portfolioEvidence(books,'POS-006','2026-10-16'),null);
 assert.equal(portfolioEvidence(books,'POS-001','2026-10-28'),null);
 const changed=structuredClone(books);const book=changed.find((b:{filename:string})=>b.filename.includes('Norden_Cross_Data'));
 book.tabs.find((t:{name:string})=>t.name==='positions').rows.find((r:{position_id:string})=>r.position_id==='POS-001').profits_interest_pct='0.49';
 assert.equal(portfolioEvidence(changed,'POS-001','2026-10-16')!.profitShare,49);
 book.tabs.find((t:{name:string})=>t.name==='capital_account_snapshots').rows.find((r:{position_id:string})=>r.position_id==='POS-001').pref_accrued_to_date='1.00';
 assert.deepEqual(portfolioEvidence(changed,'POS-001','2026-10-16')!.segments,[]);
});
test('missing source remains pending',()=>{assert.equal(portfolioEvidence([],'POS-001','2026-10-16'),null);assert.equal(portfolioEvidence(null,'POS-001','2026-10-16'),null);});
