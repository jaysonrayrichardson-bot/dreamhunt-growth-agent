const SUPABASE_URL='https://dlcahaelopldckwguzru.supabase.co';
const SUPABASE_KEY='sb_publishable_hgtbaNhPcZAOZc4ZKMmoQw_DhuVJG6i';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let user=null,guide=null,weekends=[],weekendId=null,hunts=[],assignments=[],currentHunt=null,messages=[],channel=null,watchId=null,lastPingAt=0,pendingPhone=null,lastCodeSentAt=0;

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)};
const fmt=v=>v?new Date(v).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
const setConn=()=>{const online=navigator.onLine;$('conn').textContent=online?'ONLINE':'OFFLINE';$('conn').classList.toggle('off',!online)};
window.addEventListener('online',setConn);window.addEventListener('offline',setConn);setConn();

function show(id){
 document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===id));
 document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.screen===id));
}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>show(b.dataset.screen));

function normalizeUSPhone(raw){
 const digits=String(raw||'').replace(/\D/g,'');
 if(digits.length===10)return '+1'+digits;
 if(digits.length===11&&digits.startsWith('1'))return '+'+digits;
 if(String(raw||'').trim().startsWith('+')&&digits.length>=8&&digits.length<=15)return '+'+digits;
 return null;
}
function prettyPhone(phone){
 const d=String(phone||'').replace(/\D/g,'');
 if(d.length===11&&d.startsWith('1'))return '('+d.slice(1,4)+') '+d.slice(4,7)+'-'+d.slice(7);
 return phone||'';
}
async function sendCode(){
 const phone=normalizeUSPhone($('phone').value);
 if(!phone)return toast('Enter a valid mobile number.');
 $('sendCodeBtn').disabled=true;$('sendCodeBtn').innerHTML='<span class="spinner"></span>';
 try{
  const r=await sb.auth.signInWithOtp({phone});
  if(r.error)throw r.error;
  pendingPhone=phone;lastCodeSentAt=Date.now();
  $('phoneStep').classList.add('hidden');$('codeStep').classList.remove('hidden');
  $('codeSentTo').textContent='Enter the 6-digit code sent to '+prettyPhone(phone)+'.';
  $('otpCode').value='';$('otpCode').focus();
  toast('Code sent.');
 }catch(e){
  const msg=(e.message||'Could not send code.');
  toast(msg.toLowerCase().includes('provider')?'SMS sign-in is not configured yet for this project.':msg);
 }finally{$('sendCodeBtn').disabled=false;$('sendCodeBtn').textContent='Text Me a Code'}
}
async function verifyCode(){
 const token=$('otpCode').value.replace(/\D/g,'');
 if(!pendingPhone)return toast('Enter your phone number first.');
 if(token.length!==6)return toast('Enter the 6-digit code.');
 $('verifyCodeBtn').disabled=true;$('verifyCodeBtn').innerHTML='<span class="spinner"></span>';
 try{
  const r=await sb.auth.verifyOtp({phone:pendingPhone,token,type:'sms'});
  if(r.error)throw r.error;
  await enterApp(r.data.user||r.data.session?.user);
 }catch(e){toast(e.message||'That code could not be verified.')}
 finally{$('verifyCodeBtn').disabled=false;$('verifyCodeBtn').textContent='Verify & Continue'}
}
$('sendCodeBtn').onclick=sendCode;
$('verifyCodeBtn').onclick=verifyCode;
$('otpCode').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,6);if(e.target.value.length===6)verifyCode()});
$('resendCodeBtn').onclick=async()=>{
 if(!pendingPhone)return;
 const wait=60000-(Date.now()-lastCodeSentAt);
 if(wait>0)return toast('Please wait '+Math.ceil(wait/1000)+' seconds before requesting another code.');
 $('phone').value=pendingPhone;await sendCode();
};
$('changePhoneBtn').onclick=()=>{pendingPhone=null;$('codeStep').classList.add('hidden');$('phoneStep').classList.remove('hidden');$('phone').focus()};

