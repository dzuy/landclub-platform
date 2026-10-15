import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const started=performance.now();
const result=spawnSync(process.execPath,['.scanner/scripts/document-worker.js','--probe'],{stdio:'inherit',timeout:150000});
const read=path=>{try{return readFileSync(path,'utf8').trim();}catch{return 'unavailable';}};
console.log(JSON.stringify({exitCode:result.status,signal:result.signal,elapsedSeconds:(performance.now()-started)/1000,memoryPeakBytes:read('/sys/fs/cgroup/memory.peak'),cpuStat:read('/sys/fs/cgroup/cpu.stat')}));
process.exit(result.status===0?0:1);
