import {randomUUID} from 'node:crypto';
import {MemberInvestmentRepository} from '../src/lib/member-investments';
import test from 'node:test';
import assert from 'node:assert/strict';
import {InvitationRepository} from '../src/lib/invitations';
import {InvestorPlatformRepository} from '../src/lib/investor-platform';
import {sharingFixture} from './investment-sharing-fixtures';
import {serveInvestorReport,serveInvestorDocument} from '../src/lib/investor-report-http';
const who=(a:{id:string})=>({...a,admin:false});
test('existing and new regular identities accept exact scope without changing their independent access',async()=>{
 const f=await sharingFixture();try{
  const id=await f.repo.invite(f.owner,' EXISTING@example.test ',[f.positions[0]],f.capture),token=f.mail[0].token;
  assert.equal((await f.repo.list(f.owner))[0].status,'pending');
  assert.equal(await f.shared.get(f.reports[0],who(f.existing)),null);
  assert.equal(await f.repo.pending(f.outsider,token),null);
  await assert.rejects(()=>f.repo.accept(f.outsider,token));
  await assert.rejects(()=>f.repo.accept({...f.existing,verified:false},token));
  await f.repo.accept(f.existing,token);
  assert.equal((await f.repo.list(f.owner))[0].status,'accepted');
  assert.equal((await f.shared.list(who(f.existing))).length,1);
  assert.equal(await f.shared.get(f.reports[1],who(f.existing)),null);
  assert.ok(await f.ordinary.get(f.reports[2],who(f.existing)));
  assert.equal(await f.ordinary.get(f.reports[0],who(f.existing)),null);
  assert.equal(await f.shared.get(f.reports[2],who(f.existing)),null);
  assert.equal(await f.shared.company(f.reports[0],who(f.existing)),null);
  assert.equal((await serveInvestorReport(f.shared,f.reports[0],who(f.existing),'csv')).status,200);
  assert.equal((await serveInvestorDocument(f.shared,f.document,who(f.existing))).status,200);
  assert.deepEqual((await f.repo.owned(f.existing)).map(p=>p.id),[f.positions[2]]);
  await assert.rejects(()=>f.repo.invite(f.existing,f.fresh.email,[f.positions[0]],f.capture));
  await assert.rejects(()=>f.repo.revoke(f.existing,id));
  await assert.rejects(()=>f.repo.accept(f.existing,token));
  const second=await f.repo.invite(f.owner,f.fresh.email,[f.positions[1]],f.capture);await f.repo.accept(f.fresh,f.mail[1].token);
  assert.equal((await f.shared.list(who(f.fresh))).length,1);
  assert.deepEqual(await f.ordinary.list(who(f.fresh)),[]);
  assert.equal((await f.db.query('SELECT * FROM investor_access')).rows.length,2);
  assert.equal((await f.db.query('SELECT * FROM investment_account_owners')).rows.length,0);
  assert.ok((await f.db.query('SELECT * FROM investor_operations_audit WHERE action=$1',['sharing_accepted'])).rows.length===2);
  await f.repo.revoke(f.owner,id);
  assert.equal((await serveInvestorDocument(f.shared,f.document,who(f.existing))).status,404);
  assert.equal((await serveInvestorReport(f.shared,f.reports[0],who(f.existing),'csv')).status,404);
  assert.ok(await f.ordinary.get(f.reports[2],who(f.existing)));
  assert.equal((await f.repo.list(f.owner)).find(i=>i.id===id)?.status,'revoked');
  await f.repo.revoke(f.owner,second);
 }finally{await f.pg.close();}
});
test('self, duplicate, cross-account, expired, revoked and malformed tokens fail closed',async()=>{
 const f=await sharingFixture();try{
  for(const positions of [[],[f.positions[0],f.positions[0]],[f.positions[2]],['bad']])await assert.rejects(()=>f.repo.invite(f.owner,f.fresh.email,positions,f.capture));
  await assert.rejects(()=>f.repo.invite(f.owner,f.owner.email,[f.positions[0]],f.capture));
  const id=await f.repo.invite(f.owner,f.fresh.email,[f.positions[0]],f.capture);
  await assert.rejects(()=>f.repo.invite(f.owner,f.fresh.email,[f.positions[0],f.positions[1]],f.capture));
  await assert.rejects(()=>f.repo.accept(f.fresh,'bad'));
  await f.db.query("UPDATE investment_sharing_invitations SET expires_at=now()-interval '1 minute' WHERE id=$1",[id]);
  await assert.rejects(()=>f.repo.accept(f.fresh,f.mail[0].token));
  assert.equal((await f.repo.list(f.owner))[0].status,'expired');
  const pending=await f.repo.invite(f.owner,f.fresh.email,[f.positions[0]],f.capture);await f.repo.revoke(f.owner,pending);
  await assert.rejects(()=>f.repo.accept(f.fresh,f.mail[1].token));
  assert.deepEqual(await f.repo.list(f.outsider),[]);
  const row=(await f.db.query<{token_hash:string}>('SELECT token_hash FROM investment_sharing_invitations WHERE id=$1',[pending])).rows[0];assert.notEqual(row.token_hash,f.mail[1].token);assert.match(row.token_hash,/^[a-f0-9]{64}$/);
  await assert.rejects(()=>f.repo.invite(f.owner,f.fresh.email,[f.positions[0]],async()=>{throw new Error('stubbed delivery failure');}));
  assert.equal((await f.repo.list(f.owner))[0].status,'failed');
 }finally{await f.pg.close();}
});
test('release, review, disabled identities and owner/source revocation protect every shared read',async()=>{
 const f=await sharingFixture();try{
  await f.repo.invite(f.owner,f.existing.email,[f.positions[0]],f.capture);await f.repo.accept(f.existing,f.mail[0].token);
  const denied=async()=>{assert.equal(await f.shared.get(f.reports[0],who(f.existing)),null);assert.equal(await f.shared.download(f.document,who(f.existing)),null);assert.deepEqual(await f.shared.list(who(f.existing)),[]);};
  await f.db.query("UPDATE investor_reports SET review_state='draft' WHERE id=$1",[f.reports[0]]);await denied();
  await f.db.query("UPDATE investor_reports SET review_state='reviewed',released_at=NULL,released_by=NULL WHERE id=$1",[f.reports[0]]);await denied();
  await f.db.query("UPDATE investor_reports SET released_at=now(),released_by='fixture' WHERE id=$1",[f.reports[0]]);
  for(const person of [f.people.owner,f.people.existing]){await f.db.query('UPDATE report_people SET disabled_at=now() WHERE id=$1',[person]);await denied();await f.db.query('UPDATE report_people SET disabled_at=NULL WHERE id=$1',[person]);}
  for(const table of ['investor_access']){await f.db.query(`UPDATE ${table} SET revoked_at=now() WHERE person_id=$1`,[f.people.owner]);await denied();await f.db.query(`UPDATE ${table} SET revoked_at=NULL WHERE person_id=$1`,[f.people.owner]);}
  assert.equal((await serveInvestorReport(f.shared,f.reports[0],null)).status,401);
  assert.equal((await serveInvestorDocument(f.shared,f.document,who(f.outsider))).status,404);
  await f.pg.exec('CREATE ROLE sharing_browser; GRANT USAGE ON SCHEMA public TO sharing_browser; GRANT SELECT ON ALL TABLES IN SCHEMA public TO sharing_browser; SET ROLE sharing_browser;');
  for(const table of ['investment_account_owners','investment_sharing_invitations','investment_sharing_scope'])assert.equal((await f.pg.query(`SELECT * FROM ${table}`)).rows.length,0);
  await f.pg.exec('RESET ROLE');
 }finally{await f.pg.close();}
});

