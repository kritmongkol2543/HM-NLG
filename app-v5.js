(()=>{
const SB_URL='https://khmelwrjhaxqjdeksdju.supabase.co';
const SB_KEY='sb_publishable_bIxdVhesmI0QPDUT5o4xGg_YpOVQ3yI';
const sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false}});
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const DAY=[
  {th:'อาทิตย์',short:'อา.',main:'#f05b65',soft:'#fdebed'},
  {th:'จันทร์',short:'จ.',main:'#d59b00',soft:'#fff5cf'},
  {th:'อังคาร',short:'อ.',main:'#df6d9f',soft:'#fbe6ef'},
  {th:'พุธ',short:'พ.',main:'#4da875',soft:'#e8f6ee'},
  {th:'พฤหัส',short:'พฤ.',main:'#ed852a',soft:'#fff0df'},
  {th:'ศุกร์',short:'ศ.',main:'#4779d8',soft:'#eaf1ff'},
  {th:'เสาร์',short:'ส.',main:'#8664d2',soft:'#f0ebfb'}
];
let access=localStorage.getItem('nlg_access_code')||'';
let state={year:0,month:0,items:[],settings:[]};
let editId=null,kind='hm_large',busy=false;
const month=$('#month'), weeks=$('#weeks'), itemModal=$('#itemModal'), settingsModal=$('#settingsModal');

