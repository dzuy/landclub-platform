import {scanWithClamAV,type ScanResult} from './document-scanner';
// EICAR is the standard harmless antivirus test fixture, never an investor document.
export async function probeScanner(scan:(bytes:Uint8Array)=>Promise<ScanResult>=scanWithClamAV){
 if(await scan(Buffer.from('Land Club synthetic clean scanner probe.'))!=='clean')throw new Error('Scanner clean-file probe failed.');
 const eicar='X5O!P%@AP[4\\PZX54(P^)7CC)7}$'+'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
 if(await scan(Buffer.from(eicar))!=='blocked')throw new Error('Scanner detection probe failed.');
}
