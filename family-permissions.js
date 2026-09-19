(function(){
'use strict';
let families=[], permissionRecord=null;
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const notify=m=>typeof toast==='function'?toast(m):alert(m);
const isLive=()=>typeof liveMode!=='undefined'&&liveMode&&typeof liveOrgId!=='undefined'&&liveOrgId;
const modal=document.createElement('div');
modal.className='modal';modal.id='permissionManagerModal';
modal.innerHTML='<div class="modalbox" style="width:min(760px,100%)"><div class="modalhead"><h3>Family media permission</h3><button class="x" type="button">×</button></div><div id="pmBody"></div></div>';
document.body.appendChild(modal);
modal.querySelector('.x').onclick=()=>modal.classList.remove('open');
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
const style=document.createElement('style');
style.textContent='.pm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pm-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pm-check{display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff;font-size:11px}.pm-check input{margin-top:2px}.pm-status{padding:12px;border-radius:13px;margin-bottom:12px;font-size:11px;line-height:1.45}.pm-status.ok{background:#eff7ea;border:1px solid #b9d69d}.pm-status.warn{background:#fff7ed;border:1px solid #efc49f}.pm-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:14px}@media(max-width:760px){.pm-grid,.pm-checks{grid-template-columns:1fr}}';
document.head.appendChild(style);

function addButton(){
 const box=document.getElementById('contentPermissionStatus');if(!box||document.getElementById('managePermissionBtn'))return;
 const btn=document.createElement('button');btn.id='managePermissionBtn';btn.className='btn small';btn.type='button';btn.style.marginTop='8px';btn.textContent='Manage family permission';btn.onclick=openManager;box.insertAdjacentElement('afterend',btn);
}

async function loadFamilies(){
 if(!isLive()){families=[{id:'demo-family',internal_label:'Demo family',notes:'Local trial record'}];return}
 const r=await sb.from('dh_families').select('id,internal_label,notes,created_at').eq('org_id',liveOrgId).order('updated_at',{ascending:false});
 if(r.error)throw r.error;families=r.data||[];
}
async function loadCurrentPermission(){
 permissionRecord=null;
 if(!isLive()||typeof currentActivityId==='undefined'||!currentActivityId)return;
 const a=await sb.from('dh_activities').select('id,title,family_id,permission_id').eq('org_id',liveOrgId).eq('id',currentActivityId).maybeSingle();
 if(a.error)throw a.error;if(!a.data)return;
 if(a.data.permission_id){
  const p=await sb.from('dh_media_permissions').select('*').eq('org_id',liveOrgId).eq('id',a.data.permission_id).maybeSingle();
  if(p.error)throw p.error;permissionRecord=p.data?{...p.data,activity:a.data}:null;
 } else permissionRecord={activity:a.data};
}
function validity(p){
 if(!p||!p.id)return{ok:false,text:'No verified permission record is linked to this activity.'};
 if(!p.verified_at)return{ok:false,text:'Permission exists but has not been verified.'};
 if(p.expires_at&&new Date(p.expires_at)<=new Date())return{ok:false,text:'The linked permission has expired.'};
 if(!p.story_allowed)return{ok:false,text:'Story use is not allowed by this permission.'};
 return{ok:true,text:'Verified family media permission is linked to this activity.'};
}
async function refreshStatus(){
 const box=document.getElementById('contentPermissionStatus');if(!box)return;
 if(!isLive()){box.innerHTML='<strong>Family permissions:</strong> Demo mode only. No real family permission record is being used.';return}
 try{await loadCurrentPermission();const v=validity(permissionRecord);box.innerHTML='<strong>Family permissions:</strong> '+esc(v.text)+(permissionRecord?.id?' Photo '+(permissionRecord.photo_allowed?'✓':'✕')+' · Video '+(permissionRecord.video_allowed?'✓':'✕')+' · First name '+(permissionRecord.first_name_allowed?'✓':'✕')+' · Sponsor use '+(permissionRecord.sponsor_use_allowed?'✓':'✕'):'')}catch(e){box.innerHTML='<strong>Family permissions:</strong> Could not load permission status.'}
}
function renderManager(){
 const p=permissionRecord||{};const v=validity(p);
 const selectedFamily=p.family_id||p.activity?.family_id||'';
 document.getElementById('pmBody').innerHTML=
 '<div class="pm-status '+(v.ok?'ok':'warn')+'"><strong>'+(v.ok?'Permission verified':'Review required')+'</strong><br>'+esc(v.text)+'</div>'+
 '<div class="pm-grid"><div class="field"><label>FAMILY / HOUSEHOLD</label><select id="pmFamily"><option value="">Select family</option>'+families.map(f=>'<option value="'+f.id+'" '+(selectedFamily===f.id?'selected':'')+'>'+esc(f.internal_label)+'</option>').join('')+'</select></div><div class="field"><label>NEW FAMILY LABEL</label><input id="pmNewFamily" placeholder="Internal label only"></div></div>'+
 '<div class="field"><label>PARTICIPANT LABEL</label><input id="pmParticipant" value="'+esc(p.participant_label||'')+'" placeholder="Internal participant label"></div>'+
 '<div class="pm-checks">'+
  check('pmPhoto','Photo use',p.photo_allowed)+check('pmVideo','Video use',p.video_allowed)+check('pmFirst','First name use',p.first_name_allowed)+check('pmStory','Story use',p.story_allowed)+check('pmMedical','Medical details',p.medical_details_allowed)+check('pmSponsor','Sponsor use',p.sponsor_use_allowed)+
 '</div>'+
 '<div class="pm-grid" style="margin-top:12px"><div class="field"><label>EXPIRES</label><input id="pmExpires" type="date" value="'+(p.expires_at?String(p.expires_at).slice(0,10):'')+'"></div><div class="field"><label>NOTES</label><input id="pmNotes" value="'+esc(p.notes||'')+'"></div></div>'+
 '<div class="pm-actions"><button class="btn" id="pmSaveDraft">Save without verifying</button><button class="btn primary" id="pmVerify">Save & verify permission</button></div>'+
 '<p class="wf-note">Medical details default to blocked. Sponsor use must be explicitly allowed before child/family media is used in sponsor content.</p>';
 document.getElementById('pmSaveDraft').onclick=()=>savePermission(false);
 document.getElementById('pmVerify').onclick=()=>savePermission(true);
}
function check(id,label,on){return '<label class="pm-check"><input id="'+id+'" type="checkbox" '+(on?'checked':'')+'><span><strong>'+label+'</strong></span></label>'}
async function openManager(){
 modal.classList.add('open');document.getElementById('pmBody').innerHTML='<div class="sd-empty">Loading permission records…</div>';
 try{await Promise.all([loadFamilies(),loadCurrentPermission()]);renderManager()}catch(e){document.getElementById('pmBody').innerHTML='<div class="pm-status warn">Could not load permissions: '+esc(e.message||e)+'</div>'}
}
async function savePermission(verify){
 const newFamily=document.getElementById('pmNewFamily').value.trim();let familyId=document.getElementById('pmFamily').value||null;
 if(!familyId&&!newFamily)return notify('Select a family or add an internal family label.');
 if(!isLive()){
  permissionRecord={id:'demo-permission',family_id:familyId||'demo-new',participant_label:document.getElementById('pmParticipant').value.trim(),photo_allowed:document.getElementById('pmPhoto').checked,video_allowed:document.getElementById('pmVideo').checked,first_name_allowed:document.getElementById('pmFirst').checked,story_allowed:document.getElementById('pmStory').checked,medical_details_allowed:document.getElementById('pmMedical').checked,sponsor_use_allowed:document.getElementById('pmSponsor').checked,verified_at:verify?new Date().toISOString():null,expires_at:document.getElementById('pmExpires').value||null};
  renderManager();refreshStatus();return notify(verify?'Demo permission marked verified.':'Demo permission saved without verification.');
 }
 if(typeof currentActivityId==='undefined'||!currentActivityId)return notify('Create or select an activity first.');
 if(!familyId&&newFamily){
  const fr=await sb.from('dh_families').insert({org_id:liveOrgId,internal_label:newFamily,notes:null}).select().single();if(fr.error)return notify('Could not create family: '+fr.error.message);familyId=fr.data.id;
 }
 const payload={org_id:liveOrgId,family_id:familyId,participant_label:document.getElementById('pmParticipant').value.trim()||null,photo_allowed:document.getElementById('pmPhoto').checked,video_allowed:document.getElementById('pmVideo').checked,first_name_allowed:document.getElementById('pmFirst').checked,story_allowed:document.getElementById('pmStory').checked,medical_details_allowed:document.getElementById('pmMedical').checked,sponsor_use_allowed:document.getElementById('pmSponsor').checked,verified_by:verify?liveUser.id:null,verified_at:verify?new Date().toISOString():null,expires_at:document.getElementById('pmExpires').value?new Date(document.getElementById('pmExpires').value+'T23:59:59').toISOString():null,notes:document.getElementById('pmNotes').value.trim()||null};
 let permissionId=permissionRecord?.id||null;
 if(permissionId){
  const ur=await sb.from('dh_media_permissions').update(payload).eq('org_id',liveOrgId).eq('id',permissionId).select().single();if(ur.error)return notify('Could not update permission: '+ur.error.message);permissionRecord=ur.data;
 }else{
  const ir=await sb.from('dh_media_permissions').insert(payload).select().single();if(ir.error)return notify('Could not save permission: '+ir.error.message);permissionRecord=ir.data;permissionId=ir.data.id;
 }
 const ar=await sb.from('dh_activities').update({family_id:familyId,permission_id:permissionId}).eq('org_id',liveOrgId).eq('id',currentActivityId);if(ar.error)return notify('Permission saved, but activity link failed: '+ar.error.message);
 if(typeof mediaAssets!=='undefined'&&Array.isArray(mediaAssets)&&mediaAssets.length){await sb.from('dh_media_assets').update({permission_id:permissionId}).eq('org_id',liveOrgId).eq('activity_id',currentActivityId).is('permission_id',null)}
 if(verify){
   const q=await sb.from('dh_agent_actions').select('id').eq('org_id',liveOrgId).eq('action_type','permission_review').eq('status','queued').contains('payload',{activity_id:currentActivityId});
   if(q.data?.length){await sb.from('dh_agent_actions').update({status:'approved',approved_by:liveUser.id,approved_at:new Date().toISOString()}).in('id',q.data.map(x=>x.id))}
 }
 await Promise.all([refreshStatus(),typeof loadAgentQueue==='function'?loadAgentQueue():Promise.resolve(),typeof loadMediaAssets==='function'?loadMediaAssets():Promise.resolve()]);
 await loadCurrentPermission();renderManager();notify(verify?'Family permission verified and linked to this activity.':'Permission saved; verification is still required.');
}
function hookContext(){
 addButton();refreshStatus();
 const nav=document.querySelector('[data-section="content"]');if(nav)nav.addEventListener('click',()=>setTimeout(()=>{addButton();refreshStatus()},0));
 const quick=document.getElementById('quickBtn');if(quick)quick.addEventListener('click',()=>setTimeout(addButton,0));
}
hookContext();
window.openDreamHuntPermissionManager=openManager;
})();