async function enterApp(u){
 user=u|| (await sb.auth.getUser()).data.user;if(!user)return;
 try{
  const claim=await sb.rpc('dh_claim_guide_profile');
  if(claim.error)throw claim.error;guide=claim.data;
  $('hello').textContent='Hello, '+guide.display_name;
  $('topSub').textContent=guide.display_name+' · Volunteer Guide';
  $('authScreen').classList.remove('active');$('bottomNav').classList.remove('hidden');show('homeScreen');
  await loadWeekendAccess();
 }catch(e){
  await sb.auth.signOut();user=null;guide=null;$('bottomNav').classList.add('hidden');show('authScreen');
  toast(e.message||'No active guide invitation was found for this mobile number.');
 }
}

async function loadWeekendAccess(){
 const a=await sb.from('dh_guide_weekend_access').select('weekend_id,status').eq('guide_id',guide.id).in('status',['invited','active']);
 if(a.error)return toast(a.error.message);
 const ids=(a.data||[]).map(x=>x.weekend_id);
 if(!ids.length){weekends=[];renderWeekendList();return}
 const w=await sb.from('dh_hunt_weekends').select('*').in('id',ids).in('status',['open','active','planning']).order('starts_on');
 if(w.error)return toast(w.error.message);weekends=w.data||[];
 const preferred=weekends.find(x=>['active','open'].includes(x.status))||weekends[0];weekendId=preferred?.id||null;
 renderWeekendList();if(weekendId)await loadHunts();
}

function renderWeekendList(){
 const box=$('weekendList');
 if(!weekends.length){box.innerHTML='<div class="small">No hunt weekend is currently assigned to your guide profile.</div>';$('weekendSummary').textContent='No active weekend assigned.';return}
 box.innerHTML=weekends.map(w=>'<button class="btn full" style="margin-top:7px;text-align:left" data-weekend="'+w.id+'"><b>'+esc(w.title)+'</b><br><span class="small">'+esc(w.starts_on)+' to '+esc(w.ends_on)+' · '+esc(w.status)+'</span></button>').join('');
 box.querySelectorAll('[data-weekend]').forEach(b=>b.onclick=async()=>{weekendId=b.dataset.weekend;await loadHunts();show('huntScreen')});
 const w=weekends.find(x=>x.id===weekendId);$('weekendSummary').textContent=w?w.title+' · '+w.starts_on+' to '+w.ends_on:'Choose your weekend.';
}

async function loadHunts(){
 if(!weekendId)return;
 const [h,a]=await Promise.all([
  sb.from('dh_hunts').select('*').eq('weekend_id',weekendId).in('status',['open','active','planning']).order('scheduled_start'),
  sb.from('dh_hunt_assignments').select('*').eq('guide_id',guide.id)
 ]);
 if(h.error)return toast(h.error.message);if(a.error)return toast(a.error.message);
 hunts=h.data||[];assignments=(a.data||[]).filter(x=>hunts.some(hh=>hh.id===x.hunt_id)&&x.status!=='cancelled');
 const active=assignments.find(x=>['checked_in','selected','scheduled'].includes(x.status))||assignments[0];
 currentHunt=active?hunts.find(x=>x.id===active.hunt_id):null;
 renderHunts();renderCurrentHunt();renderChatTargets();await loadChat();subscribeRealtime();
}

function assignmentFor(huntId){return assignments.find(x=>x.hunt_id===huntId&&x.status!=='cancelled')}
function renderHunts(){
 const box=$('huntList');
 if(!hunts.length){box.innerHTML='<div class="small">No hunts are currently open for this weekend.</div>';return}
 box.innerHTML=hunts.map(h=>{const a=assignmentFor(h.id),sel=currentHunt?.id===h.id;return '<div class="hunt '+(sel?'selected':'')+'"><div class="row"><div class="grow"><h3>'+esc(h.title)+'</h3><div class="small">'+fmt(h.scheduled_start)+'<br>'+esc(h.location_label||'Location available from Dream Hunt')+(h.meeting_point?'<br>Meet: '+esc(h.meeting_point):'')+'</div></div><span class="pill '+(a?'green':'')+'">'+esc(a?.status||h.status)+'</span></div>'+(h.guide_instructions?'<div class="small" style="margin-top:7px"><b>Guide notes:</b> '+esc(h.guide_instructions)+'</div>':'')+'<div class="row wrap" style="margin-top:9px">'+(a?'<button class="btn" data-use="'+h.id+'">Open Hunt</button>':'<button class="btn accent" data-select="'+h.id+'">Select Hunt</button>')+'</div></div>'}).join('');
 box.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>selectHunt(b.dataset.select));
 box.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{currentHunt=hunts.find(x=>x.id===b.dataset.use);renderCurrentHunt();renderHunts()});
}
async function selectHunt(id){
 const r=await sb.rpc('dh_guide_select_hunt',{p_hunt_id:id});if(r.error)return toast(r.error.message);
 currentHunt=hunts.find(x=>x.id===id);await loadHunts();toast('Hunt selected.');
}

