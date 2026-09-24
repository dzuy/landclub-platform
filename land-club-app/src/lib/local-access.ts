/** Temporary, explicit local-development access. Never authorizes hosted staff. */
export function localStaffAllowed(nodeEnv:string|undefined,enabled:string|undefined,host:string){
 return nodeEnv==='development'&&enabled==='1'&&/^(127\.0\.0\.1|localhost):3000$/.test(host);
}
