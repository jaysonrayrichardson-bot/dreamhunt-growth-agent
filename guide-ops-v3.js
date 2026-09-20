(function(){
'use strict';

let weekends=[], weekendId=null, hunts=[], guides=[], accessRows=[], assignments=[], locations=[], emergencies=[], messages=[], media=[];
let realtimeChannel=null, reloadTimer=null, editingWeekendId=null, editingHuntId=null, editingGuideId=null, assignmentHuntId=null;

const E=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const live=()=>typeof liveMode!=='undefined'&&liveMode&&typeof liveOrgId!=='undefined'&&!!liveOrgId;
const notice=m=>typeof toast==='function'?toast(m):alert(m);
const fmt=v=>v?new Date(v).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
const day=v=>v?new Date(v+'T12:00:00').toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'}):'—';
const localInput=v=>{if(!v)return'';const d=new Date(v),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())};
const byId=(arr,id)=>arr.find(x=>String(x.id)===String(id));
const guideName=id=>byId(guides,id)?.display_name||'Guide';
const huntName=id=>byId(hunts,id)?.title||'Hunt';

if(typeof sections!=='undefined') sections.guideops=['Guide Ops','Plan hunt weekends, manage volunteer guides, receive media, monitor field safety and communicate in real time.'];

const style=document.createElement('style');
style.textContent=
'.guideops-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px}.go-stack{display:grid;gap:10px}.go-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.go-toolbar select{min-width:260px;border:1px solid var(--line);background:#fff;border-radius:12px;padding:9px}.go-hunt{border:1px solid var(--line);background:#fff;border-radius:16px;padding:14px}.go-hunt-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.go-hunt h4{font:800 15px Manrope;margin:0 0 4px}.go-meta{font-size:11px;color:var(--muted);line-height:1.55}.go-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.go-actions{display:flex;gap:7px;flex-wrap:wrap}.go-status{display:flex;gap:8px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:13px;background:#fff}.go-status .grow,.go-guide .grow{flex:1;min-width:0}.go-status .who{font-weight:800;font-size:12px}.go-status .where{font-size:10px;color:var(--muted);margin-top:3px;line-height:1.4}.go-stale{color:#a0622f;font-weight:800}.go-alert{border:1px solid #e7aaa1;background:#fff1ee;border-radius:14px;padding:12px}.go-alert strong{color:#9a3e30}.go-chat{height:330px;overflow:auto;border:1px solid var(--line);border-radius:14px;background:#fff;padding:10px;display:grid;align-content:start;gap:8px}.go-msg{padding:9px 10px;border-radius:12px;background:#f3f5f1;font-size:11px}.go-msg.admin{background:#eaf1e8}.go-msg.emergency{background:#fff0ec;border:1px solid #e7aaa1}.go-msg .meta{font-size:9px;color:var(--muted);margin-bottom:3px}.go-roster{display:grid;gap:8px}.go-guide{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff}.go-guide b{font-size:12px}.go-guide small{display:block;color:var(--muted);font-size:9px;margin-top:2px}.go-empty{padding:20px;text-align:center;color:var(--muted);font-size:11px;border:1px dashed var(--line);border-radius:13px}.go-privacy{font-size:10px;color:var(--muted);line-height:1.45;margin-top:10px}.go-live-dot{width:8px;height:8px;border-radius:50%;background:#70a067;display:inline-block;margin-right:5px}.go-emergency-count{background:#a83c2f;color:#fff;border-radius:10px;padding:0 8px}.go-assignment{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}.go-assignment:last-child{border-bottom:0}.go-assignment select{border:1px solid var(--line);border-radius:10px;padding:7px;background:#fff}.go-media-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.go-media{border:1px solid var(--line);border-radius:13px;overflow:hidden;background:#fff}.go-media-thumb{aspect-ratio:4/3;background:#e8ebe6;display:grid;place-items:center;overflow:hidden}.go-media-thumb img,.go-media-thumb video{width:100%;height:100%;object-fit:cover}.go-media-info{padding:8px}.go-media-info b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.go-media-info small{font-size:9px;color:var(--muted);line-height:1.4;display:block;margin-top:3px}.go-inline{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.go-danger{color:#9a3e30;border-color:#d9aaa1}.go-modal-note{font-size:10px;color:var(--muted);line-height:1.5;margin-top:10px}.go-capacity{font-size:10px;color:var(--muted);font-weight:700}.go-mobile-contract{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.go-mobile-step{padding:10px;border-radius:12px;border:1px solid var(--line);background:#fff;font-size:10px}.go-mobile-step b{display:block;font-size:11px;margin-bottom:3px}@media(max-width:1000px){.go-media-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:900px){.guideops-grid{grid-template-columns:1fr}.go-assignment{grid-template-columns:1fr}.go-media-grid{grid-template-columns:repeat(2,1fr)}.go-mobile-contract{grid-template-columns:1fr}}';
document.head.appendChild(style);

const nav=document.querySelector('nav');
if(nav&&!document.querySelector('[data-section="guideops"]')){
  const b=document.createElement('button');b.className='navbtn';b.dataset.section='guideops';b.innerHTML='<span class="ico">⌖</span>Guide Ops';
  b.onclick=()=>{showSection('guideops');loadAll()};nav.insertBefore(b,nav.querySelector('[data-section="guardrails"]')||null);
}

let section=document.getElementById('guideops');
if(!section){
  section=document.createElement('section');section.id='guideops';section.className='section';
  document.querySelector('main').insertBefore(section,document.getElementById('guardrails'));
}
section.innerHTML=
'<div class="section-title"><div><h3>Guide Ops</h3><p>Load every hunt, authorize guides, receive media, monitor GPS/emergencies and communicate during the weekend.</p></div><div class="go-actions"><button class="btn" id="goAddGuide">+ Guide</button><button class="btn" id="goAddHunt">+ Hunt</button><button class="btn primary" id="goAddWeekend">+ Hunt weekend</button></div></div>'+
'<div class="card" style="margin-bottom:16px"><div class="go-toolbar"><strong>Weekend</strong><select id="goWeekendSelect"></select><button class="btn small" id="goEditWeekend">Edit weekend</button><span class="badge" id="goRealtimeBadge"><span class="go-live-dot"></span>Realtime ready</span><button class="btn small" id="goRefresh">Refresh</button></div><div class="go-privacy">Guide GPS is intended for active hunt safety. Guides only get weekend access you explicitly authorize and can only send field data for hunts they are assigned to.</div></div>'+
'<div class="grid stats" id="goStats"><div class="stat"><div class="k">Hunts</div><div class="v">0</div><div class="trend">This weekend</div></div><div class="stat"><div class="k">Authorized guides</div><div class="v">0</div><div class="trend">Mobile access roster</div></div><div class="stat"><div class="k">Media received</div><div class="v">0</div><div class="trend">Photos & video</div></div><div class="stat"><div class="k">Emergencies</div><div class="v">0</div><div class="trend">Open alerts</div></div></div>'+
'<div class="guideops-grid" style="margin-top:16px"><div class="card"><div class="cardhead"><div><h3>Hunts this weekend</h3><p>The choices the guide mobile app will present.</p></div></div><div class="go-stack" id="goHunts"></div></div><div class="card"><div class="cardhead"><div><h3>Live field status</h3><p>Latest guide location, assignment status and emergencies.</p></div></div><div id="goEmergencies"></div><div class="go-stack" id="goLocations" style="margin-top:10px"></div></div></div>'+
'<div class="guideops-grid" style="margin-top:16px"><div class="card"><div class="cardhead"><div><h3>Weekend chat</h3><p>Send to all authorized guides or one hunt team.</p></div></div><div class="field"><label>CHAT CHANNEL</label><select id="goChatTarget"><option value="">All guides</option></select></div><div class="go-chat" id="goChat"></div><div class="field" style="margin-top:10px"><label>MESSAGE</label><textarea id="goChatInput" style="min-height:70px" placeholder="Weekend update, safety note, meeting change…"></textarea></div><div class="go-actions" style="justify-content:flex-end"><button class="btn primary" id="goSendChat">Send message</button></div></div><div class="card"><div class="cardhead"><div><h3>Guide roster</h3><p>Authorize, edit and manage volunteers.</p></div></div><div class="go-roster" id="goRoster"></div></div></div>'+
'<div class="card" style="margin-top:16px"><div class="cardhead"><div><h3>Guide media inbox</h3><p>Private photos and video received from this weekend flow into the existing Content Studio.</p></div><span class="badge" id="goMediaCount">0 items</span></div><div class="go-media-grid" id="goMedia"></div></div>'+
'<div class="card" style="margin-top:16px"><div class="cardhead"><div><h3>Mobile app contract</h3><p>The backend actions the volunteer app can call when we build it.</p></div><span class="badge lime">READY</span></div><div class="go-mobile-contract"><div class="go-mobile-step"><b>1. Select Hunt</b>Capacity/access checked atomically.</div><div class="go-mobile-step"><b>2. Check In + GPS</b>Creates assignment state and safety location.</div><div class="go-mobile-step"><b>3. Upload Media</b>Private guide-specific storage path.</div><div class="go-mobile-step"><b>4. Live Location</b>Periodic pings only for active assignment.</div><div class="go-mobile-step"><b>5. Chat / Emergency</b>Realtime weekend/hunt messages and emergency alerts.</div><div class="go-mobile-step"><b>6. Check Out</b>Ends field status and records final location if provided.</div></div></div>';

function makeModal(id,title,body){
  let m=document.getElementById(id);if(m)m.remove();
  m=document.createElement('div');m.className='modal';m.id=id;
  m.innerHTML='<div class="modalbox" style="width:min(760px,100%)"><div class="modalhead"><h3>'+E(title)+'</h3><button class="x" type="button">×</button></div><div class="go-modal-body">'+body+'</div></div>';
  document.body.appendChild(m);m.querySelector('.x').onclick=()=>m.classList.remove('open');m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});return m;
}

