import type { NextConfig } from 'next';
const config:NextConfig={output:'standalone',serverExternalPackages:['@electric-sql/pglite','pg'],poweredByHeader:false,
 // Local financial review evidence must never be copied into deployment artifacts.
 outputFileTracingExcludes:{'/*':['./.data/investor-review/**/*','./.data/investor-platform/**/*','./.data/backups/**/*']},
 headers(){return ['/dashboard/investor-preview/:path*','/dashboard/portfolio/reports/:path*'].map(source=>({source,headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'private, no-store'}]}));},
 redirects(){return [{source:'/staff/:path*',destination:'/dashboard/:path*',permanent:true}];}
};
export default config;
