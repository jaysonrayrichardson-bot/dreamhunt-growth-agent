(function(){
'use strict';
let goWeekends=[],goWeekendId=null,goHunts=[],goGuides=[],goAccess=[],goAssignments=[],goLocations=[],goEmergencies=[],goMessages=[],goMedia=[],goChannel=null;
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const live=()=>typeof liveMode!=='undefined'&&liveMode&&typeof liveOrgId!=='undefined'&&!!liveOrgId;
const notify=m=>typeof toast==='function'?toast(m):alert(m);
const when=v=>v?new Date(v).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';

const css=document.createElement('style');
css.textContent=`
.guideops-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px}.go-stack{display:grid;gap:10px}.go-hunt{border:1px solid var(--line);background:#fff;border-radius:16px;padding:14px}.go-hunt-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.go-hunt h4{font:800 15px Manrope;margin:0 0 4px}.go-meta{font-size:11px;color:var(--muted);line-height:1.5}.go-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.go-status{display:flex;gap:8px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:13px;background:#fff}.go-status .who{font-weight:800;font-size:12px}.go-status .where{font-size:10px;color:var(--muted);margin-top:3px}.go-status .grow{flex:1;min-width:0}.go-alert{border:1px solid #e7aaa1;background:#fff1ee;border-radius:14px;padding:12px}.go-alert strong{color:#9a3e30}.go-chat{height:320px;overflow:auto;border:1px solid var(--line);border-radius:14px;background:#fff;padding:10px;display:grid;align-content:start;gap:8px}.go-msg{padding:9px 10px;border-radius:12px;background:#f3f5f1;font-size:11px}.go-msg.admin{background:#eaf1e8}.go-msg .meta{font-size:9px;color:var(--muted);margin-bottom:3px}.go-roster{display:grid;gap:8px}.go-guide{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff}.go-guide .grow{flex:1}.go-guide b{font-size:12px}.go-guide small{display:block;color:var(--muted);font-size:9px;margin-top:2px}.go-empty{padding:20px;text-align:center;color:var(--muted);font-size:11px;border:1px dashed var(--line);border-radius:13px}.go-actions{display:flex;gap:7px;flex-wrap:wrap}.go-privacy{font-size:10px;color:var(--muted);line-height:1.45;margin-top:10px}.go-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.go-toolbar select{min-width:220px;border:1px solid var(--line);background:#fff;border-radius:12px;padding:9px}.go-emergency-count{background:#a83c2f;color:#fff}.go-live-dot{width:8px;height:8px;border-radius:50%;background:#70a067;display:inline-block;margin-right:5px}@media(max-width:900px){.guideops-grid{grid-template-columns:1fr}}
`;
document.head.appendChild(css);

if(typeof sections!=='undefined')sections.guideops=['Guide Ops','Hunt weekends, volunteer guides, media intake, field location and hunt communications.'];
const nav=document.querySelector('nav');
if(nav&&!document.querySelector('[data-section="guideops"]')){
 const b=document.createElement('button');b.className='navbtn';b.dataset.section='guideops';b.innerHTML='<span class="ico">⌖</span>Guide Ops';b.onclick=()=>{showSection('guideops');loadGuideOps()};nav.insertBefore(b,nav.querySelector('[data-section="guardrails"]')||null);
}
const main=document.querySelector('main');
const section=document.createElement('section');section.id='guideops';section.className='section';
section.innerHTML=`
<div class="section-title"><div><h3>Guide Ops</h3><p>Prepare each hunt weekend and receive field media, guide status, GPS safety data and chat.</p></div><div class="go-actions"><button class="btn" id="goAddGuide">+ Guide</button><button class="btn" id="goAddHunt">+ Hunt</button><button class="btn primary" id="goAddWeekend">+ Hunt weekend</button></div></div>
<div class="card" style="margin-bottom:16px"><div class="go-toolbar"><strong>Weekend</strong><select id="goWeekendSelect"></select><span class="badge" id="goRealtimeBadge"><span class="go-live-dot"></span>Realtime ready</span><button class="btn small" id="goRefresh">Refresh</button></div><div class="go-privacy">Guide GPS is designed for active hunt safety. The mobile app can send check-in, periodic, and emergency pings only while a volunteer is authorized for the weekend and assigned to a hunt.</div></div>
<div class="grid stats" id="goStats"><div class="stat"><div class="k">Hunts</div><div class="v">0</div><div class="trend">This weekend</div></div><div class="stat"><div class="k">Authorized guides</div><div class="v">0</div><div class="trend">Mobile access roster</div></div><div class="stat"><div class="k">Media received</div><div class="v">0</div><div class="trend">Photos & video</div></div><div class="stat"><div class="k">Emergencies</div><div class="v">0</div><div class="trend">Open alerts</div></div></div>
<div class="guideops-grid" style="margin-top:16px">
 <div class="card"><div class="cardhead"><div><h3>Hunts this weekend</h3><p>These are the hunt choices the mobile guide app can present.</p></div></div><div class="go-stack" id="goHunts"></div></div>
 <div class="card"><div class="cardhead"><div><h3>Live field status</h3><p>Last known guide GPS and emergency state.</p></div></div><div id="goEmergencies"></div><div class="go-stack" id="goLocations" style="margin-top:10px"></div></div>
</div>
<div class="guideops-grid" style="margin-top:16px">
 <div class="card"><div class="cardhead"><div><h3>Weekend chat</h3><p>Admin + all authorized guides. Hunt-specific messages are labeled.</p></div></div><div class="go-chat" id="goChat"></div><div class="field" style="margin-top:10px"><label>MESSAGE TO ALL GUIDES</label><textarea id="goChatInput" style="min-height:70px" placeholder="Weekend update, safety note, schedule change…"></textarea></div><div class="go-actions" style="justify-content:flex-end"><button class="btn primary" id="goSendChat">Send message</button></div></div>
 <div class="card"><div class="cardhead"><div><h3>Guide roster</h3><p>Authorize volunteers for the selected weekend.</p></div></div><div class="go-roster" id="goRoster"></div></div>
</div>`;
main.insertBefore(section,document.getElementById('guardrails'));

function modal(id,title,body){
 let m=document.getElementById(id);if(m)return m;
 m=document.createElement('div');m.className='modal';m.id=id;m.innerHTML='<div class="modalbox"><div class="modalhead"><h3>'+esc(title)+'</h3><button class="x" type="button">×</button></div><div class="go-modal-body">'+body+'</div></div>';document.body.appendChild(m);m.querySelector('.x').onclick=()=>m.classList.remove('open');m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});return m;
}
const weekendModal=modal('goWeekendModal','Add hunt weekend','<div class="field"><label>WEEKEND NAME</label><input id="goWTitle" placeholder="e.g. North Louisiana Deer Weekend"></div><div class="formrow"><div class="field"><label>START DATE</label><input id="goWStart" type="date"></div><div class="field"><label>END DATE</label><input id="goWEnd" type="date"></div></div><div class="field"><label>NOTES</label><textarea id="goWNotes"></textarea></div><div class="go-actions" style="justify-content:flex-end"><button class="btn primary" id="goWSave">Create weekend</button></div>');
const huntModal=modal('goHuntModal','Add hunt','<div class="field"><label>HUNT NAME</label><input id="goHTitle" placeholder="e.g. Saturday Morning Hunt 4"></div><div class="formrow"><div class="field"><label>START</label><input id="goHStart" type="datetime-local"></div><div class="field"><label>END</label><input id="goHEnd" type="datetime-local"></div></div><div class="field"><label>LOCATION LABEL</label><input id="goHLocation" placeholder="Property/camp label"></div><div class="field"><label>MEETING POINT</label><input id="goHMeeting" placeholder="Where the guide and family meet"></div><div class="field"><label>GUIDE INSTRUCTIONS</label><textarea id="goHInstructions"></textarea></div><div class="field"><label>EMERGENCY NOTES</label><textarea id="goHEmergency" placeholder="Gate details, nearest road, emergency contact notes…"></textarea></div><div class="go-actions" style="justify-content:flex-end"><button class="btn primary" id="goHSave">Create hunt</button></div>');
const guideModal=modal('goGuideModal','Add volunteer guide','<div class="field"><label>DISPLAY NAME</label><input id="goGName"></div><div class="formrow"><div class="field"><label>EMAIL</label><input id="goGEmail" type="email"></div><div class="field"><label>PHONE</label><input id="goGPhone"></div></div><div class="field"><label>NOTES</label><textarea id="goGNotes"></textarea></div><div class="go-actions" style="justify-content:flex-end"><button class="btn primary" id="goGSave">Add guide</button></div><p class="go-privacy">When the future mobile app launches, the volunteer signs in with this email and securely claims this guide profile.</p>');