const weekendModal=makeModal('goWeekendModal','Hunt weekend','<div class="field"><label>WEEKEND NAME</label><input id="goWTitle"></div><div class="formrow"><div class="field"><label>START DATE</label><input id="goWStart" type="date"></div><div class="field"><label>END DATE</label><input id="goWEnd" type="date"></div></div><div class="field"><label>STATUS</label><select id="goWStatus"><option value="planning">Planning</option><option value="open">Open</option><option value="active">Active</option><option value="closed">Closed</option><option value="archived">Archived</option></select></div><div class="field"><label>NOTES</label><textarea id="goWNotes"></textarea></div><div class="go-actions" style="justify-content:flex-end"><button class="btn primary" id="goWSave">Save weekend</button></div>');
const huntModal=makeModal('goHuntModal','Hunt','<div class="field"><label>HUNT NAME</label><input id="goHTitle"></div><div class="formrow"><div class="field"><label>START</label><input id="goHStart" type="datetime-local"></div><div class="field"><label>END</label><input id="goHEnd" type="datetime-local"></div></div><div class="formrow"><div class="field"><label>STATUS</label><select id="goHStatus"><option value="planning">Planning</option><option value="open">Open</option><option value="active">Active</option><option value="complete">Complete</option><option value="cancelled">Cancelled</option></select></div><div class="field"><label>MAX GUIDES</label><input id="goHMax" type="number" min="1" max="50" value="4"></div></div><div class="field"><label>LOCATION LABEL</label><input id="goHLocation"></div><div class="field"><label>MEETING POINT</label><input id="goHMeeting"></div><div class="field"><label>GUIDE INSTRUCTIONS</label><textarea id="goHInstructions"></textarea></div><div class="field"><label>EMERGENCY NOTES</label><textarea id="goHEmergency"></textarea></div><div class="go-actions" style="justify-content:flex-end"><button class="btn primary" id="goHSave">Save hunt</button></div>');
const guideModal=makeModal('goGuideModal','Volunteer guide','<div class="field"><label>DISPLAY NAME</label><input id="goGName"></div><div class="formrow"><div class="field"><label>EMAIL</label><input id="goGEmail" type="email"></div><div class="field"><label>PHONE</label><input id="goGPhone"></div></div><div class="field"><label>NOTES</label><textarea id="goGNotes"></textarea></div><label style="font-size:11px"><input id="goGActive" type="checkbox" checked> Active guide</label><div class="go-actions" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" id="goGSave">Save guide</button></div><p class="go-modal-note">The mobile app will securely claim this guide profile when the volunteer signs in using the same email address.</p>');
const assignModal=makeModal('goAssignModal','Manage hunt guides','<div id="goAssignBody"></div>');
const mediaModal=makeModal('goMediaModal','Guide media preview','<div id="goMediaPreview"></div>');