test('independent roles are unchanged, mutations denied, duplicate acceptance serializes and audit fails closed',async()=>{
 const f=await sharingFixture();try{
  const roles=new InvitationRepository(f.db);await roles.initialize();
  await roles.replaceUserRoles(f.existing.id,['member','owner'],'fixture');
  const id=await f.repo.invite(f.owner,f.existing.email,[f.positions[0],f.positions[1]],f.capture),token=f.mail[0].token;
  await f.db.query('UPDATE report_people SET disabled_at=now() WHERE id=$1',[f.people.existing]);
  assert.equal(await f.repo.pending(f.existing,token),null);await assert.rejects(()=>f.repo.accept(f.existing,token));
  await f.db.query('UPDATE report_people SET disabled_at=NULL WHERE id=$1',[f.people.existing]);
  const attempts=await Promise.allSettled([f.repo.accept(f.existing,token),f.repo.accept(f.existing,token)]);
  assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
  assert.deepEqual((await roles.rolesForUser(f.existing.id)).sort(),['member','owner']);
  assert.deepEqual(await roles.rolesForUser(f.fresh.id),[]);
  const platform=new InvestorPlatformRepository(f.db),viewer=who(f.existing);
  await assert.rejects(()=>platform.publication(f.reports[0],'withdraw',viewer),/Admin access/);
  await assert.rejects(()=>platform.setAccess(f.people.owner,f.holder,false,viewer),/Admin access/);
  await assert.rejects(()=>platform.mapAccount(f.people.owner,f.existing.id,viewer),/Admin access/);
  await f.db.query('DROP TABLE investor_operations_audit');
  await assert.rejects(()=>f.repo.revoke(f.owner,id));
  assert.equal((await f.repo.list(f.owner))[0].status,'accepted');
  await assert.rejects(()=>f.repo.invite(f.owner,f.fresh.email,[f.positions[0]],f.capture));
  assert.equal((await f.repo.list(f.owner)).length,1);
 }finally{await f.pg.close();}
});

