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
const MONDAY_ORDER=[1,2,3,4,5,6,0];
function anchorFor(d){const x=new Date(d);x.setDate(x.getDate()+((4-x.getDay()+7)%7));return x}
function buildWeeks(y,m){const first=new Date(y,m,1),last=new Date(y,m+1,0);let a=anchorFor(first),out=[];for(;;){const s=new Date(a);s.setDate(a.getDate()-6);out.push({start:s,anchor:new Date(a)});if(a>=last)break;a.setDate(a.getDate()+7)}return out}
function weekIndex(date,ws){const a=iso(anchorFor(parse(date)));return ws.findIndex(w=>iso(w.anchor)===a)}
function rangeText(w){return `${w.start.toLocaleDateString('th-TH',{day:'numeric',month:'short'})} – ${w.anchor.toLocaleDateString('th-TH',{day:'numeric',month:'short'})}`}
function englishMonth(y,m){return new Date(y,m,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
async function api(action,payload={}){const code=localStorage.getItem('nlg_access_code')||'';const {data,error}=await sbx.rpc('nlg_schedule_api',{p_code:code,p_action:action,p_payload:payload});if(error)throw error;return data}
function detailRow(type,label,value){
  const empty=!String(value??'').trim();
  const text=empty?'ยังไม่มีคนลง':esc(value);
  return `<div class="ex-row ex-${type}${empty?' is-missing':''}"><strong>${label}</strong><b>${text}</b></div>`
}
function exCard(x,settings){
  const d=parse(x.event_date),dc=DAY[d.getDay()];
  const h=`<div class="ex-cardhead" style="background:${dc.soft}"><i class="marker" style="background:${dc.main}"></i><div><span style="color:${dc.main}">${dc.th}</span><br><b>${d.getDate()} ${d.toLocaleDateString('th-TH',{month:'short'})}</b></div></div>`;
  if(x.kind==='special')return `<div class="ex-card ex-special-card">${h}<div class="ex-special" style="background:${dc.soft};color:${dc.main}">SPECIAL EVENT</div></div>`;
  let r='';
  r+=detailRow('product','PRODUCT',x.product||'');
  r+=detailRow('speaker','SPEAKER',x.speaker||'');
  if(x.kind==='hm_large')r+=detailRow('bring','BRING',x.bring||'');
  const s=(settings||[]).map(z=>`<div class="ex-setline"><span>${esc(z.label)}</span><span>${esc(z.value)}</span></div>`).join('');
  return `<div class="ex-card">${h}<div class="ex-body"><div class="ex-keyrows">${r}</div><div class="ex-set"><div class="ex-settitle">DEFAULT SET</div>${s}</div></div></div>`
}
function buildBoard(y,m,items,settings){
  const board=$('#exportBoard'),ws=buildWeeks(y,m);
  const groups=ws.map((w,i)=>({w,i,items:items.filter(x=>weekIndex(x.event_date,ws)===i).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date)))})).filter(g=>g.items.length);
  const usedDays=new Set(items.map(x=>parse(x.event_date).getDay()));
  const activeDays=MONDAY_ORDER.filter(di=>usedDays.has(di));
  const dayMeta=activeDays.map(di=>{
    const dayItems=items.filter(x=>parse(x.event_date).getDay()===di);
    return {di,specialOnly:dayItems.length>0&&dayItems.every(x=>x.kind==='special')};
  });
  const tracks=dayMeta.map(x=>x.specialOnly?'minmax(150px,.58fr)':'minmax(0,1fr)').join(' ');
  const gridCols=`140px ${tracks||'minmax(0,1fr)'}`;
  const heads=dayMeta.map(x=>{const d=DAY[x.di];return `<div class="ex-colhead${x.specialOnly?' is-special-col':''}" style="background:${d.soft};color:${d.main}">${d.th}</div>`}).join('');
  const rows=groups.map(g=>{
    const byDay={};
    g.items.forEach(x=>{const di=parse(x.event_date).getDay();(byDay[di]??=[]).push(x)});
    const cells=dayMeta.map(dm=>{
      const arr=byDay[dm.di]||[];
      if(!arr.length)return `<div class="ex-daycell${dm.specialOnly?' is-special-col':''} is-empty"></div>`;
      return `<div class="ex-daycell${dm.specialOnly?' is-special-col':''}"><div class="ex-daystack" style="grid-template-rows:repeat(${arr.length},minmax(0,1fr))">${arr.map(x=>exCard(x,settings)).join('')}</div></div>`;
    }).join('');
    return `<div class="ex-week" style="grid-template-columns:${gridCols}"><div class="ex-weeklabel"><b>Week ${g.i+1}</b><span>${rangeText(g.w)}</span></div>${cells}</div>`;
  }).join('');
  board.innerHTML=`<div class="ex-head"><h1>${englishMonth(y,m)}</h1><p>Monthly HM Overview • เฉพาะวันที่มีตาราง</p></div>${activeDays.length?`<div class="ex-colheads" style="grid-template-columns:${gridCols}"><div class="ex-colspacer"></div>${heads}</div>${rows}`:'<div class="empty">No schedule</div>'}<div class="ex-exportnote">เรียง Column เริ่มจากวันจันทร์ • Week = ศุกร์–พฤหัส</div>`;
}
async function exportColumnsPNG(){
  if(typeof html2canvas!=='function')return;
  const month=$('#month')?.value;if(!month)return;
  const status=$('#status');if(status){status.textContent='กำลังสร้างภาพ...';status.className='status'}
  try{
    const [y,mm]=month.split('-').map(Number);
    const data=await api('load_month',{month});
    const items=(data?.items||[]).map(x=>({...x,event_date:String(x.event_date).slice(0,10)}));
    buildBoard(y,mm-1,items,data?.settings||[]);
    await new Promise(r=>setTimeout(r,100));
    const c=await html2canvas($('#exportBoard'),{backgroundColor:'#f8f8fa',scale:1.5,useCORS:true,logging:false,width:1800});
    const blob=await new Promise(r=>c.toBlob(r,'image/png',1));
    const name=`NLG-HM-${month}-column-overview.png`,file=new File([blob],name,{type:'image/png'});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:name});return}catch(e){if(e.name==='AbortError')return}
    }
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);
  }catch(e){console.error(e);alert('สร้างภาพไม่สำเร็จ กรุณาลองใหม่')}
  finally{if(status){status.textContent='บันทึกบน Supabase';status.className='status ok'}}
}
const btn=$('#exportBtn');if(btn){btn.onclick=exportColumnsPNG;btn.textContent='สร้างภาพแนวนอน'}
})();
