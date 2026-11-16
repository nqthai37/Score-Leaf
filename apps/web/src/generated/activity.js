// Approximate engagement, independent from exam deadlines and wall-clock changes.
function createActivityClock({now,wallNow,id,onSegment,idleMs=120000,chunkMs=15000}){
 const clockNow=()=>Math.floor(now());
 const base=clockNow(),epoch=wallNow();let last=base,input=base,visible=true,listening=false,start=null,milliseconds=0;
 const stamp=t=>new Date(epoch+t-base).toISOString();
 function flush(){if(milliseconds>0){const segment={id:id(),start:stamp(start),end:stamp(start+milliseconds),milliseconds};start=null;milliseconds=0;onSegment(segment)}}
 function add(from,to){while(to>from){if(start!==null&&start+milliseconds!==from)flush();if(start===null)start=from;const amount=Math.min(to-from,chunkMs-milliseconds);milliseconds+=amount;from+=amount;if(milliseconds>=chunkMs)flush()}}
 function tick(){const current=clockNow();if(current<last||current-last>5000){flush();last=current;return}if(visible){const until=listening?current:Math.min(current,input+idleMs);if(until>last)add(last,until)}last=current}
 return {tick,flush(){tick();flush()},interact(){tick();input=clockNow()},setVisible(value){value=!!value;if(value===visible)return;tick();visible=value;if(!visible)flush();else input=clockNow()},setListening(value){tick();listening=!!value},stop(){tick();flush();visible=false}};
}
function activityDay(value,timezone){const values=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));return `${values.year}-${values.month}-${values.day}`}
function splitActivityDays(segments,timezone){
 const days={};for(const segment of segments){let from=Date.parse(segment.start),end=Date.parse(segment.end);if(!Number.isFinite(from)||!Number.isFinite(end)||end<=from)continue;
  while(from<end){const day=activityDay(from,timezone);let boundary=end;if(activityDay(end-1,timezone)!==day){let low=from,high=end;while(high-low>1){const mid=Math.floor((low+high)/2);if(activityDay(mid,timezone)===day)low=mid;else high=mid}boundary=high}days[day]=(days[day]||0)+(boundary-from)/1000;from=boundary}
 }return days;
}


export {createActivityClock,activityDay,splitActivityDays};