function renderCurrentHunt(){
 const a=currentHunt?assignmentFor(currentHunt.id):null;
 $('assignmentStatus').textContent=a?.status||'Not selected';
 $('checkInBtn').disabled=!currentHunt||a?.status==='checked_in';
 $('checkOutBtn').disabled=!currentHunt||!a||!['checked_in','selected','scheduled'].includes(a.status);
 $('sendGpsBtn').disabled=!currentHunt||!a;
 if(!currentHunt){$('currentHuntBox').innerHTML='<div class="small">Choose a hunt to begin.</div>';return}
 $('currentHuntBox').innerHTML='<h3 style="margin:0 0 5px">'+esc(currentHunt.title)+'</h3><div class="small">'+fmt(currentHunt.scheduled_start)+'<br>'+esc(currentHunt.location_label||'')+(currentHunt.meeting_point?'<br>Meet: '+esc(currentHunt.meeting_point):'')+'</div><div class="row wrap" style="margin-top:9px"><span class="pill green">'+esc(a?.status||'selected')+'</span></div>';
}

function getPosition(){
 return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Location is not supported on this phone.'));navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:15000})});
}
async function checkIn(){
 if(!currentHunt)return toast('Select your hunt first.');
 $('checkInBtn').disabled=true;
 try{
  const p=await getPosition(),c=p.coords;
  const r=await sb.rpc('dh_guide_check_in',{p_hunt_id:currentHunt.id,p_latitude:c.latitude,p_longitude:c.longitude,p_accuracy_m:c.accuracy,p_battery_pct:null,p_device_meta:{app:'guide-pwa',user_agent:navigator.userAgent}});
  if(r.error)throw r.error;await loadHunts();startTracking();toast('Checked in. Safety location is active.');
 }catch(e){toast(e.message||'Could not check in.');$('checkInBtn').disabled=false}
}
async function sendGps(){
 if(!currentHunt)return;
 try{
  const p=await getPosition(),c=p.coords;
  const r=await sb.rpc('dh_guide_location_ping',{p_hunt_id:currentHunt.id,p_latitude:c.latitude,p_longitude:c.longitude,p_accuracy_m:c.accuracy,p_altitude_m:c.altitude,p_heading_deg:c.heading,p_speed_mps:c.speed,p_battery_pct:null,p_device_meta:{app:'guide-pwa'}});
  if(r.error)throw r.error;$('gpsStatus').textContent='Sent now';$('gpsStatus').className='gps-on';toast('GPS sent.');
 }catch(e){toast(e.message||'Could not send GPS.')}
}
async function checkOut(){
 if(!currentHunt)return;
 let args={p_hunt_id:currentHunt.id,p_latitude:null,p_longitude:null,p_accuracy_m:null,p_battery_pct:null,p_device_meta:{app:'guide-pwa'}};
 try{const p=await getPosition();args.p_latitude=p.coords.latitude;args.p_longitude=p.coords.longitude;args.p_accuracy_m=p.coords.accuracy}catch{}
 const r=await sb.rpc('dh_guide_check_out',args);if(r.error)return toast(r.error.message);stopTracking();await loadHunts();toast('Checked out. GPS tracking stopped.');
}
$('checkInBtn').onclick=checkIn;$('sendGpsBtn').onclick=sendGps;$('checkOutBtn').onclick=checkOut;

function startTracking(){
 stopTracking();if(!navigator.geolocation)return;
 $('gpsStatus').textContent='Active';$('gpsStatus').className='gps-on';
 watchId=navigator.geolocation.watchPosition(async p=>{
  const now=Date.now();if(now-lastPingAt<60000)return;lastPingAt=now;
  const c=p.coords;if(!currentHunt)return;
  await sb.rpc('dh_guide_location_ping',{p_hunt_id:currentHunt.id,p_latitude:c.latitude,p_longitude:c.longitude,p_accuracy_m:c.accuracy,p_altitude_m:c.altitude,p_heading_deg:c.heading,p_speed_mps:c.speed,p_battery_pct:null,p_device_meta:{app:'guide-pwa',background:false}});
 },()=>{$('gpsStatus').textContent='Location issue';$('gpsStatus').className='gps-off'},{enableHighAccuracy:true,maximumAge:30000,timeout:20000});
}
function stopTracking(){if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null;$('gpsStatus').textContent='Off';$('gpsStatus').className='gps-off'}

