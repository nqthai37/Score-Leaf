// Reserved until N4. Do not forward supplied auth codes, hosts or return URLs.
export const dynamic="force-dynamic";
export function GET(){return new Response(null,{status:303,headers:{Location:"/settings?signin=not-ready","Cache-Control":"no-store","Referrer-Policy":"no-referrer"}})}
