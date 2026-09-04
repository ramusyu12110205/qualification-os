// Flashcard enhancements: qualification/subject linking, shared-answer 4-choice, study sync, history deletion.
(function(){
  const originalShowDeckForm = window.showDeckForm;
  window.renderSubjectOptions = function(selected){
    const q=document.getElementById('deckQualification'), s=document.getElementById('deckSubject');
    if(!q||!s)return;
    const qid=q.value||'';
    s.innerHTML='<option value="">'+(qid?'科目を選択':'資格を先に選択')+'</option>';
    (window.subjects||[]).filter(x=>x.qualification_id===qid).forEach(x=>{
      const o=document.createElement('option');o.value=x.id;o.textContent=x.name;o.selected=x.id===selected;s.appendChild(o);
    });
  };
  window.showDeckForm = function(d){
    hideAll();const e=document.getElementById('deckForm');e.classList.remove('hidden');e.dataset.id=d?.id||'';
    e.innerHTML='<h2>'+(d?'ファイル編集':'ファイル作成')+'</h2>'+
      '<label>ファイル名</label><input id="deckName" placeholder="例：消費税区分">'+
      '<label>説明（任意）</label><input id="deckDescription">'+
      '<label>連携する資格</label><select id="deckQualification" onchange="renderSubjectOptions()"><option value="">連携しない</option>'+
      (window.qualifications||[]).map(q=>'<option value="'+q.id+'">'+esc(q.name)+'</option>').join('')+'</select>'+
      '<label>科目</label><select id="deckSubject"></select>'+
      '<label>4択の判定方式</label><div class="row"><label style="font-weight:500"><input type="radio" name="questionMode" value="one_to_one" checked> 1対1対応</label><label style="font-weight:500"><input type="radio" name="questionMode" value="shared_choices"> 同じ答えを共有</label></div>'+
      '<p class="muted small">同じ答えを共有：複数の問題が同じ答えになるカード向け。</p>'+
      '<div class="row" style="margin-top:12px"><button class="primary" onclick="saveDeck()">保存</button><button class="light" onclick="showHome()">戻る</button></div>';
    document.getElementById('deckName').value=d?.name||'';document.getElementById('deckDescription').value=d?.description||'';
    const q=document.getElementById('deckQualification');q.value=d?.qualification_id||'';renderSubjectOptions(d?.subject_id||'');
    const r=document.querySelector('input[name="questionMode"][value="'+(d?.question_mode||'one_to_one')+'"]');if(r)r.checked=true;
  };
  window.saveDeck = async function(){
    const name=document.getElementById('deckName').value.trim();if(!name)return toast('ファイル名を入力してください');
    const id=document.getElementById('deckForm').dataset.id;
    const payload={name,description:document.getElementById('deckDescription').value.trim(),qualification_id:document.getElementById('deckQualification').value||null,subject_id:document.getElementById('deckSubject').value||null,question_mode:document.querySelector('input[name="questionMode"]:checked')?.value||'one_to_one'};
    const q=id?sb.from('flashcard_decks').update(payload).eq('id',id).eq('user_id',user.id):sb.from('flashcard_decks').insert({...payload,user_id:user.id});
    const{error}=await q;if(error)return toast(error.message);await loadDecks();showHome();
  };
  const originalBoot=window.boot;
  window.boot=async function(){await originalBoot();};
  const originalLoadHome=window.loadHome;
  window.loadHome=async function(){await loadMasters();await originalLoadHome();};
  window.qualifications=[];window.subjects=[];
  window.loadMasters=async function(){
    const q=await sb.from('qualifications').select('id,name').order('name');if(q.error)return toast(q.error.message);window.qualifications=q.data||[];
    const s=await sb.from('subjects').select('id,name,qualification_id').order('name');if(s.error)return toast(s.error.message);window.subjects=s.data||[];
  };
  // Re-run master loading now; the original boot may already have run before this script is loaded.
  (async()=>{if(window.user){await loadMasters();}})();
  const originalStartSession=window.startSession;
  window.startSession=async function(mode){
    if(mode==='choice'&&window.currentCards){const unique=[...new Set(currentCards.map(c=>c.answer))];if(currentCards.length<4)return toast('4択には4枚以上のカードが必要です');if(currentDeck.question_mode==='shared_choices'&&unique.length<4)return toast('同じ答えを共有する4択には4種類以上の答えが必要です');}
    return originalStartSession(mode);
  };
  window.renderChoice=function(){
    const c=sessionCards[idx];let opts=[];
    if(currentDeck.question_mode==='shared_choices'){
      const answers=[...new Set(currentCards.map(x=>x.answer))].filter(a=>a!==c.answer).sort(()=>Math.random()-.5).slice(0,3);
      opts=[c.answer,...answers].sort(()=>Math.random()-.5).map((answer,i)=>({id:'answer-'+i,answer}));
    }else opts=[c,...currentCards.filter(x=>x.id!==c.id).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);
    document.getElementById('body').innerHTML='<div class="choice">'+opts.map(o=>'<button class="light" onclick="choose(\''+o.id+'\')">'+esc(o.answer)+'</button>').join('')+'</div>';
  };
  window.choose=async function(id){
    const c=sessionCards[idx];let ok=false;
    if(currentDeck.question_mode==='shared_choices'){const b=[...document.querySelectorAll('#body button')].find(x=>x.getAttribute('onclick')==="choose('"+id+"')");ok=!!b&&b.textContent.trim()===c.answer;}else ok=id===c.id;
    sessionCorrect+=ok?1:0;if(!await recordCard(ok?'correct':'incorrect'))return;sessionDoneCount++;
    document.getElementById('body').innerHTML='<div class="answer '+(ok?'correct':'incorrect')+'">'+(ok?'⭕ 正解':'❌ 不正解')+'<br>'+esc(c.answer)+'</div><button class="primary" onclick="nextCard()">次へ</button>';
  };
  const originalLoadHistory=window.loadHistory;
  window.loadHistory=async function(){
    const{data,error}=await sb.from('flashcard_sessions').select('*,flashcard_decks(name)').order('created_at',{ascending:false}).limit(10);if(error)return toast(error.message);
    document.getElementById('history').innerHTML=data?.length?data.map(x=>'<div class="item"><div class="row" style="justify-content:space-between"><div><b>'+esc(x.flashcard_decks?.name||'')+'</b> <span class="badge">'+(x.mode==='choice'?'4択':'自由回答')+'</span><div class="muted small">'+new Date(x.started_at).toLocaleString('ja-JP')+' ・ '+x.card_count+'枚 ・ '+fmt(x.duration_seconds)+(x.mode==='choice'?' ・ 正解'+x.correct_count+'問':'')+(x.synced_to_study?' ・ 資格勉強OSへ同期済み':'')+'</div></div><button class="danger" onclick="deleteHistory(\''+x.id+'\',\''+(x.study_record_id||'')+'\')">削除</button></div></div>').join(''):'<p class="muted">まだ履歴がありません。</p>';
  };
  window.deleteHistory=async function(id,studyRecordId){
    if(!confirm('この暗記履歴を削除しますか？資格勉強OSへ同期した勉強記録も削除されます。'))return;
    if(studyRecordId){const{error}=await sb.from('study_sessions').delete().eq('id',studyRecordId).eq('user_id',user.id);if(error)return toast(error.message);}
    let r=await sb.from('flashcard_session_cards').delete().eq('session_id',id).eq('user_id',user.id);if(r.error)return toast(r.error.message);
    r=await sb.from('flashcard_sessions').delete().eq('id',id).eq('user_id',user.id);if(r.error)return toast(r.error.message);
    toast('履歴を削除しました');await loadHistory();
  };
  const originalEndSession=window.endSession;
  window.endSession=async function(){
    if(!session)return;clearInterval(timerHandle);if(!paused)elapsed=Math.floor((Date.now()-startedAt)/1000);
    let studyRecordId=null;
    if(currentDeck.qualification_id&&currentDeck.subject_id){
      const minutes=Math.max(1,Math.floor(elapsed/60));const memo='暗記カード：'+currentDeck.name+'（'+(session.mode==='choice'?'4択':'自由回答')+'）';
      const{data,error}=await sb.from('study_sessions').insert({user_id:user.id,qualification_id:currentDeck.qualification_id,subject_id:currentDeck.subject_id,study_date:new Date().toLocaleDateString('sv-SE'),activity_type:'other',minutes,memo}).select('id').single();
      if(error)return toast('資格勉強OSへの同期に失敗しました：'+error.message);studyRecordId=data.id;
    }
    const{error}=await sb.from('flashcard_sessions').update({ended_at:new Date().toISOString(),duration_seconds:elapsed,card_count:sessionDoneCount,correct_count:sessionCorrect,study_record_id:studyRecordId,synced_to_study:!!studyRecordId}).eq('id',session.id).eq('user_id',user.id);
    if(error)return toast(error.message);session=null;toast(studyRecordId?'暗記セッションを記録・資格勉強OSへ同期しました':'暗記セッションを記録しました');await loadHistory();setTimeout(showHome,500);
  };
})();