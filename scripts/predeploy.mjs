import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Railway invokes one executable; do not depend on shell parsing of &&.
for (const script of ['check-environment.mjs','migrate.mjs','seed-demo.mjs']) {
  console.log(`Pre-deploy: ${script}`);
  const result=spawnSync(process.execPath,[fileURLToPath(new URL(script,import.meta.url))],{stdio:'inherit',env:process.env});
  if(result.error||result.status!==0){console.error(`Pre-deploy step failed: ${script}`);process.exit(result.status||1);}
}