$('mediaBtn').onclick=()=>{if(!currentHunt)return toast('Select a hunt before uploading media.');$('mediaInput').click()};
$('captureBtn').onclick=()=>{if(!currentHunt)return toast('Select a hunt before capturing media.');$('captureInput').click()};
$('mediaInput').onchange=e=>uploadFiles([...e.target.files]);
$('captureInput').onchange=e=>uploadFiles([...e.target.files]);
async function logUploadEvent(file,eventType,errorMessage=null,storagePath=null,extra={}){
 try{
  await sb.from('dh_guide_upload_events').insert({
   org_id:guide.org_id,
   guide_id:guide.id,
   hunt_id:currentHunt?.id||null,
   user_id:user.id,
   event_type:eventType,
   file_name:file?.name||null,
   storage_path:storagePath,
   error_message:errorMessage,
   metadata:{size:file?.size||null,mime:file?.type||null,app:'guide-pwa',...extra}
  });
 }catch{}
}
async function uploadFiles(files){
 if(!currentHunt?.activity_id)return toast('This hunt is not ready for media intake.');
 files=files.filter(f=>f.type.startsWith('image/')||f.type.startsWith('video/'));if(!files.length)return;
 const preview=$('mediaPreview');
 preview.innerHTML=files.slice(0,9).map(f=>'<div class="preview">'+(f.type.startsWith('image/')?'<img src="'+URL.createObjectURL(f)+'">':'▶')+'</div>').join('');
 let success=0,failed=0;
 const failures=[];
 for(let i=0;i<files.length;i++){
  const f=files[i];
  if(f.size>100*1024*1024){
   failed++;failures.push(f.name+': over 100 MB');await logUploadEvent(f,'failed','File exceeds 100 MB mobile limit');continue;
  }
  $('uploadProgress').textContent='Preparing '+(i+1)+' of '+files.length+'…';
  let path=null;
  try{
   const ticket=await sb.functions.invoke('guide-upload-ticket',{body:{hunt_id:currentHunt.id,file_name:f.name,mime:f.type,size:f.size}});
   if(ticket.error)throw new Error(ticket.error.message||'Could not get upload authorization');
   if(ticket.data?.error)throw new Error(ticket.data.error);
   path=ticket.data?.path;
   const token=ticket.data?.token;
   if(!path||!token)throw new Error('Upload authorization was incomplete');

   $('uploadProgress').textContent='Uploading '+(i+1)+' of '+files.length+'…';
   const up=await sb.storage.from('dh-trial-media').uploadToSignedUrl(path,token,f,{contentType:f.type||'application/octet-stream',cacheControl:'3600'});
   if(up.error)throw new Error(up.error.message||'File transfer failed');

   $('uploadProgress').textContent='Registering '+(i+1)+' of '+files.length+'…';
   const fin=await sb.rpc('dh_guide_finalize_media',{
    p_hunt_id:currentHunt.id,
    p_storage_path:path,
    p_media_type:f.type||'application/octet-stream',
    p_caption:f.name,
    p_metadata:{original_name:f.name,size:f.size,mime:f.type,source:'guide-mobile',hunt_id:currentHunt.id}
   });
   if(fin.error)throw new Error(fin.error.message||'Could not register uploaded media');
   success++;
  }catch(e){
   const msg=e?.message||String(e);failed++;failures.push(f.name+': '+msg);await logUploadEvent(f,'failed',msg,path);
  }
 }
 $('mediaInput').value='';
 if(success&&failed===0){
  $('uploadProgress').textContent=success+' file'+(success===1?'':'s')+' received by Dream Hunt and ready for review.';
  toast('Media received by Dream Hunt.');
 }else if(success){
  $('uploadProgress').textContent=success+' received · '+failed+' failed. '+failures.slice(0,2).join(' | ');
  toast(success+' uploaded, '+failed+' failed.');
 }else{
  $('uploadProgress').textContent='Upload failed. '+failures.slice(0,2).join(' | ');
  toast('Media was not received. See the upload error on screen.');
 }
}

