/** Temporary, explicit local-development access. Never authorizes hosted staff. */
export function localStaffAllowed(nodeEnv:string|undefined,enabled:string|undefined,host:string){
 return nodeEnv==='development'&&enabled==='1'&&/^(127\.0\.0\.1|localhost):3000$/.test(host);
}

/** Passwordless re-entry is restricted to an isolated embedded development preview. */
export function localPreviewSignInAllowed(nodeEnv:string|undefined,enabled:string|undefined,host:string,databaseUrl:string|undefined,authEnabled:boolean){
 return localStaffAllowed(nodeEnv,enabled,host)&&!databaseUrl&&!authEnabled;
}