document.getElementById('goAddWeekend').onclick=()=>openWeekend();
document.getElementById('goEditWeekend').onclick=()=>openWeekend(weekendId);
document.getElementById('goAddHunt').onclick=()=>{if(!weekendId)return notice('Create or select a hunt weekend first.');openHunt()};
document.getElementById('goAddGuide').onclick=()=>openGuide();
document.getElementById('goRefresh').onclick=()=>loadAll(true);
document.getElementById('goWeekendSelect').onchange=e=>{weekendId=e.target.value||null;loadWeekendDetail();subscribe()};
document.getElementById('goChatTarget').onchange=renderChat;
document.getElementById('goSendChat').onclick=sendChat;
document.getElementById('goWSave').onclick=saveWeekend;
document.getElementById('goHSave').onclick=saveHunt;
document.getElementById('goGSave').onclick=saveGuide;

function demo(){
  const now=new Date();
  weekends=[{id:'dw',title:'Demo Hunt Weekend',starts_on:now.toISOString().slice(0,10),ends_on:new Date(now.getTime()+86400000).toISOString().slice(0,10),status:'open',notes:'Demo mode'}];
  weekendId='dw';
  hunts=[{id:'dh1',activity_id:'da1',title:'Saturday Morning Hunt 1',scheduled_start:now.toISOString(),location_label:'Demo Property A',meeting_point:'Main camp',status:'open',max_guides:4,guide_instructions:'Meet 30 minutes before departure.',emergency_notes:'Demo emergency notes.'},{id:'dh2',activity_id:'da2',title:'Saturday Morning Hunt 2',scheduled_start:now.toISOString(),location_label:'Demo Property B',meeting_point:'South gate',status:'open',max_guides:4}];
  guides=[{id:'dg1',display_name:'Volunteer Guide',email:'guide@example.com',phone:'',auth_user_id:null,active:true,notes:'Demo guide'}];
  accessRows=[{id:'dacc',guide_id:'dg1',status:'active'}];
  assignments=[{id:'das',hunt_id:'dh1',guide_id:'dg1',status:'scheduled',checked_in_at:null,checked_out_at:null}];
  locations=[];emergencies=[];messages=[{id:'dm',hunt_id:null,guide_id:null,message:'Guide Ops admin is ready for weekend operations.',message_type:'system',created_at:now.toISOString()}];media=[];
  renderAll();
}

async function loadAll(){
  if(!live()){demo();return}
  try{
    const [wr,gr]=await Promise.all([
      sb.from('dh_hunt_weekends').select('*').eq('org_id',liveOrgId).order('starts_on',{ascending:false}).limit(50),
      sb.from('dh_guides').select('*').eq('org_id',liveOrgId).order('active',{ascending:false}).order('display_name')
    ]);
    if(wr.error)throw wr.error;if(gr.error)throw gr.error;
    weekends=wr.data||[];guides=gr.data||[];
    if(!weekendId||!weekends.some(x=>x.id===weekendId)){const p=weekends.find(x=>['active','open'].includes(x.status));weekendId=(p||weekends[0])?.id||null}
    renderWeekendSelect();
    if(weekendId){await loadWeekendDetail();subscribe()}else clearWeekend();
  }catch(e){notice('Guide Ops could not load: '+(e.message||e))}
}