test('sharing preview is bound to the admin session and selected person, including prepared identities',async()=>{
 const f=await sharingFixture();try{
  const {createHash,randomUUID}=await import('node:crypto');
  const admin={id:randomUUID(),admin:true},token='a'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
  await f.db.query("INSERT INTO investor_preview_sessions(token_hash,admin_id,person_id,mode,expires_at) VALUES($1,$2,$3,'investor',now()+interval '30 minutes')",[hash,admin.id,f.people.owner]);
  assert.equal((await f.repo.preview(token,admin))?.owned.length,2);
  assert.equal(await f.repo.preview(token,{...admin,admin:false}),null);
  assert.equal(await f.repo.preview(token,{...admin,id:randomUUID()}),null);
  assert.equal(await f.repo.preview('b'.repeat(64),admin),null);
  await f.repo.invite(f.owner,f.existing.email,[f.positions[0]],f.capture);await f.repo.accept(f.existing,f.mail[0].token);
  await f.db.query('UPDATE investor_preview_sessions SET person_id=$2 WHERE token_hash=$1',[hash,f.people.existing]);
  let view=await f.repo.preview(token,admin);assert.equal(view?.owned.length,1);assert.equal(view?.invitations.length,0);assert.deepEqual(view?.reports.map(r=>r.id),[f.reports[0]]);
  await f.db.query('UPDATE report_people SET auth_user_id=NULL WHERE id=$1',[f.people.existing]);
  view=await f.repo.preview(token,admin);assert.equal(view?.linkedAccount,false);assert.equal(view?.reports.length,1);
  await f.db.query('UPDATE investor_access SET revoked_at=now()');assert.equal((await f.repo.preview(token,admin))?.reports.length,0);
  await f.db.query('UPDATE report_people SET disabled_at=now() WHERE id=$1',[f.people.existing]);assert.equal(await f.repo.preview(token,admin),null);
  await f.db.query('UPDATE report_people SET disabled_at=NULL WHERE id=$1',[f.people.existing]);
  await f.db.query('UPDATE investor_preview_sessions SET ended_at=now()');assert.equal(await f.repo.preview(token,admin),null);
  await f.db.query("UPDATE investor_preview_sessions SET ended_at=NULL,expires_at=now()-interval '1 minute'");assert.equal(await f.repo.preview(token,admin),null);
 }finally{await f.pg.close();}
});

