// Activity is a separate ledger, never inferred from start/submit or an imported duration.
const StudyActivity={current:null,days:{},owner:null};
function studyTimezone(){return Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Ho_Chi_Minh'}
function activeStudyDays(){if(ToeicCloud.user)return StudyActivity.owner===ToeicCloud.user.id?StudyActivity.days:{};try{return JSON.parse(localStorage.getItem(storageKey+'-active-days')||'{}')}catch{return {}}}
function activityMessage(){const run=StudyActivity.current;if(!run)return '';return run.status==='other'?'Study time is being recorded in another tab.':run.status==='error'?'Study time is not synced · retry when connected.':run.status==='saving'?'Saving active study time…':`Estimated active study: ${Math.floor((run.attempt.activeMilliseconds||0)/60000)}:${String(Math.floor((run.attempt.activeMilliseconds||0)/1000)%60).padStart(2,'0')} · pauses when hidden or idle`}
function updateActivityStatus(){document.querySelectorAll('[data-activity-status]').forEach(node=>{node.textContent=activityMessage()})}
async function refreshActivityDays(){const owner=ToeicCloud.user?.id;if(!owner||!ToeicCloud.repository?.activityDays)return;const days=await ToeicCloud.repository.activityDays(studyTimezone());if(ToeicCloud.user?.id!==owner)return;StudyActivity.owner=owner;StudyActivity.days=days}
function persistActivityPending(run){try{localStorage.setItem(run.key,JSON.stringify({source:run.source,segments:run.pending}))}catch{run.status='error'}}
async function flushActivity(run=StudyActivity.current){
 if(!run)return true;run.meter?.flush();if(!run.remote)return true;if(run.flushing)return run.flushing;
 run.flushing=(async()=>{
  while(run.pending.length&&ToeicCloud.user?.id===run.owner){const segment=run.pending[0];run.status='saving';updateActivityStatus();
   try{const ack=await ToeicCloud.repository.recordActivity(run.attempt.id,run.source,segment);if(ack?.id!==segment.id)throw Error('Invalid acknowledgement');run.pending.shift();persistActivityPending(run)}catch{run.status='error';updateActivityStatus();return false}
  }
  if(ToeicCloud.user?.id!==run.owner)return false;
  try{await refreshActivityDays()}catch{run.status='error';updateActivityStatus();return false}
  run.status='ready';updateActivityStatus();return true;
 })().finally(()=>{run.flushing=null;if(run.pending.length&&run.status==='ready')setTimeout(()=>void flushActivity(run),0)});return run.flushing;
}
function stopStudyActivity(){const run=StudyActivity.current;if(!run)return;run.meter?.stop();run.stopped=true;StudyActivity.current=null;
 if(run.remote)flushActivity(run).then(saved=>{if(saved&&ToeicCloud.user?.id===run.owner)ToeicCloud.repository.releaseActivity(run.attempt.id,run.source).catch(()=>{})});
 else try{const lease=JSON.parse(localStorage.getItem(run.leaseKey)||'null');if(lease?.source===run.source)localStorage.removeItem(run.leaseKey)}catch{}
}
function startStudyActivity(){
 if(!quiz||typeof performance==='undefined'||typeof crypto==='undefined')return;
 if(StudyActivity.current?.attempt===quiz)return;stopStudyActivity();
 const run={attempt:quiz,owner:ToeicCloud.user?.id||null,remote:!!quiz.remote,source:crypto.randomUUID(),pending:[],status:'ready',renewAt:0,leaseUntil:0,meter:null,stopped:false};
 run.key=storageKey+'-activity-outbox-'+quiz.id;run.leaseKey=storageKey+'-activity-lease';StudyActivity.current=run;
 async function claim(){
  if(run.stopped||run.claiming)return;run.claiming=true;
  try{
   let owned=true,epoch=Date.now();
   if(run.remote){if(ToeicCloud.user?.id!==run.owner)return;const lease=await ToeicCloud.repository.claimActivity(run.attempt.id,run.source);owned=lease.owned;epoch=Date.parse(lease.server_now)}
   else{const old=JSON.parse(localStorage.getItem(run.leaseKey)||'null');owned=!old||old.source===run.source||old.until<=Date.now();if(owned)localStorage.setItem(run.leaseKey,JSON.stringify({source:run.source,until:Date.now()+45000}))}
   if(run.stopped)return;run.renewAt=performance.now()+15000;run.leaseUntil=owned?performance.now()+40000:0;
   if(!owned){run.status='other';run.meter?.setVisible(false);return}
   run.status='ready';
   if(!run.meter)run.meter=createActivityClock({now:()=>performance.now(),wallNow:()=>epoch,id:()=>crypto.randomUUID(),onSegment:segment=>{
    if(run.attempt.limit&&run.attempt.deadline){const end=Math.min(Date.parse(segment.end),run.attempt.deadline),start=Date.parse(segment.start);if(end<=start)return;segment={...segment,end:new Date(end).toISOString(),milliseconds:end-start}}
    run.attempt.activeMilliseconds=(run.attempt.activeMilliseconds||0)+segment.milliseconds;
    if(run.remote){run.pending.push(segment);persistActivityPending(run);setTimeout(()=>void flushActivity(run),0)}
    else{const days=activeStudyDays(),addition=splitActivityDays([segment],studyTimezone());for(const [day,seconds] of Object.entries(addition))days[day]=(days[day]||0)+seconds;localStorage.setItem(storageKey+'-active-days',JSON.stringify(days));persistQuiz()}
   }});
   run.meter.setVisible(document.visibilityState!=='hidden');
  }catch{run.status='error';run.renewAt=performance.now()+15000}finally{run.claiming=false;updateActivityStatus()}
 }
 function step(){if(run.stopped)return;if(quiz!==run.attempt||ToeicCloud.user?.id!==run.owner&&run.remote){stopStudyActivity();return}
  if(performance.now()>=run.renewAt&&document.visibilityState!=='hidden')void claim();
  if(run.meter){const valid=performance.now()<run.leaseUntil;run.meter.setVisible(valid&&document.visibilityState!=='hidden');run.meter.setListening(typeof recordedAudio!=='undefined'&&!!recordedAudio&&!recordedAudio.paused&&!recordedAudio.ended&&recordedAudio.readyState>=3);run.meter.tick();}
  setTimeout(step,1000);
 }
 async function restorePending(){
  try{const previous=JSON.parse(localStorage.getItem(run.key)||'null');if(previous?.source&&Array.isArray(previous.segments)&&previous.segments.length&&run.remote){
   for(const segment of [...previous.segments]){if(run.stopped||ToeicCloud.user?.id!==run.owner)return;const ack=await ToeicCloud.repository.recordActivity(run.attempt.id,previous.source,segment);if(ack?.id!==segment.id)throw Error('Invalid acknowledgement');previous.segments.shift();localStorage.setItem(run.key,JSON.stringify(previous))}
  }}catch{const previous=localStorage.getItem(run.key);if(previous)localStorage.setItem(run.key+'-previous',previous);toast('Some earlier study time could not sync. A local copy was kept; it is not included in your daily budget.')}
  if(!run.stopped){void claim();setTimeout(step,1000)}
 }
 void restorePending();
}
document.addEventListener('visibilitychange',()=>{const run=StudyActivity.current;run?.meter?.setVisible(document.visibilityState!=='hidden');if(document.visibilityState==='hidden')void flushActivity(run)});
for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,()=>StudyActivity.current?.meter?.interact(),{passive:true});
window.addEventListener('pagehide',()=>{stopStudyActivity()});
window.addEventListener('online',()=>{void flushActivity()});
