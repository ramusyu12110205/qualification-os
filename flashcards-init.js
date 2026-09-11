(async()=>{try{const {data:{session:s}}=await sb.auth.getSession();if(s&&window.loadMasters){await loadMasters();if(window.loadHistory)await loadHistory();}}catch(e){console.error(e)}})();
const baseStart=window.startSession;
window.startSession=async function(mode){
  if(mode==='choice'&&currentDeck?.question_mode==='shared_choices'){
    const u=[...new Set(currentCards.map(c=>c.answer))];
    if(u.length<2)return toast('同じ答えを共有する4択には2種類以上の答えが必要です');
  }
  return baseStart(mode);
};
const baseShowDeckForm=window.showDeckForm;
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

// 自由回答の出題順を「ランダム／順番通り」から選べるようにする。
setTimeout(()=>{
  window.startFreeSession=async function(order){
    if(order!=='ordered')return window.startSession('free');
    if(!currentCards.length)return toast('カードを1枚以上登録してください');
    const{data,error}=await sb.from('flashcard_sessions').insert({user_id:user.id,deck_id:currentDeck.id,mode:'free'}).select().single();
    if(error)return toast(error.message);
    session=data;
    sessionCards=[...currentCards];
    idx=0;answerShown=false;paused=false;elapsed=0;sessionCorrect=0;sessionDoneCount=0;startedAt=Date.now();
    hideAll();$('session').classList.remove('hidden');renderSession();
    timerHandle=setInterval(()=>{if(!paused){elapsed=Math.floor((Date.now()-startedAt)/1000);if($('timer'))$('timer').textContent=fmt(elapsed)}},500);
  };

  // 暗記ファイルを「資格 → 科目」単位でまとめて表示する。
  const baseLoadDecks=window.loadDecks;
  if(baseLoadDecks&&!baseLoadDecks.__subjectGrouped){
    const groupedLoadDecks=async function(){
      if(window.loadMasters)await window.loadMasters();
      await baseLoadDecks();
      const box=document.getElementById('decks');
      if(!box||!Array.isArray(decks))return;
      const qMap=new Map((window.qualifications||[]).map(q=>[String(q.id),q.name]));
      const sMap=new Map((window.subjects||[]).map(s=>[String(s.id),{name:s.name,qid:s.qualification_id}]));
      const groups=new Map();
      decks.forEach(d=>{
        const sub=sMap.get(String(d.subject_id));
        const qName=qMap.get(String(d.qualification_id))||'資格未設定';
        const key=qName+'__'+(sub?.name||'科目未設定');
        if(!groups.has(key))groups.set(key,{qName,subName:sub?.name||'科目未設定',decks:[]});
        groups.get(key).decks.push(d);
      });
      const escName=s=>esc(s);
      box.innerHTML=[...groups.values()].map(g=>
        '<section class="fc-subject-group"><div class="fc-subject-title"><span>📚 '+escName(g.qName)+'</span><b>'+escName(g.subName)+'</b></div>'+ 
        g.decks.map(d=>'<div class="item"><div class="row" style="justify-content:space-between"><div><b>'+esc(d.name)+'</b><div class="muted small">'+esc(d.description||'')+'</div></div><span class="badge" id="count-'+d.id+'">…</span></div><div class="row" style="margin-top:10px"><button class="primary" onclick="openDeck(\''+d.id+'\')">開く</button><button class="light" onclick="editDeck(\''+d.id+'\')">編集</button><button class="danger" onclick="archiveDeck(\''+d.id+'\')">削除</button></div></div>').join('')+
        '</section>'
      ).join('');
      for(const d of decks){
        const{count}=await sb.from('flashcards').select('*',{count:'exact',head:true}).eq('deck_id',d.id);
        const el=document.getElementById('count-'+d.id);if(el)el.textContent=(count||0)+'枚';
      }
    };
    groupedLoadDecks.__subjectGrouped=true;
    window.loadDecks=groupedLoadDecks;
  }
  if(!document.getElementById('fc-subject-style')){
    const style=document.createElement('style');style.id='fc-subject-style';style.textContent='.fc-subject-group{margin:18px 0 24px}.fc-subject-title{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;margin-bottom:8px;border:1px solid #39476a;border-radius:13px;background:#151d32}.fc-subject-title span{color:#98a3bf;font-size:13px;font-weight:800}.fc-subject-title b{font-size:19px}';document.head.appendChild(style);
  }

  const deck=document.getElementById('deck');
  if(!deck)return;
  const replace=()=>{
    const button=[...deck.querySelectorAll('button')].find(b=>(b.textContent||'').trim()==='自由回答で暗記');
    if(!button||button.dataset.orderReady)return;
    button.dataset.orderReady='1';
    button.textContent='自由回答（ランダム）';
    button.setAttribute('onclick',"startFreeSession('random')");
    const ordered=button.cloneNode(true);
    ordered.textContent='自由回答（順番通り）';
    ordered.setAttribute('onclick',"startFreeSession('ordered')");
    button.parentElement.insertBefore(ordered,button.nextSibling);
  };
  new MutationObserver(replace).observe(deck,{childList:true,subtree:true});
  replace();
},0);