test('admin on-behalf sharing validates session and target, preserves owner scope and audits both identities',async()=>{
 const f=await sharingFixture();try{
  const {createHash,randomUUID}=await import('node:crypto');
  const admin={id:randomUUID(),email:'admin@example.test',verified:true,admin:true},token='c'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
  await f.db.query("INSERT INTO investor_preview_sessions(token_hash,admin_id,person_id,mode,expires_at) VALUES($1,$2,$3,'investor',now()+interval '30 minutes')",[hash,admin.id,f.people.owner]);
  await f.db.query('UPDATE report_people SET auth_user_id=NULL WHERE id=$1',[f.people.owner]);
  const invite=(a=admin,t=token,person=f.people.owner,positions=[f.positions[0]])=>f.repo.inviteOnBehalf(a,t,person,f.fresh.email,positions,f.capture);
  await assert.rejects(()=>invite({...admin,admin:false}));await assert.rejects(()=>invite({...admin,id:randomUUID()}));await assert.rejects(()=>invite(admin,'bad'));await assert.rejects(()=>invite(admin,token,f.people.existing));await assert.rejects(()=>invite(admin,token,f.people.owner,[f.positions[2]]));
  assert.equal(f.mail.length,0);
  const id=await invite();assert.equal(f.mail.length,1);
  const row=(await f.db.query<{actor_id:string;person_id:string}>('SELECT actor_id,person_id FROM investor_operations_audit WHERE action=$1',['sharing_invited_on_behalf'])).rows[0];assert.equal(row.actor_id,admin.id);assert.equal(row.person_id,f.people.owner);
  assert.equal((await f.db.query<{auth_user_id:string|null}>('SELECT auth_user_id FROM report_people WHERE id=$1',[f.people.owner])).rows[0].auth_user_id,null);
  await f.repo.accept(f.fresh,f.mail[0].token);assert.equal((await f.shared.list(who(f.fresh))).length,1);
  await assert.rejects(()=>f.repo.revokeOnBehalf(admin,token,f.people.existing,id));
  await f.repo.revokeOnBehalf(admin,token,f.people.owner,id);assert.equal((await f.shared.list(who(f.fresh))).length,0);
  const revoked=(await f.db.query<{actor_id:string;person_id:string}>('SELECT actor_id,person_id FROM investor_operations_audit WHERE action=$1',['sharing_revoked_on_behalf'])).rows[0];assert.equal(revoked.actor_id,admin.id);assert.equal(revoked.person_id,f.people.owner);
  await f.db.query('UPDATE investor_access SET revoked_at=now()');await assert.rejects(()=>invite());
  await f.db.query("UPDATE investor_preview_sessions SET expires_at=now()-interval '1 minute'");await assert.rejects(()=>invite());
  assert.equal(f.mail.length,1);
 }finally{await f.pg.close();}
});

test('mixed investors share only source-owned positions across properties, never invited or generic viewing positions',async()=>{
 const f=await sharingFixture();try{
  assert.equal((await f.repo.owned(f.owner)).length,2); // Different projects, same actual owner.
  await f.repo.invite(f.owner,f.existing.email,[f.positions[0]],f.capture);await f.repo.accept(f.existing,f.mail[0].token);
  assert.deepEqual((await f.repo.owned(f.existing)).map(p=>p.id),[f.positions[2]]);
  await assert.rejects(()=>f.repo.invite(f.existing,f.outsider.email,[f.positions[0]],f.capture));
  await assert.rejects(()=>f.repo.invite(f.existing,f.outsider.email,[f.positions[2],f.positions[0]],f.capture));
  // Even generic viewing access and a legacy manual sharing flag do not prove ownership.
  await f.db.query("INSERT INTO investor_access(person_id,holder_id,granted_by) VALUES($1,$2,'fixture')",[f.people.existing,f.holder]);
  await f.db.query("INSERT INTO investment_account_owners(person_id,holder_id,granted_by) VALUES($1,$2,'fixture')",[f.people.existing,f.holder]);
  assert.deepEqual((await f.repo.owned(f.existing)).map(p=>p.id),[f.positions[2]]);
  await assert.rejects(()=>f.repo.invite(f.existing,f.outsider.email,[f.positions[0],f.positions[2]],f.capture));
  assert.equal(f.mail.length,1);
  await f.repo.invite(f.existing,f.outsider.email,[f.positions[2]],f.capture);assert.equal(f.mail.length,2);
  assert.deepEqual(await f.repo.owned(f.fresh),[]);
 }finally{await f.pg.close();}
});

