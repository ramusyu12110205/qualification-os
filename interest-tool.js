(()=>{
  const PANEL_ID='panel-interest';
  const STYLE_ID='interest-tool-style';
  let ready=false;
  function inject(){
    if(ready)return;
    const tools=document.getElementById('panel-tools');
    const grid=tools?.querySelector('.tool-grid');
    const withholding=document.getElementById('tool-withholding');
    if(!tools||!grid||!withholding)return;
    ready=true;
    const card=document.createElement('button');
    card.className='tool-card';
    card.innerHTML='<span class="tool-icon">🏦</span><span><b>預金利息の源泉徴収税額</b><small>利息の入金額・利息金額から税額を計算</small></span>';
    card.addEventListener('click',()=>interestTool.open());
    grid.appendChild(card);
    const panel=document.createElement('div');panel.id=PANEL_ID;panel.className='card tool-panel hidden';
    panel.innerHTML=`<div class="kicker">INTEREST WITHHOLDING TAX</div><div class="interest-head"><div><h2>預金利息の源泉徴収税額計算</h2><p class="muted small">「利息金額 → 入金額」と「入金額 → 利息金額」の2方向から計算できます。</p></div><button class="light" id="interest-back">← 業務ツール</button></div><div class="tool-section"><div class="tool-section-title">① 計算方向</div><div class="tool-switch tool-direction" id="interest-direction"><button class="tool-mode" data-direction="from-interest">利息金額から<br><span>源泉徴収・入金額を計算</span></button><button class="tool-mode active" data-direction="from-deposit">入金額から<br><span>利息金額を逆算</span></button></div></div><div class="tool-section"><div class="tool-section-title">② 受取人</div><div class="tool-switch tool-direction" id="interest-taxpayer"><button class="tool-mode" data-taxpayer="individual">個人<br><span>所得税＋復興特別所得税＋地方税</span></button><button class="tool-mode active" data-taxpayer="corporation">法人<br><span>所得税＋復興特別所得税</span></button></div></div><div class="tool-section"><label for="interest-amount" id="interest-input-label">③ 利息の入金額</label><div class="amount-input-wrap"><input id="interest-amount" type="number" min="0" step="1" inputmode="numeric" placeholder="例：12000"><span>円</span></div><div class="tool-hint" id="interest-input-hint">実際に口座へ入金された金額を入力してください。</div></div><div class="tool-section"><div class="tool-section-title">④ 計算結果</div><div id="interest-result" class="result-grid"><div class="result-box"><span>利息金額（税引前）</span><b id="ir-gross">—</b><em>円</em></div><div class="result-box"><span>所得税・復興特別所得税</span><b id="ir-national">—</b><em>円</em></div><div class="result-box"><span>地方税</span><b id="ir-local">—</b><em>円</em></div><div class="result-box highlight"><span>源泉徴収税額合計</span><b id="ir-tax">—</b><em>円</em></div><div class="result-box highlight"><span>利息の入金額（手取り）</span><b id="ir-net">—</b><em>円</em></div></div><div id="interest-note" class="notice small">金額を入力すると計算します。</div></div><div class="tool-formula"><b>計算式</b><div id="interest-formula">利息金額 × 15.315%（所得税・復興特別所得税）＋ 利息金額 × 5%（地方税）</div></div>`;
    tools.appendChild(panel);
    if(!document.getElementById(STYLE_ID)){const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`.interest-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.interest-head h2{margin:0}.interest-head button{white-space:nowrap}@media(max-width:600px){.interest-head{flex-direction:column}.interest-head button{width:100%}}`;document.head.appendChild(style)}
    document.getElementById('interest-back').onclick=()=>interestTool.close();
    [...document.querySelectorAll('#interest-direction .tool-mode')].forEach(btn=>btn.onclick=()=>{document.querySelectorAll('#interest-direction .tool-mode').forEach(x=>x.classList.toggle('active',x===btn));interestTool.direction=btn.dataset.direction;interestTool.updateLabels();interestTool.calculate()});
    [...document.querySelectorAll('#interest-taxpayer .tool-mode')].forEach(btn=>btn.onclick=()=>{document.querySelectorAll('#interest-taxpayer .tool-mode').forEach(x=>x.classList.toggle('active',x===btn));interestTool.taxpayer=btn.dataset.taxpayer;interestTool.calculate()});
    document.getElementById('interest-amount').addEventListener('input',()=>interestTool.calculate());
  }
  window.interestTool={direction:'from-deposit',taxpayer:'corporation',open(){inject();document.getElementById('tool-withholding')?.classList.add('hidden');document.getElementById(PANEL_ID)?.classList.remove('hidden');document.querySelectorAll('#panel-tools .tool-card').forEach(x=>x.classList.remove('active'));const cards=document.querySelectorAll('#panel-tools .tool-card');if(cards[1])cards[1].classList.add('active');this.updateLabels();this.calculate()},close(){document.getElementById(PANEL_ID)?.classList.add('hidden');document.getElementById('tool-withholding')?.classList.remove('hidden');document.querySelectorAll('#panel-tools .tool-card').forEach(x=>x.classList.remove('active'));document.querySelector('#panel-tools .tool-card')?.classList.add('active')},floor(v){return Math.floor(v+1e-9)},rates(){return this.taxpayer==='individual'?{national:.15315,local:.05}:{national:.15315,local:0}},tax(gross){const r=this.rates();const national=this.floor(gross*r.national);const local=this.floor(gross*r.local);return {national,local,total:national+local}},net(gross){const t=this.tax(gross);return gross-t.total},reverse(target){if(target<=0)return 0;const r=this.rates();let gross=this.floor(target/(1-r.national-r.local));while(this.net(gross)<target)gross++;while(gross>0&&this.net(gross-1)>=target)gross--;return gross},updateLabels(){const fromInterest=this.direction==='from-interest';document.getElementById('interest-input-label').textContent=fromInterest?'③ 利息金額（税引前）':'③ 利息の入金額';document.getElementById('interest-amount').placeholder=fromInterest?'例：14170':'例：12000';document.getElementById('interest-input-hint').textContent=fromInterest?'源泉徴収前の利息金額を入力してください。':'実際に口座へ入金された金額を入力してください。'},calculate(){const el=document.getElementById('interest-amount');if(!el)return;const v=Math.max(0,Number(el.value)||0);if(!v){['ir-gross','ir-national','ir-local','ir-tax','ir-net'].forEach(id=>document.getElementById(id).textContent='—');document.getElementById('interest-note').textContent='金額を入力すると計算します。';return}const gross=this.direction==='from-interest'?this.floor(v):this.reverse(v);const t=this.tax(gross),net=this.net(gross),fmt=n=>n.toLocaleString('ja-JP');document.getElementById('ir-gross').textContent=fmt(gross);document.getElementById('ir-national').textContent=fmt(t.national);document.getElementById('ir-local').textContent=fmt(t.local);document.getElementById('ir-tax').textContent=fmt(t.total);document.getElementById('ir-net').textContent=fmt(net);this._note=net;document.getElementById('interest-note').textContent=this.direction==='from-interest'?(this.taxpayer==='individual'?'個人：合計20.315%（所得税・復興特別所得税15.315%＋地方税5%）で計算しています。':'法人：15.315%（所得税・復興特別所得税）で計算しています。'):`入金額 ${fmt(v)}円になるよう、税引前の利息金額を逆算しています。実際の入金額は ${fmt(net)}円です。`;document.getElementById('interest-formula').textContent=this.taxpayer==='individual'?'利息金額 × 15.315% ＋ 利息金額 × 5%':'利息金額 × 15.315%';}}
  const timer=setInterval(()=>{inject();if(ready)clearInterval(timer)},300);
})();

