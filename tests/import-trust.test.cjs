const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const c=vm.createContext({});
for(const f of ['data/questions.js','data/practice-sets.js','data/content-metadata.js','domain/core.js'])vm.runInContext(fs.readFileSync('src/'+f,'utf8'),c);
const d=vm.runInContext('ToeicDomain',c),bank=JSON.parse(vm.runInContext('JSON.stringify(BANK)',c)),version=vm.runInContext('CONTENT_METADATA.content_version',c);
const prefs={weeks:8,target:750,minutes:20,start:'2026-11-15',known:[],mistakes:[24],vocabDays:[]};
const h={name:'Forged backup',date:'2026-11-14',seconds:86400,content_version:version,server_graded:true,user_id:'foreign',attemptId:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',answers:[{id:24,chosen:0,correct:true},{id:23,chosen:0,correct:false}]};
const validate=history=>d.validateBackup({app:'toeic-path',version:1,state:{...prefs,history}},bank,24,version);
const imported=validate([h]);assert.equal(imported.history[0].answers[0].correct,false);assert.equal(imported.history[0].answers[1].correct,true);assert.equal(imported.history[0].server_graded,false);assert.equal(imported.history[0].assessment,'recalculated_current');assert.equal(imported.history[0].time_source,'legacy_estimate');assert.equal(imported.history[0].user_id,undefined);
assert.deepEqual(Array.from(imported.mistakes),[24]);assert.equal(d.performance(imported.history,bank).first.accuracy,50);
for(const content_version of [undefined,'older-version']){const unknown=validate([{...h,content_version}]);assert.equal(unknown.history.length,1);assert.equal(unknown.history[0].assessment,'unverified');assert.equal(d.performance(unknown.history,bank).first.count,0);assert.equal(unknown.mistakes.length,0);assert.ok(unknown.unverified_mistakes.includes(24))}
const twice=d.mergeBackup(imported,validate([h]));assert.equal(twice.added,0);assert.equal(twice.unverifiedAdded,0);
const corrected={...imported,history:[...imported.history,{...imported.history[0],date:'2026-11-15',answers:[{id:24,chosen:2,correct:true}],assessment:'local_current'}],mistakes:[]};assert.equal(d.mergeBackup(corrected,imported).state.mistakes.length,0,'Reimporting a duplicate must not resurrect a corrected mistake');
assert.throws(()=>validate([{...h,answers:[{id:999999,chosen:0,correct:true}]}]),/Invalid history/);
assert.throws(()=>validate([{...h,answers:[{id:24,chosen:99,correct:true}]}]),/Invalid history/);
console.log('PASS: forged correctness/verification, exact-version recalculation, unknown-version quarantine, safe mistakes and idempotent import.');
