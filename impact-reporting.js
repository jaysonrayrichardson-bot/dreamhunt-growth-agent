(function(){
'use strict';
let impactState=null;
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const notify=m=>typeof toast==='function'?toast(m):alert(m);
const isLive=()=>typeof liveMode!=='undefined'&&liveMode&&typeof liveOrgId!=='undefined'&&liveOrgId;
const money=v=>'$'+Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0});
const fmt=n=>Number(n||0).toLocaleString();

const style=document.createElement('style');
style.textContent='.impact-live-note{font-size:10px;color:var(--muted);margin-top:6px}.impact-empty{padding:24px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:14px}.metric-actions{display:flex;gap:8px;flex-wrap:wrap}.metric-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:760px){.metric-form-grid{grid-template-columns:1fr}}';
document.head.appendChild(style);

const metricModal=document.createElement('div');
metricModal.className='modal';metricModal.id='metricSnapshotModal';
metricModal.innerHTML='<div class="modalbox" style="width:min(680px,100%)"><div class="modalhead"><h3>Record metric snapshot</h3><button class="x" type="button">×</button></div><div id="metricSnapshotBody"></div></div>';
document.body.appendChild(metricModal);metricModal.querySelector('.x').onclick=()=>metricModal.classList.remove('open');metricModal.addEventListener('click',e=>{if(e.target===metricModal)metricModal.classList.remove('open')});