/* accounting consultation enhancement: this file is also loaded on account-consult.html. */
(()=>{
  if(!document.getElementById('question')||!window.supabase)return;
  const sbRef=window.sb;
  if(!sbRef)return;
  let activeTopicId=null;
  let activeTopicTitle='';
  let activeThread=[];
  let busy=false;
  const esc2=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const originalAsk=window.askAI;
  const originalSave=window.saveConsultation;
  const setBusy=b=>{busy=b;const ai=document.getElementById('aiButton');if(ai){ai.disabled=b;ai.textContent=b?'🤖 AIに相談中…':'🤖 AIに相談する'}};
  function ensureUI(){
    if(document.getElementById('topicFollowup'))return;
    const result=document.getElementById('aiResult');if(!result)return;
    const box=document.createElement('div');box.id='topicFollowup';box.className='inline-panel hidden';box.innerHTML='<div class="kicker">FOLLOW-UP</div><div id="topicLabel" style="font-weight:900;margin-bottom:8px"></div><div class="muted small" style="margin-bottom:8px">このテーマについて、具体例や追加条件を続けて聞けます。</div><input id="followupQuestion" maxlength="300" placeholder="例：商店街の会費なら？"><div class="actions"><button class="primary" id="followupButton">このテーマについて聞く</button><button class="light" id="newConsultButton">新しい相談に戻る</button></div><div id="topicNotice" class="notice hidden"></div>';
    result.parentNode.insertBefore(box,result.nextSibling);
    document.getElementById('followupButton').onclick=()=>askFollowup();
    document.getElementById('newConsultButton').onclick=()=>resetTopic();
    document.getElementById('followupQuestion').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();askFollowup()}});
  }
  function showTopic(id,title){activeTopicId=id||null;activeTopicTitle=title||'';ensureUI();const box=document.getElementById('topicFollowup');const label=document.getElementById('topicLabel');if(!id){box?.classList.add('hidden');return}label.textContent='📚 テーマ：「'+activeTopicTitle+'」';box.classList.remove('hidden');}
  function resetTopic(){activeTopicId=null;activeTopicTitle='';activeThread=[];document.getElementById('topicFollowup')?.classList.add('hidden');document.getElementById('question').value='';document.getElementById('aiResult')?.classList.add('hidden');}
  async function saveTopic(title,summary){const {data,error}=await sbRef.from('accounting_topics').insert({user_id:window.currentUser.id,title:title||'新しい相談テーマ',summary:summary||null}).select().single();if(error)throw error;return data;}
  async function attachTopic(consultation,topicId){if(!topicId)return consultation;const {data,error}=await sbRef.from('accounting_consultations').update({topic_id:topicId,updated_at:new Date().toISOString()}).eq('id',consultation.id).eq('user_id',window.currentUser.id).select().single();if(error)throw error;return data;}
  async function persistCandidates(data,consultation){
    const candidates=Array.isArray(data.account_candidates)?data.account_candidates:[];if(!candidates.length)return;
    const rows=candidates.map((x,i)=>({user_id:window.currentUser.id,name:String(x.name||'').trim().slice(0,100),sort_order:1000+i,archived:false})).filter(x=>x.name);if(!rows.length)return;
    const {data:upserted,error}=await sbRef.from('accounting_accounts').upsert(rows,{onConflict:'user_id,name'}).select('*');if(error)throw error;
    const byName=new Map((upserted||[]).map(a=>[a.name,a]));const links=candidates.map(x=>{const a=byName.get(String(x.name||'').trim().slice(0,100));return a?{user_id:window.currentUser.id,consultation_id:consultation.id,account_id:a.id,relation_type:'candidate',reason:String(x.reason||'').trim().slice(0,1000)}:null}).filter(Boolean);if(links.length){const {error:e}=await sbRef.from('accounting_consultation_accounts').insert(links);if(e)throw e;}
  }
  async function askFast(question,topicId){
    const {data,error}=await sbRef.functions.invoke('accounting-consult-ai-fast',{body:{question,topic_id:topicId||null}});if(error)throw new Error(error.message||'AI呼び出しに失敗しました。');if(!data||data.error)throw new Error(data?.error||'AI回答を取得できませんでした。');return data;
  }
  async function saveResult(question,data,topicId){
    let topic=topicId?null:null;
    if(!topicId){
      if(data.topic_action==='existing'&&data.topic_id)topic=await sbRef.from('accounting_topics').select('*').eq('id',data.topic_id).eq('user_id',window.currentUser.id).maybeSingle().then(x=>{if(x.error)throw x.error;return x.data});
      if(!topic)topic=await saveTopic(data.topic_title||question,aiSummary(data.answer));
      topicId=topic.id;
    }
    const {data:consultation,error}=await sbRef.from('accounting_consultations').insert({user_id:window.currentUser.id,topic_id:topicId,question,ai_answer:data.answer||null,ai_caution:data.caution||null,ai_model:data.model||null,consultation_type:data.consultation_type||'accounting',ai_tax_category_candidates:Array.isArray(data.tax_category_candidates)?data.tax_category_candidates:[]}).select().single();if(error)throw error;
    await persistCandidates(data,consultation);
    await sbRef.from('accounting_topics').update({updated_at:new Date().toISOString(),summary:aiSummary(data.answer)}).eq('id',topicId).eq('user_id',window.currentUser.id);
    return {consultation,topicId};
  }
  function aiSummary(text){const v=String(text??'').replace(/\s+/g,' ').trim();return v?(v.length>180?v.slice(0,180)+'…':v):null}
  window.askAI=async function(){
    if(busy)return;const input=document.getElementById('question');const q=input.value.trim();if(!q){window.showStatus?.('相談内容を入力してください。',true);return}ensureUI();window.clearStatus?.();document.getElementById('aiResult').classList.add('hidden');setBusy(true);
    try{const data=await askFast(q,null);window.renderAIResult?.(data);const saved=await saveResult(q,data,null);activeTopicId=saved.topicId;activeTopicTitle=(data.topic_action==='existing'&&data.topic_id)?((await sbRef.from('accounting_topics').select('title').eq('id',saved.topicId).maybeSingle()).data?.title||data.topic_title||q):(data.topic_title||q);activeThread=[{question:q,answer:data.answer}];showTopic(activeTopicId,activeTopicTitle);input.value='';window.showStatus?.('AI回答を取得しました。テーマ「'+esc2(activeTopicTitle)+'」に保存しました。');
      if(typeof window.loadData==='function')window.loadData().catch(console.warn);
    }catch(e){console.error(e);window.showStatus?.('AI相談に失敗しました：'+esc2(e.message||e),true)}finally{setBusy(false)}
  };
  window.askFollowup=async function(){
    if(busy||!activeTopicId)return;const input=document.getElementById('followupQuestion');const q=input.value.trim();if(!q)return;setBusy(true);const btn=document.getElementById('followupButton');btn.disabled=true;
    try{const data=await askFast(q,activeTopicId);window.renderAIResult?.(data);if(data.topic_action==='new'){document.getElementById('topicNotice').classList.remove('hidden');document.getElementById('topicNotice').textContent='この質問は別テーマ「'+(data.topic_title||'新しいテーマ')+'」として分ける提案です。今回は現在のテーマには自動保存しません。';return}const saved=await saveResult(q,data,activeTopicId);activeThread.push({question:q,answer:data.answer});input.value='';window.showStatus?.('追加質問を同じテーマに保存しました。');if(typeof window.loadData==='function')window.loadData().catch(console.warn)}catch(e){console.error(e);window.showStatus?.('追加質問に失敗しました：'+esc2(e.message||e),true)}finally{setBusy(false);btn.disabled=false}
  };
  window.saveConsultation=async function(){return originalSave?.()};
  ensureUI();
})();
