(function(){
'use strict';
let calendarCursor=new Date();
calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1);
let calendarItems=[];
let editingCalendarItem=null;
let editingDraftContext=null;

const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const notify=m=>typeof toast==='function'?toast(m):alert(m);
const isLive=()=>typeof liveMode!=='undefined'&&liveMode&&typeof liveOrgId!=='undefined'&&liveOrgId;
const pad=n=>String(n).padStart(2,'0');
const localInput=v=>{if(!v)return'';const d=new Date(v);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
const monthName=d=>d.toLocaleDateString(undefined,{month:'long',year:'numeric'});
const isoAt=(date,hour=18)=>{const d=new Date(date);d.setHours(hour,0,0,0);return d.toISOString()};

const css=document.createElement('style');
css.textContent='.cal-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.cal-tools strong{font:800 14px Manrope}.cal-nav{display:flex;gap:6px}.day.blank{background:transparent;border-color:transparent;box-shadow:none}.day.has-items{cursor:pointer}.day.has-items:hover{border-color:#91a79a}.event{cursor:pointer}.event.draft{background:#f4e9dc}.event.approved{background:#e8f2e3}.event.published{background:#dfece8}.event.yellow{outline:1px solid #e6b891}.cal-counts{font-size:10px;color:var(--muted);display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}.wf-note{font-size:10px;color:var(--muted);line-height:1.45;margin-top:8px}.opp.saved{border-color:#9fb78d;background:#f5f9f1}.opp .saved-mark{font-size:10px;color:#527244;font-weight:800}.edit-meta{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}@media(max-width:760px){.cal-tools{align-items:flex-start}.calendar{grid-template-columns:repeat(2,1fr)!important}.day.blank{display:none}}';
document.head.appendChild(css);

function addModal(id,title){
 const m=document.createElement('div');m.className='modal';m.id=id;
 m.innerHTML='<div class="modalbox" style="width:min(720px,100%)"><div class="modalhead"><h3>'+esc(title)+'</h3><button class="x" type="button">×</button></div><div class="wf-body"></div></div>';
 document.body.appendChild(m);m.querySelector('.x').onclick=()=>m.classList.remove('open');m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});return m;
}
const calModal=addModal('calendarItemModal','Content calendar item');
const editModal=addModal('draftEditModal','Edit content draft');

