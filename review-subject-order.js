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

// Passed-subject handling.
// The master UI displays 合格/不合格, while subjects.result stores passed/failed.
(function(){
  function syncResultLabels(){
    if(typeof subjects==='undefined')return;
    document.querySelectorAll('.q-sub-result[data-sub-id]').forEach(function(sel){
      const sub=subjects.find(function(x){return x.id===sel.dataset.subId});
      sel.value=sub?.result==='passed'?'合格':sub?.result==='failed'?'不合格':'';
    });
  }

  function filterPassed(){
    const s=document.getElementById('recordSubject');
    if(!s||typeof subjects==='undefined')return;
    [...s.options].forEach(function(o){
      const sub=subjects.find(function(x){return x.id===o.value});
      if(sub&&sub.result==='passed')o.remove();
    });
    if(!s.options.length){
      const o=document.createElement('option');
      o.value='';
      o.textContent='合格済みのため対象科目なし';
      s.appendChild(o);
    }
  }

  // IMPORTANT: save only the subject editor belonging to the qualification being saved.
  // The qualification master contains multiple qualifications on the same page.
  window.updateQualification=async function(id){
    const ta=document.getElementById('qs-'+id);
    const editor=ta?.previousElementSibling;
    if(!editor?.classList.contains('q-subject-tabs-editor')){
      alert('科目編集欄を読み込めませんでした。ページを更新してください。');
      return;
    }
    const name=document.getElementById('qn-'+id)?.value.trim();
    const exam_date=document.getElementById('qd-'+id)?.value||null;
    if(!name){alert('資格名を入力してください');return;}
    if(!currentUser?.id){alert('ログイン状態を確認してください。');return}

    const rows=[...editor.querySelectorAll('.q-sub-name[data-sub-id]')].map(function(input,index){
      const sid=input.dataset.subId;
      const result=editor.querySelector('.q-sub-result[data-sub-id="'+sid+'"]')?.value||null;
      return {id:sid,name:input.value.trim(),result:result,sort_order:index};
    }).filter(function(x){return x.name});

    const oldSubjects=subjects.filter(function(s){return s.qualification_id===id&&!s.archived});

    const qUpdate=await sb.from('qualifications').update({name:name,exam_date:exam_date}).eq('id',id).eq('user_id',currentUser.id);
    if(qUpdate.error){alert('資格の更新に失敗しました: '+qUpdate.error.message);return}

    const keepIds=[];
    for(let i=0;i<rows.length;i++){
      const row=rows[i];
      const dbResult=row.result==='合格'?'passed':row.result==='不合格'?'failed':null;
      const exists=oldSubjects.some(function(s){return s.id===row.id});
      const res=exists
        ? await sb.from('subjects').update({name:row.name,result:dbResult,sort_order:i,archived:false}).eq('id',row.id).eq('user_id',currentUser.id)
        : await sb.from('subjects').insert({user_id:currentUser.id,qualification_id:id,name:row.name,result:dbResult,sort_order:i,archived:false});
      if(res.error){alert('科目の保存に失敗しました: '+res.error.message);return}
      if(exists)keepIds.push(row.id);
      else if(res.data?.[0]?.id)keepIds.push(res.data[0].id);
    }

    const remove=oldSubjects.filter(function(s){return !keepIds.includes(s.id)});
    if(remove.length){
      const ar=await sb.from('subjects').update({archived:true}).in('id',remove.map(function(s){return s.id})).eq('user_id',currentUser.id);
      if(ar.error){alert('科目の更新に失敗しました: '+ar.error.message);return}
    }

    await loadAll();
    renderQualificationMasterInline();
    toast('資格を保存しました');
  };

  const originalRefresh=window.refreshSubjectSelect;
  if(typeof originalRefresh==='function'){
    window.refreshSubjectSelect=function(){originalRefresh.apply(this,arguments);filterPassed()};
    setTimeout(filterPassed,0);
  }

  const observer=new MutationObserver(syncResultLabels);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(syncResultLabels,0);
})();
