import type {MemberDirectoryRow} from '@/lib/members';
import {RoleEditor} from './role-editor';
import styles from './members.module.css';

const dateFormatter=new Intl.DateTimeFormat('en',{year:'numeric',month:'short',day:'numeric'});
function date(value:string|null){return value?dateFormatter.format(new Date(value)):'Never';}

export function MemberTable({members}:{members:MemberDirectoryRow[]}){
 return <section className={styles.directory}><div className={styles.directoryHeading}><div><span className="eyebrow">MEMBER DIRECTORY</span><h2>People in Land Club.</h2></div><span className="muted">{members.length} {members.length===1?'person':'people'}</span></div>{members.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Status</th><th>Last active</th><th>Joined</th></tr></thead><tbody>{members.map(member=><tr key={member.id}><td><strong>{member.name||'Name not added'}</strong></td><td>{member.email}</td><td><RoleEditor roles={member.roles} target={member.roleTarget} locked={member.rolesLocked}/></td><td><span className={`badge ${member.status==='active'?'':'sand'}`}>{member.status==='active'?'Active':'Invited'}</span></td><td>{date(member.lastActiveAt)}</td><td>{date(member.joinedAt)}</td></tr>)}</tbody></table></div>:<p className="empty">No members or invitations yet.</p>}</section>;
}