function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('on');setTimeout(()=>x.classList.remove('on'),1700)}
function setStatus(t,cls=''){const x=$('#status');x.textContent=t;x.className='status '+cls}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function api(action,payload={}){
  const {data,error}=await sb.rpc('nlg_schedule_api',{p_code:access,p_action:action,p_payload:payload});
  if(error) throw error;
  return data;
}
function anchorFor(d){let x=new Date(d);x.setDate(x.getDate()+((4-x.getDay()+7)%7));return x}
function buildWeeks(y,m){
  const first=new Date(y,m,1),last=new Date(y,m+1,0);let a=anchorFor(first),out=[];
  for(;;){let s=new Date(a);s.setDate(a.getDate()-6);out.push({start:s,anchor:new Date(a)});if(a>=last)break;a.setDate(a.getDate()+7)}
  return out
}
function weekIndex(date,ws){const a=iso(anchorFor(parse(date)));return ws.findIndex(w=>iso(w.anchor)===a)}
function rangeText(w){return `${w.start.toLocaleDateString('th-TH',{day:'numeric',month:'short'})} – ${w.anchor.toLocaleDateString('th-TH',{day:'numeric',month:'short'})}`}
function monthName(y,m){return new Date(y,m,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'})}
function englishMonth(y,m){return new Date(y,m,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}

async function unlock(code){
  access=code.trim();
  if(!access) return;
  $('#unlockBtn').disabled=true;
  try{
    await api('ping');
    localStorage.setItem('nlg_access_code',access);
    $('#unlock').classList.remove('open');
    await loadMonthFromInput();
  }catch(e){
    localStorage.removeItem('nlg_access_code');access='';
    toast('รหัสไม่ถูกต้อง');
  }finally{$('#unlockBtn').disabled=false}
}
async function ensureAccess(){
  if(!access){$('#unlock').classList.add('open');return false}
  try{await api('ping');return true}catch(e){localStorage.removeItem('nlg_access_code');access='';$('#unlock').classList.add('open');return false}
}

async function load(y,m){
  state.year=y;state.month=m;month.value=`${y}-${pad(m+1)}`;
  setStatus('กำลังโหลด...');
  try{
    const data=await api('load_month',{month:month.value});
    state.items=(data?.items||[]).map(x=>({...x,event_date:String(x.event_date).slice(0,10)}));
    state.settings=data?.settings||[];
    setStatus('บันทึกบน Supabase','ok');
    await migrateLocalIfNeeded();
    render();
  }catch(e){console.error(e);setStatus('เชื่อมต่อไม่ได้','err');toast('โหลดข้อมูลไม่สำเร็จ')}
}
async function loadMonthFromInput(){
  const now=new Date(),v=month.value||`${now.getFullYear()}-${pad(now.getMonth()+1)}`;
  const [y,m]=v.split('-').map(Number);await load(y,m-1)
}
async function migrateLocalIfNeeded(){
  if(localStorage.getItem('nlg_db_migrated_v5')) return;
  if(state.items.length){localStorage.setItem('nlg_db_migrated_v5','1');return}
  const candidates=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i)||'';
    if(k.includes(month.value) && k.toLowerCase().includes('nlg')) candidates.push(k);
  }
  let old=[];
  for(const k of candidates){
    try{
      const o=JSON.parse(localStorage.getItem(k));
      if(Array.isArray(o?.items)) old.push(...o.items);
    }catch(e){}
  }
  const usable=old.filter(x=>x && (x.kind==='hm_large'||x.kind==='hm_small'||x.kind==='special') && (x.event_date||x.date));
  if(!usable.length){localStorage.setItem('nlg_db_migrated_v5','1');return}
  setStatus('กำลังย้ายข้อมูลเดิม...');
  for(const x of usable){
    await api('save_item',{
      event_date:x.event_date||x.date,kind:x.kind,
      speaker:x.speaker||'',product:x.product||'',bring:x.bring||'',title:x.title||''
    });
  }
  localStorage.setItem('nlg_db_migrated_v5','1');
  const data=await api('load_month',{month:month.value});state.items=data.items||[];state.settings=data.settings||state.settings;
  toast(`ย้ายข้อมูลเดิม ${usable.length} รายการแล้ว`);
}

function render(){
  $('#monthTitle').textContent=monthName(state.year,state.month);
  $('#legend').innerHTML=DAY.map(d=>`<span class="pill" style="background:${d.soft};color:${d.main}">${d.th}</span>`).join('');
  const ws=buildWeeks(state.year,state.month),groups=[];
  ws.forEach((w,i)=>{
    const items=state.items.filter(x=>weekIndex(x.event_date,ws)===i).sort((a,b)=>a.event_date.localeCompare(b.event_date));
    if(items.length) groups.push({w,i,items});
  });
  if(!groups.length){weeks.innerHTML=`<div class="empty"><b>เดือนนี้ยังไม่มีตาราง</b>กด “เพิ่มวัน” แล้วเลือกวันที่ได้เลย</div>`;return}
  weeks.innerHTML=groups.map(g=>weekHTML(g.w,g.i,g.items)).join('');
}
function weekHTML(w,i,items){
  const by={};items.forEach(x=>(by[x.event_date]??=[]).push(x));
  const cards=Object.keys(by).sort().flatMap(d=>by[d].map(x=>cardHTML(x))).join('');
  return `<section class="week"><div class="weekhead"><b>Week ${i+1}</b><span>${rangeText(w)}</span></div><div class="days">${cards}</div></section>`
}
function cardHTML(x){
  const d=parse(x.event_date),dc=DAY[d.getDay()];
  const head=`<div class="daytop" style="background:${dc.soft}"><div class="dayidentity"><i class="marker" style="background:${dc.main}"></i><div><div class="dow" style="color:${dc.main}">${dc.th}</div><div class="datebig">${d.getDate()} ${d.toLocaleDateString('th-TH',{month:'long'})}</div></div></div><div class="tools"><button class="iconbtn" data-edit="${x.id}">✎</button><button class="iconbtn" data-del="${x.id}">×</button></div></div>`;
  if(x.kind==='special') return `<article class="daycard">${head}<div class="special"><div class="specialtitle" style="background:${dc.soft};color:${dc.main}">${esc(x.title||'Special Event')}</div></div></article>`;
  let rows='';
  if(x.speaker) rows+=hmrow('SPEAKER',x.speaker);
  if(x.product) rows+=hmrow('PRODUCT',x.product);
  if(x.kind==='hm_large'&&x.bring) rows+=hmrow('BRING',x.bring);
  const sets=state.settings.map(s=>`<div class="setline"><b>${esc(s.label)}</b><span>${esc(s.value)}</span></div>`).join('');
  return `<article class="daycard">${head}<div class="body"><div class="hmrows">${rows||'<div class="label">ไม่มีรายละเอียด HM</div>'}</div><div class="setbox"><div class="settitle">SET • DEFAULT</div>${sets}</div></div></article>`
}
function hmrow(label,value){return `<div class="hmrow"><div class="label">${label}</div><div class="value">${esc(value)}</div></div>`}

function setKind(k){
  kind=k;
  $$('#kindSeg button').forEach(b=>b.classList.toggle('on',b.dataset.kind===k));
  $('#hmFields').style.display=k==='special'?'none':'block';
  $('#specialFields').style.display=k==='special'?'block':'none';
  $('#bringBox').style.display=k==='hm_large'?'block':'none';
  if(k==='hm_small'){$('#bringOn').checked=false;$('#fBring').value=''}
  syncOptionBoxes();
}
function syncOptionBoxes(){
  [['speakerOn','speakerBox','fSpeaker'],['productOn','productBox','fProduct'],['bringOn','bringBox','fBring']].forEach(([c,b,i])=>{
    const on=$('#'+c).checked;$('#'+b).classList.toggle('disabled',!on);$('#'+i).disabled=!on;
  })
}
function openItem(id=null,date=null){
  editId=id;
  const x=id?state.items.find(i=>i.id===id):null;
  $('#formTitle').textContent=id?'แก้ไขวัน':'เพิ่มวัน';
  $('#fDate').value=x?.event_date||date||`${month.value}-01`;
  $('#fSpeaker').value=x?.speaker||'';$('#fProduct').value=x?.product||'';$('#fBring').value=x?.bring||'';$('#fTitle').value=x?.title||'';
  $('#speakerOn').checked=!!x?.speaker || !x;
  $('#productOn').checked=!!x?.product || !x;
  $('#bringOn').checked=!!x?.bring;
  setKind(x?.kind||'hm_large');
  itemModal.classList.add('open');
}
function closeItem(){itemModal.classList.remove('open');editId=null}
async function saveItem(){
  if(busy)return;
  const d=$('#fDate').value;if(!d)return toast('เลือกวันที่');
  const pd=parse(d);if(pd.getFullYear()!==state.year||pd.getMonth()!==state.month)return toast('วันที่ต้องอยู่ในเดือนที่เลือก');
  const payload={
    id:editId||undefined,event_date:d,kind,
    speaker:kind==='special'?'':($('#speakerOn').checked?$('#fSpeaker').value.trim():''),
    product:kind==='special'?'':($('#productOn').checked?$('#fProduct').value.trim():''),
    bring:kind==='hm_large'&&$('#bringOn').checked?$('#fBring').value.trim():'',
    title:kind==='special'?$('#fTitle').value.trim():''
  };
  if(kind==='special'&&!payload.title)return toast('ใส่ชื่อ Event');
  busy=true;$('#saveItem').disabled=true;setStatus('กำลังบันทึก...');
  try{
    await api('save_item',payload);closeItem();await load(state.year,state.month);toast('บันทึกแล้ว');
  }catch(e){console.error(e);toast('บันทึกไม่สำเร็จ');setStatus('เกิดข้อผิดพลาด','err')}
  finally{busy=false;$('#saveItem').disabled=false}
}
async function deleteItem(id){
  const x=state.items.find(i=>i.id===id);if(!x||!confirm('ลบรายการวันนี้?'))return;
  try{await api('delete_item',{id});await load(state.year,state.month);toast('ลบแล้ว')}catch(e){toast('ลบไม่สำเร็จ')}
}

function openSettings(){
  $('#settingsRows').innerHTML=state.settings.map((s,i)=>`<div class="settingrow"><input data-si="${i}" data-sf="label" value="${esc(s.label)}"><input data-si="${i}" data-sf="value" value="${esc(s.value)}"></div>`).join('');
  settingsModal.classList.add('open')
}
async function saveSettings(){
  const lines=state.settings.map((_,i)=>({
    label:($(`[data-si="${i}"][data-sf="label"]`)?.value||'').trim(),
    value:($(`[data-si="${i}"][data-sf="value"]`)?.value||'').trim()
  }));
  try{await api('save_settings',{set_lines:lines});state.settings=lines;settingsModal.classList.remove('open');render();toast('บันทึก Default แล้ว')}catch(e){toast('บันทึก Setting ไม่สำเร็จ')}
}

function buildExport(){
  const board=$('#exportBoard'),ws=buildWeeks(state.year,state.month);
  const groups=ws.map((w,i)=>({w,i,items:state.items.filter(x=>weekIndex(x.event_date,ws)===i).sort((a,b)=>a.event_date.localeCompare(b.event_date))})).filter(g=>g.items.length);
  const weeksHTML=groups.map(g=>{
    const cards=g.items.map(exportCard).join('');
    return `<div class="ex-week"><div class="ex-weeklabel"><b>Week ${g.i+1}</b><span>${rangeText(g.w)}</span></div><div class="ex-cards" style="grid-template-columns:repeat(${Math.min(g.items.length,5)},minmax(0,1fr))">${cards}</div></div>`
  }).join('');
  board.innerHTML=`<div class="ex-head"><h1>${englishMonth(state.year,state.month)}</h1><p>Monthly HM Overview • แสดงเฉพาะวันที่มีตาราง</p></div>${weeksHTML||'<div class="empty">No schedule</div>'}`;
}
function exportCard(x){
  const d=parse(x.event_date),dc=DAY[d.getDay()];
  const h=`<div class="ex-cardhead" style="background:${dc.soft}"><i class="marker" style="background:${dc.main}"></i><div><span style="color:${dc.main}">${dc.th}</span><br><b>${d.getDate()} ${d.toLocaleDateString('th-TH',{month:'short'})}</b></div></div>`;
  if(x.kind==='special')return `<div class="ex-card">${h}<div class="ex-special" style="color:${dc.main}">${esc(x.title||'Special Event')}</div></div>`;
  let r='';if(x.speaker)r+=`<div class="ex-row"><strong>SPEAKER</strong><b>${esc(x.speaker)}</b></div>`;if(x.product)r+=`<div class="ex-row"><strong>PRODUCT</strong><b>${esc(x.product)}</b></div>`;if(x.kind==='hm_large'&&x.bring)r+=`<div class="ex-row"><strong>BRING</strong><b>${esc(x.bring)}</b></div>`;
  const s=state.settings.map(z=>`<div class="ex-setline"><span>${esc(z.label)}</span><span>${esc(z.value)}</span></div>`).join('');
  return `<div class="ex-card">${h}<div class="ex-body">${r}<div class="ex-set">${s}</div></div></div>`
}
async function exportPNG(){
  if(typeof html2canvas!=='function')return toast('ตัวสร้างภาพยังโหลดไม่เสร็จ');
  buildExport();setStatus('กำลังสร้างภาพ...');
  await new Promise(r=>setTimeout(r,80));
  try{
    const c=await html2canvas($('#exportBoard'),{backgroundColor:'#f8f8fa',scale:1.5,useCORS:true,logging:false,width:1800});
    const blob=await new Promise(r=>c.toBlob(r,'image/png',1));
    const name=`NLG-HM-${month.value}-overview.png`,file=new File([blob],name,{type:'image/png'});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:name});return}catch(e){if(e.name==='AbortError')return}
    }
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);
  }catch(e){console.error(e);toast('สร้างภาพไม่สำเร็จ')}
  finally{setStatus('บันทึกบน Supabase','ok')}
}

