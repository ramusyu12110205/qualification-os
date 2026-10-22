(function(){
  const URL='https://txprypfzdsfaupguhybl.supabase.co';
  const KEY='sb_publishable_qiCaP0cBNhms5-usSDzKlQ_nywzlU36';
  let subjectOrder=new Map();
  let subjectNameOrder=new Map();
  async function loadOrder(){
    try{
      const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data:{session}}=await client.auth.getSession();if(!session?.user)return false;
      const {data,error}=await client.from('subjects').select('id,name,created_at,sort_order').eq('user_id',session.user.id).eq('archived',false).order('created_at',{ascending:true});
      if(error)return false;subjectOrder=new Map((data||[]).map((s,i)=>[String(s.id),i]));subjectNameOrder=new Map((data||[]).map((s,i)=>[String(s.name||''),i]));return true;
    }catch(e){return false}
  }
  function sortReviewSubjectGroups(){
    const list=document.getElementById('reviewList');if(!list||!subjectOrder.size)return;const groups=[...list.querySelectorAll(':scope > details')];if(groups.length<2)return;
    const getOrder=(el)=>{const id=el.dataset.subjectId||el.getAttribute('data-subject-id');if(id&&subjectOrder.has(String(id)))return subjectOrder.get(String(id));const summary=el.querySelector('summary')?.textContent||'';let best=999999;for(const [name,idx] of subjectNameOrder)if(name&&summary.includes(name))best=Math.min(best,idx);return best};
    const sorted=[...groups].sort((a,b)=>getOrder(a)-getOrder(b));if(sorted.some((el,i)=>el!==groups[i])){const frag=document.createDocumentFragment();sorted.forEach(el=>frag.appendChild(el));list.appendChild(frag)}
  }
  let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sortReviewSubjectGroups()})}
  async function init(){const list=document.getElementById('reviewList');if(!list)return false;if(!subjectOrder.size&&!await loadOrder())return false;sortReviewSubjectGroups();if(!list.__subjectOrderObserver){const observer=new MutationObserver(schedule);observer.observe(list,{childList:true,subtree:true});list.__subjectOrderObserver=observer}return true}
  let tries=0;const timer=setInterval(async()=>{tries++;if(await init()||tries>=30)clearInterval(timer)},500);window.addEventListener('load',()=>setTimeout(init,300));
})();

// Passed-subject handling: DB uses passed/failed, UI uses Japanese labels.
(function(){
  function syncResultLabels(){
    if(typeof subjects==='undefined')return;
    document.querySelectorAll('.q-sub-result[data-sub-id]').forEach(function(sel){
      const sub=subjects.find(function(x){return x.id===sel.dataset.subId});
      if(sub?.result==='passed')sel.value='合格';
      else if(sub?.result==='failed')sel.value='不合格';
      else sel.value='';
    });
  }
  function filterPassed(){
    const s=document.getElementById('recordSubject');if(!s||typeof subjects==='undefined')return;
    [...s.options].forEach(function(o){const sub=subjects.find(function(x){return x.id===o.value});if(sub&&sub.result==='passed')o.remove()});
    if(!s.options.length){const o=document.createElement('option');o.value='';o.textContent='合格済みのため対象科目なし';s.appendChild(o)}
  }
  const originalRefresh=window.refreshSubjectSelect;
  if(typeof originalRefresh==='function'){
    window.refreshSubjectSelect=function(){originalRefresh.apply(this,arguments);filterPassed()};
    setTimeout(filterPassed,0);
  }
  const originalUpdate=window.updateQualification;
  if(typeof originalUpdate==='function'){
    window.updateQualification=async function(id){
      const root=document.getElementById('panel-qualification');
      if(root)root.querySelectorAll('.q-sub-result').forEach(function(sel){if(sel.value==='合格')sel.value='passed';else if(sel.value==='不合格')sel.value='failed'});
      try{return await originalUpdate.apply(this,arguments)}finally{syncResultLabels()}
    };
  }
  const observer=new MutationObserver(syncResultLabels);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(syncResultLabels,0);
})();
