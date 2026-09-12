// Flashcard self-assessment / weak-card filters
(function(){
  const escLocal=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let filterMode='all',filterValue=0;

  async function loadStats(){
    const ids=currentCards.map(c=>c.id);if(!ids.length)return new Map();
    const{data,error}=await sb.from('flashcards').select('id,correct_count,incorrect_count,last_result,last_answered_at').in('id',ids).eq('user_id',user.id);
    if(error){toast(error.message);return new Map()}
    return new Map((data||[]).map(x=>[x.id,x]));
  }

  function filterCards(cards,stats){
    return cards.filter(c=>{
      const s=stats.get(c.id)||{};
      if(filterMode==='last_incorrect')return s.last_result==='incorrect';
      if(filterMode==='incorrect_gte')return Number(s.incorrect_count||0)>=filterValue;
      if(filterMode==='correct_lte')return Number(s.correct_count||0)<=filterValue;
      return true;
    });
  }

  async function startFreeFiltered(order){
    if(!currentCards.length)return toast('カードを1枚以上登録してください');
    const stats=await loadStats();
    const pool=filterCards(currentCards,stats);
    if(!pool.length)return toast('条件に合うカードがありません');
    const{data,error}=await sb.from('flashcard_sessions').insert({user_id:user.id,deck_id:currentDeck.id,mode:'free'}).select().single();
    if(error)return toast(error.message);
    session=data;sessionCards=order==='ordered'?[...pool]:[...pool].sort(()=>Math.random()-.5);
    idx=0;answerShown=false;paused=false;elapsed=0;sessionCorrect=0;sessionDoneCount=0;startedAt=Date.now();
    hideAll();$('session').classList.remove('hidden');renderSession();
    clearInterval(timerHandle);timerHandle=setInterval(()=>{if(!paused){elapsed=Math.floor((Date.now()-startedAt)/1000);if($('timer'))$('timer').textContent=fmt(elapsed)}},500);
  }

  async function rateSelf(ok){
    const c=sessionCards[idx];
    const result=ok?'correct':'incorrect';
    const now=new Date().toISOString();
    const{error}=await sb.from('flashcard_session_cards').insert({user_id:user.id,session_id:session.id,flashcard_id:c.id,result});
    if(error)return toast('正誤の記録に失敗しました：'+error.message);
    const{error:updateError}=await sb.from('flashcards').update({correct_count:ok?Number(c.correct_count||0)+1:Number(c.correct_count||0),incorrect_count:ok?Number(c.incorrect_count||0):Number(c.incorrect_count||0)+1,last_result:result,last_answered_at:now,updated_at:now}).eq('id',c.id).eq('user_id',user.id);
    if(updateError)return toast('カード集計の更新に失敗しました：'+updateError.message);
    c.correct_count=ok?Number(c.correct_count||0)+1:Number(c.correct_count||0);
    c.incorrect_count=ok?Number(c.incorrect_count||0):Number(c.incorrect_count||0)+1;
    c.last_result=result;c.last_answered_at=now;
    sessionCorrect+=ok?1:0;sessionDoneCount++;
    $('body').innerHTML='<div class="answer '+(ok?'correct':'incorrect')+'">'+(ok?'⭕ 正解':'❌ 不正解')+'<br>'+escLocal(c.answer)+'</div><button class="primary" onclick="nextCard()">'+(idx+1<sessionCards.length?'次へ':'終了')+'</button>';
    if(idx+1>=sessionCards.length)$('body').querySelector('button').onclick=()=>endSession();
  }

  function renderFreeSelf(){
    const c=sessionCards[idx];
    $('body').innerHTML=(answerShown?'<div class="answer">'+escLocal(c.answer)+'</div>':'<p class="muted">頭の中で答えてから「答えを見る」</p>')+
      '<button class="primary" onclick="revealSelf()">'+(answerShown?'':'答えを見る')+'</button>'+
      (answerShown?'<div class="row" style="justify-content:center;margin-top:12px"><button class="success" onclick="selfCorrect()">⭕ 正解</button><button class="danger" onclick="selfIncorrect()">❌ 不正解</button></div>':'');
  }

  window.revealSelf=function(){answerShown=true;renderFreeSelf()};
  window.selfCorrect=()=>rateSelf(true);
  window.selfIncorrect=()=>rateSelf(false);

  const baseRenderSession=window.renderSession;
  window.renderSession=function(){
    baseRenderSession();
    if(session?.mode==='free')renderFreeSelf();
  };

  const baseOpenDeck=window.openDeck;
  window.openDeck=async function(id){
    await baseOpenDeck(id);
    const box=$('deck');if(!box||!currentDeck)return;
    const action=box.querySelector('.card .row[style*="margin:14px 0"]');if(!action)return;
    const oldFree=[...action.querySelectorAll('button')].find(b=>b.textContent.includes('自由回答'));
    if(oldFree)oldFree.remove();
    const random=document.createElement('button');random.className='primary';random.textContent='🔀 自由回答・ランダム';random.onclick=()=>startFreeFiltered('random');
    const ordered=document.createElement('button');ordered.className='primary';ordered.textContent='🔢 自由回答・順番通り';ordered.onclick=()=>startFreeFiltered('ordered');
    action.insertBefore(random,action.firstChild);action.insertBefore(ordered,action.children[1]||null);
    const filter=document.createElement('div');filter.className='fc-weak-filter';filter.innerHTML='<div class="muted small" style="margin-bottom:6px">🎯 苦手カード抽出</div><div class="row"><select id="fc-filter-mode"><option value="all">全カード</option><option value="last_incorrect">直前に不正解</option><option value="incorrect_gte">不正解○回以上</option><option value="correct_lte">正解○回以下</option></select><input id="fc-filter-number" type="number" min="0" value="3" style="max-width:120px" placeholder="回数"><span class="muted small">※回数条件のみ使用</span></div>';
    box.querySelector('.card').appendChild(filter);
    filter.querySelector('#fc-filter-mode').onchange=()=>{filterMode=filter.querySelector('#fc-filter-mode').value;filter.querySelector('#fc-filter-number').disabled=filterMode==='all'||filterMode==='last_incorrect'};
    filter.querySelector('#fc-filter-number').oninput=()=>{filterValue=Math.max(0,parseInt(filter.querySelector('#fc-filter-number').value||'0',10))};
    filter.querySelector('#fc-filter-mode').dispatchEvent(new Event('change'));
  };

  if(!document.getElementById('fc-self-assessment-style')){
    const style=document.createElement('style');style.id='fc-self-assessment-style';style.textContent='.fc-weak-filter{margin-top:14px;padding:12px;border:1px solid #26314d;border-radius:12px;background:#0c1322}.fc-weak-filter select,.fc-weak-filter input{width:auto;min-width:190px}.fc-weak-filter input{margin:0}.fc-weak-filter .muted{font-size:12px}@media(max-width:700px){.fc-weak-filter select{width:100%;min-width:0}.fc-weak-filter input{max-width:none!important;width:100%}}';document.head.appendChild(style)
  }
})();
