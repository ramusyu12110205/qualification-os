(function(){
  const URL='https://txprypfzdsfaupguhybl.supabase.co';
  const KEY='sb_publishable_qiCaP0cBNhms5-usSDzKlQ_nywzlU36';
  let subjectOrder=new Map();
  let qualificationOrder=new Map();

  async function loadOrder(){
    try{
      const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data:{session}}=await client.auth.getSession();
      if(!session?.user)return false;
      const uid=session.user.id;
      const [qRes,sRes]=await Promise.all([
        client.from('qualifications').select('id,created_at,sort_order').eq('user_id',uid).eq('archived',false).order('created_at',{ascending:true}),
        client.from('subjects').select('id,qualification_id,name,created_at,sort_order').eq('user_id',uid).eq('archived',false).order('created_at',{ascending:true})
      ]);
      if(qRes.error||sRes.error)return false;

      qualificationOrder=new Map((qRes.data||[]).map((q,i)=>[String(q.id),i]));
      subjectOrder=new Map((sRes.data||[]).map((s,i)=>[String(s.id),i]));
      return true;
    }catch(e){return false}
  }

  function sortReviewSubjectGroups(){
    const list=document.getElementById('reviewList');
    if(!list||!subjectOrder.size)return;
    const groups=[...list.querySelectorAll(':scope > details')];
    if(groups.length<2)return;

    const getOrder=(el)=>{
      const id=el.dataset.subjectId||el.getAttribute('data-subject-id');
      if(id&&subjectOrder.has(String(id)))return subjectOrder.get(String(id));
      const summary=el.querySelector('summary')?.textContent||'';
      let best=999999;
      for(const [sid,idx] of subjectOrder){
        const subjectName=window.__qualificationOsSubjectNames?.[sid];
        if(subjectName&&summary.includes(subjectName))best=Math.min(best,idx);
      }
      return best;
    };

    const sorted=[...groups].sort((a,b)=>getOrder(a)-getOrder(b));
    if(sorted.some((el,i)=>el!==groups[i])){
      const frag=document.createDocumentFragment();
      sorted.forEach(el=>frag.appendChild(el));
      list.appendChild(frag);
    }
  }

  let scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;sortReviewSubjectGroups();});
  }

  async function init(){
    const list=document.getElementById('reviewList');
    if(!list)return false;
    if(!subjectOrder.size){
      const ok=await loadOrder();
      if(!ok)return false;
    }
    sortReviewSubjectGroups();
    if(!list.__subjectOrderObserver){
      const observer=new MutationObserver(schedule);
      observer.observe(list,{childList:true,subtree:true});
      list.__subjectOrderObserver=observer;
    }
    return true;
  }

  let tries=0;
  const timer=setInterval(async()=>{
    tries++;
    if(await init()||tries>=30)clearInterval(timer);
  },500);
  window.addEventListener('load',()=>setTimeout(init,300));
})();
