(function(){
  function scoreOf(a){return typeof window.attemptScore==='function'?window.attemptScore(a):(a?.result==='correct'?1:0);}
  function subjectName(id){return typeof window.sName==='function'?window.sName(id):(subjects.find(s=>s.id===id)?.name||'科目');}
  function qualificationName(id){return typeof window.qName==='function'?window.qName(id):(qualifications.find(q=>q.id===id)?.name||'資格');}
  function escRank(s){return typeof window.esc==='function'?window.esc(s):String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));}

  async function loadRanking(){
    if(!user)return;
    const box=ensureBox();
    if(!box)return;
    const {data:sess,error:se}=await sb.from('comprehensive_review_sessions')
      .select('id,qualification_id,subject_id,status,created_at,completed_at')
      .eq('user_id',user.id)
      .order('created_at',{ascending:false});
    if(se){console.warn('総復習ランキング取得失敗',se);return;}
    const sessionsAll=sess||[];
    if(!sessionsAll.length){render([]);return;}

    // 同一科目に複数の総復習がある場合は、最新のセッションだけをランキング対象にする。
    const latestBySubject=new Map();
    sessionsAll.forEach(s=>{if(!latestBySubject.has(s.subject_id))latestBySubject.set(s.subject_id,s);});
    const list=[...latestBySubject.values()];
    const ids=list.map(x=>x.id);

    const [pr,at]=await Promise.all([
      sb.from('comprehensive_review_problems')
        .select('session_id,problem_id,mode,status,round')
        .eq('user_id',user.id).in('session_id',ids),
      sb.from('comprehensive_review_attempts')
        .select('session_id,problem_id,result,answer_type,partial_correct,partial_total,round,created_at')
        .eq('user_id',user.id).in('session_id',ids).order('created_at')
    ]);
    if(pr.error||at.error){console.warn('総復習ランキング明細取得失敗',pr.error||at.error);return;}

    const subjectMap=new Map(subjects.map(s=>[s.id,s]));
    const qualificationOrder=new Map(qualifications.map((q,i)=>[q.id,Number(q.sort_order??i)]));
    const rows=[];
    const attemptsBySession=new Map();
    (at.data||[]).forEach(a=>{
      if(!attemptsBySession.has(a.session_id))attemptsBySession.set(a.session_id,[]);
      attemptsBySession.get(a.session_id).push(a);
    });

    list.forEach(s=>{
      const aa=attemptsBySession.get(s.id)||[];
      const byRound=new Map();
      aa.forEach(a=>{
        const round=Math.max(1,Number(a.round)||1);
        if(!byRound.has(round))byRound.set(round,[]);
        byRound.get(round).push(a);
      });
      byRound.forEach((arr,round)=>{
        const score=arr.reduce((sum,a)=>sum+scoreOf(a),0);
        rows.push({
          qualificationId:s.qualification_id,
          qualification:qualificationName(s.qualification_id),
          qualificationOrder:qualificationOrder.get(s.qualification_id)??999999,
          subjectId:s.subject_id,
          subject:subjectName(s.subject_id),
          subjectOrder:Number(subjectMap.get(s.subject_id)?.sort_order??999999),
          round,
          accuracy:score/arr.length*100,
          answers:arr.length,
          wrong:arr.filter(a=>a.result==='wrong').length,
          status:s.status
        });
      });
    });
    render(rows);
  }

  function ensureBox(){
    let box=document.getElementById('roundRanking');
    if(box)return box;
    const active=document.getElementById('activeSection');
    const sessionsList=document.getElementById('sessionsList');
    if(!active||!sessionsList)return null;
    box=document.createElement('section');
    box.id='roundRanking';
    box.style.margin='12px 0 18px';
    active.insertBefore(box,sessionsList);
    return box;
  }

  function render(rows){
    const box=ensureBox();
    if(!box)return;
    if(!rows.length){
      box.innerHTML='<div class="empty"><b>🏆 周回ランキング</b><div class="muted small" style="margin-top:6px">まだ回答結果がありません。</div></div>';
      return;
    }

    const qualificationsById=new Map();
    rows.forEach(x=>{if(!qualificationsById.has(x.qualificationId))qualificationsById.set(x.qualificationId,x.qualification);});
    const groups=[...new Set(rows.map(x=>x.qualificationId))]
      .sort((a,b)=>{const ao=rows.find(x=>x.qualificationId===a)?.qualificationOrder??999999;const bo=rows.find(x=>x.qualificationId===b)?.qualificationOrder??999999;return ao-bo;});

    box.innerHTML=`<div class="card" style="margin:0"><div class="row" style="justify-content:space-between"><div><h3 style="margin:0">🏆 周回ランキング</h3><div class="muted small" style="margin-top:4px">各資格の最新の総復習を、周回ごとに正答率の低い順で表示</div></div><button class="light" onclick="loadComprehensiveReviewRanking()">↻ 更新</button></div>${groups.map(qid=>{
      const qRows=rows.filter(x=>x.qualificationId===qid);
      const rounds=[...new Set(qRows.map(x=>x.round))].sort((a,b)=>a-b);
      return `<div style="margin-top:16px"><div style="font-weight:900;font-size:16px">${escRank(qualificationsById.get(qid)||'資格')}</div>${rounds.map(round=>{
        const data=qRows.filter(x=>x.round===round).sort((a,b)=>a.accuracy-b.accuracy||b.answers-a.answers||a.subjectOrder-b.subjectOrder);
        return `<div style="margin-top:12px"><div class="row" style="justify-content:space-between"><b>${round}周目</b><span class="muted small">${data.length}科目</span></div><div style="margin-top:5px">${data.map((x,i)=>{
          const prev=qRows.find(y=>y.subjectId===x.subjectId&&y.round===round-1);
          const diff=prev?x.accuracy-prev.accuracy:null;
          const change=diff===null?'':`<span class="${diff>=0?'good':'bad'}" style="margin-left:8px">${diff>=0?'↑':'↓'} ${Math.abs(diff).toFixed(1)}pt</span>`;
          return `<div style="display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)"><b>${i+1}</b><div><b>${escRank(x.subject)}</b><div class="muted small">${x.answers}回解答 ・ 誤答 ${x.wrong}回${change}</div></div><strong>${x.accuracy.toFixed(1)}%</strong></div>`;
        }).join('')}</div></div>`;
      }).join('')}</div>`;
    }).join('')}</div>`;
  }

  window.loadComprehensiveReviewRanking=loadRanking;
  window.renderRoundRanking=render;

  const originalRenderSessions=window.renderSessions;
  window.renderSessions=function(){
    if(originalRenderSessions)originalRenderSessions();
    loadRanking();
  };

  // 初回ロードでは init() → loadBase() → renderSessions() が先に走るため、
  // モジュール読込直後にも一度だけランキング取得を試す。
  let tries=0;
  const boot=setInterval(()=>{
    if(user){loadRanking();clearInterval(boot);}
    if(++tries>30)clearInterval(boot);
  },200);
})();
