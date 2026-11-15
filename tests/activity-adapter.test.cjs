const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const modules=['src/domain/activity.js','src/js/activity.js'];
(async()=>{
 let mono=0,wall=Date.parse('2026-11-15T10:00:00Z'),seq=0,stored=new Map(),accepted=new Map(),lost=true,daySeconds=0;
 const events={},timers=[];
 const repository={claimActivity:async()=>({owned:true,server_now:new Date(wall).toISOString()}),releaseActivity:async()=>{},recordActivity:async(_a,_s,segment)=>{if(!accepted.has(segment.id)){accepted.set(segment.id,segment);daySeconds+=segment.milliseconds/1000}if(lost){lost=false;throw Error('Lost ack')}return {id:segment.id}},activityDays:async()=>({'2026-11-15':daySeconds})};
 const c=vm.createContext({console,Date,Intl,Math,JSON,Number,Object,Promise,performance:{now:()=>mono},crypto:{randomUUID:()=>`id-${++seq}`},ToeicCloud:{user:{id:'A'},repository},document:{visibilityState:'visible',querySelectorAll:()=>[],addEventListener:(name,fn)=>events[name]=fn},window:{addEventListener:(name,fn)=>events[name]=fn},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},setTimeout:fn=>{timers.push(fn)},persistQuiz(){},toast(){}});
 vm.runInContext("let quiz={id:'attempt',remote:{},activeMilliseconds:0},storageKey='A',recordedAudio=null;",c);
 for(const file of modules)vm.runInContext(fs.readFileSync(file,'utf8'),c);
 const run=s=>vm.runInContext(s,c),settle=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve))};
 run('startStudyActivity()');await settle();
 for(let i=0;i<15;i++){mono+=1000;wall+=1000;run('StudyActivity.current.meter.interact()')}
 await run('flushActivity()');assert.equal(accepted.size,1);assert.equal(run('StudyActivity.current.pending.length'),1);assert.equal(run('StudyActivity.current.status'),'error','A lost ack cannot be labelled saved');
 await run('flushActivity()');assert.equal(accepted.size,1);assert.equal(run('StudyActivity.current.pending.length'),0);assert.equal(run('activeStudyDays()["2026-11-15"]'),15,'Retry reads authoritative days rather than double-incrementing');
 run("document.visibilityState='hidden'");events.visibilitychange();await settle();mono+=1800000;wall+=1800000;run("document.visibilityState='visible'");events.visibilitychange();
 for(let i=0;i<3;i++){mono+=1000;wall+=1000;run('StudyActivity.current.meter.interact()')}
 await run('flushActivity()');assert.equal(daySeconds,18);
 run('stopStudyActivity()');await settle();run("ToeicCloud.user={id:'B'}");assert.deepEqual(JSON.parse(run('JSON.stringify(activeStudyDays())')),{},'A activity totals are never exposed to B');
 run('quiz=null');for(const fn of timers.slice())fn();await settle();
 console.log('PASS: activity adapter acknowledgements, lost-response dedupe, hidden resume and account isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
