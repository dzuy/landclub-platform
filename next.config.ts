import type { NextConfig } from 'next';
const config:NextConfig={output:'standalone',serverExternalPackages:['@electric-sql/pglite','pg'],poweredByHeader:false,
 // Local financial review evidence must never be copied into deployment artifacts.
 outputFileTracingExcludes:{'/*':['./.data/investor-review/**/*']},
 redirects(){return [{source:'/staff/:path*',destination:'/dashboard/:path*',permanent:true}];}
};
export default config;