function demoCalendar(){
 const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();
 const mk=(day,title,platform,status='draft',type='mission_story')=>({id:'demo-cal-'+day+'-'+title,platform,title,body:title+' — demo calendar content.',status,content_type:type,sensitivity:'green',scheduled_for:new Date(y,m,day,18,0).toISOString()});
 return [mk(3,'Volunteer spotlight','Instagram','approved','reel_caption'),mk(7,'Sponsor thank-you','Facebook','draft','sponsor_value'),mk(12,'Mission story','Facebook','approved'),mk(16,'Hunt recap Reel','Instagram','draft','reel_caption'),mk(21,'Partner feature','LinkedIn','approved','sponsor_value'),mk(25,'Family story','Facebook','draft')];
}
async function loadCalendarItems(){
 if(!isLive()){calendarItems=demoCalendar();return}
 const start=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1);
 const end=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);
 const r=await sb.from('dh_content_items').select('id,activity_id,sponsor_id,platform,content_type,title,body,status,sensitivity,approval_required,sponsor_disclosure_required,scheduled_for,published_at,created_at').eq('org_id',liveOrgId).gte('scheduled_for',start.toISOString()).lt('scheduled_for',end.toISOString()).order('scheduled_for');
 if(r.error)throw r.error;calendarItems=r.data||[];
}
function calendarClass(x){if(x.sensitivity==='yellow')return'yellow';if(x.status==='approved')return'approved';if(x.status==='published')return'published';return'draft'}
async function renderCalendarEnhanced(){
 const grid=document.getElementById('calendarGrid');if(!grid)return;
 try{await loadCalendarItems()}catch(e){notify('Could not load calendar: '+e.message);return}
 const parent=grid.parentElement;
 let tools=parent.querySelector('.cal-tools');
 if(!tools){tools=document.createElement('div');tools.className='cal-tools';tools.innerHTML='<div class="cal-nav"><button class="btn small" data-cal-prev>‹</button><button class="btn small" data-cal-today>Today</button><button class="btn small" data-cal-next>›</button></div><strong data-cal-label></strong>';parent.insertBefore(tools,grid);tools.querySelector('[data-cal-prev]').onclick=()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);renderCalendarEnhanced()};tools.querySelector('[data-cal-next]').onclick=()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);renderCalendarEnhanced()};tools.querySelector('[data-cal-today]').onclick=()=>{const n=new Date();calendarCursor=new Date(n.getFullYear(),n.getMonth(),1);renderCalendarEnhanced()}}
 tools.querySelector('[data-cal-label]').textContent=monthName(calendarCursor);
 const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
 const cells=[];
 for(let i=0;i<first;i++)cells.push('<div class="day blank"></div>');
 for(let day=1;day<=days;day++){
   const items=calendarItems.filter(x=>new Date(x.scheduled_for).getDate()===day);
   cells.push('<div class="day '+(items.length?'has-items':'')+'" data-cal-day="'+day+'"><div class="num">'+day+'</div>'+items.map(x=>'<div class="event '+calendarClass(x)+'" data-cal-id="'+x.id+'"><b>'+esc(x.platform)+'</b><br>'+esc(x.title||x.content_type||'Content')+'</div>').join('')+'</div>');
 }
 grid.innerHTML=cells.join('');
 grid.querySelectorAll('[data-cal-id]').forEach(el=>el.onclick=e=>{e.stopPropagation();openCalendarItem(el.dataset.calId)});
 let counts=parent.querySelector('.cal-counts');if(!counts){counts=document.createElement('div');counts.className='cal-counts';parent.appendChild(counts)}
 counts.innerHTML='<span>Scheduled: <b>'+calendarItems.length+'</b></span><span>Drafts: <b>'+calendarItems.filter(x=>x.status==='draft').length+'</b></span><span>Approved: <b>'+calendarItems.filter(x=>x.status==='approved').length+'</b></span><span>Published: <b>'+calendarItems.filter(x=>x.status==='published').length+'</b></span>';
 const tabs=parent.querySelectorAll('.tabs .tab');if(tabs[0])tabs[0].textContent=calendarCursor.toLocaleDateString(undefined,{month:'long'});if(tabs[1])tabs[1].textContent='Drafts '+calendarItems.filter(x=>x.status==='draft').length;if(tabs[2])tabs[2].textContent='Approved '+calendarItems.filter(x=>x.status==='approved').length;
}
function openCalendarItem(id){
 const item=calendarItems.find(x=>String(x.id)===String(id));if(!item)return;editingCalendarItem=item;
 calModal.querySelector('.wf-body').innerHTML='<div class="edit-meta"><span class="badge">'+esc(item.platform)+'</span><span class="badge">'+esc(item.status)+'</span><span class="badge '+(item.sensitivity==='yellow'?'orange':'lime')+'">'+esc(item.sensitivity||'green')+' sensitivity</span></div><div class="field"><label>TITLE</label><input id="calEditTitle" value="'+esc(item.title||'')+'"></div><div class="field"><label>POST COPY</label><textarea id="calEditBody" style="min-height:180px">'+esc(item.body||'')+'</textarea></div><div class="field"><label>SCHEDULED FOR</label><input id="calEditWhen" type="datetime-local" value="'+localInput(item.scheduled_for)+'"></div><div class="reviewblock '+(item.status==='approved'?'reviewsafe':'')+'"><h4>Publishing safeguard</h4><p>Changing the schedule does not publish the post. Editing copy on an already approved post returns it to draft and requires review again.</p></div><div class="reviewactions"><button class="btn" data-cal-unschedule>Unschedule</button><button class="btn primary" data-cal-save>Save changes</button></div>';
 calModal.querySelector('[data-cal-save]').onclick=saveCalendarItem;calModal.querySelector('[data-cal-unschedule]').onclick=()=>saveCalendarItem(true);calModal.classList.add('open');
}
async function saveCalendarItem(unschedule=false){
 if(!editingCalendarItem)return;
 const title=document.getElementById('calEditTitle').value.trim(),body=document.getElementById('calEditBody').value.trim(),when=document.getElementById('calEditWhen').value;
 const copyChanged=title!==(editingCalendarItem.title||'')||body!==(editingCalendarItem.body||'');
 const scheduled_for=unschedule?null:(when?new Date(when).toISOString():null);
 let nextStatus=editingCalendarItem.status;if(copyChanged&&nextStatus==='approved')nextStatus='draft';
 if(isLive()){
   const r=await sb.from('dh_content_items').update({title:title||null,body:body||null,scheduled_for,status:nextStatus}).eq('org_id',liveOrgId).eq('id',editingCalendarItem.id);if(r.error)return notify('Could not save calendar item: '+r.error.message);
   if(copyChanged&&editingCalendarItem.status==='approved'){await sb.from('dh_agent_actions').insert({org_id:liveOrgId,action_type:'content_approval',title:'Review revised '+(title||editingCalendarItem.platform)+' content',payload:{draft_ids:[editingCalendarItem.id],activity_id:editingCalendarItem.activity_id},risk_level:editingCalendarItem.sensitivity==='yellow'?'high':'medium',status:'queued',requires_human_approval:true});if(typeof loadAgentQueue==='function')await loadAgentQueue()}
 }
 Object.assign(editingCalendarItem,{title,body,scheduled_for,status:nextStatus});calModal.classList.remove('open');await renderCalendarEnhanced();notify(copyChanged&&nextStatus==='draft'?'Changes saved and approval is required again.':'Calendar item updated.');
}
async function autoBalanceWeek(){
 let items=[];
 if(isLive()){
   const r=await sb.from('dh_content_items').select('id,platform,title,status,sensitivity,scheduled_for').eq('org_id',liveOrgId).is('scheduled_for',null).in('status',['draft','approved']).order('created_at',{ascending:true}).limit(7);
   if(r.error)return notify('Could not load unscheduled content: '+r.error.message);items=r.data||[];
 }else items=[{id:'demo-u1'},{id:'demo-u2'},{id:'demo-u3'}];
 if(!items.length)return notify('No unscheduled drafts or approved posts are waiting.');
 const start=new Date();start.setDate(start.getDate()+1);
 if(isLive()){for(let i=0;i<items.length;i++){const d=new Date(start);d.setDate(start.getDate()+i);const r=await sb.from('dh_content_items').update({scheduled_for:isoAt(d,18)}).eq('org_id',liveOrgId).eq('id',items[i].id);if(r.error)return notify('Auto-balance stopped: '+r.error.message)}}else{const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();items.forEach((x,i)=>calendarItems.push({id:x.id,platform:['Facebook','Instagram','LinkedIn'][i%3],title:['Mission story','Volunteer spotlight','Sponsor value'][i%3],body:'Demo auto-balanced content.',status:'draft',sensitivity:'green',scheduled_for:new Date(y,m,Math.min(28,new Date().getDate()+i+1),18,0).toISOString()}))}
 await renderCalendarEnhanced();notify(items.length+' item'+(items.length===1?'':'s')+' balanced across the next week. Nothing was published.');
}

