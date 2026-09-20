(function(){
'use strict';

let aiActivities=[],aiProjects=[],aiSponsors=[],aiGenerating=false;

const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const notify=m=>typeof toast==='function'?toast(m):alert(m);
const isLive=()=>typeof liveMode!=='undefined'&&liveMode&&typeof liveOrgId!=='undefined'&&!!liveOrgId;

const css=document.createElement('style');
css.textContent='.ai-projectbar{margin-bottom:16px}.ai-toolbar{display:grid;grid-template-columns:minmax(220px,1.3fr) minmax(160px,.7fr) auto;gap:8px;align-items:end}.ai-state{margin-top:10px;padding:11px 12px;border-radius:13px;background:#f3f6f1;border:1px solid var(--line);font-size:11px;line-height:1.5}.ai-state strong{display:block;font-size:12px;margin-bottom:2px}.ai-media-select{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.ai-media-item{position:relative;border:2px solid transparent;border-radius:13px;overflow:hidden;background:#eef1ec;cursor:pointer}.ai-media-item.selected{border-color:#6d936f}.ai-media-item input{position:absolute;top:8px;left:8px;z-index:2;width:18px;height:18px}.ai-media-thumb{aspect-ratio:4/3;display:grid;place-items:center;overflow:hidden;font-size:28px}.ai-media-thumb img,.ai-media-thumb video{width:100%;height:100%;object-fit:cover}.ai-media-meta{padding:7px;background:#fff;font-size:9px;color:var(--muted)}.ai-result{display:grid;gap:10px}.ai-summary{padding:13px;border:1px solid var(--line);border-radius:14px;background:#fff}.ai-summary h4{font:800 14px Manrope;margin:0 0 5px}.ai-summary p{font-size:11px;color:var(--muted);line-height:1.55;margin:0}.ai-assets{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ai-pick{border:1px solid var(--line);border-radius:12px;padding:8px;background:#fff;font-size:10px}.ai-pick b{display:block;font-size:11px}.ai-score{font-size:17px;font-weight:900}.ai-question{padding:8px 10px;border-left:3px solid #d59c4e;background:#fff8ed;border-radius:8px;font-size:10px}.ai-progress{padding:18px;text-align:center}.ai-progress .spin{width:26px;height:26px;border:3px solid #dce3da;border-top-color:#173d2d;border-radius:50%;animation:aipulse .8s linear infinite;margin:0 auto 10px}@keyframes aipulse{to{transform:rotate(360deg)}}@media(max-width:760px){.ai-toolbar{grid-template-columns:1fr}.ai-media-select,.ai-assets{grid-template-columns:repeat(2,1fr)}}';
document.head.appendChild(css);

const content=document.getElementById('content');
const composer=content?.querySelector('.composer');
if(content&&composer&&!document.getElementById('aiProjectBar')){
  const bar=document.createElement('div');bar.className='card ai-projectbar';bar.id='aiProjectBar';
  bar.innerHTML='<div class="cardhead"><div><h3>AI Content Project</h3><p>Select a hunt/activity and turn its collected media into review-ready drafts.</p></div><span class="badge" id="aiProjectBadge">READY</span></div><div class="ai-toolbar"><div class="field" style="margin:0"><label>ACTIVITY / HUNT</label><select id="aiActivitySelect"><option value="">Loading activities…</option></select></div><div class="field" style="margin:0"><label>PROJECT TYPE</label><select id="aiProjectType"><option value="hunt_story">Hunt story package</option><option value="reel_package">Reel package</option><option value="donor_update">Donor update</option><option value="sponsor_story">Sponsor story</option></select></div><button class="btn accent" id="aiGenerateTop">✦ Generate AI Drafts</button></div><div class="ai-state" id="aiProjectState"><strong>No project selected</strong>Select a hunt with uploaded media.</div>';
  content.insertBefore(bar,composer);
}

const modal=document.createElement('div');modal.className='modal';modal.id='aiContentModal';
modal.innerHTML='<div class="modalbox" style="width:min(980px,100%)"><div class="modalhead"><h3>AI Content Builder</h3><button class="x" type="button">×</button></div><div id="aiContentBody"></div></div>';
document.body.appendChild(modal);
modal.querySelector('.x').onclick=()=>{if(!aiGenerating)modal.classList.remove('open')};
modal.addEventListener('click',e=>{if(e.target===modal&&!aiGenerating)modal.classList.remove('open')});

async function loadActivities(){
 const sel=document.getElementById('aiActivitySelect');if(!sel)return;
 if(!isLive()){
  sel.innerHTML='<option value="">Connect Dream Hunt backend to use AI content projects</option>';
  return;
 }
 const [ar,mr]=await Promise.all([
  sb.from('dh_activities').select('id,title,activity_type,starts_at,story_notes,status,updated_at').eq('org_id',liveOrgId).order('updated_at',{ascending:false}).limit(60),
  sb.from('dh_media_assets').select('activity_id').eq('org_id',liveOrgId).limit(1000)
 ]);
 if(ar.error){sel.innerHTML='<option value="">Could not load activities</option>';return}
 const counts={};(mr.data||[]).forEach(x=>{if(x.activity_id)counts[x.activity_id]=(counts[x.activity_id]||0)+1});
 aiActivities=ar.data||[];
 sel.innerHTML='<option value="">Select an activity…</option>'+aiActivities.map(a=>'<option value="'+a.id+'">'+esc(a.title)+' — '+(counts[a.id]||0)+' media</option>').join('');
 if(typeof currentActivityId!=='undefined'&&currentActivityId&&aiActivities.some(a=>a.id===currentActivityId))sel.value=currentActivityId;
 sel.onchange=()=>selectActivity(sel.value);
 if(sel.value)await selectActivity(sel.value,false);
}

async function selectActivity(id,loadMedia=true){
 if(!id)return;
 currentActivityId=id;
 const a=aiActivities.find(x=>x.id===id);
 const huntName=document.getElementById('huntName');if(huntName&&a)huntName.value=a.title||'';
 const notes=document.getElementById('storyNotes');if(notes&&a&&a.story_notes)notes.value=a.story_notes;
 if(loadMedia&&typeof loadMediaAssets==='function')await loadMediaAssets();
 await loadProjectState();
 if(typeof window.openDreamHuntPermissionManager==='function'){
   const status=document.getElementById('contentPermissionStatus');
   if(status)status.scrollIntoView({block:'nearest'});
 }
}

async function loadProjectState(){
 const state=document.getElementById('aiProjectState'),badge=document.getElementById('aiProjectBadge');if(!state||!currentActivityId||!isLive())return;
 const type=document.getElementById('aiProjectType')?.value||'hunt_story';
 const pr=await sb.from('dh_content_projects').select('*').eq('org_id',liveOrgId).eq('activity_id',currentActivityId).eq('project_type',type).maybeSingle();
 if(pr.error){state.innerHTML='<strong>Could not load AI project</strong>'+esc(pr.error.message);return}
 const p=pr.data;
 if(!p){state.innerHTML='<strong>Ready for first AI package</strong>'+mediaAssets.length+' media item'+(mediaAssets.length===1?'':'s')+' currently attached. Select Generate AI Drafts to begin.';badge.textContent='READY';badge.className='badge';return}
 badge.textContent=String(p.status||'project').replace('_',' ').toUpperCase();badge.className='badge '+(p.status==='draft_ready'?'lime':p.status==='failed'?'orange':'');
 state.innerHTML='<strong>'+esc(p.creative_hook||p.title||'AI content project')+'</strong>'+esc(p.story_summary||('Project status: '+p.status));
 if(p.status==='draft_ready')await loadExistingDrafts(p.id);
}

async function loadExistingDrafts(projectId){
 const r=await sb.from('dh_content_items').select('id,platform,content_type,title,body,call_to_action,status,sensitivity').eq('org_id',liveOrgId).eq('content_project_id',projectId).order('created_at',{ascending:false}).limit(12);
 if(r.error||!r.data?.length)return;
 renderDraftPackage(r.data,{story_summary:document.getElementById('aiProjectState')?.textContent||'',permission_notes:[]});
}

async function openBuilder(){
 if(!isLive())return notify('Connect the Dream Hunt trial backend before generating AI content.');
 if(!currentActivityId){
   const v=document.getElementById('aiActivitySelect')?.value;if(v)currentActivityId=v;
 }
 if(!currentActivityId)return notify('Select an activity or hunt first.');
 if(typeof loadMediaAssets==='function')await loadMediaAssets();
 if(!mediaAssets.length)return notify('This hunt does not have any media yet.');
 const a=aiActivities.find(x=>x.id===currentActivityId);
 const sponsorsR=await sb.from('dh_sponsors').select('id,name,stage').eq('org_id',liveOrgId).order('name');
 aiSponsors=sponsorsR.data||[];
 const currentNotes=document.getElementById('storyNotes')?.value||a?.story_notes||'';
 const type=document.getElementById('aiProjectType')?.value||'hunt_story';

 document.getElementById('aiContentBody').innerHTML='<div class="formrow"><div class="field"><label>CONTENT PROJECT</label><select id="aiModalType"><option value="hunt_story">Hunt story package</option><option value="reel_package">Reel package</option><option value="donor_update">Donor update</option><option value="sponsor_story">Sponsor story</option></select></div><div class="field"><label>SPONSOR (OPTIONAL)</label><select id="aiSponsorSelect"><option value="">No sponsor</option>'+aiSponsors.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('')+'</select></div></div><div class="field"><label>STORY NOTES / FACTS FOR AI</label><textarea id="aiStoryNotes" style="min-height:110px">'+esc(currentNotes)+'</textarea></div><div class="cardhead" style="margin-top:4px"><div><h3>Select media for this package</h3><p>Images are visually analyzed. Videos are attached to the package now; detailed video clip analysis comes next.</p></div><button class="btn small" id="aiToggleMedia">Select all</button></div><div class="ai-media-select" id="aiMediaSelect">'+mediaAssets.map((m,i)=>mediaTile(m,i)).join('')+'</div><div class="permission" style="margin-top:12px" id="aiPermissionCheck">Checking family permissions…</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn" id="aiCancel">Cancel</button><button class="btn accent" id="aiRun">✦ Generate AI Drafts</button></div>';
 document.getElementById('aiModalType').value=type;
 modal.querySelectorAll('.ai-media-item').forEach(el=>el.onclick=e=>{if(e.target.tagName==='INPUT')return;const cb=el.querySelector('input');cb.checked=!cb.checked;el.classList.toggle('selected',cb.checked)});
 modal.querySelectorAll('.ai-media-item input').forEach(cb=>cb.onchange=()=>cb.closest('.ai-media-item').classList.toggle('selected',cb.checked));
 document.getElementById('aiToggleMedia').onclick=()=>{const boxes=[...modal.querySelectorAll('.ai-media-item input')];const all=boxes.every(x=>x.checked);boxes.forEach(x=>{x.checked=!all;x.closest('.ai-media-item').classList.toggle('selected',!all)})};
 document.getElementById('aiCancel').onclick=()=>modal.classList.remove('open');
 document.getElementById('aiRun').onclick=runAI;
 modal.classList.add('open');
 await updatePermissionCheck();
}

function mediaTile(m,i){
 const video=(m.media_type||'').startsWith('video');
 const thumb=m.preview_url?(video?'<video src="'+esc(m.preview_url)+'" muted playsinline preload="metadata"></video>':'<img src="'+esc(m.preview_url)+'" alt="">'):'<span>'+(video?'▶':'▧')+'</span>';
 return '<label class="ai-media-item selected" data-id="'+m.id+'"><input type="checkbox" checked value="'+m.id+'"><div class="ai-media-thumb">'+thumb+'</div><div class="ai-media-meta">'+esc(m.name||m.caption||('Media '+(i+1)))+' · '+esc(m.media_type||'media')+'</div></label>';
}

async function updatePermissionCheck(){
 const el=document.getElementById('aiPermissionCheck');if(!el)return;
 const hasPhoto=mediaAssets.some(x=>x.media_type==='image'),hasVideo=mediaAssets.some(x=>x.media_type==='video');
 const sponsor=!!document.getElementById('aiSponsorSelect')?.value;
 if(typeof getPermissionState!=='function'){el.innerHTML='<strong>Permission review required.</strong>';return}
 const p=await getPermissionState(currentActivityId,{photoUse:hasPhoto,videoUse:hasVideo,sponsorUse:sponsor});
 el.innerHTML='<strong>Family permissions:</strong> '+esc(p.text);
 el.className='permission '+(p.ok?'':'warning');
}
document.addEventListener('change',e=>{if(e.target?.id==='aiSponsorSelect')updatePermissionCheck()});

async function runAI(){
 if(aiGenerating)return;
 const selected=[...modal.querySelectorAll('.ai-media-item input:checked')].map(x=>x.value);
 if(!selected.length)return notify('Select at least one photo or video.');
 const sponsorId=document.getElementById('aiSponsorSelect').value||null;
 const notes=document.getElementById('aiStoryNotes').value.trim();
 const type=document.getElementById('aiModalType').value||'hunt_story';
 aiGenerating=true;
 document.getElementById('aiContentBody').innerHTML='<div class="ai-progress"><div class="spin"></div><h3>Building the content package…</h3><p style="font-size:11px;color:var(--muted)">AI is reviewing the selected media, hunt context, permissions and sponsor rules. Nothing will publish automatically.</p></div>';
 const btn=document.getElementById('generateBtn');if(btn){btn.disabled=true;btn.textContent='✦ AI working…'}
 try{
   const r=await sb.functions.invoke('dreamhunt-content-ai',{body:{activity_id:currentActivityId,project_type:type,story_notes:notes,sponsor_id:sponsorId,selected_media_ids:selected}});
   if(r.error)throw new Error(r.error.message||'AI content request failed');
   if(r.data?.error)throw new Error(r.data.error);
   await Promise.all([
     typeof loadAgentQueue==='function'?loadAgentQueue():Promise.resolve(),
     typeof loadMediaAssets==='function'?loadMediaAssets():Promise.resolve()
   ]);
   document.getElementById('aiProjectType').value=type;
   renderAIResult(r.data);
   renderDraftPackage(r.data.drafts||[],r.data);
   await loadProjectState();
   notify('AI content package created and queued for human review.');
 }catch(e){
   document.getElementById('aiContentBody').innerHTML='<div class="reviewblock" style="border-color:#d59b8f"><h4>AI generation failed</h4><p>'+esc(e.message||e)+'</p></div><div style="display:flex;justify-content:flex-end"><button class="btn" id="aiCloseError">Close</button></div>';
   document.getElementById('aiCloseError').onclick=()=>modal.classList.remove('open');
 }finally{
   aiGenerating=false;
   if(btn){btn.disabled=false;btn.textContent='✦ Generate AI Drafts'}
 }
}

async function openProjectReview(projectId){
 if(!isLive())return notify('Live review requires the connected Dream Hunt backend.');
 if(!projectId)return notify('This content package does not have a project ID.');
 try{
   const r=await sb.from('dh_agent_actions')
     .select('id,status,created_at')
     .eq('org_id',liveOrgId)
     .eq('action_type','content_approval')
     .eq('status','queued')
     .contains('payload',{project_id:projectId})
     .order('created_at',{ascending:false})
     .limit(1)
     .maybeSingle();
   if(r.error)throw r.error;
   if(!r.data?.id)return notify('No queued review was found for this AI package.');
   modal.classList.remove('open');
   if(typeof openAgentReview==='function')return openAgentReview(r.data.id);
   notify('The review action was found, but the review window could not be opened.');
 }catch(e){
   notify('Could not open this review: '+(e.message||e));
 }
}

function renderAIResult(data){
 const recs=(data.asset_recommendations||[]).slice().sort((a,b)=>Number(b.score||0)-Number(a.score||0)).slice(0,6);
 const questions=data.questions||[],notes=data.permission_notes||[];
 document.getElementById('aiContentBody').innerHTML='<div class="ai-result"><div class="ai-summary"><h4>Story angle</h4><p><strong>'+esc(data.creative_hook||'Dream Hunt story')+'</strong><br>'+esc(data.story_summary||'')+'</p></div><div class="ai-summary"><h4>Recommended assets</h4><div class="ai-assets">'+(recs.length?recs.map(r=>'<div class="ai-pick"><span class="badge">'+esc(r.role||'supporting')+'</span><div class="ai-score">'+Math.round(Number(r.score||0))+'</div><b>'+esc(mediaName(r.media_id))+'</b><span>'+esc(r.reason||'')+'</span></div>').join(''):'<p>No visual ranking returned.</p>')+'</div></div>'+(notes.length?'<div class="ai-summary"><h4>Permission / review notes</h4>'+notes.map(n=>'<div class="ai-question">'+esc(n)+'</div>').join('')+'</div>':'')+(questions.length?'<div class="ai-summary"><h4>Facts to confirm before publishing</h4>'+questions.map(q=>'<div class="ai-question">'+esc(q)+'</div>').join('')+'</div>':'')+'<div class="ai-summary"><h4>Internal recap</h4><p>'+esc(data.recap||'')+'</p></div><div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" id="aiCloseResult">Close</button><button class="btn primary" id="aiOpenQueue">Review drafts</button></div></div>';
 document.getElementById('aiCloseResult').onclick=()=>modal.classList.remove('open');
 document.getElementById('aiOpenQueue').onclick=()=>openProjectReview(data.project_id);
}

function mediaName(id){const m=mediaAssets.find(x=>String(x.id)===String(id));return m?.name||m?.caption||'Media'}

function renderDraftPackage(drafts,data){
 const box=document.getElementById('draftPreview');if(!box||!drafts?.length)return;
 box.innerHTML=drafts.map(d=>'<div class="post"><div class="posthead"><span class="platform">'+esc(d.platform||'Social')+'</span><span class="badge">'+esc(String(d.content_type||'draft').replaceAll('_',' ').toUpperCase())+'</span></div><p>'+esc(d.body||'')+'</p>'+(d.call_to_action?'<p style="font-size:10px;color:var(--muted)"><b>CTA:</b> '+esc(d.call_to_action)+'</p>':'')+'<div style="display:flex;justify-content:flex-end"><button class="btn small">Edit</button></div></div>').join('');
 const status=document.getElementById('draftStatus');if(status)status.textContent=drafts.length+' AI draft'+(drafts.length===1?'':'s')+' — awaiting human approval';
 const badge=document.getElementById('riskBadge');if(badge){const sensitivity=data?.sensitivity||drafts[0]?.sensitivity||'yellow';badge.textContent=sensitivity==='green'?'REVIEW':'REVIEW REQUIRED';badge.className='badge '+(sensitivity==='green'?'lime':'orange')}
}

const gen=document.getElementById('generateBtn');
if(gen){gen.textContent='✦ Generate AI Drafts';gen.onclick=openBuilder}
const top=document.getElementById('aiGenerateTop');if(top)top.onclick=openBuilder;
const typeSel=document.getElementById('aiProjectType');if(typeSel)typeSel.onchange=loadProjectState;

const nav=document.querySelector('[data-section="content"]');if(nav)nav.addEventListener('click',()=>setTimeout(async()=>{await loadActivities();await loadProjectState()},0));
if(typeof sb!=='undefined'&&sb.auth?.onAuthStateChange)sb.auth.onAuthStateChange(()=>setTimeout(loadActivities,400));

setTimeout(loadActivities,200);
window.DreamHuntContentAI={open:openBuilder,refresh:loadActivities};
})();