// Flashcard listening mode
(function(){
  let playing=false,stopped=false,voiceIndex=0,timer=null,voiceTimer=null,voiceSession=null,voiceStartedAt=0,voiceElapsed=0;
  const synth=window.speechSynthesis;
  const escV=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const voiceKey='qualification-os-flashcard-voice';
  const getVoices=()=>synth?synth.getVoices().filter(v=>String(v.lang||'').toLowerCase().startsWith('ja')):[];
  const savedVoice=()=>localStorage.getItem(voiceKey)||'';
  const pickVoice=()=>getVoices().find(v=>v.name===savedVoice())||getVoices()[0]||null;
  const speakText=(text,rate)=>new Promise(resolve=>{
    if(!synth)return resolve();
    synth.cancel();
    const u=new SpeechSynthesisUtterance(String(text||''));
    u.lang='ja-JP';u.rate=rate;u.pitch=1;u.volume=1;
    const v=pickVoice();if(v)u.voice=v;
    u.onend=resolve;u.onerror=resolve;synth.speak(u);
  });
  const wait=ms=>new Promise(r=>{clearTimeout(timer);timer=setTimeout(r,ms)});
  async function finishVoiceSession(){
    clearInterval(voiceTimer);voiceTimer=null;
    if(!voiceSession)return;
    const duration=Math.max(0,Math.floor((Date.now()-voiceStartedAt)/1000));
    const count=Math.min(voiceIndex+1,sessionCards?.length||0);
    await sb.from('flashcard_sessions').update({duration_seconds:duration,card_count:count,correct_count:0}).eq('id',voiceSession.id).eq('user_id',user.id);
    voiceSession=null;
  }
  function render(){
    const box=document.getElementById('session');if(!box)return;
    const c=sessionCards[voiceIndex];if(!c)return;
    const voices=getVoices();
    const voiceOptions=voices.length?voices.map(v=>'<option value="'+escV(v.name)+'" '+(v.name===savedVoice()?'selected':'')+'>'+escV(v.name)+'</option>').join(''):'<option value="">端末の日本語音声を読み込み中…</option>';
    box.innerHTML='<div class="card fc-voice-card"><div class="row" style="justify-content:space-between"><span class="badge">🔊 聞き流し ・ '+(voiceIndex+1)+'/'+sessionCards.length+'</span><span id="fc-voice-timer" class="timer" style="font-size:28px">'+fmt(voiceElapsed)+'</span></div><div class="row" style="justify-content:center;margin:8px 0"><button class="light" id="fc-voice-toggle">'+(playing?'一時停止':'再開')+'</button><button class="danger" id="fc-voice-close">終了</button></div><div class="fc-voice-progress"><div class="muted small">問題</div><div class="prompt">'+escV(c.prompt)+'</div><div id="fc-voice-answer" class="answer hidden"></div></div><div class="row" style="justify-content:center;margin-top:12px"><button class="light" id="fc-voice-replay">🔁 もう一度</button></div><div class="fc-voice-settings"><label>声 <select id="fc-voice-select">'+voiceOptions+'</select></label><label>速度 <select id="fc-voice-rate"><option value="0.8">ゆっくり</option><option value="1" selected>普通</option><option value="1.2">速め</option><option value="1.4">かなり速め</option></select></label><label>間 <select id="fc-voice-gap"><option value="1000">1秒</option><option value="2000" selected>2秒</option><option value="3000">3秒</option><option value="5000">5秒</option></select></label></div><p class="muted small" style="text-align:center;margin-top:12px">問題 → 間 → 答え → 間 → 次の問題</p></div>';
    document.getElementById('fc-voice-close').onclick=stop;
    document.getElementById('fc-voice-toggle').onclick=()=>{if(playing){playing=false;synth?.cancel();clearTimeout(timer);document.getElementById('fc-voice-toggle').textContent='再開'}else{playing=true;stopped=false;document.getElementById('fc-voice-toggle').textContent='一時停止';playCurrent()}};
    document.getElementById('fc-voice-replay').onclick=()=>{stopped=false;playing=true;clearTimeout(timer);document.getElementById('fc-voice-toggle').textContent='一時停止';playCurrent()};
    document.getElementById('fc-voice-rate').onchange=()=>{if(playing)playCurrent()};
    document.getElementById('fc-voice-gap').onchange=()=>{};
    document.getElementById('fc-voice-select').onchange=e=>{localStorage.setItem(voiceKey,e.target.value);if(playing)playCurrent()};
    if(!voices.length&&synth)synth.onvoiceschanged=()=>{if(document.getElementById('fc-voice-select'))render()};
  }
  async function playCurrent(){
    if(!playing||stopped)return;
    const c=sessionCards[voiceIndex];if(!c)return;
    const rate=Number(document.getElementById('fc-voice-rate')?.value||1);
    const gap=Number(document.getElementById('fc-voice-gap')?.value||2000);
    const answer=document.getElementById('fc-voice-answer');
    if(answer)answer.classList.add('hidden');
    await speakText('問題。'+c.prompt,rate);
    if(!playing||stopped)return;
    await wait(gap);if(!playing||stopped)return;
    if(answer){answer.textContent=c.answer||'';answer.classList.remove('hidden')}
    await speakText('答え。'+String(c.answer||''),rate);
    if(!playing||stopped)return;
    await wait(gap);if(!playing||stopped)return;
    voiceIndex++;
    if(voiceIndex>=sessionCards.length){playing=false;await finishVoiceSession();return render()}
    render();playing=true;playCurrent();
  }
  async function stop(){playing=false;stopped=true;clearTimeout(timer);synth?.cancel();await finishVoiceSession();hideAll();document.getElementById('deck')?.classList.remove('hidden')}
  async function startVoice(order){
    if(!currentCards?.length)return toast('カードを1枚以上登録してください');
    const{data,error}=await sb.from('flashcard_sessions').insert({user_id:user.id,deck_id:currentDeck.id,mode:'free'}).select().single();
    if(error)return toast(error.message);
    voiceSession=data;voiceStartedAt=Date.now();voiceElapsed=0;
    clearInterval(voiceTimer);voiceTimer=setInterval(()=>{voiceElapsed=Math.floor((Date.now()-voiceStartedAt)/1000);const el=document.getElementById('fc-voice-timer');if(el)el.textContent=fmt(voiceElapsed)},500);
    sessionCards=order==='ordered'?[...currentCards]:[...currentCards].sort(()=>Math.random()-.5);
    voiceIndex=0;playing=true;stopped=false;clearTimeout(timer);synth?.cancel();
    hideAll();document.getElementById('session')?.classList.remove('hidden');render();
    setTimeout(()=>playCurrent(),100);
  }
  window.startVoiceSession=startVoice;
  const baseOpenDeck=window.openDeck;
  window.openDeck=async function(id){
    await baseOpenDeck(id);
    const box=document.getElementById('deck');if(!box)return;
    const action=box.querySelector('.card .row[style*="margin:14px 0"]');if(!action)return;
    if([...action.querySelectorAll('button')].some(b=>b.textContent.includes('聞き流し')))return;
    const r=document.createElement('button');r.className='primary';r.textContent='🔊 聞き流し・ランダム';r.onclick=()=>startVoice('random');
    const o=document.createElement('button');o.className='primary';o.textContent='🔊 聞き流し・順番通り';o.onclick=()=>startVoice('ordered');
    action.appendChild(r);action.appendChild(o);
  };
  if(!document.getElementById('fc-voice-style')){
    const style=document.createElement('style');style.id='fc-voice-style';style.textContent='.fc-voice-card{max-width:760px;margin:14px auto}.fc-voice-card select{background:#0c1322;color:#f4f6ff;border:1px solid #394563;border-radius:9px;padding:8px}.fc-voice-progress{min-height:260px;display:flex;flex-direction:column;justify-content:center;text-align:center}.fc-voice-progress .answer{white-space:pre-wrap}.fc-voice-settings{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px}.fc-voice-card label{display:flex;align-items:center;gap:6px;font-size:13px}.fc-voice-settings label:first-child select{min-width:230px}@media(max-width:700px){.fc-voice-settings label{width:100%;justify-content:center}.fc-voice-card select{flex:1}.fc-voice-settings label:first-child select{min-width:0}}';document.head.appendChild(style)
  }

  // カード詳細から戻るときは、直前の「資格 → 科目」階層へ戻す。ホームへ戻さない。
  const originalVoiceOpenDeck=window.openDeck;
  window.openDeck=async function(id){
    await originalVoiceOpenDeck(id);
    const box=document.getElementById('deck');
    const back=box?.querySelector('.card .row button.light');
    if(!back||!currentDeck)return;
    const qid=currentDeck.qualification_id;
    const sid=currentDeck.subject_id;
    if(qid&&sid){
      back.textContent='← 戻る';
      back.onclick=()=>window.openSubject(String(sid),String(qid));
    }else if(qid){
      back.textContent='← 戻る';
      back.onclick=()=>window.openQualification(String(qid));
    }
  };

  // スマホの科目ファイル一覧で、編集・削除ボタンに幅を奪われてファイル名が縦書きになるのを防ぐ。
  if(!document.getElementById('fc-mobile-file-style')){
    const style=document.createElement('style');
    style.id='fc-mobile-file-style';
    style.textContent='@media(max-width:700px){.fc-file-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:6px;padding:8px}.fc-file-open{min-width:0;width:100%;grid-column:1/-1}.fc-file-main{min-width:0}.fc-file-main b{display:block;white-space:normal;overflow-wrap:anywhere;word-break:normal}.fc-file-edit,.fc-file-delete{grid-column:auto}.fc-file-count{margin-left:auto}}';
    document.head.appendChild(style);
  }
})();
