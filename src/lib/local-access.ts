/** Temporary, explicit local-development access. Never authorizes hosted staff. */
export function localStaffAllowed(nodeEnv:string|undefined,enabled:string|undefined,host:string,port:string='3000'){
 return nodeEnv==='development'&&enabled==='1'&&/^[1-9][0-9]{0,4}$/.test(port)&&Number(port)<=65535&&(host===`127.0.0.1:${port}`||host===`localhost:${port}`);
}

/** Passwordless re-entry is restricted to an isolated embedded development preview. */
export function localPreviewSignInAllowed(nodeEnv:string|undefined,enabled:string|undefined,host:string,databaseUrl:string|undefined,authEnabled:boolean,port:string='3000'){
 return localStaffAllowed(nodeEnv,enabled,host,port)&&!databaseUrl&&!authEnabled;
}