test('latest imported source ownership removal revokes sharing authority and downstream reads',async()=>{
 const f=await sharingFixture();try{
  const {randomUUID}=await import('node:crypto');
  await f.repo.invite(f.owner,f.existing.email,[f.positions[0]],f.capture);await f.repo.accept(f.existing,f.mail[0].token);
  const original=(await f.db.query<{payload:unknown}>('SELECT payload FROM investor_source_snapshots')).rows[0].payload;
  const payload=JSON.parse(JSON.stringify(original));payload[0].tabs[0].rows[0].access_role='viewer';
  const digest='e'.repeat(64);
  await f.db.query("INSERT INTO investor_source_snapshots(id,source_key,sha256,source_filename,payload,captured_at) VALUES($1,'ownership-fixture',$2,'newer.xlsx',$3,now()+interval '1 second')",[randomUUID(),digest,JSON.stringify(payload)]);
  // Unimported snapshots do not redefine ownership.
  assert.equal((await f.repo.owned(f.owner)).length,2);
  await f.db.query("INSERT INTO investor_import_batches(id,digest,source_key,actor_id,summary) VALUES($1,$2,'ownership-fixture','fixture','{}')",[randomUUID(),digest]);
  assert.deepEqual(await f.repo.owned(f.owner),[]);
  await assert.rejects(()=>f.repo.invite(f.owner,f.fresh.email,[f.positions[1]],f.capture));
  assert.equal(await f.shared.get(f.reports[0],who(f.existing)),null);
  assert.equal(await f.shared.download(f.document,who(f.existing)),null);
 }finally{await f.pg.close();}
});

test('uncertain delivery remains failed and repeated submission cannot send a duplicate',async()=>{
 const f=await sharingFixture();try{
  let sends=0;const timeout=async()=>{sends++;throw new Error('provider timeout');};
  await assert.rejects(()=>f.repo.invite(f.owner,f.fresh.email,[f.positions[0]],timeout));
  await assert.rejects(()=>f.repo.invite(f.owner,f.fresh.email,[f.positions[0]],timeout));
  assert.equal(sends,1);const list=await f.repo.list(f.owner);assert.equal(list.length,1);assert.equal(list[0].status,'failed');assert.equal(list[0].delivery_state,'failed');
  assert.equal((await f.shared.list(who(f.fresh))).length,0);
 }finally{await f.pg.close();}
});

test('administrative property selections cannot unlock reports or re-share delegated holdings, including mixed batches',async()=>{
 const f=await sharingFixture();try{
  const selections=new MemberInvestmentRepository(f.db);await selections.initialize();
  const property=randomUUID();await f.db.query("INSERT INTO properties(id,draft) VALUES($1,'{}')",[property]);
  await f.db.query('UPDATE investment_positions SET property_id=$1',[property]);
  for(const user of [f.existing,f.outsider])await selections.save(user.id,[{kind:'property',id:property}],0,{id:'fixture-admin',admin:true});
  assert.deepEqual(await f.ordinary.list(who(f.outsider)),[]);
  assert.equal(await f.ordinary.get(f.reports[0],who(f.existing)),null);
  assert.deepEqual(await f.repo.owned(f.outsider),[]);
  await f.repo.invite(f.owner,f.existing.email,[f.positions[0]],f.capture);await f.repo.accept(f.existing,f.mail[0].token);
  assert.ok(await f.shared.get(f.reports[0],who(f.existing)));
  assert.deepEqual((await f.repo.owned(f.existing)).map(p=>p.id),[f.positions[2]]);
  for(const ids of [[f.positions[0]],[f.positions[2],f.positions[0]]])await assert.rejects(()=>f.repo.invite(f.existing,f.fresh.email,ids,f.capture));
  assert.equal(f.mail.length,1,'Denied re-sharing must not send mail');
  assert.equal((await f.db.query('SELECT * FROM investor_access')).rows.length,2);
  assert.equal((await f.db.query('SELECT * FROM investment_account_owners')).rows.length,0);
 }finally{await f.pg.close();}
});
