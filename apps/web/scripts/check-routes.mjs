import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const reserve=createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
const origin=process.env.PREVIEW_BASE_URL||`http://127.0.0.1:${port}`;
let server,logs='';
try{
 if(!process.env.PREVIEW_BASE_URL){server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd,stdio:['ignore','pipe','pipe']});for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>{logs=(logs+chunk.toString()).slice(-6000)})}
 let ready=false;for(let i=0;i<80;i++){try{const result=await fetch(origin+'/dashboard');if(result.ok){ready=true;break}}catch{}if(server?.exitCode!==null&&server?.exitCode!==undefined)break;await new Promise(resolve=>setTimeout(resolve,250))}assert.ok(ready,'Production server did not become ready: '+logs);
 const pages=['/dashboard','/plan','/practice','/practice/session','/practice/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','/tests','/review','/vocabulary','/progress','/settings'];
 const results=await Promise.allSettled(pages.map(async path=>{for(let visit=0;visit<2;visit++){const result=await fetch(origin+path);assert.equal(result.status,200,path);const html=await result.text();assert.ok(html.includes('A first look at your next study space.'),path+' preview disclosure');assert.ok(html.includes('nqthai37.github.io/toeic-path/'),path+' current site link');assert.ok(!html.includes('/js/app.js'),path+' must not bootstrap the legacy DOM app');if(path.includes('/practice/a'))assert.match(result.headers.get('cache-control'),/private|no-store/)}return path}));
 for(const result of results){if(result.status==='rejected')throw result.reason}
 const root=await fetch(origin+'/',{redirect:'manual'});assert.equal(root.status,307);assert.equal(root.headers.get('location'),'/dashboard');
 assert.equal((await fetch(origin+'/missing-page')).status,404);const invalid=await fetch(origin+'/practice/invalid-attempt');assert.ok([200,404].includes(invalid.status));assert.ok((await invalid.text()).includes('This page is not here.'),'Streamed invalid sessions render the not-found view');
 const callback=await fetch(origin+'/auth/callback?code=private-code&next=https://example.com',{redirect:'manual'});assert.equal(callback.status,303);assert.equal(callback.headers.get('location'),'/settings?signin=not-ready');assert.match(callback.headers.get('cache-control'),/no-store/);assert.equal(callback.headers.get('referrer-policy'),'no-referrer');
 assert.match(await (await fetch(origin+'/robots.txt')).text(),/Disallow: \//);
 const illustration=await fetch(origin+'/illustrations/study-books.svg');assert.equal(illustration.status,200);assert.match(await illustration.text(),/<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 console.log('PASS: direct and repeated requests to all preview routes, private session cache, redirects, callback hygiene, 404 and SVG asset.');
}finally{if(server&&server.exitCode===null&&server.signalCode===null){const exited=new Promise(resolve=>server.once('exit',resolve));server.kill();await exited}}
