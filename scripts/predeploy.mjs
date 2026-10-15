import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Probe the packaged scanner before migrations can quarantine existing documents.
const scanner=spawnSync(process.execPath,['.scanner/scripts/document-worker.js','--probe'],{stdio:'inherit',env:process.env,timeout:120000});
if(scanner.error||scanner.status!==0){console.error('Scanner pre-deploy probe failed; migrations were not started.');process.exit(1);}

// Railway invokes one executable; do not depend on shell parsing of &&.
for (const script of ['check-environment.mjs','migrate.mjs','seed-demo.mjs']) {
  console.log(`Pre-deploy: ${script}`);
  const result=spawnSync(process.execPath,[fileURLToPath(new URL(script,import.meta.url))],{stdio:'inherit',env:process.env});
  if(result.error||result.status!==0){console.error(`Pre-deploy step failed: ${script}`);process.exit(result.status||1);}
}
