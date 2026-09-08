(()=>{
const SB_URL='https://khmelwrjhaxqjdeksdju.supabase.co';
const SB_KEY='sb_publishable_bIxdVhesmI0QPDUT5o4xGg_YpOVQ3yI';
const sbx=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false}});
const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const [y,m,d]=String(s).slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY=[
  {th:'อาทิตย์',main:'#f05b65',soft:'#fdebed'},
  {th:'จันทร์',main:'#d59b00',soft:'#fff5cf'},
  {th:'อังคาร',main:'#df6d9f',soft:'#fbe6ef'},
  {th:'พุธ',main:'#4da875',soft:'#e8f6ee'},
  {th:'พฤหัส',main:'#ed852a',soft:'#fff0df'},
  {th:'ศุกร์',main:'#4779d8',soft:'#eaf1ff'},
  {th:'เสาร์',main:'#8664d2',soft:'#f0ebfb'}
];
const ORDER=[1,2,3,4,5,6,0];
let timer=null,lastKey='';
let zoomMode=localStorage.getItem('nlg_overview_zoom_mode')||'fit';
let manualZoom=Math.max(.30,Math.min(1,Number(localStorage.getItem('nlg_overview_zoom'))||.75));
function anchorFor(d){const x=new Date(d);x.setDate(x.getDate()+((4-x.getDay()+7)%7));return x}
function buildWeeks(y,m){const first=new Date(y,m,1),last=new Date(y,m+1,0);let a=anchorFor(first),out=[];for(;;){const s=new Date(a);s.setDate(a.getDate()-6);out.push({start:s,anchor:new Date(a)});if(a>=last)break;a.setDate(a.getDate()+7)}return out}
function weekIndex(date,ws){const a=iso(anchorFor(parse(date)));return ws.findIndex(w=>iso(w.anchor)===a)}
function rangeText(w){return `${w.start.toLocaleDateString('th-TH',{day:'numeric',month:'short'})} – ${w.anchor.toLocaleDateString('th-TH',{day:'numeric',month:'short'})}`}
function englishMonth(y,m){return new Date(y,m,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
async function api(action,payload={}){const code=localStorage.getItem('nlg_access_code')||'';if(!code)throw new Error('locked');const {data,error}=await sbx.rpc('nlg_schedule_api',{p_code:code,p_action:action,p_payload:payload});if(error)throw error;return data}
function row(type,label,value){const empty=!String(value??'').trim();return `<div class="mo-row mo-${type}${empty?' is-missing':''}"><strong>${label}</strong><b>${empty?'ยังไม่มีคนลง':esc(value)}</b></div>`}
function card(x,settings){
  const d=parse(x.event_date),dc=DAY[d.getDay()];
  const h=`<div class="mo-cardhead" style="background:${dc.soft}"><i class="mo-marker" style="background:${dc.main}"></i><div><div class="dow" style="color:${dc.main}">${dc.th}</div><div class="date">${d.getDate()} ${d.toLocaleDateString('th-TH',{month:'short'})}</div></div></div>`;
  if(x.kind==='special')return `<article class="mo-card mo-special-card" data-overview-edit="${x.id}" tabindex="0" role="button" aria-label="แก้ไข ${dc.th} ${d.getDate()}"><span class="mo-edit-hint">แตะเพื่อแก้ไข</span>${h}<div class="mo-special" style="background:${dc.soft};color:${dc.main}">SPECIAL EVENT</div></article>`;
  let rows=row('product','PRODUCT',x.product)+row('speaker','SPEAKER',x.speaker);
  if(x.kind==='hm_large')rows+=row('bring','BRING',x.bring);
  const sets=(settings||[]).map(z=>`<div class="mo-setline"><span>${esc(z.label)}</span><span>${esc(z.value)}</span></div>`).join('');
  return `<article class="mo-card" data-overview-edit="${x.id}" tabindex="0" role="button" aria-label="แก้ไข ${dc.th} ${d.getDate()}"><span class="mo-edit-hint">แตะเพื่อแก้ไข</span>${h}<div class="mo-body"><div class="mo-keyrows">${rows}</div><div class="mo-set"><div class="mo-settitle">DEFAULT SET</div>${sets}</div></div></article>`
}
function ensureMount(){let el=$('#mainOverview');if(!el){el=document.createElement('section');el.id='mainOverview';const weeks=$('#weeks');weeks?.parentNode?.insertBefore(el,weeks)}return el}
function zoomControls(){return `<div class="mo-zoom" aria-label="ปรับขนาดมุมมอง"><button type="button" data-mo-zoom="out" aria-label="ย่อ">−</button><span id="moZoomValue">100%</span><button type="button" data-mo-zoom="in" aria-label="ขยาย">＋</button><button type="button" class="fit" data-mo-fit>พอดีจอ</button></div>`}
function applyZoom(){
  const scroll=$('.main-overview-scroll'),board=$('.main-overview-board'),label=$('#moZoomValue');if(!scroll||!board)return;
  board.style.zoom='1';
  let z=manualZoom;
  if(zoomMode==='fit'){
    const natural=Math.max(board.scrollWidth,board.offsetWidth,1);
    z=Math.min(1,Math.max(.30,(scroll.clientWidth-2)/natural));
  }
  board.style.zoom=String(z);
  scroll.classList.toggle('is-fit',zoomMode==='fit');
  if(label)label.textContent=`${zoomMode==='fit'?'Fit ':''}${Math.round(z*100)}%`;
  const fit=$('[data-mo-fit]');if(fit)fit.classList.toggle('on',zoomMode==='fit');
}
function setManualZoom(delta){
  const board=$('.main-overview-board');let current=manualZoom;
  if(zoomMode==='fit'&&board){const v=parseFloat(board.style.zoom);if(Number.isFinite(v))current=v}
  manualZoom=Math.max(.30,Math.min(1,Math.round((current+delta)*20)/20));
  zoomMode='manual';
  localStorage.setItem('nlg_overview_zoom_mode','manual');localStorage.setItem('nlg_overview_zoom',String(manualZoom));applyZoom();
}
function fitPage(){zoomMode='fit';localStorage.setItem('nlg_overview_zoom_mode','fit');applyZoom()}
async function renderOverview(force=false){
  const month=$('#month')?.value;if(!month)return;
  const code=localStorage.getItem('nlg_access_code')||'';if(!code)return;
  const key=month+'|'+code;if(!force&&key===lastKey&&document.body.classList.contains('overview-live'))return;
  try{
    const [y,mm]=month.split('-').map(Number),data=await api('load_month',{month});
    const items=(data?.items||[]).map(x=>({...x,event_date:String(x.event_date).slice(0,10)}));
    const settings=data?.settings||[],ws=buildWeeks(y,mm-1);
    const groups=ws.map((w,i)=>({w,i,items:items.filter(x=>weekIndex(x.event_date,ws)===i).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date)))})).filter(g=>g.items.length);
    const used=new Set(items.map(x=>parse(x.event_date).getDay()));
    const active=ORDER.filter(di=>used.has(di));
    const meta=active.map(di=>{const diItems=items.filter(x=>parse(x.event_date).getDay()===di);return {di,specialOnly:diItems.length>0&&diItems.every(x=>x.kind==='special')}});
    const tracks=meta.map(x=>x.specialOnly?'minmax(150px,.58fr)':'minmax(245px,1fr)').join(' ');
    const grid=`125px ${tracks||'minmax(245px,1fr)'}`;
    const heads=meta.map(x=>{const d=DAY[x.di];return `<div class="mo-colhead${x.specialOnly?' is-special-col':''}" style="background:${d.soft};color:${d.main}">${d.th}</div>`}).join('');
    const rows=groups.map(g=>{
      const by={};g.items.forEach(x=>{const di=parse(x.event_date).getDay();(by[di]??=[]).push(x)});
      const cells=meta.map(dm=>{const arr=by[dm.di]||[];if(!arr.length)return `<div class="mo-daycell is-empty"></div>`;return `<div class="mo-daycell"><div class="mo-daystack" style="grid-template-rows:repeat(${arr.length},minmax(0,1fr))">${arr.map(x=>card(x,settings)).join('')}</div></div>`}).join('');
      return `<div class="mo-week" style="grid-template-columns:${grid}"><div class="mo-weeklabel"><b>Week ${g.i+1}</b><span>${rangeText(g.w)}</span></div>${cells}</div>`
    }).join('');
    const mount=ensureMount();
    mount.innerHTML=`<div class="mo-viewbar"><div><b>ภาพรวมทั้งเดือน</b><span>ย่อเพื่อดูทั้งหน้า หรือขยายเพื่อแก้รายละเอียด</span></div>${zoomControls()}</div><div class="main-overview-scroll"><div class="main-overview-board"><div class="mo-head"><h1>${englishMonth(y,mm-1)}</h1><p>Monthly HM Overview • แตะ Card เพื่อแก้ไข</p></div>${active.length?`<div class="mo-colheads" style="grid-template-columns:${grid}"><div class="mo-colspacer"></div>${heads}</div>${rows}`:'<div class="mo-empty">เดือนนี้ยังไม่มีตาราง</div>'}<div class="mo-note">Week = ศุกร์–พฤหัส • แสดงเฉพาะวันที่มีตาราง</div></div></div>`;
    document.body.classList.add('overview-live');lastKey=key;requestAnimationFrame(applyZoom);
  }catch(e){console.error('overview',e)}
}
function schedule(force=true){clearTimeout(timer);timer=setTimeout(()=>renderOverview(force),140)}
document.addEventListener('click',e=>{
  const z=e.target.closest?.('[data-mo-zoom]');if(z){setManualZoom(z.dataset.moZoom==='in'?.05:-.05);return}
  const fit=e.target.closest?.('[data-mo-fit]');if(fit){fitPage();return}
  const c=e.target.closest?.('[data-overview-edit]');if(!c)return;
  const id=c.dataset.overviewEdit;
  const hidden=document.querySelector(`#weeks [data-edit="${CSS.escape(id)}"]`);
  if(hidden)hidden.click();
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('[data-overview-edit]')){e.preventDefault();e.target.click()}});
$('#month')?.addEventListener('change',()=>schedule(true));
$('#prev')?.addEventListener('click',()=>schedule(true));
$('#next')?.addEventListener('click',()=>schedule(true));
$('#saveItem')?.addEventListener('click',()=>setTimeout(()=>schedule(true),500));
$('#saveSettings')?.addEventListener('click',()=>setTimeout(()=>schedule(true),500));
$('#unlockBtn')?.addEventListener('click',()=>setTimeout(()=>schedule(true),500));
window.addEventListener('resize',()=>{clearTimeout(window.__moResize);window.__moResize=setTimeout(applyZoom,120)});
const status=$('#status');if(status)new MutationObserver(()=>{if(status.classList.contains('ok'))schedule(true)}).observe(status,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
setTimeout(()=>renderOverview(true),350);
})();