const opportunityDefaults=[
{id:'annual-partner',icon:'◎',name:'Outdoor brand annual partner',desc:'Package 10–15 youth experiences with recurring digital deliverables and quarterly impact reporting.',score:96,rev:'$25K–$75K',value:50000,type:'sponsorship',next:'Identify 10 high-fit outdoor brands and build a target list.'},
{id:'youtube-series',icon:'▶',name:'YouTube story series',desc:'Produce longer, mission-first outdoor stories with sponsor integrations and a reusable short-form clip library.',score:91,rev:'Audience + sponsors',value:25000,type:'content',next:'Outline a six-episode pilot and production requirements.'},
{id:'affiliate',icon:'↗',name:'Affiliate partner program',desc:'Use mission-aligned outdoor products only where the relationship fits and disclosures are clear.',score:83,rev:'Variable',value:12000,type:'revenue',next:'Define eligibility and disclosure rules before partner outreach.'},
{id:'monthly-donor',icon:'♡',name:'Monthly donor conversion',desc:'Turn high-performing family stories into gentle recurring-donor campaigns rather than one-time asks.',score:94,rev:'Recurring',value:30000,type:'fundraising',next:'Build a recurring donor landing path and test one mission story.'},
{id:'media-kit',icon:'▣',name:'Sponsor media kit',desc:'Auto-generate a current sponsor deck from real reach, impact, available activations and open inventory.',score:95,rev:'Sales enablement',value:20000,type:'sponsorship',next:'Build a current partner-facing media kit from verified metrics.'},
{id:'archive',icon:'✦',name:'Evergreen story archive',desc:'Transform older Dream Hunt stories into a searchable media library for throwbacks and sponsor proposals.',score:88,rev:'Content efficiency',value:10000,type:'content',next:'Import and tag the first 50 evergreen stories.'}
];
let savedOpportunityIds=new Set(JSON.parse(localStorage.getItem('dh_saved_opps')||'[]'));
async function addOpportunity(index){
 const o=opportunityDefaults[index];if(!o)return;
 if(isLive()){
   const existing=await sb.from('dh_opportunities').select('id').eq('org_id',liveOrgId).eq('title',o.name).neq('status','dismissed').limit(1);
   if(existing.data?.length){savedOpportunityIds.add(o.id);renderOpportunitiesEnhanced();return notify('That opportunity is already in the plan.')}
   const r=await sb.from('dh_opportunities').insert({org_id:liveOrgId,opportunity_type:o.type,title:o.name,description:o.desc,estimated_value:o.value,mission_alignment:o.score,sponsor_fit:o.type==='sponsorship'?o.score:75,revenue_potential:Math.min(100,o.score),audience_relevance:90,operational_effort:45,reputation_risk:15,advisory_score:o.score,status:'planned',next_action:o.next,source:'growth-agent-ui'}).select().single();
   if(r.error)return notify('Could not add opportunity: '+r.error.message);
   const q=await sb.from('dh_agent_actions').insert({org_id:liveOrgId,action_type:'opportunity_review',title:'Review growth plan: '+o.name,payload:{opportunity_id:r.data.id,description:o.desc,body:o.next,estimated_value:o.value},risk_level:'low',status:'queued',requires_human_approval:true});
   if(q.error)return notify('Opportunity saved, but review queue failed: '+q.error.message);if(typeof loadAgentQueue==='function')await loadAgentQueue();
 }else{savedOpportunityIds.add(o.id);localStorage.setItem('dh_saved_opps',JSON.stringify([...savedOpportunityIds]));if(typeof queue!=='undefined'){queue.unshift({id:'demo-opp-'+Date.now(),icon:'↗',action_type:'opportunity_review',title:'Review growth plan: '+o.name,sub:'Growth opportunity • planned',risk_level:'low',status:'queued',payload:{description:o.desc,body:o.next}});if(typeof renderQueue==='function')renderQueue()}}
 savedOpportunityIds.add(o.id);renderOpportunitiesEnhanced();notify('Opportunity added to the plan and queued for review.');
}
function renderOpportunitiesEnhanced(){
 const grid=document.getElementById('oppGrid');if(!grid)return;
 grid.innerHTML=opportunityDefaults.map((o,i)=>'<div class="opp '+(savedOpportunityIds.has(o.id)?'saved':'')+'"><span class="badge">'+o.icon+' '+esc(o.rev)+'</span><h4>'+esc(o.name)+'</h4><p>'+esc(o.desc)+'</p><div style="display:flex;justify-content:space-between;align-items:end"><div><small style="color:var(--muted)">MISSION FIT</small><div class="score">'+o.score+'</div></div>'+(savedOpportunityIds.has(o.id)?'<span class="saved-mark">IN PLAN ✓</span>':'<button class="btn small" data-add-opp="'+i+'">Add to plan</button>')+'</div></div>').join('');
 grid.querySelectorAll('[data-add-opp]').forEach(b=>b.onclick=()=>addOpportunity(Number(b.dataset.addOpp)));
}
async function refreshOpportunityScan(){
 if(isLive()){
   const r=await sb.from('dh_opportunities').select('title,status').eq('org_id',liveOrgId).neq('status','dismissed');if(!r.error){const titles=new Set((r.data||[]).map(x=>x.title));opportunityDefaults.forEach(o=>{if(titles.has(o.name))savedOpportunityIds.add(o.id)})}
 }
 renderOpportunitiesEnhanced();notify('Opportunity scan refreshed against the current trial plan.');
}
async function buildSponsorPackage(){
 const idx=0,o={...opportunityDefaults[idx],name:'Year-round Dream Hunt Adventure Partner package',desc:'Formalize a 12-month partner package with supported experiences, agreed content deliverables, quarterly impact reporting and a renewal checkpoint.',value:18000,next:'Review package benefits, inventory and sponsor-facing language before using it in outreach.'};
 if(isLive()){
   const r=await sb.from('dh_opportunities').insert({org_id:liveOrgId,opportunity_type:'sponsorship',title:o.name,description:o.desc,estimated_value:o.value,mission_alignment:98,sponsor_fit:96,revenue_potential:90,audience_relevance:92,operational_effort:50,reputation_risk:10,advisory_score:96,status:'planned',next_action:o.next,source:'growth-agent-package-builder'}).select().single();
   if(r.error)return notify('Could not build package plan: '+r.error.message);
   const q=await sb.from('dh_agent_actions').insert({org_id:liveOrgId,action_type:'sponsor_package_review',title:'Review year-round Adventure Partner package',payload:{opportunity_id:r.data.id,description:o.desc,body:o.next,target_value:o.value},risk_level:'medium',status:'queued',requires_human_approval:true});if(q.error)return notify('Package plan saved, but review queue failed: '+q.error.message);if(typeof loadAgentQueue==='function')await loadAgentQueue();
 }else if(typeof queue!=='undefined'){queue.unshift({id:'demo-package-'+Date.now(),icon:'◎',action_type:'sponsor_package_review',title:'Review year-round Adventure Partner package',sub:'Sponsor package • draft plan',risk_level:'medium',status:'queued',payload:{description:o.desc,body:o.next}});if(typeof renderQueue==='function')renderQueue()}
 notify('Sponsor package plan built and queued for human review.');
}