async function loadWeekendDetail(){
  if(!live()||!weekendId){renderAll();return}
  try{
    const [hr,ar,asr,lr,er,mr]=await Promise.all([
      sb.from('dh_hunts').select('*').eq('org_id',liveOrgId).eq('weekend_id',weekendId).order('scheduled_start'),
      sb.from('dh_guide_weekend_access').select('*').eq('org_id',liveOrgId).eq('weekend_id',weekendId),
      sb.from('dh_hunt_assignments').select('*').eq('org_id',liveOrgId).order('created_at'),
      sb.from('dh_guide_locations').select('*').eq('org_id',liveOrgId).eq('weekend_id',weekendId).order('captured_at',{ascending:false}).limit(500),
      sb.from('dh_hunt_emergencies').select('*').eq('org_id',liveOrgId).eq('weekend_id',weekendId).order('triggered_at',{ascending:false}).limit(100),
      sb.from('dh_hunt_messages').select('*').eq('org_id',liveOrgId).eq('weekend_id',weekendId).order('created_at',{ascending:true}).limit(500)
    ]);
    const err=[hr,ar,asr,lr,er,mr].find(x=>x.error)?.error;if(err)throw err;
    hunts=hr.data||[];accessRows=ar.data||[];assignments=(asr.data||[]).filter(x=>hunts.some(h=>h.id===x.hunt_id));locations=lr.data||[];emergencies=er.data||[];messages=mr.data||[];
    await loadMedia();
    renderAll();
  }catch(e){notice('Weekend detail could not load: '+(e.message||e))}
}

async function loadMedia(){
  media=[];
  if(!live())return;
  const activityIds=hunts.map(x=>x.activity_id).filter(Boolean);if(!activityIds.length)return;
  const r=await sb.from('dh_media_assets').select('id,activity_id,permission_id,storage_path,media_type,caption,approved_for_social,approved_for_sponsor_use,metadata,created_by,created_at').eq('org_id',liveOrgId).in('activity_id',activityIds).order('created_at',{ascending:false}).limit(100);
  if(r.error)throw r.error;
  const rows=r.data||[];
  media=await Promise.all(rows.map(async x=>{let signed=null;const s=await sb.storage.from('dh-trial-media').createSignedUrl(x.storage_path,3600);if(!s.error)signed=s.data?.signedUrl||null;return {...x,preview_url:signed}}));
}

function clearWeekend(){hunts=[];accessRows=[];assignments=[];locations=[];emergencies=[];messages=[];media=[];renderAll()}
function renderWeekendSelect(){
  const s=document.getElementById('goWeekendSelect');
  s.innerHTML=weekends.length?weekends.map(w=>'<option value="'+w.id+'" '+(w.id===weekendId?'selected':'')+'>'+E(w.title)+' · '+E(w.status)+' · '+E(w.starts_on)+'</option>').join(''):'<option value="">No hunt weekends yet</option>';
  document.getElementById('goEditWeekend').disabled=!weekendId;
}
function renderAll(){renderWeekendSelect();renderStats();renderHunts();renderLocations();renderEmergencies();renderChatTarget();renderChat();renderRoster();renderMedia()}
function renderStats(){
  const activeAccess=accessRows.filter(x=>x.status==='active').length,openE=emergencies.filter(x=>['open','acknowledged'].includes(x.status)).length;
  const vals=[hunts.length,activeAccess,media.length,openE];
  document.querySelectorAll('#goStats .stat .v').forEach((x,i)=>x.textContent=String(vals[i]||0));
  const e=document.querySelectorAll('#goStats .stat .v')[3];if(e)e.classList.toggle('go-emergency-count',openE>0);
}

function renderHunts(){
  const box=document.getElementById('goHunts');
  if(!hunts.length){box.innerHTML='<div class="go-empty">No hunts loaded for this weekend. Use “+ Hunt” to add the hunt schedule.</div>';return}
  box.innerHTML=hunts.map(h=>{
    const aa=assignments.filter(x=>x.hunt_id===h.id&&x.status!=='cancelled'),mm=media.filter(x=>x.activity_id===h.activity_id);
    const names=aa.map(x=>guideName(x.guide_id)+' · '+x.status).join(', ');
    return '<div class="go-hunt"><div class="go-hunt-head"><div><h4>'+E(h.title)+'</h4><div class="go-meta">'+fmt(h.scheduled_start)+(h.scheduled_end?' – '+fmt(h.scheduled_end):'')+'<br>'+E(h.location_label||'Location not entered')+(h.meeting_point?'<br>Meet: '+E(h.meeting_point):'')+'</div></div><span class="badge">'+E(h.status)+'</span></div>'+
      '<div class="go-badges"><span class="badge">'+aa.length+'/'+h.max_guides+' guides</span><span class="badge">'+mm.length+' media</span></div>'+
      (names?'<div class="go-meta" style="margin-top:7px">'+E(names)+'</div>':'')+
      '<div class="go-actions" style="margin-top:10px"><button class="btn small" data-manage-guides="'+h.id+'">Manage guides</button><button class="btn small" data-edit-hunt="'+h.id+'">Edit</button>'+(h.activity_id?'<button class="btn small" data-open-content="'+h.id+'">Content</button>':'')+'</div></div>';
  }).join('');
  box.querySelectorAll('[data-manage-guides]').forEach(b=>b.onclick=()=>openAssignments(b.dataset.manageGuides));
  box.querySelectorAll('[data-edit-hunt]').forEach(b=>b.onclick=()=>openHunt(b.dataset.editHunt));
  box.querySelectorAll('[data-open-content]').forEach(b=>b.onclick=()=>openContent(b.dataset.openContent));
}
function openContent(huntId){
  const h=byId(hunts,huntId);if(!h?.activity_id)return;
  if(typeof currentActivityId!=='undefined')currentActivityId=h.activity_id;
  const hn=document.getElementById('huntName');if(hn)hn.value=h.title;
  showSection('content');if(typeof loadMediaAssets==='function')loadMediaAssets();
}

