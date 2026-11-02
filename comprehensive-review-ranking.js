(function(){
  function scoreOf(a){return typeof window.attemptScore==='function'?window.attemptScore(a):(a?.result==='correct'?1:0);}
  function subjectName(id){return typeof window.sName==='function'?window.sName(id):(subjects.find(s=>s.id===id)?.name||'科目');}
  function qualificationName(id){return typeof window.qName==='function'?window.qName(id):(qualifications.find(q=>q.id===id)?.name||'資格');}
  function escRank(s){return typeof window.esc==='function'?window.esc(s):String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));}
  async function loadRanking(){
    if(!currentSession||!user)return;
    const qualificationId=currentSession.qualification_id;
    const {data:sess,error:se}=await sb.from('comprehensive_review_sessions').select('id,qualification_id,subject_id,status,created_at,completed_at').eq('user_id',user.id).eq('qualification_id',qualificationId);
    if(se){console.warn('総復習ランキング取得失敗',se);return;}
    const list=sess||[];
    if(!list.length){render([]);return;}
    const ids=list.map(x=>x.id);
    const [pr,at]=await Promise.all([
      sb.from('comprehensive_review_problems').select('session_id,problem_id,mode,status,round').eq('user_id',user.id).in('session_id',ids),
      sb.from('comprehensive_review_attempts').select('session_id,problem_id,result,answer_type,partial_correct,partial_total,created_at').eq('user_id',user.id).in('session_id',ids).order('created_at')
    ]);
    if(pr.error||at.error){console.warn('総復習ランキング明細取得失敗',pr.error||at.error);return;}
    const problemsBySession=new Map();(pr.data||[]).forEach(x=>{if(!problemsBySession.has(x.session_id))problemsBySession.set(x.session_id,[]);problemsBySession.get(x.session_id).push(x);});
    const attemptsBySession=new Map();(at.data||[]).forEach(x=>{if(!attemptsBySession.has(x.session_id))attemptsBySession.set(x.session_id,[]);attemptsBySession.get(x.session_id).push(x);});
    const rows=[];
    list.forEach(s=>{
      const links=problemsBySession.get(s.id)||[],aa=attemptsBySession.get(s.id)||[],rounds=new Set(links.map(x=>Number(x.round)||1));
      rounds.forEach(round=>{
        const idsForRound=new Set(links.filter(x=>(Number(x.round)||1)===round).map(x=>x.problem_id));
        const attemptsForRound=aa.filter(x=>idsForRound.has(x.problem_id));
        if(!attemptsForRound.length)return;
        const score=attemptsForRound.reduce((sum,a)=>sum+scoreOf(a),0);
        rows.push({subjectId:s.subject_id,subject:subjectName(s.subject_id),round,accuracy:score/attemptsForRound.length*100,answers:attemptsForRound.length,wrong:attemptsForRound.filter(a=>a.result==='wrong').length,status:s.status});
      });
    });
    render(rows);
  }
  function render(rows){
    let box=document.getElementById('roundRanking');
    if(!box){const modeCards=document.getElementById('modeCards');if(!modeCards)return;box=document.createElement('section');box.id='roundRanking';box.style.marginTop='18px';modeCards.parentElement.appendChild(box);}
    const rounds=[...new Set(rows.map(x=>x.round))].sort((a,b)=>a-b);
    if(!rounds.length){box.innerHTML='<div class="empty"><b>周回ランキング</b><div class="muted small" style="margin-top:6px">まだランキングに表示できる回答結果がありません。</div></div>';return;}
    const latestBySubjectRound=new Map();rows.forEach(x=>latestBySubjectRound.set(`${x.subjectId}|${x.round}`,x));
    box.innerHTML=`<div class="card" style="margin:0"><div class="row" style="justify-content:space-between"><div><h3 style="margin:0">🏆 周回ランキング</h3><div class="muted small" style="margin-top:4px">${escRank(qualificationName(currentSession.qualification_id))}の総復習を、周回ごとに正答率の低い順で表示</div></div><button class="light" onclick="loadComprehensiveReviewRanking()">↻ 更新</button></div>${rounds.map(round=>{const data=[...latestBySubjectRound.values()].filter(x=>x.round===round).sort((a,b)=>a.accuracy-b.accuracy||b.answers-a.answers);return `<div style="margin-top:16px"><div class="row" style="justify-content:space-between"><b>${round}周目</b><span class="muted small">${data.length}科目</span></div><div style="margin-top:7px">${data.map((x,i)=>{const prev=latestBySubjectRound.get(`${x.subjectId}|${round-1}`),diff=prev?x.accuracy-prev.accuracy:null,change=diff===null?'':`<span class="${diff>=0?'good':'bad'}" style="margin-left:8px">${diff>=0?'↑':'↓'} ${Math.abs(diff).toFixed(1)}pt</span>`;return `<div style="display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)"><b>${i+1}</b><div><b>${escRank(x.subject)}</b><div class="muted small">${x.answers}回解答 ・ 誤答 ${x.wrong}回${change}</div></div><strong>${x.accuracy.toFixed(1)}%</strong></div>`;}).join('')}</div></div>`;}).join('')}</div>`;
  }
  window.loadComprehensiveReviewRanking=loadRanking;
  window.renderRoundRanking=render;
  const originalRenderModes=window.renderModes;
  window.renderModes=function(){if(originalRenderModes)originalRenderModes();loadRanking();};
})();
