/* 資格OS 総復習ランキング */
(function(){
  function score(a){
    if(a.result==='correct') return 1;
    if(a.answer_type==='selection' && Number(a.partial_total)>0) return Math.max(0,Math.min(1,Number(a.partial_correct||0)/Number(a.partial_total)));
    return 0;
  }
  function escText(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));}

  function box(){
    let el=document.getElementById('roundRanking');
    if(el)return el;
    const active=document.getElementById('activeSection');
    if(!active)return null;
    el=document.createElement('section');
    el.id='roundRanking';
    el.className='card';
    el.style.margin='14px 0';
    active.parentNode.insertBefore(el,active);
    return el;
  }

  async function render(){
    const el=box();
    if(!el || !window.user || !window.sb)return;
    el.innerHTML='<div class="muted small">🏆 周回ランキングを読み込み中…</div>';

    const {data:sessions,error:se}=await sb.from('comprehensive_review_sessions')
      .select('id,qualification_id,subject_id,status,created_at,completed_at')
      .eq('user_id',user.id)
      .order('created_at',{ascending:false});
    if(se){
      console.error('総復習ランキング: sessions取得失敗',se);
      el.innerHTML='<div><b>🏆 周回ランキング</b><div class="muted small" style="margin-top:6px">ランキングを取得できませんでした。</div></div>';
      return;
    }
    const list=sessions||[];
    if(!list.length){
      el.innerHTML='<div><b>🏆 周回ランキング</b><div class="muted small" style="margin-top:6px">まだ回答結果がありません。</div></div>';
      return;
    }

    // 科目ごとに最新セッションだけを採用
    const latest=new Map();
    list.forEach(s=>{if(!latest.has(s.subject_id))latest.set(s.subject_id,s);});
    const target=[...latest.values()];
    const ids=target.map(s=>s.id);
    const {data:attemptRows,error:ae}=await sb.from('comprehensive_review_attempts')
      .select('session_id,problem_id,result,answer_type,partial_correct,partial_total,round,created_at')
      .eq('user_id',user.id)
      .in('session_id',ids)
      .order('created_at');
    if(ae){
      console.error('総復習ランキング: attempts取得失敗',ae);
      el.innerHTML='<div><b>🏆 周回ランキング</b><div class="muted small">回答履歴を取得できませんでした。</div></div>';
      return;
    }

    const qMap=new Map((qualifications||[]).map(q=>[q.id,q]));
    const sMap=new Map((subjects||[]).map(s=>[s.id,s]));
    const rows=[];
    target.forEach(sess=>{
      const arr=(attemptRows||[]).filter(a=>a.session_id===sess.id);
      const rounds=new Map();
      arr.forEach(a=>{
        const r=Math.max(1,Number(a.round)||1);
        if(!rounds.has(r))rounds.set(r,[]);
        rounds.get(r).push(a);
      });
      rounds.forEach((answers,r)=>{
        const total=answers.reduce((n,a)=>n+score(a),0);
        rows.push({
          qid:sess.qualification_id,
          qname:qMap.get(sess.qualification_id)?.name||'資格',
          sid:sess.subject_id,
          sname:sMap.get(sess.subject_id)?.name||'科目',
          round:r,
          accuracy:total/answers.length*100,
          answers:answers.length,
          wrong:answers.filter(a=>a.result==='wrong').length,
          created:sess.created_at
        });
      });
    });

    if(!rows.length){
      el.innerHTML='<div><b>🏆 周回ランキング</b><div class="muted small" style="margin-top:6px">まだ回答結果がありません。</div></div>';
      return;
    }

    const qids=[...new Set(rows.map(r=>r.qid))];
    qids.sort((a,b)=>String(qMap.get(a)?.name||'').localeCompare(String(qMap.get(b)?.name||''),'ja'));
    el.innerHTML=`<div class="row" style="justify-content:space-between"><div><h3 style="margin:0">🏆 周回ランキング</h3><div class="muted small" style="margin-top:4px">周回ごと・正答率の低い順</div></div><button class="light" onclick="window.loadComprehensiveReviewRanking()">↻ 更新</button></div>`;

    qids.forEach(qid=>{
      const qRows=rows.filter(r=>r.qid===qid);
      const rounds=[...new Set(qRows.map(r=>r.round))].sort((a,b)=>a-b);
      const section=document.createElement('div');
      section.style.marginTop='16px';
      section.innerHTML=`<div style="font-weight:900;font-size:16px">${escText(qMap.get(qid)?.name||'資格')}</div>`;
      rounds.forEach(round=>{
        const data=qRows.filter(r=>r.round===round).sort((a,b)=>a.accuracy-b.accuracy||a.sname.localeCompare(b.sname,'ja'));
        const prevMap=new Map(qRows.filter(r=>r.round===round-1).map(r=>[r.sid,r]));
        const wrap=document.createElement('div');
        wrap.style.marginTop='10px';
        wrap.innerHTML=`<div class="row" style="justify-content:space-between"><b>${round}周目</b><span class="muted small">${data.length}科目</span></div>`;
        data.forEach((r,i)=>{
          const prev=prevMap.get(r.sid);
          const diff=prev? r.accuracy-prev.accuracy:null;
          const delta=diff===null?'':`<span class="${diff>=0?'good':'bad'}" style="margin-left:8px">${diff>=0?'↑':'↓'} ${Math.abs(diff).toFixed(1)}pt</span>`;
          const row=document.createElement('div');
          row.style.cssText='display:grid;grid-template-columns:32px 1fr auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)';
          row.innerHTML=`<b>${i+1}</b><div><b>${escText(r.sname)}</b><div class="muted small">${r.answers}回解答 ・ 誤答 ${r.wrong}回${delta}</div></div><strong>${r.accuracy.toFixed(1)}%</strong>`;
          wrap.appendChild(row);
        });
        section.appendChild(wrap);
      });
      el.appendChild(section);
    });
  }

  window.loadComprehensiveReviewRanking=render;

  // renderSessionsの後にも確実に描画する
  function hook(){
    if(typeof window.renderSessions==='function' && !window.__rankingHooked){
      const original=window.renderSessions;
      window.renderSessions=function(){
        const result=original.apply(this,arguments);
        setTimeout(render,0);
        return result;
      };
      window.__rankingHooked=true;
    }
    if(window.user){render();}
  }

  let n=0;
  const timer=setInterval(()=>{
    hook();
    if(++n>50)clearInterval(timer);
  },200);
  setTimeout(hook,1000);
})();