function latestLocations(){
  const seen=new Set(),out=[];for(const x of locations){if(seen.has(x.guide_id))continue;seen.add(x.guide_id);out.push(x)}return out;
}
function renderLocations(){
  const box=document.getElementById('goLocations'),rows=latestLocations();
  if(!rows.length){box.innerHTML='<div class="go-empty">No guide GPS received yet.</div>';return}
  box.innerHTML=rows.map(x=>{
    const ageMin=Math.max(0,Math.round((Date.now()-new Date(x.captured_at).getTime())/60000)),stale=ageMin>15;
    const a=assignments.find(z=>z.guide_id===x.guide_id&&z.hunt_id===x.hunt_id&&z.status!=='cancelled');
    return '<div class="go-status"><div class="qicon">⌖</div><div class="grow"><div class="who">'+E(guideName(x.guide_id))+'</div><div class="where">'+E(huntName(x.hunt_id))+' · '+fmt(x.captured_at)+' · '+(stale?'<span class="go-stale">'+ageMin+' min old</span>':ageMin+' min old')+(x.accuracy_m?' · ±'+Math.round(Number(x.accuracy_m))+'m':'')+(x.battery_pct!==null&&x.battery_pct!==undefined?' · '+x.battery_pct+'% battery':'')+(a?' · '+E(a.status):'')+'</div></div><button class="btn small" data-map="'+x.latitude+','+x.longitude+'">Map</button></div>';
  }).join('');
  box.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.dataset.map),'_blank','noopener'));
}
function renderEmergencies(){
  const box=document.getElementById('goEmergencies'),rows=emergencies.filter(x=>['open','acknowledged'].includes(x.status));
  if(!rows.length){box.innerHTML='';return}
  box.innerHTML=rows.map(x=>'<div class="go-alert" style="margin-bottom:8px"><strong>Emergency · '+E(guideName(x.guide_id))+'</strong><div class="go-meta">'+E(huntName(x.hunt_id))+' · '+fmt(x.triggered_at)+' · '+E(x.status)+'</div><div style="font-size:11px;margin-top:6px">'+E(x.message||'Emergency alert triggered from guide app.')+'</div><div class="go-actions" style="margin-top:8px">'+(x.status==='open'?'<button class="btn small" data-ack="'+x.id+'">Acknowledge</button>':'')+'<button class="btn small" data-resolve="'+x.id+'">Resolve</button>'+(x.latitude!==null&&x.longitude!==null?'<button class="btn small" data-emap="'+x.latitude+','+x.longitude+'">Map</button>':'')+'</div></div>').join('');
  box.querySelectorAll('[data-ack]').forEach(b=>b.onclick=()=>updateEmergency(b.dataset.ack,'acknowledged'));
  box.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=()=>updateEmergency(b.dataset.resolve,'resolved'));
  box.querySelectorAll('[data-emap]').forEach(b=>b.onclick=()=>window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.dataset.emap),'_blank','noopener'));
}

function renderChatTarget(){
  const s=document.getElementById('goChatTarget'),cur=s.value;
  s.innerHTML='<option value="">All guides</option>'+hunts.map(h=>'<option value="'+h.id+'">'+E(h.title)+'</option>').join('');
  if([...s.options].some(o=>o.value===cur))s.value=cur;
}
function renderChat(){
  const box=document.getElementById('goChat'),target=document.getElementById('goChatTarget').value;
  const rows=messages.filter(x=>target?x.hunt_id===target:true);
  if(!rows.length){box.innerHTML='<div class="go-empty">No messages in this channel yet.</div>';return}
  box.innerHTML=rows.map(x=>'<div class="go-msg '+(!x.guide_id?'admin':'')+' '+(x.message_type==='emergency'?'emergency':'')+'"><div class="meta">'+E(x.guide_id?guideName(x.guide_id):'Dream Hunt Admin')+' · '+E(x.hunt_id?huntName(x.hunt_id):'All guides')+' · '+fmt(x.created_at)+'</div>'+E(x.message)+'</div>').join('');
  box.scrollTop=box.scrollHeight;
}

function activeAccessMap(){return new Map(accessRows.filter(x=>x.status==='active').map(x=>[x.guide_id,x]))}
function renderRoster(){
  const box=document.getElementById('goRoster');
  if(!guides.length){box.innerHTML='<div class="go-empty">No volunteer guides have been added yet.</div>';return}
  const active=activeAccessMap();
  box.innerHTML=guides.map(g=>{
    const mine=assignments.filter(x=>x.guide_id===g.id&&x.status!=='cancelled');
    return '<div class="go-guide" style="'+(!g.active?'opacity:.55':'')+'"><div class="grow"><b>'+E(g.display_name)+'</b><small>'+E(g.email||'No email')+' · '+(g.auth_user_id?'Mobile linked':'Not linked yet')+(mine.length?' · '+mine.length+' hunt assignment'+(mine.length===1?'':'s'):'')+'</small></div>'+
      (g.active?(active.has(g.id)?'<button class="btn small go-danger" data-revoke="'+g.id+'">Revoke</button>':'<button class="btn small" data-authorize="'+g.id+'">Authorize</button>'):'<span class="badge">INACTIVE</span>')+
      '<button class="btn small" data-edit-guide="'+g.id+'">Edit</button></div>';
  }).join('');
  box.querySelectorAll('[data-authorize]').forEach(b=>b.onclick=()=>authorizeGuide(b.dataset.authorize));
  box.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>revokeGuide(b.dataset.revoke));
  box.querySelectorAll('[data-edit-guide]').forEach(b=>b.onclick=()=>openGuide(b.dataset.editGuide));
}

