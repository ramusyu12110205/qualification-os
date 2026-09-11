// Flashcard UI initialization / explorer
(function(){
  const gate=document.createElement('style');
  gate.id='fc-initial-load-gate';
  gate.textContent='html{visibility:hidden!important}';
  document.head.appendChild(gate);

  const prepareHome=()=>{
    const home=document.getElementById('home');
    if(!home)return;
    const card=home.querySelector('.card');
    if(card){
      const h2=card.querySelector('h2');if(h2)h2.textContent='📁 資格';
      const p=card.querySelector('p');if(p)p.textContent='資格を選ぶと、その資格の科目ファイルを表示します。';
    }
  };
  prepareHome();

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

  const baseOpenDeck=window.openDeck;
  window.openDeck=async function(id){
    await baseOpenDeck(id);
    const box=document.getElementById('deck');
    if(!box||!currentDeck)return;
    const actionRow=box.querySelector('.card .row[style*="margin:14px 0"]');
    if(!actionRow)return;
    const free=actionRow.querySelector('button[onclick="startSession(\'free\')"]');
    if(free)free.remove();
    const b1=document.createElement('button');
    b1.className='primary';b1.textContent='🔀 自由回答・ランダム';b1.onclick=()=>window.startFreeSession('random');
    const b2=document.createElement('button');
    b2.className='primary';b2.textContent='🔢 自由回答・順番通り';b2.onclick=()=>window.startFreeSession('ordered');
    actionRow.insertBefore(b1,actionRow.firstChild);
    actionRow.insertBefore(b2,actionRow.children[1]||null);
  };

  window.loadDecks=async function(){
    prepareHome();
    const box=document.getElementById('decks');
    if(!box)return;
    if(window.loadMasters)await window.loadMasters();
    const{data,error}=await sb.from('flashcard_decks').select('*').eq('archived',false).order('created_at');
    if(error)return toast(error.message);
    decks=data||[];
    const qualifications=window.qualifications||[];
    const counts=new Map();
    for(const d of decks){
      const{count}=await sb.from('flashcards').select('*',{count:'exact',head:true}).eq('deck_id',d.id);
      const qid=String(d.qualification_id||'');
      if(qid)counts.set(qid,(counts.get(qid)||0)+(count||0));
    }
    box.innerHTML=qualifications.length?qualifications.map(q=>{
      const count=counts.get(String(q.id))||0;
      return '<button class="fc-qualification" onclick="openQualification(\''+q.id+'\')">'+
        '<span class="fc-folder">📁</span><span class="fc-qualification-name">'+esc(q.name)+'</span>'+
        '<span class="fc-qualification-count">'+count+'枚</span><span class="fc-arrow">›</span>';
    }).join(''):'<p class="muted">資格がまだ登録されていません。</p>';
  };

  window.showHome=function(){
    hideAll();
    prepareHome();
    $('home').classList.remove('hidden');
    return Promise.all([loadDecks(),loadHistory()]);
  };

  window.openQualification=async function(qid){
    if(!window.qualifications?.length)await loadMasters();
    const q=(window.qualifications||[]).find(x=>String(x.id)===String(qid));
    if(!q)return toast('資格が見つかりません');
    const{data,error}=await sb.from('flashcard_decks').select('*').eq('archived',false).eq('qualification_id',qid).order('created_at');
    if(error)return toast(error.message);
    decks=data||[];
    hideAll();
    $('deck').classList.remove('hidden');
    const subjects=new Map((window.subjects||[]).map(s=>[String(s.id),s.name]));
    const groups=new Map();
    for(const d of data||[]){
      const sid=String(d.subject_id||'');
      const name=subjects.get(sid)||'科目未設定';
      if(!groups.has(sid))groups.set(sid,{id:sid,name,decks:[]});
      groups.get(sid).decks.push(d);
    }
    const list=[...groups.values()];
    $('deck').innerHTML='<div class="card fc-qualification-page"><div class="fc-page-head"><div><div class="fc-breadcrumb">📁 資格</div><h2>📚 '+esc(q.name)+'</h2><div class="muted small">科目ファイル</div></div><button class="light" onclick="showHome()">← 戻る</button></div>'+
      '<div class="fc-file-list">'+
      (list.length?list.map(g=>'<button class="fc-file-row" onclick="openSubject(\''+g.id+'\',\''+qid+'\')"><span class="fc-file-icon">📁</span><span class="fc-file-main"><b>'+esc(g.name)+'</b><span>暗記ファイル '+g.decks.length+'個</span></span><span class="fc-arrow">›</span></button>').join(''):'<p class="muted">この資格にはまだ科目ファイルがありません。</p>')+
      '</div></div>';
  };

  window.openSubject=async function(subjectId,qid){
    if(!decks.length){
      const{data}=await sb.from('flashcard_decks').select('*').eq('archived',false).eq('qualification_id',qid).order('created_at');
      decks=data||[];
    }
    const subject=(window.subjects||[]).find(s=>String(s.id)===String(subjectId));
    const subjectDecks=decks.filter(d=>String(d.subject_id||'')===String(subjectId));
    hideAll();
    $('deck').classList.remove('hidden');
    $('deck').innerHTML='<div class="card fc-qualification-page"><div class="fc-page-head"><div><div class="fc-breadcrumb">📁 資格 → 📁 科目</div><h2>📚 '+esc(subject?.name||'科目未設定')+'</h2><div class="muted small">暗記カードファイル</div></div><button class="light" onclick="openQualification(\''+qid+'\')">← 戻る</button></div>'+
      '<div class="fc-file-list">'+
      (subjectDecks.length?subjectDecks.map(d=>'<button class="fc-file-row" onclick="openDeck(\''+d.id+'\')"><span class="fc-file-icon">📄</span><span class="fc-file-main"><b>'+esc(d.name)+'</b><span>'+esc(d.description||'')+'</span></span><span class="fc-file-count" id="scount-'+d.id+'">…</span><span class="fc-arrow">›</span></button>').join(''):'<p class="muted">この科目にはまだ暗記カードファイルがありません。</p>')+
      '</div></div>';
    for(const d of subjectDecks){
      const{count}=await sb.from('flashcards').select('*',{count:'exact',head:true}).eq('deck_id',d.id);
      const el=document.getElementById('scount-'+d.id);if(el)el.textContent=(count||0)+'枚';
    }
  };

  if(!document.getElementById('fc-explorer-clean-style')){
    const style=document.createElement('style');
    style.id='fc-explorer-clean-style';
    style.textContent='.fc-qualification{width:100%;display:flex;align-items:center;gap:13px;margin:9px 0;padding:17px 15px;text-align:left;background:#0f1627;color:#f5f7ff;border:1px solid #263553;border-radius:16px}.fc-qualification:active,.fc-file-row:active{background:#151d32;transform:scale(.995)}.fc-folder{font-size:30px;flex:none}.fc-qualification-name{font-size:19px;font-weight:900;flex:1}.fc-qualification-count,.fc-file-count{font-size:13px;color:#d7ceff;background:#261b50;border:1px solid #45337c;border-radius:999px;padding:4px 9px;flex:none}.fc-arrow{font-size:28px;color:#98a3bf;line-height:1;flex:none}.fc-page-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.fc-breadcrumb{font-size:13px;color:#98a3bf;font-weight:800;margin-bottom:4px}.fc-page-head h2{margin:0 0 3px}.fc-file-row{width:100%;display:flex;align-items:center;gap:13px;margin:8px 0;padding:15px 13px;text-align:left;background:#0f1627;color:#f5f7ff;border:1px solid #263553;border-radius:15px}.fc-file-icon{font-size:27px;flex:none}.fc-file-main{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}.fc-file-main b{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fc-file-main span{font-size:12px;color:#98a3bf;min-height:1em}.fc-file-list{margin-top:4px}'
    document.head.appendChild(style);
  }

  const releaseGate=()=>{
    const gateStyle=document.getElementById('fc-initial-load-gate');
    if(gateStyle)gateStyle.remove();
  };
  const waitForInitialRender=()=>{
    const app=document.getElementById('app');
    const auth=document.getElementById('auth');
    if(!app||!auth)return releaseGate();
    if(!app.classList.contains('hidden')){
      window.showHome().finally(releaseGate);
      return;
    }
    if(!auth.classList.contains('hidden')){releaseGate();return;}
    setTimeout(waitForInitialRender,50);
  };
  setTimeout(waitForInitialRender,0);
})();
