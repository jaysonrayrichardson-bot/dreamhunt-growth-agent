(function(){
'use strict';
let dashTimer=null;
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const money=v=>{const n=Number(v||0);if(Math.abs(n)>=1000000)return '$'+(n/1000000).toFixed(1).replace('.0','')+'M';if(Math.abs(n)>=1000)return '$'+(n/1000).toFixed(n>=100000?0:1).replace('.0','')+'K';return '$'+n.toLocaleString()};
const compact=v=>{const n=Number(v||0);if(n>=1000000)return (n/1000000).toFixed(1).replace('.0','')+'M';if(n>=1000)return (n/1000).toFixed(1).replace('.0','')+'K';return n.toLocaleString()};
const isLive=()=>typeof liveMode!=='undefined'&&liveMode&&typeof liveOrgId!=='undefined'&&!!liveOrgId;

function dashboardEls(){
 const sec=document.getElementById('dashboard');if(!sec)return null;
 const topStats=sec.querySelectorAll(':scope > .grid.stats > .stat');
 const lowerCards=sec.querySelectorAll(':scope > .grid.two');
 const pipelineCard=lowerCards[1]?.querySelector('.card:first-child')||null;
 const storyCard=lowerCards[1]?.querySelector('.card:last-child')||null;
 return{sec,topStats,pipelineCard,storyCard};
}
function setStat(el,label,value,trend,kind=''){
 if(!el)return;const k=el.querySelector('.k'),v=el.querySelector('.v'),t=el.querySelector('.trend');
 if(k)k.textContent=label;if(v)v.textContent=value;if(t){t.textContent=trend;t.className='trend'+(kind?' '+kind:'')}
}
function demoDashboard(){
 const e=dashboardEls();if(!e)return;
 setStat(e.topStats[0],'Sponsor pipeline','$126,500','Illustrative qualified opportunity');
 setStat(e.topStats[1],'30-day reach','418K','Illustrative cross-channel reach');
 setStat(e.topStats[2],'Content ready','12','5 illustrative items waiting for approval','warn');
 setStat(e.topStats[3],'Sponsor deliverables','91%','Illustrative fulfillment pace');
 if(e.pipelineCard){
  const pipes=e.pipelineCard.querySelectorAll('.pipe');
  const vals=[['Prospects','$48K'],['Outreach','$33K'],['Proposal','$27K'],['Renewal','$18.5K']];
  pipes.forEach((p,i)=>{if(!vals[i])return;p.querySelector('small').textContent=vals[i][0];p.querySelector('b').textContent=vals[i][1]});
  const bar=e.pipelineCard.querySelector('.bar i');if(bar)bar.style.width='72%';
  const note=e.pipelineCard.querySelector('.bar + small');if(note)note.textContent='Illustrative demo sponsor pipeline.';
 }
}
async function queryDashboard(){
 const now=new Date(),thirty=new Date(now.getTime()-30*86400000),weekEnd=new Date(now.getTime()+7*86400000);
 const [sponsorsR,metricsR,readyR,pendingR,deliverablesR,scheduledR,activitiesR]=await Promise.all([
  sb.from('dh_sponsors').select('id,name,stage,opportunity_value,next_action,next_action_at,cash_value,in_kind_value').eq('org_id',liveOrgId),
  sb.from('dh_metric_snapshots').select('reach,impressions,engagements,snapshot_date').eq('org_id',liveOrgId).gte('snapshot_date',thirty.toISOString().slice(0,10)).lte('snapshot_date',now.toISOString().slice(0,10)),
  sb.from('dh_content_items').select('id',{count:'exact',head:true}).eq('org_id',liveOrgId).eq('status','approved').is('published_at',null),
  sb.from('dh_agent_actions').select('id,action_type',{count:'exact'}).eq('org_id',liveOrgId).eq('status','queued'),
  sb.from('dh_sponsor_deliverables').select('quantity_committed,quantity_delivered,status').eq('org_id',liveOrgId),
  sb.from('dh_content_items').select('id,content_type,platform,status,scheduled_for,sponsor_id').eq('org_id',liveOrgId).gte('scheduled_for',now.toISOString()).lte('scheduled_for',weekEnd.toISOString()).order('scheduled_for'),
  sb.from('dh_activities').select('id',{count:'exact',head:true}).eq('org_id',liveOrgId).gte('starts_at',new Date(now.getFullYear(),0,1).toISOString()).lte('starts_at',now.toISOString())
 ]);
 const err=[sponsorsR,metricsR,readyR,pendingR,deliverablesR,scheduledR,activitiesR].find(x=>x.error)?.error;if(err)throw err;
 const sponsors=sponsorsR.data||[],metrics=metricsR.data||[],delivs=deliverablesR.data||[],scheduled=scheduledR.data||[],pending=pendingR.data||[];
 const pipeline=sponsors.reduce((n,x)=>n+Number(x.opportunity_value||0),0);
 const reach=metrics.reduce((n,x)=>n+Number(x.reach||0),0);
 const committed=delivs.reduce((n,x)=>n+Number(x.quantity_committed||0),0);
 const delivered=delivs.reduce((n,x)=>n+Number(x.quantity_delivered||0),0);
 const fulfillment=committed?Math.min(100,Math.round(delivered/committed*100)):0;
 const stage={prospect:0,outreach:0,active:0,other:0};
 sponsors.forEach(s=>{const key=stage[s.stage]!==undefined?s.stage:'other';stage[key]+=Number(s.opportunity_value||0)});
 const ready=readyR.count||0,queued=pendingR.count||0,contentPending=pending.filter(x=>x.action_type==='content_approval').length;
 return{pipeline,reach,ready,queued,contentPending,committed,delivered,fulfillment,stage,sponsors,scheduled,activities:activitiesR.count||0,metricCount:metrics.length};
}
function storyBuckets(items){
 const out={mission:0,outdoor:0,sponsor:0,other:0};
 items.forEach(x=>{
  const t=(x.content_type||'').toLowerCase();
  if(x.sponsor_id||t.includes('sponsor'))out.sponsor++;
  else if(t.includes('reel')||t.includes('video')||t.includes('outdoor')||t.includes('hunt'))out.outdoor++;
  else if(t.includes('mission')||t.includes('story')||t.includes('family'))out.mission++;
  else out.other++;
 });
 return out;
}
function renderLive(d){
 const e=dashboardEls();if(!e)return;
 setStat(e.topStats[0],'Sponsor pipeline',money(d.pipeline),d.sponsors.length?d.sponsors.length+' sponsor record'+(d.sponsors.length===1?'':'s')+' in CRM':'No sponsors entered yet');
 setStat(e.topStats[1],'30-day reach',compact(d.reach),d.metricCount?d.metricCount+' recorded metric snapshot'+(d.metricCount===1?'':'s'):'No metric snapshots in the last 30 days');
 setStat(e.topStats[2],'Content ready',String(d.ready),d.contentPending?d.contentPending+' content approval'+(d.contentPending===1?'':'s')+' waiting':d.queued?d.queued+' total queue action'+(d.queued===1?'':'s'):'No approvals waiting',d.contentPending?'warn':'');
 setStat(e.topStats[3],'Sponsor deliverables',d.committed?d.fulfillment+'%':'—',d.committed?d.delivered+' of '+d.committed+' committed units delivered':'No sponsor deliverables recorded');
 if(e.pipelineCard){
  const pipes=e.pipelineCard.querySelectorAll('.pipe');
  const vals=[['Prospects',money(d.stage.prospect)],['Outreach',money(d.stage.outreach)],['Active',money(d.stage.active)],['Total',money(d.pipeline)]];
  pipes.forEach((p,i)=>{if(!vals[i])return;const s=p.querySelector('small'),b=p.querySelector('b');if(s)s.textContent=vals[i][0];if(b)b.textContent=vals[i][1]});
  const bar=e.pipelineCard.querySelector('.bar i');if(bar)bar.style.width=(d.committed?d.fulfillment:0)+'%';
  const note=e.pipelineCard.querySelector('.bar + small');if(note)note.textContent=d.committed?d.fulfillment+'% of documented sponsor deliverables completed.':'No sponsor obligations documented yet.';
 }
 if(e.storyCard){
  const q=e.storyCard.querySelector('.queue');if(q){
   const b=storyBuckets(d.scheduled),total=d.scheduled.length;
   const rows=[
    ['♡','Mission / family stories',b.mission],
    ['⌁','Outdoor / video',b.outdoor],
    ['★','Sponsor features',b.sponsor],
    ['◎','Other content',b.other]
   ].filter(x=>x[2]>0);
   q.innerHTML=rows.length?rows.map(x=>'<div class="qitem"><div class="qicon">'+x[0]+'</div><div><strong>'+esc(x[1])+'</strong><span>'+x[2]+' scheduled in next 7 days</span></div><b>'+Math.round(x[2]/total*100)+'%</b></div>').join(''):'<div class="qitem"><div class="qicon">—</div><div><strong>No content scheduled</strong><span>Use the Content Calendar to schedule the next seven days.</span></div><b>0</b></div>';
   const p=e.storyCard.querySelector('.cardhead p');if(p)p.textContent='Live mix for the next seven days';
  }
 }
 let status=e.sec.querySelector('.dashboard-live-status');
 if(!status){status=document.createElement('div');status.className='dashboard-live-status';status.style.cssText='font-size:10px;color:var(--muted);margin:-8px 0 14px;text-align:right';e.sec.insertBefore(status,e.sec.firstChild)}
 status.textContent='Live trial data • '+d.activities+' activities recorded this year • updated '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
}
async function refreshDashboard(){
 if(!isLive()){demoDashboard();return}
 try{const d=await queryDashboard();renderLive(d)}catch(err){console.error('Dashboard refresh failed',err);notify('Dashboard could not refresh live data: '+(err.message||err))}
}
function scheduleRefresh(){
 if(dashTimer)clearInterval(dashTimer);
 dashTimer=setInterval(()=>{const sec=document.getElementById('dashboard');if(sec?.classList.contains('active')&&isLive())refreshDashboard()},60000);
}
const nav=document.querySelector('[data-section="dashboard"]');if(nav)nav.addEventListener('click',()=>setTimeout(refreshDashboard,0));
if(typeof sb!=='undefined'&&sb.auth?.onAuthStateChange)sb.auth.onAuthStateChange(()=>setTimeout(refreshDashboard,300));
const originalLoadQueue=typeof loadAgentQueue==='function'?loadAgentQueue:null;
if(originalLoadQueue){loadAgentQueue=async function(){const r=await originalLoadQueue.apply(this,arguments);if(document.getElementById('dashboard')?.classList.contains('active'))setTimeout(refreshDashboard,0);return r}}
scheduleRefresh();setTimeout(refreshDashboard,0);
window.refreshDreamHuntDashboard=refreshDashboard;
})();