// Pure learning logic shared by the web and a future native adapter.
// No DOM, storage, clock, network or global content dependencies.
const ToeicDomain=(()=>{
 const accuracy=answers=>answers.length?Math.round(100*answers.filter(a=>a.correct).length/answers.length):0;
 function shuffle(values,random=Math.random){const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
 function prioritized(pool,history,random=Math.random){
  const seen=new Map();history.forEach((h,index)=>h.answers.forEach(a=>{if(a.chosen!==null)seen.set(a.id,index+1)}));
  return shuffle(pool,random).sort((a,b)=>(seen.get(a.id)||0)-(seen.get(b.id)||0));
 }
 function groups(pool){
  const result=new Map();for(const q of pool){const key=q.group_id||'question-'+q.id;if(!result.has(key))result.set(key,[]);result.get(key).push(q)}
  return [...result.values()].map(items=>({id:items[0].group_id||'question-'+items[0].id,part:items[0].part,questions:items.sort((a,b)=>a.id-b.id),seconds:items[0].group_estimated_seconds||items.reduce((n,q)=>n+(q.estimated_seconds||45),0)}));
 }
 function selectQuestions(pool,count,history=[],{balanced=false,random=Math.random}={}){
  const ranked=prioritized(pool,history,random),ranks=new Map(ranked.map((q,i)=>[q.id,i]));
  const candidates=groups(pool).sort((a,b)=>Math.min(...a.questions.map(q=>ranks.get(q.id)))-Math.min(...b.questions.map(q=>ranks.get(q.id))));
  const chosen=[];
  if(balanced)for(const part of [...new Set(pool.map(q=>q.part))]){
   const available=candidates.filter(g=>g.part===part),min=Math.min(...available.map(g=>g.questions.length));
   const group=available.find(g=>g.questions.length===min);if(group)chosen.push(group);
  }
  const initial=chosen.reduce((n,g)=>n+g.questions.length,0),remaining=Math.max(0,count-initial),used=new Set(chosen.map(g=>g.id));
  // Keep whole groups. Fill the requested count when possible, otherwise the
  // closest smaller count; the seven-part minimum may exceed a short request.
  const possibilities=new Map([[0,[]]]);
  for(const group of candidates.filter(g=>!used.has(g.id)))for(const [size,selected] of [...possibilities].sort((a,b)=>b[0]-a[0])){
   const next=size+group.questions.length;if(next<=remaining&&!possibilities.has(next))possibilities.set(next,[...selected,group]);
  }
  chosen.push(...possibilities.get(Math.max(...possibilities.keys())));
  return chosen.flatMap(g=>g.questions).sort((a,b)=>a.part-b.part||a.id-b.id);
 }
 function selectWithinBudget(pool,seconds,history=[]){
  if(!Number.isInteger(seconds)||seconds<0)throw Error('Invalid time budget');
  const order=new Map(prioritized(pool,history).map((q,i)=>[q.id,i]));
  const available=groups(pool).sort((a,b)=>Math.min(...a.questions.map(q=>order.get(q.id)))-Math.min(...b.questions.map(q=>order.get(q.id))));
  const selected=[];let used=0;
  for(const group of available)if(used+group.seconds<=seconds){selected.push(group);used+=group.seconds}
  return {groups:selected,estimated_seconds:used,remaining_seconds:seconds-used,reason:selected.length?'within-budget':'no-complete-group-fits',shortest_group_seconds:available.length?Math.min(...available.map(g=>g.seconds)):null};
 }
 const evidenceHistory=history=>history.filter(h=>h.assessment==='local_current'||h.assessment==='recalculated_current'||h.source==='server_practice'&&h.server_graded===true);
 function performance(history,bank){
  const lookup=new Map(bank.map(q=>[q.id,q])),first=[],repeats=[],seen=new Set(),skills=new Map();
  const ordered=evidenceHistory(history).map((h,index)=>({h,index})).sort((a,b)=>Date.parse(a.h.date)-Date.parse(b.h.date)||a.index-b.index);
  for(const {h} of ordered)for(const answer of h.answers){
   if(answer.chosen===null||!lookup.has(answer.id))continue;
   if(seen.has(answer.id)){repeats.push(answer);continue}seen.add(answer.id);first.push(answer);
   const q=lookup.get(answer.id);if(q.metadata_status!=='reviewed')continue;
   for(const skill of q.skill_tags){if(!skills.has(skill))skills.set(skill,{id:skill,attempts:0,wrong:0});const item=skills.get(skill);item.attempts++;if(!answer.correct)item.wrong++}
  }
  return {parts:Array.from({length:7},(_,i)=>{const answers=first.filter(a=>lookup.get(a.id).part===i+1);return {part:i+1,count:answers.length,accuracy:accuracy(answers),confidence:answers.length>=5?'limited':'low'}}),first:{count:first.length,accuracy:accuracy(first)},repeats:{count:repeats.length,accuracy:accuracy(repeats)},skills:[...skills.values()].map(s=>({...s,confidence:s.attempts>=5?'enough-data':'low'}))};
 }
 function reviewSchedule(history,bank,{today,timezone='Asia/Ho_Chi_Minh'}={}){
  const lookup=new Map(bank.map(q=>[q.id,q])),items=new Map(),recall=[];
  const day=value=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`};
  const plus=(date,n)=>{const value=new Date(date+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+n);return value.toISOString().slice(0,10)};
  for(const session of evidenceHistory(history).slice().sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))){const date=day(session.date);
   for(const answer of session.answers){if(!lookup.has(answer.id))continue;const previous=items.get(answer.id),spaced=previous&&date>=previous.due&&date!==previous.last_day&&answer.chosen!==null;
    if(spaced)recall.push(answer);
    if(!answer.correct){items.set(answer.id,{id:answer.id,stage:0,due:plus(date,1),last_day:date,spaced_correct:previous?.spaced_correct||0});continue}
    if(previous){if(spaced){previous.stage=Math.min(2,previous.stage+1);previous.due=plus(date,previous.stage===1?3:7);previous.spaced_correct++}previous.last_day=date}
   }
  }
  const result=[...items.values()];return {items:result,due:result.filter(item=>today&&item.due<=today),recall:{count:recall.length,accuracy:accuracy(recall)}};
 }
 function score(questions,answers){return questions.map(q=>({id:q.id,chosen:answers[q.id]??null,correct:answers[q.id]===q.answer}))}
 function validateBackup(data,bank,vocabularyCount,currentVersion=null){
  const s=data?.state,lookup=new Map(bank.map(q=>[q.id,q]));
  const validId=id=>Number.isInteger(id)&&lookup.has(id),date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
  if(data?.app!=='toeic-path'||data.version!==1||!s||![4,8,12].includes(s.weeks)||![20,30,45,60,90,120].includes(s.minutes)||!Number.isInteger(s.target)||s.target<10||s.target>990||s.target%5||!date(s.start))throw Error('Invalid preferences');
  if(!Array.isArray(s.history)||s.history.length>10000||!s.history.every(h=>typeof h.name==='string'&&h.name.length<=300&&date(h.date)&&Number.isFinite(h.seconds)&&h.seconds>=0&&h.seconds<=86400&&Array.isArray(h.answers)&&h.answers.length<=bank.length&&new Set(h.answers.map(a=>a.id)).size===h.answers.length&&h.answers.every(a=>validId(a.id)&&typeof a.correct==='boolean'&&(a.chosen===null||(Number.isInteger(a.chosen)&&a.chosen>=0&&a.chosen<lookup.get(a.id).options.length)))))throw Error('Invalid history');
  if(!Array.isArray(s.mistakes)||!s.mistakes.every(validId)||!Array.isArray(s.known)||!s.known.every(i=>Number.isInteger(i)&&i>=0&&i<vocabularyCount)||!Array.isArray(s.vocabDays)||!s.vocabDays.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&date(d)&&new Date(d).toISOString().slice(0,10)===d))throw Error('Invalid progress');
  const history=s.history.map(h=>{
   const compatible=!!currentVersion&&h.content_version===currentVersion;
   return {date:h.date,name:h.name,seconds:h.seconds,time_source:'legacy_estimate',legacy_seconds:h.seconds,setId:Number.isInteger(h.setId)?h.setId:null,
    ...(typeof h.attemptId==='string'&&h.attemptId.length<=100?{attemptId:h.attemptId}:{}),content_version:typeof h.content_version==='string'?h.content_version:null,
    source:'imported_practice',assessment:compatible?'recalculated_current':'unverified',server_graded:false,
    answers:h.answers.map(a=>({id:a.id,chosen:a.chosen,correct:compatible?a.chosen===lookup.get(a.id).answer:a.correct}))};
  });
  const latest=new Map();for(const h of evidenceHistory(history).slice().sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)))for(const a of h.answers)latest.set(a.id,a.correct);
  const mistakes=[...latest].filter(([,correct])=>!correct).map(([id])=>id);
  const unverified=new Set([...(Array.isArray(s.unverified_mistakes)?s.unverified_mistakes:[]).filter(validId),...s.mistakes.filter(id=>!latest.has(id))]);
  for(const h of history.filter(h=>h.assessment==='unverified'))for(const a of h.answers)if(!a.correct)unverified.add(a.id);
  return {weeks:s.weeks,target:s.target,minutes:s.minutes,start:s.start,history,mistakes,unverified_mistakes:[...unverified],known:[...new Set(s.known)],vocabDays:[...new Set(s.vocabDays)]};
 }
 const historyKey=h=>JSON.stringify([h.date,h.name,h.answers.map(a=>[a.id,a.chosen])]);
 function mergeBackup(current,incoming){
  const keys=new Set(current.history.map(historyKey)),added=incoming.history.filter(h=>{const key=historyKey(h);if(keys.has(key))return false;keys.add(key);return true});
  const history=[...current.history,...added].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)),latest=new Map();
  for(const h of evidenceHistory(history))for(const answer of h.answers)latest.set(answer.id,answer.correct);
  const mistakes=[...new Set([...current.mistakes.filter(id=>!latest.has(id)),...[...latest].filter(([,correct])=>!correct).map(([id])=>id)])];
  return {state:{...current,history,mistakes,unverified_mistakes:[...new Set([...(current.unverified_mistakes||[]),...(incoming.unverified_mistakes||[])])],known:[...new Set([...current.known,...incoming.known])],vocabDays:[...new Set([...current.vocabDays,...incoming.vocabDays])]},added:added.length,unverifiedAdded:added.filter(h=>h.assessment==='unverified').length,duplicates:incoming.history.length-added.length};
 }
 return {accuracy,evidenceHistory,reviewSchedule,shuffle,prioritized,groups,selectQuestions,selectWithinBudget,performance,score,validateBackup,mergeBackup};
})();


export default ToeicDomain;