document.getElementById('goAddWeekend').onclick=()=>weekendModal.classList.add('open');
document.getElementById('goAddHunt').onclick=()=>{if(!goWeekendId)return notify('Create or select a hunt weekend first.');huntModal.classList.add('open')};
document.getElementById('goAddGuide').onclick=()=>guideModal.classList.add('open');
document.getElementById('goRefresh').onclick=()=>loadGuideOps(true);
document.getElementById('goWeekendSelect').onchange=e=>{goWeekendId=e.target.value||null;loadWeekendDetail();subscribeWeekend()};
document.getElementById('goSendChat').onclick=sendChat;
document.getElementById('goWSave').onclick=createWeekend;
document.getElementById('goHSave').onclick=createHunt;
document.getElementById('goGSave').onclick=createGuide;

function demo(){
 goWeekends=[{id:'demo-weekend',title:'Demo Hunt Weekend',starts_on:new Date().toISOString().slice(0,10),ends_on:new Date(Date.now()+86400000).toISOString().slice(0,10),status:'open'}];goWeekendId='demo-weekend';
 goHunts=[{id:'demo-h1',activity_id:'demo-a1',title:'Saturday Morning Hunt 1',scheduled_start:new Date().toISOString(),location_label:'Demo Property A',meeting_point:'Main camp',status:'open'},{id:'demo-h2',activity_id:'demo-a2',title:'Saturday Morning Hunt 2',scheduled_start:new Date().toISOString(),location_label:'Demo Property B',meeting_point:'South gate',status:'open'}];
 goGuides=[{id:'demo-g1',display_name:'Volunteer Guide',email:'guide@example.com',phone:'',auth_user_id:null,active:true}];goAccess=[];goAssignments=[];goLocations=[];goEmergencies=[];goMessages=[{id:'demo-m1',message:'Guide Ops is ready for the mobile app intake flow.',message_type:'system',created_at:new Date().toISOString(),dh_guides:null,dh_hunts:null}];goMedia=[];renderAll();
}
async function loadGuideOps(force=false){
 if(!live()){demo();return}
 try{
  const [w,g]=await Promise.all([
   sb.from('dh_hunt_weekends').select('*').eq('org_id',liveOrgId).order('starts_on',{ascending:false}).limit(30),
   sb.from('dh_guides').select('*').eq('org_id',liveOrgId).eq('active',true).order('display_name')
  ]);
  if(w.error)throw w.error;if(g.error)throw g.error;goWeekends=w.data||[];goGuides=g.data||[];
  if(!goWeekendId||!goWeekends.some(x=>x.id===goWeekendId)){const preferred=goWeekends.find(x=>['active','open'].includes(x.status));goWeekendId=(preferred||goWeekends[0])?.id||null}
  renderWeekendSelect();if(goWeekendId){await loadWeekendDetail();subscribeWeekend()}else{clearWeekend()}
 }catch(e){notify('Guide Ops could not load: '+(e.message||e))}
}
async function loadWeekendDetail(){
 if(!live()||!goWeekendId){if(!live())renderAll();return}
 try{
  const [h,a,asgn,loc,em,msg]=await Promise.all([
   sb.from('dh_hunts').select('*').eq('org_id',liveOrgId).eq('weekend_id',goWeekendId).order('scheduled_start'),
   sb.from('dh_guide_weekend_access').select('id,guide_id,status,dh_guides(id,display_name,email,phone,auth_user_id)').eq('org_id',liveOrgId).eq('weekend_id',goWeekendId),
   sb.from('dh_hunt_assignments').select('id,hunt_id,guide_id,status,checked_in_at,checked_out_at,dh_guides(display_name),dh_hunts(title)').eq('org_id',liveOrgId).order('created_at'),
   sb.from('dh_guide_locations').select('id,hunt_id,guide_id,latitude,longitude,accuracy_m,battery_pct,source,is_emergency,captured_at,dh_guides(display_name),dh_hunts(title)').eq('org_id',liveOrgId).eq('weekend_id',goWeekendId).order('captured_at',{ascending:false}).limit(250),
   sb.from('dh_hunt_emergencies').select('id,hunt_id,guide_id,status,message,latitude,longitude,accuracy_m,triggered_at,acknowledged_at,resolved_at,dh_guides(display_name),dh_hunts(title)').eq('org_id',liveOrgId).eq('weekend_id',goWeekendId).order('triggered_at',{ascending:false}).limit(50),
   sb.from('dh_hunt_messages').select('id,hunt_id,guide_id,sender_user_id,message,message_type,created_at,dh_guides(display_name),dh_hunts(title)').eq('org_id',liveOrgId).eq('weekend_id',goWeekendId).order('created_at',{ascending:true}).limit(300)
  ]);
  const err=[h,a,asgn,loc,em,msg].find(x=>x.error)?.error;if(err)throw err;
  goHunts=h.data||[];goAccess=a.data||[];goAssignments=asgn.data||[];goLocations=loc.data||[];goEmergencies=em.data||[];goMessages=msg.data||[];
  const activityIds=goHunts.map(x=>x.activity_id).filter(Boolean);
  if(activityIds.length){const mr=await sb.from('dh_media_assets').select('id,activity_id,media_type,created_at,metadata').eq('org_id',liveOrgId).in('activity_id',activityIds);if(mr.error)throw mr.error;goMedia=mr.data||[]}else goMedia=[];
  renderAll();
 }catch(e){notify('Weekend detail could not load: '+(e.message||e))}
}
function renderWeekendSelect(){
 const s=document.getElementById('goWeekendSelect');s.innerHTML=goWeekends.length?goWeekends.map(w=>'<option value="'+w.id+'" '+(w.id===goWeekendId?'selected':'')+'>'+esc(w.title)+' · '+esc(w.starts_on)+' to '+esc(w.ends_on)+'</option>').join(''):'<option value="">No hunt weekends yet</option>';
}
function clearWeekend(){goHunts=[];goAccess=[];goAssignments=[];goLocations=[];goEmergencies=[];goMessages=[];goMedia=[];renderWeekendSelect();renderAll()}
function renderAll(){renderWeekendSelect();renderStats();renderHunts();renderLocations();renderEmergencies();renderChat();renderRoster()}
function renderStats(){
 const vals=[goHunts.length,goAccess.filter(x=>x.status==='active').length,goMedia.length,goEmergencies.filter(x=>['open','acknowledged'].includes(x.status)).length];
 document.querySelectorAll('#goStats .stat .v').forEach((x,i)=>x.textContent=String(vals[i]||0));
 const e=document.querySelectorAll('#goStats .stat')[3];e?.querySelector('.v')?.classList.toggle('go-emergency-count',vals[3]>0);
}
function renderHunts(){
 const box=document.getElementById('goHunts');if(!goHunts.length){box.innerHTML='<div class="go-empty">No hunts loaded for this weekend yet.</div>';return}
 box.innerHTML=goHunts.map(h=>{const a=goAssignments.filter(x=>x.hunt_id===h.id&&x.status!=='cancelled'),m=goMedia.filter(x=>x.activity_id===h.activity_id);return '<div class="go-hunt"><div class="go-hunt-head"><div><h4>'+esc(h.title)+'</h4><div class="go-meta">'+when(h.scheduled_start)+'<br>'+esc(h.location_label||'Location not entered')+(h.meeting_point?'<br>Meet: '+esc(h.meeting_point):'')+'</div></div><span class="badge">'+esc(h.status)+'</span></div><div class="go-badges"><span class="badge">'+a.length+' guide'+(a.length===1?'':'s')+'</span><span class="badge">'+m.length+' media</span></div><div class="go-actions" style="margin-top:9px">'+(h.activity_id?'<button class="btn small" data-go-content="'+h.id+'">Open content</button>':'')+'</div></div>'}).join('');
 box.querySelectorAll('[data-go-content]').forEach(b=>b.onclick=()=>{const h=goHunts.find(x=>x.id===b.dataset.goContent);if(!h)return;if(typeof currentActivityId!=='undefined')currentActivityId=h.activity_id;const hn=document.getElementById('huntName');if(hn)hn.value=h.title;showSection('content');if(typeof loadMediaAssets==='function')loadMediaAssets()});
}
function latestLocations(){
 const seen=new Set(),out=[];for(const x of goLocations){if(seen.has(x.guide_id))continue;seen.add(x.guide_id);out.push(x)}return out;
}
function renderLocations(){
 const box=document.getElementById('goLocations'),rows=latestLocations();if(!rows.length){box.innerHTML='<div class="go-empty">No guide GPS received yet.</div>';return}
 box.innerHTML=rows.map(x=>'<div class="go-status"><div class="qicon">⌖</div><div class="grow"><div class="who">'+esc(x.dh_guides?.display_name||'Guide')+'</div><div class="where">'+esc(x.dh_hunts?.title||'Hunt')+' · '+when(x.captured_at)+(x.accuracy_m?' · ±'+Math.round(Number(x.accuracy_m))+'m':'')+(x.battery_pct!==null&&x.battery_pct!==undefined?' · '+x.battery_pct+'% battery':'')+'</div></div><button class="btn small" data-map-lat="'+x.latitude+'" data-map-lng="'+x.longitude+'">Map</button></div>').join('');
 box.querySelectorAll('[data-map-lat]').forEach(b=>b.onclick=()=>window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.dataset.mapLat+','+b.dataset.mapLng),'_blank','noopener'));
}
function renderEmergencies(){
 const box=document.getElementById('goEmergencies'),rows=goEmergencies.filter(x=>['open','acknowledged'].includes(x.status));if(!rows.length){box.innerHTML='';return}
 box.innerHTML=rows.map(x=>'<div class="go-alert" style="margin-bottom:8px"><strong>Emergency · '+esc(x.dh_guides?.display_name||'Guide')+'</strong><div class="go-meta">'+esc(x.dh_hunts?.title||'Hunt')+' · '+when(x.triggered_at)+' · '+esc(x.status)+'</div><div style="font-size:11px;margin-top:6px">'+esc(x.message||'Emergency alert triggered from guide app.')+'</div><div class="go-actions" style="margin-top:8px">'+(x.status==='open'?'<button class="btn small" data-ack="'+x.id+'">Acknowledge</button>':'')+'<button class="btn small" data-resolve="'+x.id+'">Resolve</button>'+(x.latitude!==null&&x.longitude!==null?'<button class="btn small" data-emap="'+x.latitude+','+x.longitude+'">Map</button>':'')+'</div></div>').join('');
 box.querySelectorAll('[data-ack]').forEach(b=>b.onclick=()=>updateEmergency(b.dataset.ack,'acknowledged'));
 box.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=()=>updateEmergency(b.dataset.resolve,'resolved'));
 box.querySelectorAll('[data-emap]').forEach(b=>b.onclick=()=>window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.dataset.emap),'_blank','noopener'));
}
function renderChat(){
 const box=document.getElementById('goChat');if(!goMessages.length){box.innerHTML='<div class="go-empty">No weekend messages yet.</div>';return}
 box.innerHTML=goMessages.map(x=>'<div class="go-msg '+(!x.guide_id?'admin':'')+'"><div class="meta">'+esc(x.dh_guides?.display_name||'Dream Hunt Admin')+(x.dh_hunts?.title?' · '+esc(x.dh_hunts.title):' · All guides')+' · '+when(x.created_at)+'</div>'+esc(x.message)+'</div>').join('');box.scrollTop=box.scrollHeight;
}
function renderRoster(){
 const box=document.getElementById('goRoster');if(!goGuides.length){box.innerHTML='<div class="go-empty">No volunteer guides have been added yet.</div>';return}
 const active=new Map(goAccess.filter(x=>x.status==='active').map(x=>[x.guide_id,x]));
 box.innerHTML=goGuides.map(g=>'<div class="go-guide"><div class="grow"><b>'+esc(g.display_name)+'</b><small>'+esc(g.email||'No email')+' · '+(g.auth_user_id?'Mobile linked':'Not linked yet')+'</small></div>'+(active.has(g.id)?'<span class="badge lime">AUTHORIZED</span>':'<button class="btn small" data-authorize="'+g.id+'">Authorize</button>')+'</div>').join('');
 box.querySelectorAll('[data-authorize]').forEach(b=>b.onclick=()=>authorizeGuide(b.dataset.authorize));
}
async function createWeekend(){
 if(!live())return notify('Connect the trial backend to create a real hunt weekend.');
 const title=document.getElementById('goWTitle').value.trim(),start=document.getElementById('goWStart').value,end=document.getElementById('goWEnd').value;if(!title||!start||!end)return notify('Enter a weekend name, start date and end date.');
 const r=await sb.from('dh_hunt_weekends').insert({org_id:liveOrgId,title,starts_on:start,ends_on:end,status:'open',notes:document.getElementById('goWNotes').value.trim()||null,created_by:liveUser.id}).select().single();if(r.error)return notify('Could not create weekend: '+r.error.message);
 weekendModal.classList.remove('open');goWeekendId=r.data.id;await loadGuideOps(true);notify('Hunt weekend created.');
}
async function createHunt(){
 if(!live())return notify('Connect the trial backend to create a real hunt.');
 const title=document.getElementById('goHTitle').value.trim();if(!title)return notify('Enter a hunt name.');
 const start=document.getElementById('goHStart').value,end=document.getElementById('goHEnd').value,location=document.getElementById('goHLocation').value.trim(),meeting=document.getElementById('goHMeeting').value.trim();
 const ar=await sb.from('dh_activities').insert({org_id:liveOrgId,title,activity_type:'hunt',starts_at:start?new Date(start).toISOString():null,location_label:location||null,story_notes:null,status:'scheduled',created_by:liveUser.id}).select().single();if(ar.error)return notify('Could not create linked activity: '+ar.error.message);
 const hr=await sb.from('dh_hunts').insert({org_id:liveOrgId,weekend_id:goWeekendId,activity_id:ar.data.id,title,scheduled_start:start?new Date(start).toISOString():null,scheduled_end:end?new Date(end).toISOString():null,location_label:location||null,meeting_point:meeting||null,guide_instructions:document.getElementById('goHInstructions').value.trim()||null,emergency_notes:document.getElementById('goHEmergency').value.trim()||null,status:'open',created_by:liveUser.id}).select().single();
 if(hr.error){await sb.from('dh_activities').delete().eq('id',ar.data.id);return notify('Could not create hunt: '+hr.error.message)}
 huntModal.classList.remove('open');await loadWeekendDetail();notify('Hunt created and ready for guide selection.');
}
async function createGuide(){
 if(!live())return notify('Connect the trial backend to add a real guide.');
 const name=document.getElementById('goGName').value.trim(),email=document.getElementById('goGEmail').value.trim().toLowerCase();if(!name||!email)return notify('Enter the guide name and email.');
 const r=await sb.from('dh_guides').insert({org_id:liveOrgId,display_name:name,email,phone:document.getElementById('goGPhone').value.trim()||null,notes:document.getElementById('goGNotes').value.trim()||null,active:true,created_by:liveUser.id}).select().single();if(r.error)return notify('Could not add guide: '+r.error.message);
 guideModal.classList.remove('open');goGuides.push(r.data);renderRoster();notify('Guide added. Authorize them for a hunt weekend when ready.');
}
async function authorizeGuide(guideId){
 if(!live()||!goWeekendId)return;
 const r=await sb.from('dh_guide_weekend_access').upsert({org_id:liveOrgId,weekend_id:goWeekendId,guide_id:guideId,status:'active',created_by:liveUser.id},{onConflict:'weekend_id,guide_id'}).select().single();if(r.error)return notify('Could not authorize guide: '+r.error.message);
 await loadWeekendDetail();notify('Guide authorized for this weekend.');
}
async function sendChat(){
 const input=document.getElementById('goChatInput'),message=input.value.trim();if(!message)return;if(!live())return notify('Connect the trial backend to send live hunt chat.');
 const r=await sb.from('dh_hunt_messages').insert({org_id:liveOrgId,weekend_id:goWeekendId,hunt_id:null,guide_id:null,sender_user_id:liveUser.id,message,message_type:'announcement'});if(r.error)return notify('Could not send message: '+r.error.message);input.value='';await loadWeekendDetail();
}
async function updateEmergency(id,status){
 if(!live())return;
 const patch=status==='acknowledged'?{status,acknowledged_by:liveUser.id,acknowledged_at:new Date().toISOString()}:{status,resolved_by:liveUser.id,resolved_at:new Date().toISOString()};
 const r=await sb.from('dh_hunt_emergencies').update(patch).eq('org_id',liveOrgId).eq('id',id);if(r.error)return notify('Could not update emergency: '+r.error.message);await loadWeekendDetail();notify(status==='resolved'?'Emergency resolved.':'Emergency acknowledged.');
}
function subscribeWeekend(){
 if(typeof sb==='undefined'||!live()||!goWeekendId)return;
 if(goChannel)sb.removeChannel(goChannel);
 goChannel=sb.channel('guide-ops-'+goWeekendId)
  .on('postgres_changes',{event:'*',schema:'public',table:'dh_hunt_messages',filter:'weekend_id=eq.'+goWeekendId},()=>loadWeekendDetail())
  .on('postgres_changes',{event:'*',schema:'public',table:'dh_guide_locations',filter:'weekend_id=eq.'+goWeekendId},()=>loadWeekendDetail())
  .on('postgres_changes',{event:'*',schema:'public',table:'dh_hunt_emergencies',filter:'weekend_id=eq.'+goWeekendId},()=>loadWeekendDetail())
  .on('postgres_changes',{event:'*',schema:'public',table:'dh_hunt_assignments',filter:'org_id=eq.'+liveOrgId},()=>loadWeekendDetail())
  .subscribe();
}
if(typeof sb!=='undefined'&&sb.auth?.onAuthStateChange)sb.auth.onAuthStateChange(()=>setTimeout(()=>{if(document.getElementById('guideops')?.classList.contains('active'))loadGuideOps(true)},300));
window.refreshDreamHuntGuideOps=()=>loadGuideOps(true);
})();