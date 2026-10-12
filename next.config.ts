import type { NextConfig } from 'next';
const config:NextConfig={output:'standalone',serverExternalPackages:['@electric-sql/pglite','pg'],poweredByHeader:false,
 redirects(){return [{source:'/staff/:path*',destination:'/dashboard/:path*',permanent:true}];}
};
export default config;