function renderChatTargets(){
 const s=$('chatTarget'),cur=s.value;s.innerHTML='<option value="">All Guides</option>'+hunts.map(h=>'<option value="'+h.id+'">'+esc(h.title)+'</option>').join('');if([...s.options].some(o=>o.value===cur))s.value=cur;
}
$('chatTarget').onchange=()=>{$('chatScope').textContent=$('chatTarget').value?(hunts.find(h=>h.id===$('chatTarget').value)?.title||'Hunt'):'All guides';renderChat()};
async function loadChat(){
 if(!weekendId)return;const r=await sb.from('dh_hunt_messages').select('*').eq('weekend_id',weekendId).order('created_at',{ascending:true}).limit(300);if(r.error)return;messages=r.data||[];renderChat();
}
function renderChat(){
 const target=$('chatTarget').value,rows=messages.filter(m=>target?m.hunt_id===target:true),box=$('chatBox');
 box.innerHTML=rows.length?rows.map(m=>'<div class="msg '+(m.sender_user_id===user.id?'mine ':'')+(m.message_type==='emergency'?'emergency':'')+'"><div class="meta">'+(m.sender_user_id===user.id?'You':m.guide_id?'Guide':'Dream Hunt')+' · '+fmt(m.created_at)+'</div>'+esc(m.message)+'</div>').join(''):'<div class="small">No messages yet.</div>';box.scrollTop=box.scrollHeight;
}
$('sendChatBtn').onclick=async()=>{const text=$('chatInput').value.trim();if(!text||!weekendId)return;const r=await sb.rpc('dh_guide_send_message',{p_weekend_id:weekendId,p_message:text,p_hunt_id:$('chatTarget').value||null});if(r.error)return toast(r.error.message);$('chatInput').value='';await loadChat()};

function subscribeRealtime(){
 if(channel)sb.removeChannel(channel);if(!weekendId)return;
 channel=sb.channel('guide-mobile-'+weekendId).on('postgres_changes',{event:'*',schema:'public',table:'dh_hunt_messages',filter:'weekend_id=eq.'+weekendId},()=>loadChat()).on('postgres_changes',{event:'*',schema:'public',table:'dh_hunt_assignments'},()=>loadHunts()).subscribe();
}

$('emergencyBtn').onclick=async()=>{
 if(!currentHunt)return toast('Select your hunt before sending an emergency.');
 if(!confirm('Send an emergency alert to Dream Hunt now?'))return;
 $('emergencyBtn').disabled=true;$('emergencyBtn').textContent='SENDING…';
 let args={p_hunt_id:currentHunt.id,p_message:$('emergencyMessage').value.trim()||null,p_latitude:null,p_longitude:null,p_accuracy_m:null,p_battery_pct:null,p_device_meta:{app:'guide-pwa'}};
 try{const p=await getPosition();args.p_latitude=p.coords.latitude;args.p_longitude=p.coords.longitude;args.p_accuracy_m=p.coords.accuracy}catch{}
 const r=await sb.rpc('dh_guide_trigger_emergency',args);$('emergencyBtn').disabled=false;$('emergencyBtn').textContent='SEND EMERGENCY ALERT';
 if(r.error)return toast(r.error.message);$('safetyStatus').textContent='Emergency alert sent at '+new Date().toLocaleTimeString()+'. Dream Hunt Guide Ops has been notified.';toast('Emergency alert sent.');await loadChat();
};

$('signOutBtn').onclick=async()=>{stopTracking();if(channel)sb.removeChannel(channel);await sb.auth.signOut();user=guide=null;weekends=[];hunts=[];assignments=[];currentHunt=null;$('bottomNav').classList.add('hidden');$('topSub').textContent='Volunteer field app';pendingPhone=null;$('codeStep').classList.add('hidden');$('phoneStep').classList.remove('hidden');show('authScreen')};

sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session?.user&&!user)enterApp(session.user);if(event==='SIGNED_OUT'){user=null;guide=null}});
(async()=>{const s=await sb.auth.getSession();if(s.data.session?.user)await enterApp(s.data.session.user)})();

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
