import {execFile} from 'node:child_process';
import {isAbsolute} from 'node:path';
export function signatureDateFromVersion(output:string,now=Date.now()):number{
 const match=/^ClamAV [^/\r\n]+\/\d+\/([^\r\n]+)\s*$/.exec(output.trim());
 const date=match?Date.parse(match[1]+' UTC'):NaN;
 if(!Number.isFinite(date)||date>now||now-date>=7*24*60*60*1000)throw new Error('Scanner signatures unavailable or stale.');
 return date;
}
// --version reads signature metadata without loading the scanning engine.
export async function readScannerSignatureDate(executable=process.env.LAND_CLUB_CLAMSCAN_PATH):Promise<number>{
 if(!executable||!isAbsolute(executable))throw new Error('Scanner executable unavailable.');
 const output=await new Promise<string>((resolve,reject)=>execFile(executable,['--version'],{timeout:5000,maxBuffer:4096,env:{PATH:process.env.PATH,NODE_ENV:process.env.NODE_ENV,TZ:'UTC',LC_ALL:'C'}},(error,stdout)=>error?reject(new Error('Scanner metadata unavailable.')):resolve(stdout)));
 return signatureDateFromVersion(output);
}