function wireDraftEditors(){
 const preview=document.getElementById('draftPreview');if(!preview)return;
 preview.querySelectorAll('.post').forEach(post=>{
   const edit=[...post.querySelectorAll('button')].find(b=>b.textContent.trim()==='Edit');if(!edit||edit.dataset.wfEdit)return;
   edit.dataset.wfEdit='1';edit.onclick=async e=>{e.preventDefault();e.stopPropagation();const platform=post.querySelector('.platform')?.textContent?.trim()||'';const body=post.querySelector('p')?.textContent||'';let item=null;
     if(isLive()&&typeof currentActivityId!=='undefined'&&currentActivityId){const r=await sb.from('dh_content_items').select('id,activity_id,platform,title,body,status,sensitivity').eq('org_id',liveOrgId).eq('activity_id',currentActivityId).eq('platform',platform.replace(' Reel','')).order('created_at',{ascending:false}).limit(1).maybeSingle();if(!r.error)item=r.data}
     editingDraftContext={post,platform,item,body};openDraftEditor();
   };
 });
}
function openDraftEditor(){
 const c=editingDraftContext;if(!c)return;const status=c.item?.status||'demo draft';
 editModal.querySelector('.wf-body').innerHTML='<div class="edit-meta"><span class="badge">'+esc(c.platform)+'</span><span class="badge">'+esc(status)+'</span></div><div class="field"><label>POST COPY</label><textarea id="wfDraftBody" style="min-height:220px">'+esc(c.item?.body||c.body)+'</textarea></div><div class="reviewblock"><h4>Approval behavior</h4><p>If approved copy is changed, it returns to draft and a new human approval action is created.</p></div><div class="reviewactions"><button class="btn" data-wf-edit-cancel>Cancel</button><button class="btn primary" data-wf-edit-save>Save draft</button></div>';
 editModal.querySelector('[data-wf-edit-cancel]').onclick=()=>editModal.classList.remove('open');editModal.querySelector('[data-wf-edit-save]').onclick=saveDraftEdit;editModal.classList.add('open');
}
async function saveDraftEdit(){
 const c=editingDraftContext,newBody=document.getElementById('wfDraftBody').value.trim();if(!newBody)return notify('Draft copy cannot be blank.');
 if(isLive()&&c.item?.id){
   const wasApproved=c.item.status==='approved';const r=await sb.from('dh_content_items').update({body:newBody,status:wasApproved?'draft':c.item.status}).eq('org_id',liveOrgId).eq('id',c.item.id);if(r.error)return notify('Could not save draft: '+r.error.message);
   if(wasApproved){const q=await sb.from('dh_agent_actions').insert({org_id:liveOrgId,action_type:'content_approval',title:'Review revised '+c.platform+' draft',payload:{draft_ids:[c.item.id],activity_id:c.item.activity_id},risk_level:c.item.sensitivity==='yellow'?'high':'medium',status:'queued',requires_human_approval:true});if(q.error)return notify('Draft changed, but re-approval queue failed: '+q.error.message);if(typeof loadAgentQueue==='function')await loadAgentQueue()}
   c.item.body=newBody;if(wasApproved)c.item.status='draft';
 }
 const p=c.post.querySelector('p');if(p)p.textContent=newBody;editModal.classList.remove('open');notify(c.item?.status==='draft'?'Draft saved. Human approval is still required.':'Draft updated.');
}

function wireButtons(){
 const calendarSection=document.getElementById('calendar');if(calendarSection){const auto=[...calendarSection.querySelectorAll('button')].find(b=>b.textContent.includes('Auto-balance'));if(auto)auto.onclick=autoBalanceWeek;const nav=document.querySelector('[data-section="calendar"]');if(nav)nav.addEventListener('click',()=>setTimeout(renderCalendarEnhanced,0))}
 const oppSection=document.getElementById('opportunities');if(oppSection){const refresh=[...oppSection.querySelectorAll('button')].find(b=>b.textContent.includes('Refresh scan'));if(refresh)refresh.onclick=refreshOpportunityScan;const build=[...oppSection.querySelectorAll('button')].find(b=>b.textContent.includes('Build sponsor package'));if(build)build.onclick=buildSponsorPackage}
 const preview=document.getElementById('draftPreview');if(preview){new MutationObserver(wireDraftEditors).observe(preview,{childList:true,subtree:true});wireDraftEditors()}
}
if(typeof renderCalendar==='function')renderCalendar=renderCalendarEnhanced;
if(typeof renderOpps==='function')renderOpps=renderOpportunitiesEnhanced;
wireButtons();renderCalendarEnhanced();renderOpportunitiesEnhanced();
})();