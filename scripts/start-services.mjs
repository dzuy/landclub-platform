import {spawn} from 'node:child_process';
import {rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export function supervise(commands,{launch=spawn,exit=code=>process.exit(code),onSignal=(name,handler)=>process.on(name,handler),schedule=setTimeout,cancel=clearTimeout,markUnavailable=()=>rmSync('/tmp/land-club-scanner-health.json',{force:true}),now=Date.now}={}){
 let stopping=false,exitCode=1,worker,web,retryTimer,attempts=0;
 const children=()=>[web,worker].filter(Boolean);
 function maybeExit(){if(stopping&&children().every(child=>child.exitCode!==null))exit(exitCode);}
 function stop(code){if(stopping)return;stopping=true;exitCode=code;if(retryTimer)cancel(retryTimer);markUnavailable();for(const child of children())child.kill('SIGTERM');schedule(()=>{for(const child of children())child.kill('SIGKILL');exit(code);},5000);maybeExit();}
 function startWorker(){
  if(stopping)return;
  const started=now();let handled=false;
  worker=launch(process.execPath,commands[1],{stdio:'inherit',env:process.env});
  const failed=()=>{if(handled)return;handled=true;markUnavailable();if(stopping){maybeExit();return;}attempts=now()-started>=300000?1:attempts+1;const wait=Math.min(300000,5000*2**Math.min(attempts-1,6));console.error(`Document worker unavailable; retrying in ${wait/1000}s. Website remains available.`);retryTimer=schedule(startWorker,wait);};
  worker.on('error',failed);worker.on('exit',failed);
 }
 web=launch(process.execPath,commands[0],{stdio:'inherit',env:process.env});
 web.on('error',()=>stop(1));web.on('exit',()=>{if(!stopping)stop(1);else maybeExit();});
 startWorker();onSignal('SIGTERM',()=>stop(0));onSignal('SIGINT',()=>stop(0));
 return {stop};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 rmSync('/tmp/land-club-scanner-health.json',{force:true});
 supervise([['server.js'],['.scanner/scripts/document-worker.js']]);
}
