(function(){
  const URL='https://txprypfzdsfaupguhybl.supabase.co';
  const KEY='sb_publishable_qiCaP0cBNhms5-usSDzKlQ_nywzlU36';
  let subjectOrder=new Map();
  let subjectNameOrder=new Map();
  async function loadOrder(){
    try{
      const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data:{session}}=await client.auth.getSession();if(!session?.user)return false;
      const {data,error}=await client.from('subjects').select('id,name,created_at,sort_order,qualification_id').eq('user_id',session.user.id).eq('archived',false).order('sort_order',{ascending:true}).order('name',{ascending:true});
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

  // 記録画面：内容を変更しても、直前に選択していた科目を保持する。
  // activityType の変更時に refreshSubjectSelect が科目を先頭へ戻すケースを防ぐ。
  let rememberedSubjectId=null;
  function getSubjectSelect(){return document.getElementById('recordSubject')}
  function rememberSubject(){const s=getSubjectSelect();if(s?.value)rememberedSubjectId=s.value}
  function restoreSubject(){
    const s=getSubjectSelect();
    if(!s||!rememberedSubjectId)return;
    if([...s.options].some(o=>String(o.value)===String(rememberedSubjectId))){
      s.value=rememberedSubjectId;
    }
  }
  document.addEventListener('change',function(e){
    if(e.target?.id==='recordQualification'){
      rememberedSubjectId=null;
      setTimeout(rememberSubject,0);
      return;
    }
    if(e.target?.id==='recordSubject'){
      rememberSubject();
      return;
    }
    if(e.target?.id==='activityType'){
      const before=getSubjectSelect()?.value||rememberedSubjectId;
      if(before)rememberedSubjectId=before;
      setTimeout(restoreSubject,0);
      setTimeout(restoreSubject,50);
      setTimeout(restoreSubject,200);
    }
  },true);
  setTimeout(()=>{rememberSubject()},300);
})();
