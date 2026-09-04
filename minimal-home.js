/* B-style home dashboard. It only owns #minimalHome and leaves existing screens/functions intact. */
(function(){
  const GOAL=60;
  let originalOpenTab=null;
  let ready=false;

  const escM=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const dateM=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const addM=(s,n)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const fmtM=s=>{if(!s)return '—';const d=new Date(s+'T00:00:00');return `${d.getMonth()+1}/${d.getDate()}`};
  const minsM=n=>{n=Number(n)||0;return `${Math.floor(n/60)}時間${n%60}分`};
  const todayM=()=>dateM();
  const daysUntil=s=>Math.ceil((new Date(s+'T00:00:00')-new Date(todayM()+'T00:00:00'))/86400000);
  const getData=()=>({q:window.qualifications||[],s:window.subjects||[],p:window.problems||[],st:window.sessions||[]});

  function ensureHome(){
    if(document.getElementById('minimalHome'))return;
    const el=document.createElement('div');
    el.id='minimalHome';
    el.innerHTML=`
      <aside class="mh-sidebar">
        <div class="mh-brand">資格勉強OS<span>QUALIFICATION OS</span></div>
        <nav class="mh-nav">
          <button data-mh="home">⌂　ホーム</button>
          <button data-mh="review">▣　復習スケジュール</button>
          <button data-mh="record">＋　勉強記録</button>
          <button data-mh="status">◫　学習状況</button>
          <button data-mh="flash">▤　暗記カード</button>
          <button data-mh="status">▤　問題集</button>
          <button data-mh="settings">◉　資格・科目</button>
          <button data-mh="settings">⚙　設定</button>
        </nav>
      </aside>
      <div class="mh-main">
        <header class="mh-topbar">
          <span id="mhDate"></span>
          <button title="通知" onclick="alert('現在、新しい通知はありません。')">♢</button>
          <button title="プロフィール" onclick="openTab('settings')">◯</button>
          <button title="メニュー" onclick="openTab('settings')">☰</button>
        </header>
        <main class="mh-content">
          <div class="mh-welcome"><div><h1>今日の学習</h1><p id="mhWelcomeSub">今日も少しずつ進めよう。</p></div></div>
          <div class="mh-grid3">
            <section class="mh-card"><div class="mh-kicker">NEXT EXAM</div><div class="mh-exam-days" id="mhExamDays">—</div><div class="mh-exam-name" id="mhExamName">試験日を設定してください</div><div class="mh-exam-date" id="mhExamDate">資格・科目から設定できます</div></section>
            <section class="mh-card"><h3>今日の目標</h3><div class="mh-goal"><div class="mh-donut" id="mhDonut" style="--pct:0%"><strong id="mhGoalPct">0%</strong></div><div class="mh-goal-text"><b id="mhGoalTime">0 / 60分</b><span id="mhGoalSub">あと60分で目標達成</span><button class="mh-link" onclick="openTab('record')">＋ 記録する</button></div></div></section>
            <section class="mh-card"><h3>今日のタスク</h3><div class="mh-task-list" id="mhTasks"></div></section>
          </div>
          <div class="mh-section-grid mh-section">
            <section class="mh-card"><h3>資格別の進捗</h3><div class="mh-progress" id="mhProgress"></div></section>
            <section class="mh-card"><h3>復習スケジュール</h3><div class="mh-review-grid" id="mhReviewSchedule"></div><button class="mh-link" onclick="openTab('review')">復習に進む →</button></section>
          </div>
          <div class="mh-section-grid mh-section">
            <section class="mh-card"><h3>最近の記録</h3><div class="mh-records" id="mhRecords"></div><button class="mh-link" onclick="openTab('status')">すべて見る →</button></section>
            <section class="mh-card"><h3>今週の学習時間</h3><div class="mh-chart" id="mhChart"></div><div class="mh-week-summary"><div><b id="mhWeekTotal">0分</b><span>今週の合計</span></div><div><b id="mhWeekAvg">0分</b><span>1日平均</span></div></div></section>
          </div>
        </main>
      </div>`;
    document.getElementById('app').appendChild(el);
    el.querySelectorAll('[data-mh]').forEach(b=>b.addEventListener('click',()=>mhNavigate(b.dataset.mh)));
  }

  function hideOriginal(){
    const app=document.getElementById('app');
    if(!app)return;
    [...app.children].forEach(ch=>{if(ch.id!=='minimalHome')ch.style.display='none'});
    const home=document.getElementById('minimalHome');if(home)home.style.display='block';
    document.querySelectorAll('.mh-nav button').forEach(b=>b.classList.toggle('active',b.dataset.mh==='home'));
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function showOriginal(){
    const app=document.getElementById('app');
    if(!app)return;
    const home=document.getElementById('minimalHome');if(home)home.style.display='none';
    [...app.children].forEach(ch=>{if(ch.id!=='minimalHome')ch.style.display=''});
  }
  function mhNavigate(name){
    if(name==='home'){showHome();return}
    if(name==='flash'){location.href='flashcards.html';return}
    showOriginal();
    if(originalOpenTab)originalOpenTab(name==='record'?'record':name==='status'?'status':name==='settings'?'settings':'review');
    document.querySelectorAll('.mh-nav button').forEach(b=>b.classList.toggle('active',b.dataset.mh===name));
  }
  function showHome(){
    hideOriginal();
    renderHome();
  }

  function renderHome(){
    ensureHome();
    const {q,s,p,st}=getData();
    const today=todayM();
    document.getElementById('mhDate').textContent=new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date());
    const totalToday=st.filter(x=>x.study_date===today).reduce((a,x)=>a+Number(x.minutes||0),0);
    const pct=Math.min(100,Math.round(totalToday/GOAL*100));
    document.getElementById('mhDonut').style.setProperty('--pct',pct+'%');
    document.getElementById('mhGoalPct').textContent=pct+'%';
    document.getElementById('mhGoalTime').textContent=`${totalToday} / ${GOAL}分`;
    document.getElementById('mhGoalSub').textContent=totalToday>=GOAL?'今日の目標を達成しました！':`あと${GOAL-totalToday}分で目標達成`;

    const next=q.filter(x=>x.exam_date && daysUntil(x.exam_date)>=0).sort((a,b)=>a.exam_date.localeCompare(b.exam_date))[0];
    if(next){const d=daysUntil(next.exam_date);document.getElementById('mhExamDays').textContent=d===0?'本日':`あと ${d}日`;document.getElementById('mhExamName').textContent=escM(next.name);document.getElementById('mhExamDate').textContent=`試験日 ${fmtM(next.exam_date)}`}
    else{document.getElementById('mhExamDays').textContent='—';document.getElementById('mhExamName').textContent='試験日を設定してください';document.getElementById('mhExamDate').textContent='資格・科目から設定できます'}
    document.getElementById('mhWelcomeSub').textContent=totalToday>=GOAL?'今日の目標達成。いいペースです。':totalToday?`今日は${totalToday}分学習中。あと${GOAL-totalToday}分。`:'まずは今日の学習を1つ記録しよう。';

    const due=p.filter(x=>x.status==='pending'&&x.next_review_date&&x.next_review_date<=today).length;
    const tomorrow=addM(today,1);
    const weekEnd=addM(today,7);
    const tomorrowDue=p.filter(x=>x.status==='pending'&&x.next_review_date===tomorrow).length;
    const weekDue=p.filter(x=>x.status==='pending'&&x.next_review_date&&x.next_review_date>=today&&x.next_review_date<weekEnd).length;
    const streak=calcStreak(st);
    document.getElementById('mhTasks').innerHTML=`
      <div class="mh-task"><div><div class="mh-task-name">今日の復習</div><div class="mh-task-bar"><i style="width:${due?Math.min(100,due/30*100):100}%"></i></div></div><div class="mh-task-val">${due}問</div></div>
      <div class="mh-task"><div><div class="mh-task-name">勉強時間を60分以上</div><div class="mh-task-bar"><i style="width:${pct}%"></i></div></div><div class="mh-task-val">${totalToday}/${GOAL}分</div></div>
      <div class="mh-task"><div><div class="mh-task-name">連続学習を継続</div><div class="mh-task-bar"><i style="width:${Math.min(100,streak/7*100)}%"></i></div></div><div class="mh-task-val">${streak}日</div></div>`;

    const rows=q.map(qual=>{
      const ps=p.filter(x=>{const sub=s.find(y=>y.id===x.subject_id);return sub?.qualification_id===qual.id});
      const mastered=ps.filter(x=>x.status==='mastered').length;
      return {name:qual.name,total:ps.length,mastered,pct:ps.length?Math.round(mastered/ps.length*100):0};
    }).filter(x=>x.total>0).slice(0,6);
    document.getElementById('mhProgress').innerHTML=rows.length?rows.map(x=>`<div class="mh-progress-row"><div class="mh-progress-name" title="${escM(x.name)}">${escM(x.name)}</div><div class="mh-progress-bar"><i style="width:${x.pct}%"></i></div><div class="mh-progress-pct">${x.pct}%</div></div>`).join(''):'<div class="mh-empty">問題を登録すると資格別の進捗が表示されます。</div>';

    document.getElementById('mhReviewSchedule').innerHTML=`<div class="mh-review-stat"><b>${due}</b><span>今日</span></div><div class="mh-review-stat"><b>${tomorrowDue}</b><span>明日</span></div><div class="mh-review-stat"><b>${weekDue}</b><span>今週</span></div>`;

    const recent=st.slice(0,3);
    document.getElementById('mhRecords').innerHTML=recent.length?recent.map(x=>{const qual=q.find(y=>y.id===x.qualification_id),sub=s.find(y=>y.id===x.subject_id);return `<div class="mh-record"><div><b>${escM(sub?.name||qual?.name||'学習')}</b><div class="mh-kicker">${escM(activityLabel(x.activity_type))}</div></div><span>${fmtM(x.study_date)} ・ ${x.minutes||0}分</span></div>`}).join(''):'<div class="mh-empty">まだ勉強記録がありません。</div>';

    const days=[];for(let i=6;i>=0;i--)days.push(addM(today,-i));
    const vals=days.map(d=>st.filter(x=>x.study_date===d).reduce((a,x)=>a+Number(x.minutes||0),0));
    const max=Math.max(1,...vals);
    document.getElementById('mhChart').innerHTML=days.map((d,i)=>`<div class="mh-day ${d===today?'today':''}" title="${d}: ${vals[i]}分"><div class="mh-bar" style="height:${Math.max(3,Math.round(vals[i]/max*100))}%"></div><small>${new Date(d+'T00:00:00').getMonth()+1}/${new Date(d+'T00:00:00').getDate()}</small></div>`).join('');
    const weekTotal=vals.reduce((a,b)=>a+b,0);document.getElementById('mhWeekTotal').textContent=minsM(weekTotal);document.getElementById('mhWeekAvg').textContent=minsM(Math.round(weekTotal/7));
  }

  function activityLabel(v){return ({new_problems:'新規問題',review:'復習',textbook:'テキスト',lecture:'講義',mock:'模試',other:'その他'})[v]||v||'学習'}
  function calcStreak(st){
    const days=[...new Set(st.map(x=>x.study_date))].sort().reverse();if(!days.length||days[0]!==todayM())return 0;let n=0;for(let i=0;i<days.length;i++){if(days[i]===addM(todayM(),-i))n++;else break}return n;
  }

  function bootMinimal(){
    if(ready)return;ready=true;ensureHome();
    originalOpenTab=window.openTab;
    window.openTab=function(name){
      if(name==='review' && document.getElementById('minimalHome')?.style.display!=='none'){
        showOriginal();
      }
      return originalOpenTab ? originalOpenTab(name) : undefined;
    };
    showHome();
  }

  const wait=setInterval(()=>{
    if(document.getElementById('app') && window.qualifications && window.sessions){clearInterval(wait);bootMinimal()}
  },100);
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(document.getElementById('app'))bootMinimal()},300));
  window.minimalHomeRefresh=renderHome;
})();
