// 暗記カード：スタート画面は資格、資格を押すと紐づくカード一覧
(function(){
  const baseStart=window.startSession;
  const baseShowDeckForm=window.showDeckForm;

  function addStyles(){
    if(document.getElementById('fc-explorer-style'))return;
    const style=document.createElement('style');
    style.id='fc-explorer-style';
    style.textContent=`
      .fc-folder{display:flex;align-items:center;gap:12px;margin:10px 0;padding:17px 16px;border:1px solid #39476a;border-radius:15px;background:#10182a;cursor:pointer}
      .fc-folder:active{transform:scale(.99);background:#151d32}
      .fc-folder-icon{font-size:29px;flex:none}
      .fc-folder-info{flex:1;min-width:0}
      .fc-folder-name{font-size:20px;font-weight:900}
      .fc-folder-meta{color:#98a3bf;font-size:13px;margin-top:4px}
      .fc-folder-arrow{font-size:28px;color:#98a3bf}
      .fc-card-item{border-top:1px solid #26314d;padding:12px 2px}
      .fc-card-item:first-child{border-top:0}
      .fc-card-item summary{cursor:pointer;font-weight:850;line-height:1.55}
      .fc-card-num{color:#98a3bf;margin-right:5px}
      .fc-card-answer{margin:9px 0 2px;padding:11px 12px;border-radius:10px;background:#0c1322;color:#dfe5f7;line-height:1.6}
      .fc-card-file{margin-top:6px;color:#7f8aa7;font-size:12px}
    `;
    document.head.appendChild(style);
  }

  async function fetchDecks(){
    const{data,error}=await sb.from('flashcard_decks').select('*').eq('archived',false).order('created_at');
    if(error){toast(error.message);return []}
    decks=data||[];
    return decks;
  }

  async function renderQualificationHome(){
    addStyles();
    hideAll();
    $('home').classList.remove('hidden');
    await loadMasters();
    await fetchDecks();
    const qs=window.qualifications||[];
    $('home').innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><h2>📁 資格</h2><p class="muted small">資格を選ぶと、その資格に紐づく暗記カードを表示します。</p></div><button class="light" onclick="location.href='index.html'">← 資格勉強OS</button></div><div id="fc-qualification-list"></div></div>`;
    const box=document.getElementById('fc-qualification-list');
    if(!qs.length){box.innerHTML='<p class="muted">まだ資格が登録されていません。</p>';return}
    const cardsByQ=new Map();
    for(const q of qs)cardsByQ.set(String(q.id),0);
    for(const d of decks){
      if(!d.qualification_id)continue;
      const r=await sb.from('flashcards').select('*',{count:'exact',head:true}).eq('deck_id',d.id);
      const key=String(d.qualification_id);
      cardsByQ.set(key,(cardsByQ.get(key)||0)+(r.count||0));
    }
    box.innerHTML=qs.map(q=>`<div class="fc-folder" onclick="openQualificationCards('${q.id}')"><div class="fc-folder-icon">📁</div><div class="fc-folder-info"><div class="fc-folder-name">${esc(q.name)}</div><div class="fc-folder-meta">${cardsByQ.get(String(q.id))||0}枚</div></div><div class="fc-folder-arrow">›</div></div>`).join('');
  }

  // boot() が呼ばれる前に上書きするので、旧「暗記ファイル」画面は一度も描画しない。
  window.loadHome=async function(){await renderQualificationHome()};
  window.showHome=function(){renderQualificationHome()};

  window.openQualificationCards=async function(qid){
    addStyles();
    await loadMasters();
    await fetchDecks();
    const q=(window.qualifications||[]).find(x=>String(x.id)===String(qid));
    if(!q)return;
    const qdecks=decks.filter(d=>String(d.qualification_id)===String(qid));
    const deckIds=qdecks.map(d=>d.id);
    let cards=[];
    if(deckIds.length){
      const{data,error}=await sb.from('flashcards').select('*').in('deck_id',deckIds).order('created_at');
      if(error)return toast(error.message);
      cards=data||[];
    }
    const deckMap=new Map(qdecks.map(d=>[String(d.id),d.name]));
    hideAll();$('deck').classList.remove('hidden');
    $('deck').innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><h2>📁 ${esc(q.name)}</h2><div class="muted">${cards.length}枚</div></div><button class="light" onclick="showHome()">← 戻る</button></div></div><div class="card"><h3>📝 カード一覧</h3><div id="fc-qualification-cards"></div></div>`;
    const list=document.getElementById('fc-qualification-cards');
    list.innerHTML=cards.length?cards.map((c,i)=>`<details class="fc-card-item"><summary><span class="fc-card-num">${i+1}.</span>${esc(c.prompt)}</summary><div class="fc-card-answer">${esc(c.answer)}</div><div class="fc-card-file">ファイル：${esc(deckMap.get(String(c.deck_id))||'')}</div></details>`).join(''):'<p class="muted">この資格にはまだカードがありません。</p>';
  };

  // 既存の4択判定・カード削除・ファイル作成機能は維持。
  window.startSession=async function(mode){
    if(mode==='choice'&&currentDeck?.question_mode==='shared_choices'){
      const u=[...new Set(currentCards.map(c=>c.answer))];
      if(u.length<2)return toast('同じ答えを共有する4択には2種類以上の答えが必要です');
    }
    return baseStart(mode);
  };

  window.showDeckForm=async function(d){
    if(!window.qualifications?.length||!window.subjects?.length)await loadMasters();
    return baseShowDeckForm(d);
  };

  window.deleteCard=async function(id){
    if(!confirm('このカードを削除しますか？'))return;
    const{error}=await sb.from('flashcards').delete().eq('id',id).eq('user_id',user.id);
    if(error)return toast(error.message);
    toast('カードを削除しました');
    const{data,error:e}=await sb.from('flashcards').select('*').eq('deck_id',currentDeck.id).order('created_at');
    if(e)return toast(e.message);
    currentCards=data||[];
    await manageCards();
  };

  // 自由回答の「ランダム／順番通り」は従来どおり利用可能。
  window.startFreeSession=async function(order){
    if(order!=='ordered')return window.startSession('free');
    if(!currentCards.length)return toast('カードを1枚以上登録してください');
    const{data,error}=await sb.from('flashcard_sessions').insert({user_id:user.id,deck_id:currentDeck.id,mode:'free'}).select().single();
    if(error)return toast(error.message);
    session=data;sessionCards=[...currentCards];idx=0;answerShown=false;paused=false;elapsed=0;sessionCorrect=0;sessionDoneCount=0;startedAt=Date.now();
    hideAll();$('session').classList.remove('hidden');renderSession();
    timerHandle=setInterval(()=>{if(!paused){elapsed=Math.floor((Date.now()-startedAt)/1000);if($('timer'))$('timer').textContent=fmt(elapsed)}},500);
  };
})();
