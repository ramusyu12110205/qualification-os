// Flashcard listening mode
(function(){
  let playing=false,stopped=false,voiceIndex=0,timer=null;
  const synth=window.speechSynthesis;
  const escV=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const speak=(text,rate,onend)=>{
    if(!synth)return onend?.();
    synth.cancel();
    const u=new SpeechSynthesisUtterance(String(text||''));
    u.lang='ja-JP';u.rate=rate;u.pitch=1;u.volume=1;
    u.onend=()=>{if(playing&&!stopped)onend?.()};
    u.onerror=()=>{if(playing&&!stopped)onend?.()};
    synth.speak(u);
  };
  const wait=ms=>new Promise(r=>{timer=setTimeout(r,ms)});
  function render(){
    const box=document.getElementById('session');if(!box)return;
    const c=sessionCards[voiceIndex];
    box.innerHTML='<div class="card fc-voice-card"><div class="row" style="justify-content:space-between"><span class="badge">🔊 聞き流し ・ '+(voiceIndex+1)+'/'+sessionCards.length+'</span><button class="light" id="fc-voice-close">終了</button></div><div class="fc-voice-progress"><div class="muted small">問題</div><div class="prompt">'+escV(c.prompt)+'</div><div id="fc-voice-answer" class="answer hidden"></div></div><div class="row" style="justify-content:center;margin-top:12px"><button class="primary" id="fc-voice-toggle">一時停止</button><button class="light" id="fc-voice-replay">🔁 もう一度</button></div><div class="row" style="justify-content:center;margin-top:12px"><label style="margin:0">速度 <select id="fc-voice-rate"><option value="0.8">ゆっくり</option><option value="1" selected>普通</option><option value="1.2">速め</option><option value="1.4">かなり速め</option></select></label><label style="margin:0">間 <select id="fc-voice-gap"><option value="1000">1秒</option><option value="2000" selected>2秒</option><option value="3000">3秒</option><option value="5000">5秒</option></select></label></div><p class="muted small" style="text-align:center;margin-top:12px">問題 → 間 → 答え → 間 → 次の問題</p></div>';
    document.getElementById('fc-voice-close').onclick=stop;
    document.getElementById('fc-voice-toggle').onclick=()=>{if(playing){playing=false;synth?.cancel();document.getElementById('fc-voice-toggle').textContent='再開'}else{playing=true;stopped=false;document.getElementById('fc-voice-toggle').textContent='一時停止';playCurrent()}};
    document.getElementById('fc-voice-replay').onclick=()=>{stopped=false;playing=true;document.getElementById('fc-voice-toggle').textContent='一時停止';playCurrent()};
    document.getElementById('fc-voice-rate').onchange=()=>{if(playing)playCurrent()};
    document.getElementById('fc-voice-gap').onchange=()=>{};
  }
  async function playCurrent(){
    if(!playing||stopped)return;
    const c=sessionCards[voiceIndex];if(!c)return;
    const rate=Number(document.getElementById('fc-voice-rate')?.value||1);
    const gap=Number(document.getElementById('fc-voice-gap')?.value||2000);
    const answer=document.getElementById('fc-voice-answer');
    if(answer)answer.classList.add('hidden');
    speak('問題。'+c.prompt,gapAndNext=>{});
    await new Promise(resolve=>{
      synth.cancel();
      const u=new SpeechSynthesisUtterance('問題。'+String(c.prompt||''));u.lang='ja-JP';u.rate=rate;u.pitch=1;u.volume=1;
      u.onend=resolve;u.onerror=resolve;synth.speak(u);
    });
    if(!playing||stopped)return;
    await wait(gap);if(!playing||stopped)return;
    if(answer){answer.textContent=c.answer||'';answer.classList.remove('hidden')}
    await new Promise(resolve=>{
      const u=new SpeechSynthesisUtterance('答え。'+String(c.answer||''));u.lang='ja-JP';u.rate=rate;u.pitch=1;u.volume=1;u.onend=resolve;u.onerror=resolve;synth.speak(u);
    });
    if(!playing||stopped)return;
    await wait(gap);if(!playing||stopped)return;
    voiceIndex++;
    if(voiceIndex>=sessionCards.length){playing=false;return render();}
    render();playing=true;playCurrent();
  }
  function stop(){playing=false;stopped=true;clearTimeout(timer);synth?.cancel();hideAll();document.getElementById('deck')?.classList.remove('hidden');}
  function startVoice(order){
    if(!currentCards?.length)return toast('カードを1枚以上登録してください');
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
    const style=document.createElement('style');style.id='fc-voice-style';style.textContent='.fc-voice-card{max-width:760px;margin:14px auto}.fc-voice-card select{background:#0c1322;color:#f4f6ff;border:1px solid #394563;border-radius:9px;padding:8px}.fc-voice-progress{min-height:260px;display:flex;flex-direction:column;justify-content:center;text-align:center}.fc-voice-progress .answer{white-space:pre-wrap}.fc-voice-card label{display:flex;align-items:center;gap:6px;font-size:13px}@media(max-width:700px){.fc-voice-card label{width:100%;justify-content:center}.fc-voice-card select{flex:1}}';document.head.appendChild(style)
  }
})();
