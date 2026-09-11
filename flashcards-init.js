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