function renderMedia(){
  const box=document.getElementById('goMedia');document.getElementById('goMediaCount').textContent=media.length+' item'+(media.length===1?'':'s');
  if(!media.length){box.innerHTML='<div class="go-empty" style="grid-column:1/-1">No guide media has arrived for this weekend yet.</div>';return}
  box.innerHTML=media.map(x=>{
    const h=hunts.find(z=>z.activity_id===x.activity_id),g=guides.find(z=>z.auth_user_id===x.created_by),video=(x.media_type||'').startsWith('video');
    const preview=x.preview_url?(video?'<video src="'+E(x.preview_url)+'" muted playsinline preload="metadata"></video>':'<img src="'+E(x.preview_url)+'" alt="">'):'<div style="font-size:26px">'+(video?'▶':'▧')+'</div>';
    return '<div class="go-media"><div class="go-media-thumb" data-preview-media="'+x.id+'">'+preview+'</div><div class="go-media-info"><b>'+E(x.caption||x.metadata?.original_name||'Guide media')+'</b><small>'+E(h?.title||'Hunt')+' · '+E(g?.display_name||'Guide')+'<br>'+fmt(x.created_at)+'</small><div class="go-actions" style="margin-top:6px"><button class="btn small" data-media-content="'+x.id+'">Content</button></div></div></div>';
  }).join('');
  box.querySelectorAll('[data-preview-media]').forEach(b=>b.onclick=()=>openMedia(b.dataset.previewMedia));
  box.querySelectorAll('[data-media-content]').forEach(b=>b.onclick=()=>{const x=byId(media,b.dataset.mediaContent),h=hunts.find(z=>z.activity_id===x?.activity_id);if(h)openContent(h.id)});
}
function openMedia(id){
  const x=byId(media,id);if(!x)return;const video=(x.media_type||'').startsWith('video');
  document.getElementById('goMediaPreview').innerHTML=(x.preview_url?(video?'<video src="'+E(x.preview_url)+'" controls style="width:100%;max-height:65vh"></video>':'<img src="'+E(x.preview_url)+'" style="width:100%;max-height:65vh;object-fit:contain">'):'<div class="go-empty">Preview unavailable.</div>')+'<p class="go-modal-note">'+E(x.caption||x.metadata?.original_name||'Media')+' · '+fmt(x.created_at)+'</p>';
  mediaModal.classList.add('open');
}

function openWeekend(id){
  editingWeekendId=id||null;const w=id?byId(weekends,id):null;
  document.getElementById('goWTitle').value=w?.title||'';document.getElementById('goWStart').value=w?.starts_on||'';document.getElementById('goWEnd').value=w?.ends_on||'';document.getElementById('goWStatus').value=w?.status||'open';document.getElementById('goWNotes').value=w?.notes||'';weekendModal.classList.add('open');
}
async function saveWeekend(){
  if(!live())return notice('Connect the trial backend to save hunt weekends.');
  const title=document.getElementById('goWTitle').value.trim(),starts_on=document.getElementById('goWStart').value,ends_on=document.getElementById('goWEnd').value,status=document.getElementById('goWStatus').value,notes=document.getElementById('goWNotes').value.trim()||null;
  if(!title||!starts_on||!ends_on)return notice('Weekend name, start and end dates are required.');
  let r;if(editingWeekendId)r=await sb.from('dh_hunt_weekends').update({title,starts_on,ends_on,status,notes}).eq('org_id',liveOrgId).eq('id',editingWeekendId).select().single();else r=await sb.from('dh_hunt_weekends').insert({org_id:liveOrgId,title,starts_on,ends_on,status,notes,created_by:liveUser.id}).select().single();
  if(r.error)return notice('Could not save weekend: '+r.error.message);weekendModal.classList.remove('open');weekendId=r.data.id;await loadAll();notice(editingWeekendId?'Weekend updated.':'Hunt weekend created.');
}