$('#unlockBtn').onclick=()=>unlock($('#accessInput').value);
$('#accessInput').addEventListener('keydown',e=>{if(e.key==='Enter')unlock(e.target.value)});
$('#kindSeg').onclick=e=>{const b=e.target.closest('[data-kind]');if(b)setKind(b.dataset.kind)};
['speakerOn','productOn','bringOn'].forEach(id=>$('#'+id).onchange=syncOptionBoxes);
$('#saveItem').onclick=saveItem;$('#cancelItem').onclick=closeItem;
itemModal.onclick=e=>{if(e.target===itemModal)closeItem()};
$('#settingsBtn').onclick=openSettings;$('#cancelSettings').onclick=()=>settingsModal.classList.remove('open');$('#saveSettings').onclick=saveSettings;
settingsModal.onclick=e=>{if(e.target===settingsModal)settingsModal.classList.remove('open')};
weeks.onclick=e=>{const ed=e.target.closest('[data-edit]');if(ed)return openItem(ed.dataset.edit);const del=e.target.closest('[data-del]');if(del)return deleteItem(del.dataset.del)};
$('#addTop').onclick=$('#fab').onclick=()=>openItem();
$('#prev').onclick=()=>{const d=new Date(state.year,state.month-1,1);load(d.getFullYear(),d.getMonth())};
$('#next').onclick=()=>{const d=new Date(state.year,state.month+1,1);load(d.getFullYear(),d.getMonth())};
month.onchange=loadMonthFromInput;
$('#exportBtn').onclick=exportPNG;

(async()=>{
  const now=new Date();month.value=`${now.getFullYear()}-${pad(now.getMonth()+1)}`;
  if(await ensureAccess()) await load(now.getFullYear(),now.getMonth());
})();
})();
