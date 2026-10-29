(function(){
  function currentRound(mode){
    const links=(currentLinks||[]).filter(x=>x.mode===mode);
    return links.length ? Math.max(...links.map(x=>Number(x.round)||1)) : 1;
  }
  function roundLinks(mode){
    const r=currentRound(mode);
    return (currentLinks||[]).filter(x=>x.mode===mode && (Number(x.round)||1)===r);
  }
  function stats(mode){
    const links=(currentLinks||[]).filter(x=>x.mode===mode);
    const r=currentRound(mode);
    const rl=links.filter(x=>(Number(x.round)||1)===r);
    const untouched=rl.filter(x=>x.status==='pending' && (x.consecutive_wrong||0)===0).length;
    const wrongPending=rl.filter(x=>x.status==='pending' && (x.consecutive_wrong||0)>0).length;
    const done=rl.filter(x=>x.status==='completed').length;
    const aa=(attempts||[]).filter(a=>links.some(l=>l.problem_id===a.problem_id));
    const score=aa.reduce((sum,a)=>sum+attemptScore(a),0);
    const acc=aa.length?score/aa.length*100:0;
    const maxWrong=rl.reduce((m,l)=>Math.max(m,l.consecutive_wrong||0),0);
    return {round:r,total:rl.length,done,remaining:untouched,wrongPending,accuracy:acc,maxWrong};
  }

  window.modeStats=function(mode){
    const x=stats(mode);
    return {total:x.total,pending:x.remaining,accuracy:x.accuracy,maxWrong:x.maxWrong,round:x.round,done:x.done,wrongPending:x.wrongPending};
  };

  window.openSession=async function(id){
    const s=sessions.find(x=>x.id===id);
    if(!s)return;
    currentSession=s;
    const [l,a]=await Promise.all([
      sb.from('comprehensive_review_problems').select('id,problem_id,mode,status,consecutive_wrong,round,created_at,completed_at').eq('user_id',user.id).eq('session_id',id),
      sb.from('comprehensive_review_attempts').select('problem_id,result,answer_type,partial_correct,partial_total,created_at').eq('user_id',user.id).eq('session_id',id).order('created_at')
    ]);
    if(l.error||a.error){alert('総復習の読み込みに失敗しました');return;}
    currentLinks=l.data||[];attempts=a.data||[];currentMode=null;pendingWrongProblem=null;browserProblemId=null;
    document.getElementById('setup').classList.add('hidden');
    document.getElementById('activeSection').classList.add('hidden');
    document.getElementById('selectionSection').classList.add('hidden');
    document.getElementById('reviewSection').classList.add('hidden');
    document.getElementById('problemBrowserSection').classList.add('hidden');
    document.getElementById('addSection').classList.add('hidden');
    document.getElementById('modeSection').classList.remove('hidden');
    renderModes();
  };

  window.renderModes=function(){
    document.getElementById('modeSessionLabel').textContent=qName(currentSession.qualification_id)+' / '+sName(currentSession.subject_id);
    document.getElementById('modeSessionTitle').textContent='総復習';
    const c=['comprehensive','individual'];
    document.getElementById('modeCards').innerHTML=c.map(mode=>{
      const x=stats(mode);
      const label=mode==='comprehensive'?'📚 総合問題':'📝 個別問題';
      const desc=mode==='comprehensive'?'選択した問題。総合問題として繰り返し確認します。':'総合問題に選ばなかった問題。個別問題として確認します。';
      if(!x.total) return `<div class="mode-card"><h3>${label}</h3><div class="muted small">${desc}</div><div style="margin-top:10px"><strong>0</strong><span class="muted"> / 0問</span></div></div>`;
      return `<div class="mode-card" onclick="startMode('${mode}')"><h3>${label}</h3><div class="muted small">${desc}</div><div style="margin-top:10px"><strong>${x.remaining}</strong><span class="muted"> / ${x.total}問 ${x.round}周目まであと</span></div><div class="small" style="margin-top:6px">正解 ${x.done}問 ・ 誤答待ち ${x.wrongPending}問 ・ 正答率 ${x.accuracy.toFixed(0)}%</div><button class="primary" style="margin-top:12px">この箱をスタート</button></div>`;
    }).join('');
  };

  window.renderReview=function(){
    const x=stats(currentMode);
    const links=roundLinks(currentMode);
    const aa=(attempts||[]).filter(a=>links.some(l=>l.problem_id===a.problem_id));
    const score=aa.reduce((sum,a)=>sum+attemptScore(a),0);
    const acc=aa.length?score/aa.length*100:0;
    document.getElementById('sessionLabel').textContent=qName(currentSession.qualification_id)+' / '+sName(currentSession.subject_id)+' / '+(currentMode==='comprehensive'?'総合問題':'個別問題');
    document.getElementById('sessionTitle').textContent=(currentMode==='comprehensive'?'📚 総合問題':'📝 個別問題')+' ・ '+x.round+'周目';
    document.getElementById('targetCount').textContent=x.total+'問';
    document.getElementById('doneCount').textContent=x.done+'問';
    document.getElementById('pendingCount').textContent=x.remaining+'問';
    const label=document.querySelector('#pendingCount')?.parentElement?.querySelector('b');
    if(label)label.textContent=x.round+'周目まであと';
    document.getElementById('overallAccuracy').textContent=acc.toFixed(1)+'%';
    document.getElementById('progressBar').style.width=(x.total?(x.done/x.total*100):0)+'%';
    const sub=subjects.find(s=>s.id===currentSession.subject_id);
    document.getElementById('subjectStats').innerHTML=`<div class="subject-stat"><div class="top"><b>${esc(sub?.name||'科目')}</b><span class="pill">${currentMode==='comprehensive'?'総合':'個別'} ・ ${x.round}周目</span></div><div style="margin-top:7px"><strong>${x.accuracy.toFixed(1)}%</strong> <span class="muted small">正答率</span></div><div class="small" style="margin-top:5px"><span class="bad">誤答待ち ${x.wrongPending}問</span><span class="muted"> ・ ${x.total}問</span></div></div>`;
    renderProblemBrowser();
    const box=document.getElementById('currentProblem');
    if(browserProblemId){renderSelectedBrowserProblem();return;}
    if(!x.total || (x.remaining===0 && x.wrongPending===0)){
      box.innerHTML='<div class="problem" style="text-align:center"><h2>🎉 この周回は完了</h2><p class="muted">この周回の問題をすべて正解しました。</p><button class="primary" onclick="backToModes()">問題種別へ戻る</button></div>';
      return;
    }
    const link=links.find(l=>l.status==='pending' && (l.consecutive_wrong||0)===0) || links.find(l=>l.status==='pending');
    const p=problems.find(x=>x.id===link.problem_id);
    renderProblemCard(link,p,box);
  };

  window.renderProblemBrowser=function(){
    const sec=document.getElementById('problemBrowserSection');
    if(sec.classList.contains('hidden'))return;
    const box=document.getElementById('problemBrowserList');
    const links=roundLinks(currentMode).slice().sort((a,b)=>problemSort(problems.find(p=>p.id===a.problem_id)||{},problems.find(p=>p.id===b.problem_id)||{}));
    if(!links.length){box.innerHTML='<div class="empty">この周回には問題がありません。</div>';return;}
    box.innerHTML=links.map(l=>{
      const p=problems.find(x=>x.id===l.problem_id);
      const aa=attempts.filter(a=>a.problem_id===l.problem_id);
      const latest=aa.length?aa[aa.length-1]:null;
      const wrong=aa.filter(a=>a.result==='wrong').length;
      let status='pending',label='未実施';
      if(l.status==='completed'){status='done';label='✓ 正解済み';}
      else if(latest?.result==='wrong'){status='wrong';label='× 誤答';}
      const clickable=l.status!=='completed';
      return `<div class="browser-item ${clickable?'clickable':''}" ${clickable?`onclick="selectBrowserProblem('${l.problem_id}')"`:''} aria-disabled="${clickable?'false':'true'}"><span class="browser-name">問題 ${esc(p?.name||'—')}</span><span class="browser-meta"><span class="browser-status ${status}">${label}</span><br>${aa.length}回解答${wrong?` ・ 誤答${wrong}回`:''}${!clickable?'<br><span class="muted">この周回完了</span>':''}</span></div>`;
    }).join('');
  };

  window.reloadCurrentSession=async function(){
    const [l,a,s]=await Promise.all([
      sb.from('comprehensive_review_problems').select('id,problem_id,mode,status,consecutive_wrong,round,created_at,completed_at').eq('user_id',user.id).eq('session_id',currentSession.id),
      sb.from('comprehensive_review_attempts').select('problem_id,result,answer_type,partial_correct,partial_total,created_at').eq('user_id',user.id).eq('session_id',currentSession.id).order('created_at'),
      sb.from('comprehensive_review_sessions').select('id,qualification_id,subject_id,status,created_at,completed_at').eq('user_id',user.id).eq('id',currentSession.id).single()
    ]);
    if(l.error||a.error||s.error){alert('最新状態の取得に失敗しました');return;}
    currentLinks=l.data||[];attempts=a.data||[];currentSession=s.data;pendingWrongProblem=null;
    if(currentMode){
      const r=await sb.rpc('advance_comprehensive_review_round',{p_session_id:currentSession.id,p_mode:currentMode});
      if(r.error){alert('周回更新に失敗しました: '+r.error.message);return;}
      if(r.data?.advanced){
        const [nl,ns]=await Promise.all([
          sb.from('comprehensive_review_problems').select('id,problem_id,mode,status,consecutive_wrong,round,created_at,completed_at').eq('user_id',user.id).eq('session_id',currentSession.id),
          sb.from('comprehensive_review_sessions').select('id,qualification_id,subject_id,status,created_at,completed_at').eq('user_id',user.id).eq('id',currentSession.id).single()
        ]);
        if(nl.error||ns.error){alert('次の周回の読み込みに失敗しました');return;}
        currentLinks=nl.data||[];currentSession=ns.data;
      }
    }
    renderReview();
  };
})();