function openHunt(id){
  editingHuntId=id||null;const h=id?byId(hunts,id):null;
  document.getElementById('goHTitle').value=h?.title||'';document.getElementById('goHStart').value=localInput(h?.scheduled_start);document.getElementById('goHEnd').value=localInput(h?.scheduled_end);document.getElementById('goHStatus').value=h?.status||'open';document.getElementById('goHMax').value=h?.max_guides||4;document.getElementById('goHLocation').value=h?.location_label||'';document.getElementById('goHMeeting').value=h?.meeting_point||'';document.getElementById('goHInstructions').value=h?.guide_instructions||'';document.getElementById('goHEmergency').value=h?.emergency_notes||'';huntModal.classList.add('open');
}
function activityStatusForHunt(status){return status==='planning'?'draft':status==='complete'?'complete':status==='cancelled'?'archived':'ready'}
async function saveHunt(){
  if(!live())return notice('Connect the trial backend to save hunts.');
  const title=document.getElementById('goHTitle').value.trim();if(!title)return notice('Hunt name is required.');
  const start=document.getElementById('goHStart').value,end=document.getElementById('goHEnd').value,status=document.getElementById('goHStatus').value,max_guides=Math.max(1,Math.min(50,Number(document.getElementById('goHMax').value||4))),location=document.getElementById('goHLocation').value.trim()||null,meeting=document.getElementById('goHMeeting').value.trim()||null,guide_instructions=document.getElementById('goHInstructions').value.trim()||null,emergency_notes=document.getElementById('goHEmergency').value.trim()||null;
  if(editingHuntId){
    const h=byId(hunts,editingHuntId),r=await sb.from('dh_hunts').update({title,scheduled_start:start?new Date(start).toISOString():null,scheduled_end:end?new Date(end).toISOString():null,location_label:location,meeting_point:meeting,guide_instructions,emergency_notes,status,max_guides}).eq('org_id',liveOrgId).eq('id',editingHuntId).select().single();
    if(r.error)return notice('Could not update hunt: '+r.error.message);
    if(h?.activity_id)await sb.from('dh_activities').update({title,starts_at:start?new Date(start).toISOString():null,location_label:location,status:activityStatusForHunt(status)}).eq('org_id',liveOrgId).eq('id',h.activity_id);
  }else{
    const hr=await sb.rpc('dh_admin_create_hunt',{
      p_org_id:liveOrgId,
      p_weekend_id:weekendId,
      p_title:title,
      p_scheduled_start:start?new Date(start).toISOString():null,
      p_scheduled_end:end?new Date(end).toISOString():null,
      p_location_label:location,
      p_meeting_point:meeting,
      p_guide_instructions:guide_instructions,
      p_emergency_notes:emergency_notes,
      p_status:status,
      p_max_guides:max_guides
    });
    if(hr.error)return notice('Could not create hunt: '+hr.error.message);
  }
  huntModal.classList.remove('open');await loadWeekendDetail();notice(editingHuntId?'Hunt updated.':'Hunt created and ready for guide assignment.');
}

function openGuide(id){
  editingGuideId=id||null;const g=id?byId(guides,id):null;
  document.getElementById('goGName').value=g?.display_name||'';document.getElementById('goGEmail').value=g?.email||'';document.getElementById('goGPhone').value=g?.phone||'';document.getElementById('goGNotes').value=g?.notes||'';document.getElementById('goGActive').checked=g?!!g.active:true;guideModal.classList.add('open');
}
async function saveGuide(){
  if(!live())return notice('Connect the trial backend to save guides.');
  const display_name=document.getElementById('goGName').value.trim(),email=document.getElementById('goGEmail').value.trim().toLowerCase(),phone=document.getElementById('goGPhone').value.trim()||null,notes=document.getElementById('goGNotes').value.trim()||null,active=document.getElementById('goGActive').checked;
  if(!display_name||!email)return notice('Guide name and email are required.');
  let r;if(editingGuideId)r=await sb.from('dh_guides').update({display_name,email,phone,notes,active}).eq('org_id',liveOrgId).eq('id',editingGuideId).select().single();else r=await sb.from('dh_guides').insert({org_id:liveOrgId,display_name,email,phone,notes,active,created_by:liveUser.id}).select().single();
  if(r.error)return notice('Could not save guide: '+r.error.message);guideModal.classList.remove('open');await loadAll();notice(editingGuideId?'Guide updated.':'Volunteer guide added.');
}

async function authorizeGuide(guideId){
  if(!live()||!weekendId)return;
  const r=await sb.from('dh_guide_weekend_access').upsert({org_id:liveOrgId,weekend_id:weekendId,guide_id:guideId,status:'active',created_by:liveUser.id},{onConflict:'weekend_id,guide_id'}).select().single();
  if(r.error)return notice('Could not authorize guide: '+r.error.message);await loadWeekendDetail();notice('Guide authorized for this weekend.');
}
async function revokeGuide(guideId){
  if(!live())return;
  const r=await sb.from('dh_guide_weekend_access').update({status:'revoked'}).eq('org_id',liveOrgId).eq('weekend_id',weekendId).eq('guide_id',guideId);
  if(r.error)return notice('Could not revoke access: '+r.error.message);
  await sb.from('dh_hunt_assignments').update({status:'cancelled'}).eq('org_id',liveOrgId).eq('guide_id',guideId).in('hunt_id',hunts.map(h=>h.id)).neq('status','complete');
  await loadWeekendDetail();notice('Weekend access revoked and active hunt assignments cancelled.');
}