function demoState(){
 return {live:false,partnerValue:184700,activities:86,sponsorFeatures:74,engagements:39200,linkActions:5830,monthly:[46000,61000,55000,72000,81000,90000,70000,96000,78000,112000,126000,143000],fulfillment:[
 {name:'Bayou Outdoor Supply',commitment:'12 social features / 4 hunts',delivered:'10 features / 4 hunts',status:'ON TRACK'},
 {name:'Delta Trail Gear',commitment:'8 social features / logo',delivered:'8 features / logo',status:'COMPLETE'},
 {name:"Sportsman's Lodge",commitment:'6 features / 2 events',delivered:'4 features / 1 event',status:'ACTION'}
 ],snapshots:[]};
}
async function loadImpact(){
 if(!isLive()){impactState=demoState();return impactState}
 const now=new Date(),year=now.getFullYear(),start=year+'-01-01',end=(year+1)+'-01-01';
 const [metricsR,activitiesR,featuresR,sponsorsR,agreementsR,deliverablesR]=await Promise.all([
   sb.from('dh_metric_snapshots').select('*').eq('org_id',liveOrgId).gte('snapshot_date',start).lt('snapshot_date',end).order('snapshot_date'),
   sb.from('dh_activities').select('id',{count:'exact',head:true}).eq('org_id',liveOrgId).gte('starts_at',new Date(year,0,1).toISOString()).lt('starts_at',new Date(year+1,0,1).toISOString()),
   sb.from('dh_content_items').select('id',{count:'exact',head:true}).eq('org_id',liveOrgId).not('sponsor_id','is',null).in('status',['approved','published']),
   sb.from('dh_sponsors').select('id,name,cash_value,in_kind_value,stage').eq('org_id',liveOrgId),
   sb.from('dh_sponsor_agreements').select('id,sponsor_id,cash_value,in_kind_value,status,start_date,end_date').eq('org_id',liveOrgId),
   sb.from('dh_sponsor_deliverables').select('id,sponsor_id,deliverable_type,description,quantity_committed,quantity_delivered,status,due_at,dh_sponsors(name)').eq('org_id',liveOrgId)
 ]);
 const err=[metricsR,activitiesR,featuresR,sponsorsR,agreementsR,deliverablesR].find(x=>x.error)?.error;if(err)throw err;
 const snapshots=metricsR.data||[];
 const engagements=snapshots.reduce((n,x)=>n+Number(x.engagements||0),0);
 const linkActions=snapshots.reduce((n,x)=>n+Number(x.link_clicks||0)+Number(x.donation_clicks||0),0);
 const monthly=Array(12).fill(0);snapshots.forEach(x=>{const d=new Date(x.snapshot_date+'T12:00:00');monthly[d.getMonth()]+=Number(x.reach||0)});
 const agreements=(agreementsR.data||[]).filter(a=>a.status!=='cancelled');
 const partnerValue=agreements.length?agreements.reduce((n,a)=>n+Number(a.cash_value||0)+Number(a.in_kind_value||0),0):(sponsorsR.data||[]).reduce((n,s)=>n+Number(s.cash_value||0)+Number(s.in_kind_value||0),0);
 const grouped={};(deliverablesR.data||[]).forEach(x=>{const name=x.dh_sponsors?.name||'Sponsor';if(!grouped[name])grouped[name]={name,committed:0,delivered:0,items:0};grouped[name].committed+=Number(x.quantity_committed||0);grouped[name].delivered+=Number(x.quantity_delivered||0);grouped[name].items++});
 const fulfillment=Object.values(grouped).map(g=>({name:g.name,commitment:g.committed+' committed deliverables',delivered:g.delivered+' delivered',status:g.committed&&g.delivered>=g.committed?'COMPLETE':g.delivered>0?'ON TRACK':'ACTION'}));
 impactState={live:true,year,partnerValue,activities:activitiesR.count||0,sponsorFeatures:featuresR.count||0,engagements,linkActions,monthly,fulfillment,snapshots,sponsors:sponsorsR.data||[],agreements,deliverables:deliverablesR.data||[]};
 return impactState;
}
function getImpactEls(){
 const sec=document.getElementById('impact');if(!sec)return null;
 const big=sec.querySelector('.bigmetric');
 const stats=sec.querySelectorAll('.grid.stats .stat');
 const fulfillmentBody=sec.querySelector('.card:last-child tbody');
 return{sec,big,stats,fulfillmentBody};
}
async function renderImpact(){
 const els=getImpactEls();if(!els)return;
 try{await loadImpact()}catch(e){notify('Could not load impact data: '+e.message);return}
 const s=impactState,live=s.live;
 const bigNum=els.big.querySelector('.num');if(bigNum)bigNum.textContent=money(s.partnerValue);
 const bigLabel=els.big.querySelector('small');if(bigLabel)bigLabel.textContent=(live?'CURRENT ':'ESTIMATED ')+(s.year||new Date().getFullYear())+' PARTNER VALUE TRACKED';
 const bigP=els.big.querySelector('p');if(bigP)bigP.textContent=live?'Uses currently stored sponsor agreement or sponsor-level cash and in-kind values.':'Illustrative demo figures until live sponsor and accounting data are connected.';
 const bar=els.big.querySelector('.bar i');if(bar)bar.style.width=live?(s.partnerValue?Math.min(100,Math.round(s.partnerValue/250000*100))+'%':'0%'):'68%';
 const bottomSmall=els.big.querySelectorAll('small')[1];if(bottomSmall)bottomSmall.textContent=live?(s.partnerValue?'Tracking against a $250,000 planning benchmark':'No partner value recorded yet'):'68% of annual target';
 const labels=live?[
   ['Activities recorded',fmt(s.activities),'Current-year Dream Hunt activity records'],
   ['Sponsor features',fmt(s.sponsorFeatures),'Approved or published sponsor-linked content'],
   ['Engagements',fmt(s.engagements),s.snapshots.length?'From recorded platform snapshots':'No metric snapshots recorded yet'],
   ['Link actions',fmt(s.linkActions),s.snapshots.length?'Link + donation clicks from snapshots':'No metric snapshots recorded yet']
 ]:[
   ['Youth experiences supported','86','YTD — connect to program records'],['Sponsor features','74','Across posts, reels & events'],['Engagements','39.2K','9.4% illustrative engagement'],['Link actions','5,830','Sponsor + donation clicks']
 ];
 els.stats.forEach((el,i)=>{if(!labels[i])return;el.querySelector('.k').textContent=labels[i][0];el.querySelector('.v').textContent=labels[i][1];el.querySelector('.trend').textContent=labels[i][2]});
 const chart=document.getElementById('reachChart');if(chart){
   const vals=s.monthly||[];const max=Math.max(...vals,1);
   chart.innerHTML=vals.some(v=>v>0)?vals.map((v,i)=>'<div class="col"><i style="height:'+Math.max(8,Math.round(v/max*130))+'px"></i><span>'+['J','F','M','A','M','J','J','A','S','O','N','D'][i]+'</span></div>').join(''):'<div class="impact-empty" style="width:100%">No reach snapshots recorded yet.</div>';
   const card=chart.closest('.card');const p=card?.querySelector('.cardhead p');if(p)p.textContent=live?'Reach from recorded metric snapshots':'Illustrative cross-channel audience';
 }
 if(els.fulfillmentBody){
   els.fulfillmentBody.innerHTML=s.fulfillment.length?s.fulfillment.map(x=>'<tr><td><span class="org">'+esc(x.name)+'</span></td><td>'+esc(x.commitment)+'</td><td>'+esc(x.delivered)+'</td><td><span class="badge '+(x.status==='ACTION'?'orange':'lime')+'">'+esc(x.status)+'</span></td></tr>').join(''):'<tr><td colspan="4"><div class="impact-empty">No sponsor deliverables recorded yet.</div></td></tr>';
 }
 let actions=els.sec.querySelector('.metric-actions');if(!actions){actions=document.createElement('div');actions.className='metric-actions';const title=els.sec.querySelector('.section-title');title.appendChild(actions)}
 actions.innerHTML=live?'<button class="btn accent" id="recordMetricsBtn">+ Record metrics</button>':'<span class="badge">DEMO DATA</span>';
 const record=document.getElementById('recordMetricsBtn');if(record)record.onclick=openMetricModal;
}
function openMetricModal(){
 metricModal.querySelector('#metricSnapshotBody').innerHTML='<div class="metric-form-grid"><div class="field"><label>PLATFORM</label><select id="msPlatform"><option>Facebook</option><option>Instagram</option><option>YouTube</option><option>LinkedIn</option><option>Website</option><option>Other</option></select></div><div class="field"><label>DATE</label><input id="msDate" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div><div class="field"><label>FOLLOWERS</label><input id="msFollowers" type="number" value="0"></div><div class="field"><label>IMPRESSIONS</label><input id="msImpressions" type="number" value="0"></div><div class="field"><label>REACH</label><input id="msReach" type="number" value="0"></div><div class="field"><label>ENGAGEMENTS</label><input id="msEngagements" type="number" value="0"></div><div class="field"><label>VIDEO VIEWS</label><input id="msVideo" type="number" value="0"></div><div class="field"><label>LINK CLICKS</label><input id="msLinks" type="number" value="0"></div><div class="field"><label>DONATION CLICKS</label><input id="msDonationClicks" type="number" value="0"></div><div class="field"><label>DONATIONS AMOUNT</label><input id="msDonations" type="number" step="0.01" value="0"></div></div><div class="field"><label>SOURCE / NOTE</label><input id="msSource" placeholder="e.g. Meta Business Suite export"></div><div class="reviewactions"><button class="btn" id="msCancel">Cancel</button><button class="btn primary" id="msSave">Save snapshot</button></div>';
 metricModal.querySelector('#msCancel').onclick=()=>metricModal.classList.remove('open');metricModal.querySelector('#msSave').onclick=saveMetricSnapshot;metricModal.classList.add('open');
}
async function saveMetricSnapshot(){
 if(!isLive())return notify('Sign in to save live metrics.');
 const val=id=>Number(document.getElementById(id).value||0);
 const row={org_id:liveOrgId,sponsor_id:null,platform:document.getElementById('msPlatform').value,snapshot_date:document.getElementById('msDate').value,followers:val('msFollowers'),impressions:val('msImpressions'),reach:val('msReach'),engagements:val('msEngagements'),video_views:val('msVideo'),link_clicks:val('msLinks'),donation_clicks:val('msDonationClicks'),donations_amount:val('msDonations'),source:{note:document.getElementById('msSource').value.trim()||'manual entry',entry:'impact-ui'}};
 const r=await sb.from('dh_metric_snapshots').insert(row);if(r.error)return notify('Could not save metric snapshot: '+r.error.message);
 metricModal.classList.remove('open');await renderImpact();notify('Metric snapshot recorded.');
}
function reportHtml(s){
 const generated=new Date().toLocaleString();
 const sponsorRows=(typeof sponsors!=='undefined'?sponsors:[]).map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(typeof stageLabel==='function'?stageLabel(x.stage):x.stage)+'</td><td>'+money(x.value)+'</td><td>'+esc(x.next||'')+'</td><td>'+Number(x.fit||0)+'%</td></tr>').join('');
 const fulfill=s.fulfillment.length?s.fulfillment.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.commitment)+'</td><td>'+esc(x.delivered)+'</td><td>'+esc(x.status)+'</td></tr>').join(''):'<tr><td colspan="4">No sponsor deliverables recorded.</td></tr>';
 const dataNote=s.live?'This report reflects data currently stored in the Dream Hunt trial system.':'This report is generated from demo/illustrative data and should not be shared as actual performance.';
 return '<!doctype html><html><head><meta charset="utf-8"><title>Dream Hunt Sponsor & Impact Report</title><style>body{font-family:Arial,sans-serif;color:#173d2d;max-width:1000px;margin:0 auto;padding:40px}h1,h2{margin-bottom:6px}.hero{background:#173d2d;color:white;padding:26px;border-radius:18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.k{border:1px solid #d8ddd4;border-radius:12px;padding:14px}.k small{color:#6d776f}.k b{display:block;font-size:24px;margin-top:5px}table{width:100%;border-collapse:collapse;margin:12px 0 28px}th,td{text-align:left;border-bottom:1px solid #ddd;padding:9px;font-size:12px}th{font-size:10px;color:#6d776f}.note{background:#f4f6f1;padding:14px;border-radius:12px;font-size:12px}.foot{font-size:10px;color:#6d776f;margin-top:30px}@media print{body{padding:10px}.hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="hero"><h1>Dream Hunt Foundation</h1><h2>Sponsor & Impact Report</h2><p>Generated '+esc(generated)+'</p></div><div class="grid"><div class="k"><small>Partner value tracked</small><b>'+money(s.partnerValue)+'</b></div><div class="k"><small>Activities recorded</small><b>'+fmt(s.activities)+'</b></div><div class="k"><small>Engagements</small><b>'+fmt(s.engagements)+'</b></div><div class="k"><small>Link actions</small><b>'+fmt(s.linkActions)+'</b></div></div><div class="note"><b>Data status:</b> '+esc(dataNote)+'</div><h2>Sponsor Pipeline</h2><table><thead><tr><th>Organization</th><th>Stage</th><th>Opportunity</th><th>Next action</th><th>Fit</th></tr></thead><tbody>'+sponsorRows+'</tbody></table><h2>Sponsor Fulfillment</h2><table><thead><tr><th>Partner</th><th>Commitment</th><th>Delivered</th><th>Status</th></tr></thead><tbody>'+fulfill+'</tbody></table><h2>Platform Metrics</h2><table><thead><tr><th>Platform</th><th>Date</th><th>Reach</th><th>Engagements</th><th>Video views</th><th>Link clicks</th></tr></thead><tbody>'+(s.snapshots.length?s.snapshots.map(x=>'<tr><td>'+esc(x.platform)+'</td><td>'+esc(x.snapshot_date)+'</td><td>'+fmt(x.reach)+'</td><td>'+fmt(x.engagements)+'</td><td>'+fmt(x.video_views)+'</td><td>'+fmt(Number(x.link_clicks||0)+Number(x.donation_clicks||0))+'</td></tr>').join(''):'<tr><td colspan="6">No metric snapshots recorded.</td></tr>')+'</tbody></table><p class="foot">Dream Hunt Foundation • Media & Growth Agent trial report. Human review required before external distribution.</p></body></html>';
}
async function downloadImpactReport(){
 if(!impactState)await loadImpact();
 const html=reportHtml(impactState);const blob=new Blob([html],{type:'text/html'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='dream-hunt-sponsor-impact-report.html';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0);notify('Sponsor-ready report downloaded. Open it in a browser to print or save as PDF.');
}
window.downloadReport=downloadImpactReport;
const impactNav=document.querySelector('[data-section="impact"]');if(impactNav)impactNav.addEventListener('click',()=>setTimeout(renderImpact,0));
if(typeof sb!=='undefined'&&sb.auth?.onAuthStateChange)sb.auth.onAuthStateChange(()=>setTimeout(renderImpact,200));
renderImpact();
})();