(function(){
  let priorityRows=[];
  let priorityIds=new Set();
  let priorityLoadedUserId=null;
  let originalStartReview=null;
  let originalFinishReviewSession=null;
  const q=(s)=>document.querySelector(s);
  const escP=(s)=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const subjectOf=(p)=>subjects.find(s=>s.id===p.subject_id);
  const qualOf=(s)=>qualifications.find(x=>x.id===s?.qualification_id);

  function ensurePriorityPanel(){
    const host=q('#tab-review'); if(!host)return null;
    let panel=q('#priorityReviewPanel');
    if(!panel){
      panel=document.createElement('section');
      panel.id='priorityReviewPanel';
      panel.className='priority-card';
      const reviewMain=host.querySelector('.review-v2') || host.firstElementChild;
      if(reviewMain) reviewMain.parentNode.insertBefore(panel,reviewMain.nextSibling);
      else host.prepend(panel);
    }
    return panel;
  }

  async function loadPriority(){
    const panel=ensurePriorityPanel();
    if(!panel)return;
    if(!currentUser){
      priorityLoadedUserId=null;
      panel.innerHTML='<div class="priority-head"><div><div class="priority-title">⭐ 今日やる</div><div class="muted small">ログイン後に、先にやっておきたい問題をストックできます。</div></div></div>';
      return;
    }
    const {data,error}=await sb.from('review_priority_queue').select('id,problem_id,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:false});
    if(error){
      priorityLoadedUserId=null;
      console.error('review_priority_queue load error',error);
      panel.innerHTML='<div class="priority-head"><div><div class="priority-title">⭐ 今日やる</div><div class="muted small">優先復習を読み込めませんでした。ページを再読み込みしてください。</div></div></div>';
      return;
    }
    priorityRows=data||[];
    priorityIds=new Set(priorityRows.map(x=>x.problem_id));
    priorityLoadedUserId=currentUser.id;
    renderPriorityPanel();
  }

  function injectStyles(){
    if(q('#priorityReviewStyles'))return;
    const st=document.createElement('style');st.id='priorityReviewStyles';st.textContent=`
      .priority-card{border:1px solid #3b3265;background:linear-gradient(145deg,rgba(38,24,70,.88),rgba(14,19,34,.98));border-radius:20px;padding:18px;margin:14px 0}
      .priority-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.priority-title{font-size:19px;font-weight:950}.priority-count{font-size:13px;color:#d9ccff;background:#2a1d50;border:1px solid #513b86;border-radius:999px;padding:5px 10px}
      .priority-empty{padding:12px 0;color:#98a3bf}.priority-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.priority-item{display:flex;gap:10px;align-items:center;border:1px solid #303b59;border-radius:13px;padding:10px;background:#0d1424}.priority-item input{width:auto;min-height:0}.priority-meta{font-size:11px;color:#8f9ab7;margin-top:3px}
      .priority-modal-list{max-height:55vh;overflow:auto;margin-top:10px}.priority-group{margin:10px 0}.priority-group h4{margin:0 0 7px;color:#dce3fb}.priority-modal-item{display:flex;gap:10px;align-items:center;padding:9px 10px;border:1px solid #293653;border-radius:11px;margin:6px 0;background:#0d1424}.priority-modal-item input{width:auto;min-height:0}.priority-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      @media(max-width:700px){.priority-list{grid-template-columns:1fr}.priority-card{padding:15px}}
    `;document.head.appendChild(st);
  }

  function renderPriorityPanel(){
    const panel=ensurePriorityPanel(); if(!panel)return;
    const ps=priorityRows.map(r=>problems.find(p=>p.id===r.problem_id)).filter(Boolean);
    panel.innerHTML=`<div class="priority-head"><div><div class="priority-title">⭐ 今日やる</div><div class="muted small">先にやっておきたい問題をストック</div></div><span class="priority-count">${ps.length}問</span></div>
      <div class="priority-actions"><button class="primary" onclick="window.openPriorityPicker()">＋ 問題を追加</button>${ps.length?`<button class="light" onclick="window.startPriorityReview()">今日やる問題を復習</button><button class="light" onclick="window.clearPriorityQueue()">すべて解除</button>`:''}</div>
      ${ps.length?`<div class="priority-list">${ps.map(p=>{const s=subjectOf(p),qf=qualOf(s);return `<div class="priority-item"><input type="checkbox" checked onchange="window.togglePriority('${p.id}',this.checked)"><div><b>${escP(p.name)}</b><div class="priority-meta">${escP(qf?.name||'資格')} / ${escP(s?.name||'科目')}</div></div></div>`}).join('')}</div>`:'<div class="priority-empty">まだありません。「＋ 問題を追加」から、今日やる問題を先に選んでおけます。</div>'}`;
  }

  window.addSelectedToPriority=async()=>{
    if(!currentUser){alert('ログインしてください。');return;}
    const selected=[...document.querySelectorAll('.dueCheck:checked')].map(x=>x.dataset.id).filter(Boolean);
    if(!selected.length){if(typeof toast==='function')toast('ストックする問題を選択してください');else alert('ストックする問題を選択してください');return;}
    const rows=selected.map(problem_id=>({user_id:currentUser.id,problem_id}));
    const {error}=await sb.from('review_priority_queue').upsert(rows,{onConflict:'user_id,problem_id'});
    if(error){alert(error.message);return;}
    await loadPriority();
    if(typeof toast==='function')toast(`${selected.length}問を「今日やる」に追加しました`);else alert(`${selected.length}問を「今日やる」に追加しました`);
  };

  window.openPriorityPicker=()=>{
    let modal=q('#priorityPickerModal');
    if(!modal){modal=document.createElement('div');modal.id='priorityPickerModal';modal.className='modal';document.body.appendChild(modal);}
    const pending=problems.filter(p=>p.status==='pending');
    const grouped={};pending.forEach(p=>(grouped[p.subject_id]??=[]).push(p));
    Object.values(grouped).forEach(arr=>arr.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ja',{numeric:true,sensitivity:'base'})));
    modal.innerHTML=`<div class="modal-box"><div class="sectiontitle"><div><h2>⭐ 今日やる問題を選ぶ</h2><div class="muted small">期限に関係なく、先にやっておきたい問題をストックできます。</div></div><button class="light" onclick="window.closePriorityPicker()">閉じる</button></div>
      <div class="priority-actions"><button class="light" onclick="window.selectPriorityVisible(true)">表示中を全選択</button><button class="light" onclick="window.selectPriorityVisible(false)">表示中を全解除</button></div>
      <div class="priority-modal-list">${Object.entries(grouped).map(([sid,arr])=>{const s=subjectOf(arr[0]),qf=qualOf(s);return `<div class="priority-group"><h4>${escP(qf?.name||'資格')} / ${escP(s?.name||'科目')}（${arr.length}問）</h4>${arr.map(p=>`<label class="priority-modal-item"><input class="priorityPick" type="checkbox" data-id="${p.id}" ${priorityIds.has(p.id)?'checked':''}><span><b>${escP(p.name)}</b><span class="priority-meta">${p.next_review_date?'次回 '+escP(fmt(p.next_review_date)):'未設定'}</span></span></label>`).join('')}</div>`}).join('')||'<div class="item">登録済みの問題がありません。</div>'}</div>
      <div class="priority-actions"><button class="primary" onclick="window.savePriorityQueue()">この選択をストック</button><button class="light" onclick="window.closePriorityPicker()">キャンセル</button></div></div>`;
    modal.classList.add('open');
  };
  window.closePriorityPicker=()=>q('#priorityPickerModal')?.classList.remove('open');
  window.selectPriorityVisible=(v)=>q('#priorityPickerModal')?.querySelectorAll('.priorityPick').forEach(x=>x.checked=v);
  window.savePriorityQueue=async()=>{
    const selected=[...q('#priorityPickerModal').querySelectorAll('.priorityPick:checked')].map(x=>x.dataset.id);
    const {error:delError}=await sb.from('review_priority_queue').delete().eq('user_id',currentUser.id);
    if(delError){alert(delError.message);return}
    if(selected.length){const {error:insError}=await sb.from('review_priority_queue').insert(selected.map(problem_id=>({user_id:currentUser.id,problem_id})));if(insError){alert(insError.message);return}}
    await loadPriority();window.closePriorityPicker();if(typeof toast==='function')toast('今日やる問題を更新しました');
  };
  window.togglePriority=async(id,on)=>{
    const result=on
      ? await sb.from('review_priority_queue').upsert({user_id:currentUser.id,problem_id:id},{onConflict:'user_id,problem_id'})
      : await sb.from('review_priority_queue').delete().eq('user_id',currentUser.id).eq('problem_id',id);
    if(result.error)alert(result.error.message);
    await loadPriority();
  };
  window.clearPriorityQueue=async()=>{if(!confirm('今日やる問題をすべて解除しますか？'))return;const {error}=await sb.from('review_priority_queue').delete().eq('user_id',currentUser.id);if(error){alert(error.message);return}await loadPriority();};

  function openPrioritySubjectPicker(groups){
    let modal=q('#prioritySubjectPickerModal');
    if(!modal){modal=document.createElement('div');modal.id='prioritySubjectPickerModal';modal.className='modal';document.body.appendChild(modal);}
    modal.innerHTML=`<div class="modal-box"><div class="sectiontitle"><div><h2>⭐ 今日やる問題</h2><div class="muted small">復習時間を正しく記録するため、今回は科目ごとに復習します。</div></div><button class="light" onclick="window.closePrioritySubjectPicker()">閉じる</button></div>${groups.map(g=>`<button class="item clickable" style="display:block;width:100%;text-align:left" onclick="window.startPrioritySubjectReview('${g.subjectId}')"><b>${escP(g.qualificationName)} / ${escP(g.subjectName)}</b><br><span class="muted small">${g.ids.length}問</span></button>`).join('')}</div>`;
    modal.classList.add('open');
    window._prioritySubjectGroups=groups;
  }
  window.closePrioritySubjectPicker=()=>q('#prioritySubjectPickerModal')?.classList.remove('open');
  window.startPrioritySubjectReview=(subjectId)=>{
    const g=(window._prioritySubjectGroups||[]).find(x=>x.subjectId===subjectId);if(!g)return;
    window.closePrioritySubjectPicker();reviewSelectedIds.clear();g.ids.forEach(id=>reviewSelectedIds.add(id));originalStartReview();
  };

  window.startPriorityReview=()=>{
    const ids=priorityRows.map(r=>r.problem_id).filter(id=>problems.some(p=>p.id===id));
    if(!ids.length){if(typeof toast==='function')toast('今日やる問題がありません');return}
    const groups=[];const by={};
    ids.forEach(id=>{const p=problems.find(x=>x.id===id),s=subjectOf(p),qf=qualOf(s);if(!by[p.subject_id])by[p.subject_id]={subjectId:p.subject_id,qualificationName:qf?.name||'資格',subjectName:s?.name||'科目',ids:[]};by[p.subject_id].ids.push(id)});
    groups.push(...Object.values(by));
    if(groups.length>1){openPrioritySubjectPicker(groups);return}
    reviewSelectedIds.clear();ids.forEach(id=>reviewSelectedIds.add(id));
    originalStartReview();
  };

  async function cleanupCompletedPriority(ids){
    const done=[...new Set(ids||[])].filter(id=>priorityIds.has(id));
    if(!done.length||!currentUser)return;
    await sb.from('review_priority_queue').delete().eq('user_id',currentUser.id).in('problem_id',done);
    await loadPriority();
  }

  const wrap=()=>{
    if(window.startReview&&!originalStartReview)originalStartReview=window.startReview;
    if(window.finishReviewSession&&!originalFinishReviewSession){
      originalFinishReviewSession=window.finishReviewSession;
      window.finishReviewSession=async function(){
        const ids=(reviewQueue||[]).map(p=>p.id);
        await originalFinishReviewSession();
        if(!(q('#timeModal')?.classList.contains('open')) && !(reviewQueue||[]).length)await cleanupCompletedPriority(ids);
      };
    }
  };
  window.addEventListener('load',()=>{injectStyles();ensurePriorityPanel();loadPriority();});
  setInterval(()=>{wrap();if(currentUser&&priorityLoadedUserId!==currentUser.id)loadPriority();else if(!q('#priorityReviewPanel')){injectStyles();loadPriority();}},500);
})();