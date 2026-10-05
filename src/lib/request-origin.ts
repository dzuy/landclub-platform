// Next's internal URL may use localhost even when the browser requested 127.0.0.1.
// Compare against the actual HTTP Host, not a forwarded host supplied by a client.
export function hasSameOrigin(request:Request){
 const origin=request.headers.get('origin'),host=request.headers.get('host');
 if(!origin||!host)return false;
 try{
  const source=new URL(origin),target=new URL(request.url);
  const authority=new URL(`${target.protocol}//${host}`);
  return source.origin===origin&&source.origin===authority.origin;
 }catch{return false;}
}
