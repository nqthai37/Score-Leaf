import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=['src/data/questions.js','src/data/practice-sets.js','src/data/heygen-part3.js','src/data/heygen-extra.js','src/data/content-metadata.js'];
const context=vm.createContext({});for(const file of files)vm.runInContext(await readFile(resolve(root,file),'utf8'),context,{filename:file});
const content=JSON.parse(vm.runInContext('JSON.stringify({questions:BANK,tests:PRACTICE_SETS,vocabulary:VOCAB,parts:PARTS,metadata:CONTENT_METADATA})',context));
const protectedPaths=[...files,'src/index.html','src/styles/main.css','src/styles/library.css','src/js/app.js','src/js/practice-library.js','src/js/daily-practice.js','src/data/content-bindings.json','src/js/activity.js','src/js/cloud.js','src/js/cloud-repository.js','src/js/server-practice.js','src/js/session.js','src/js/audio.js'];
// Freeze the original N0 database baseline. Later additive migrations are
// checked by their PostgreSQL tests, without rewriting the original snapshot.
for(const dir of ['src/domain','supabase/migrations'])for(const file of await readdir(resolve(root,dir))){if(dir==='supabase/migrations'&&file>'202611150006_import_provenance.sql')continue;protectedPaths.push(dir+'/'+file)}
const hashes={};for(const path of protectedPaths.sort())hashes[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
const snapshot={baselineCommit:'fd0583286830531c5c365c7fdca00405a8a3e259',bankVersion:content.metadata.content_version,questionIds:content.questions.map(q=>q.id),groupIds:[...new Set(content.questions.map(q=>q.group_id))],audioIds:content.metadata.audio.map(a=>a.id),testIds:content.tests.map(t=>t.id),protectedFiles:hashes};
const summary={contentVersion:content.metadata.content_version,questions:content.questions.length,groups:new Set(content.questions.map(q=>q.group_id)).size,audio:content.metadata.audio.length,tests:content.tests.length,vocabulary:content.vocabulary.length,parts:Object.entries(content.parts).filter(([,value])=>value).map(([part,value])=>({part:Number(part),name:value[0],category:Number(part)<=4?'Listening':'Reading',questions:content.questions.filter(q=>q.part===Number(part)).length})),testLibrary:content.tests.map(test=>({id:test.id,title:test.title,topic:test.topic,questions:test.questions.length,minutes:test.minutes}))};
for(const [path,value] of [['docs/migration/baseline.json',snapshot],['apps/web/src/generated/content-summary.json',summary]]){
 const output=JSON.stringify(value,null,2)+'\n';if(process.argv.includes('--check')){if(await readFile(resolve(root,path),'utf8')!==output)throw Error('Migration baseline changed: '+path)}else{await mkdir(resolve(root,path,'..'),{recursive:true});await writeFile(resolve(root,path),output)}
}
for(const name of ['main','library']){
 const original=await readFile(resolve(root,'src/styles/'+name+'.css'));
 const target=resolve(root,'apps/web/src/styles/legacy-'+name+'.css');
 if(process.argv.includes('--check')){if(!(await readFile(target)).equals(original))throw Error('Legacy CSS differs: '+name)}else{await mkdir(resolve(target,'..'),{recursive:true});await writeFile(target,original)}
}
console.log('PASS: baseline identities, domain/adapter/migration hashes and preview content inventory match.');
