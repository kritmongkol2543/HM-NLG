(()=>{
try{
  const writes=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i)||'';
    if(!k.startsWith('nlg-hm-flex-v1:')) continue;
    const ym=k.slice('nlg-hm-flex-v1:'.length);
    const old=JSON.parse(localStorage.getItem(k)||'{}');
    if(!Array.isArray(old.items)) continue;
    const items=old.items.map(x=>({
      event_date:x.date||x.event_date||'',
      kind:x.mode==='event'?'special':x.mode==='small'?'hm_small':'hm_large',
      speaker:x.speaker||'',
      product:x.product||'',
      bring:x.bring||'',
      title:x.eventTitle||x.title||''
    })).filter(x=>x.event_date);
    if(items.length) writes.push([`nlg-legacy-v5:${ym}`,JSON.stringify({items})]);
  }
  writes.forEach(([k,v])=>localStorage.setItem(k,v));
}catch(e){console.warn('Legacy migration bridge skipped',e)}
})();
