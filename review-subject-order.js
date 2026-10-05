(function(){
  function sortReviewSubjectGroups(){
    const list=document.getElementById('reviewList');
    if(!list||!Array.isArray(window.subjects))return;
    const order=new Map(window.subjects.map((s,i)=>[String(s.id),i]));
    const nameOrder=new Map(window.subjects.map((s,i)=>[String(s.name||''),i]));
    const groups=[...list.querySelectorAll(':scope > details')];
    if(groups.length<2)return;
    const getOrder=(el)=>{
      const id=el.dataset.subjectId||el.getAttribute('data-subject-id');
      if(id&&order.has(String(id)))return order.get(String(id));
      const text=el.querySelector('summary')?.textContent||'';
      let best=999999;
      for(const [name,i] of nameOrder){if(name&&text.includes(name)){best=Math.min(best,i);}}
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

  function init(){
    const list=document.getElementById('reviewList');
    if(!list)return false;
    sortReviewSubjectGroups();
    if(!list.__subjectOrderObserver){
      const observer=new MutationObserver(schedule);
      observer.observe(list,{childList:true,subtree:true});
      list.__subjectOrderObserver=observer;
    }
    return true;
  }

  const timer=setInterval(()=>{if(init()){clearInterval(timer);}},500);
  window.addEventListener('load',()=>{setTimeout(init,100);});
})();