function openAssignments(huntId){
  assignmentHuntId=huntId;const h=byId(hunts,huntId),authorized=guides.filter(g=>g.active&&accessRows.some(a=>a.guide_id===g.id&&a.status==='active'));
  const activeAssignments=assignments.filter(a=>a.hunt_id===huntId&&a.status!=='cancelled');
  let html='<div class="go-inline" style="justify-content:space-between;margin-bottom:10px"><div><strong>'+E(h?.title||'Hunt')+'</strong><div class="go-capacity">'+activeAssignments.length+'/'+(h?.max_guides||0)+' guide slots filled</div></div></div>';
  if(!authorized.length)html+='<div class="go-empty">Authorize guides for this weekend first.</div>';
  else html+=authorized.map(g=>{const a=assignments.find(x=>x.hunt_id===huntId&&x.guide_id===g.id&&x.status!=='cancelled');return '<div class="go-assignment"><div><b>'+E(g.display_name)+'</b><div class="go-meta">'+E(g.email||'')+'</div></div>'+(a?'<select data-assignment-status="'+a.id+'"><option value="scheduled" '+(a.status==='scheduled'?'selected':'')+'>Scheduled</option><option value="selected" '+(a.status==='selected'?'selected':'')+'>Selected</option><option value="checked_in" '+(a.status==='checked_in'?'selected':'')+'>Checked in</option><option value="checked_out" '+(a.status==='checked_out'?'selected':'')+'>Checked out</option><option value="complete" '+(a.status==='complete'?'selected':'')+'>Complete</option></select><button class="btn small go-danger" data-unassign="'+a.id+'">Remove</button>':'<span></span><button class="btn small" data-assign="'+g.id+'">Assign</button>')+'</div>'}).join('');
  document.getElementById('goAssignBody').innerHTML=html;
  document.querySelectorAll('[data-assign]').forEach(b=>b.onclick=()=>assignGuide(b.dataset.assign));
  document.querySelectorAll('[data-unassign]').forEach(b=>b.onclick=()=>unassignGuide(b.dataset.unassign));
  document.querySelectorAll('[data-assignment-status]').forEach(s=>s.onchange=()=>setAssignmentStatus(s.dataset.assignmentStatus,s.value));
  assignModal.classList.add('open');
}
async function assignGuide(guideId){
  const h=byId(hunts,assignmentHuntId),count=assignments.filter(a=>a.hunt_id===assignmentHuntId&&a.status!=='cancelled').length;if(count>=Number(h?.max_guides||0))return notice('This hunt has reached its guide limit.');
  const r=await sb.from('dh_hunt_assignments').upsert({org_id:liveOrgId,hunt_id:assignmentHuntId,guide_id:guideId,role:'guide',status:'scheduled',selected_at:new Date().toISOString(),checked_in_at:null,checked_out_at:null,created_by:liveUser.id},{onConflict:'hunt_id,guide_id'}).select().single();
  if(r.error)return notice('Could not assign guide: '+r.error.message);await loadWeekendDetail();openAssignments(assignmentHuntId);notice('Guide assigned.');
}
async function unassignGuide(id){
  const r=await sb.from('dh_hunt_assignments').update({status:'cancelled'}).eq('org_id',liveOrgId).eq('id',id);if(r.error)return notice('Could not remove assignment: '+r.error.message);await loadWeekendDetail();openAssignments(assignmentHuntId);notice('Guide removed from hunt.');
}
async function setAssignmentStatus(id,status){
  const patch={status};if(status==='checked_in')patch.checked_in_at=new Date().toISOString();if(status==='checked_out'||status==='complete')patch.checked_out_at=new Date().toISOString();
  const r=await sb.from('dh_hunt_assignments').update(patch).eq('org_id',liveOrgId).eq('id',id);if(r.error)return notice('Could not update assignment: '+r.error.message);await loadWeekendDetail();openAssignments(assignmentHuntId);notice('Assignment status updated.');
}

async function sendChat(){
  if(!live())return notice('Connect the trial backend to send hunt chat.');
  const input=document.getElementById('goChatInput'),message=input.value.trim(),hunt_id=document.getElementById('goChatTarget').value||null;if(!message)return;
  const r=await sb.from('dh_hunt_messages').insert({org_id:liveOrgId,weekend_id:weekendId,hunt_id,guide_id:null,sender_user_id:liveUser.id,message,message_type:hunt_id?'chat':'announcement'});
  if(r.error)return notice('Could not send message: '+r.error.message);input.value='';await loadWeekendDetail();
}
async function updateEmergency(id,status){
  const patch=status==='acknowledged'?{status,acknowledged_by:liveUser.id,acknowledged_at:new Date().toISOString()}:{status,resolved_by:liveUser.id,resolved_at:new Date().toISOString()};
  const r=await sb.from('dh_hunt_emergencies').update(patch).eq('org_id',liveOrgId).eq('id',id);if(r.error)return notice('Could not update emergency: '+r.error.message);await loadWeekendDetail();notice(status==='resolved'?'Emergency resolved.':'Emergency acknowledged.');
}

function scheduleReload(){clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>loadWeekendDetail(),350)}
function subscribe(){
  if(typeof sb==='undefined'||!live()||!weekendId)return;if(realtimeChannel)sb.removeChannel(realtimeChannel);
  realtimeChannel=sb.channel('guideops-v2-'+weekendId)
    .on('postgres_changes',{event:'*',schema:'public',table:'dh_hunt_messages',filter:'weekend_id=eq.'+weekendId},scheduleReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'dh_guide_locations',filter:'weekend_id=eq.'+weekendId},scheduleReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'dh_hunt_emergencies',filter:'weekend_id=eq.'+weekendId},scheduleReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'dh_hunt_assignments',filter:'org_id=eq.'+liveOrgId},scheduleReload)
    .subscribe();
}

if(typeof sb!=='undefined'&&sb.auth?.onAuthStateChange)sb.auth.onAuthStateChange(()=>setTimeout(()=>{if(document.getElementById('guideops')?.classList.contains('active'))loadAll()},300));
window.refreshDreamHuntGuideOps=loadAll;
window.DreamHuntGuideOps={reload:loadAll,openWeekend,openHunt,openGuide,openAssignments};

renderWeekendSelect();
})();