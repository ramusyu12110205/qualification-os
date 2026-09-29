// 科目内の問題並び順を切り替える
(function(){
  const KEY_PREFIX='qualification-os-problem-sort-';
  const OPTIONS=[
    {value:'number',label:'数字順'},
    {value:'review',label:'復習日が近い順'},
    {value:'master',label:'MASTER → MASTERに近い順'}
  ];

  function getSaved(subjectId){
    try{return localStorage.getItem(KEY_PREFIX+subjectId)||'number'}catch(e){return 'number'}
  }
  function save(subjectId,value){
    try{localStorage.setItem(KEY_PREFIX+subjectId,value)}catch(e){}
  }
  function problemForItem(item,subjectId){
    const name=item.querySelector('b')?.textContent?.trim()||'';
    const list=(typeof problems!=='undefined'&&Array.isArray(problems))?problems:[];
    return list.find(p=>p.subject_id===subjectId&&p.name===name)||null;
  }
  function numberOf(p){
    const m=String(p?.name||'').match(/^\s*(\d+)/);
    return m?Number(m[1]):Number.MAX_SAFE_INTEGER;
  }
  function reviewTime(p){
    if(!p?.next_review_date)return Number.MAX_SAFE_INTEGER;
    const t=Date.parse(p.next_review_date+'T00:00:00');
    return Number.isNaN(t)?Number.MAX_SAFE_INTEGER:t;
  }
  function masterRank(p){
    if(!p)return -1;
    if(p.status==='mastered')return 1000000;
    const stage=Number(p.stage||0);
    const attempts=Number(p.attempts||0);
    return stage*1000+attempts;
  }
  function sortItems(items,mode,subjectId){
    return items.slice().sort(function(a,b){
      const pa=problemForItem(a,subjectId),pb=problemForItem(b,subjectId);
      if(mode==='review'){
        const da=reviewTime(pa),db=reviewTime(pb);
        if(da!==db)return da-db;
        return numberOf(pa)-numberOf(pb);
      }
      if(mode==='master'){
        const ra=masterRank(pa),rb=masterRank(pb);
        if(ra!==rb)return rb-ra;
        return numberOf(pa)-numberOf(pb);
      }
      const na=numberOf(pa),nb=numberOf(pb);
      if(na!==nb)return na-nb;
      return String(pa?.name||'').localeCompare(String(pb?.name||''),'ja');
    });
  }
  function applySort(subjectId,mode,container){
    if(!container)return;
    const all=[...container.querySelectorAll(':scope > .item')].filter(function(el){
      return !!problemForItem(el,subjectId);
    });
    const sorted=sortItems(all,mode,subjectId);
    sorted.forEach(function(el){container.appendChild(el)});
  }
  function installForCurrentUnit(){
    const box=document.getElementById('dashboard');
    if(!box)return;
    const heading=box.querySelector('h2');
    if(!heading)return;
    const subjectId=window.__qosCurrentSubjectId;
    if(!subjectId)return;

    const problemItems=[...box.querySelectorAll('.item')].filter(function(el){
      return !!problemForItem(el,subjectId);
    });
    if(!problemItems.length)return;
    const container=problemItems[0].parentElement;

    let controls=box.querySelector('.qos-problem-sort');
    if(!controls){
      controls=document.createElement('div');
      controls.className='item qos-problem-sort';
      controls.style.margin='10px 0';
      controls.innerHTML='<div class="row" style="justify-content:space-between;align-items:center"><div><b>問題の並び順</b><div class="muted small">表示順だけを変更します。問題データ自体は変更しません。</div></div><div style="min-width:190px;flex:0 1 260px"><select aria-label="問題の並び順"></select></div></div>';
      const select=controls.querySelector('select');
      OPTIONS.forEach(function(o){
        const opt=document.createElement('option');opt.value=o.value;opt.textContent=o.label;select.appendChild(opt);
      });
      select.value=getSaved(subjectId);
      select.addEventListener('change',function(){
        save(subjectId,this.value);
        applySort(subjectId,this.value,container);
      });
      heading.insertAdjacentElement('afterend',controls);
    }else{
      const select=controls.querySelector('select');
      if(select)select.value=getSaved(subjectId);
    }
    applySort(subjectId,getSaved(subjectId),container);
  }

  const originalShowUnit=window.showUnit;
  window.showUnit=function(id){
    window.__qosCurrentSubjectId=id;
    const result=originalShowUnit?originalShowUnit.apply(this,arguments):undefined;
    setTimeout(installForCurrentUnit,30);
    setTimeout(installForCurrentUnit,150);
    return result;
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(installForCurrentUnit,100)});
  else setTimeout(installForCurrentUnit,100);

  const style=document.createElement('style');
  style.textContent='.qos-problem-sort select{min-width:190px}.qos-problem-sort{background:linear-gradient(145deg,#10182a,#0c1220)}@media(max-width:700px){.qos-problem-sort .row>div:last-child{width:100%;min-width:0}.qos-problem-sort select{width:100%}}';
  document.head.appendChild(style);
})();
