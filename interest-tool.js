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
    const panel=document.createElement('div');
    panel.id=PANEL_ID;
    panel.className='card tool-panel hidden';
    panel.innerHTML=`
      <div class="kicker">INTEREST WITHHOLDING TAX</div>
      <div class="interest-head"><div><h2>預金利息の源泉徴収税額計算</h2><p class="muted small">「利息金額 → 入金額」と「入金額 → 利息金額」の2方向から計算できます。</p></div><button class="light" id="interest-back">← 業務ツール</button></div>
      <div class="tool-section"><div class="tool-section-title">① 計算方向</div>
        <div class="tool-switch tool-direction" id="interest-direction">
          <button class="tool-mode" data-direction="from-interest">利息金額から<br><span>源泉徴収・入金額を計算</span></button>
          <button class="tool-mode active" data-direction="from-deposit">入金額から<br><span>利息金額を逆算</span></button>
        </div>
      </div>
      <div class="tool-section"><div class="tool-section-title">② 受取人</div>
        <div class="tool-switch tool-direction" id="interest-taxpayer">
          <button class="tool-mode active" data-taxpayer="individual">個人<br><span>所得税＋復興特別所得税＋地方税</span></button>
          <button class="tool-mode" data-taxpayer="corporation">法人<br><span>所得税＋復興特別所得税</span></button>
        </div>
      </div>
      <div class="tool-section"><label for="interest-amount" id="interest-input-label">③ 利息の入金額</label>
        <div class="amount-input-wrap"><input id="interest-amount" type="number" min="0" step="1" inputmode="numeric" placeholder="例：12000"><span>円</span></div>
        <div class="tool-hint" id="interest-input-hint">実際に口座へ入金された金額を入力してください。</div>
      </div>
      <div class="tool-section"><div class="tool-section-title">④ 計算結果</div>
        <div id="interest-result" class="result-grid">
          <div class="result-box"><span>利息金額（税引前）</span><b id="ir-gross">—</b><em>円</em></div>
          <div class="result-box"><span>所得税・復興特別所得税</span><b id="ir-national">—</b><em>円</em></div>
          <div class="result-box"><span>地方税</span><b id="ir-local">—</b><em>円</em></div>
          <div class="result-box highlight"><span>源泉徴収税額合計</span><b id="ir-tax">—</b><em>円</em></div>
          <div class="result-box highlight"><span>利息の入金額（手取り）</span><b id="ir-net">—</b><em>円</em></div>
        </div>
        <div id="interest-note" class="notice small">金額を入力すると計算します。</div>
      </div>
      <div class="tool-formula"><b>計算式</b><div id="interest-formula">利息金額 × 15.315%（所得税・復興特別所得税）＋ 利息金額 × 5%（地方税）</div><div class="muted small">預貯金などの利子は原則として15.315%の所得税・復興特別所得税が源泉徴収され、個人は他に地方税5%が特別徴収されます。citeturn0search0turn0search2</div></div>`;
    tools.appendChild(panel);
    if(!document.getElementById(STYLE_ID)){
      const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`.interest-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.interest-head h2{margin:0}.interest-head button{white-space:nowrap}@media(max-width:600px){.interest-head{flex-direction:column}.interest-head button{width:100%}}`;
      document.head.appendChild(style);
    }
    document.getElementById('interest-back').onclick=()=>interestTool.close();
    [...document.querySelectorAll('#interest-direction .tool-mode')].forEach(btn=>btn.onclick=()=>{document.querySelectorAll('#interest-direction .tool-mode').forEach(x=>x.classList.toggle('active',x===btn));interestTool.direction=btn.dataset.direction;interestTool.updateLabels();interestTool.calculate()});
    [...document.querySelectorAll('#interest-taxpayer .tool-mode')].forEach(btn=>btn.onclick=()=>{document.querySelectorAll('#interest-taxpayer .tool-mode').forEach(x=>x.classList.toggle('active',x===btn));interestTool.taxpayer=btn.dataset.taxpayer;interestTool.calculate()});
    document.getElementById('interest-amount').addEventListener('input',()=>interestTool.calculate());
  }
  window.interestTool={direction:'from-deposit',taxpayer:'individual',open(){inject();document.getElementById('tool-withholding')?.classList.add('hidden');document.getElementById(PANEL_ID)?.classList.remove('hidden');document.querySelectorAll('#panel-tools .tool-card').forEach(x=>x.classList.remove('active'));const cards=document.querySelectorAll('#panel-tools .tool-card');if(cards[1])cards[1].classList.add('active');this.updateLabels();this.calculate()},close(){document.getElementById(PANEL_ID)?.classList.add('hidden');document.getElementById('tool-withholding')?.classList.remove('hidden');document.querySelectorAll('#panel-tools .tool-card').forEach(x=>x.classList.remove('active'));document.querySelector('#panel-tools .tool-card')?.classList.add('active')},floor(v){return Math.floor(v+1e-9)},rates(){return this.taxpayer==='individual'?{national:.15315,local:.05}:{national:.15315,local:0}},tax(gross){const r=this.rates();const national=this.floor(gross*r.national);const local=this.floor(gross*r.local);return {national,local,total:national+local}},net(gross){const t=this.tax(gross);return gross-t.total},reverse(target){if(target<=0)return 0;const r=this.rates();let gross=this.floor(target/(1-r.national-r.local));while(this.net(gross)<target)gross++;while(gross>0&&this.net(gross-1)>=target)gross--;return gross},updateLabels(){const fromInterest=this.direction==='from-interest';document.getElementById('interest-input-label').textContent=fromInterest?'③ 利息金額（税引前）':'③ 利息の入金額';document.getElementById('interest-amount').placeholder=fromInterest?'例：14170':'例：12000';document.getElementById('interest-input-hint').textContent=fromInterest?'源泉徴収前の利息金額を入力してください。':'実際に口座へ入金された金額を入力してください。'},calculate(){const el=document.getElementById('interest-amount');if(!el)return;const v=Math.max(0,Number(el.value)||0);if(!v){['ir-gross','ir-national','ir-local','ir-tax','ir-net'].forEach(id=>document.getElementById(id).textContent='—');document.getElementById('interest-note').textContent='金額を入力すると計算します。';return}const gross=this.direction==='from-interest'?this.floor(v):this.reverse(v);const t=this.tax(gross),net=this.net(gross),fmt=n=>n.toLocaleString('ja-JP');document.getElementById('ir-gross').textContent=fmt(gross);document.getElementById('ir-national').textContent=fmt(t.national);document.getElementById('ir-local').textContent=fmt(t.local);document.getElementById('ir-tax').textContent=fmt(t.total);document.getElementById('ir-net').textContent=fmt(net);const rate=this.taxpayer==='individual'?'20.315%':'15.315%';document.getElementById('interest-note').textContent=this.direction==='from-interest'?(this.taxpayer==='individual'?'個人：合計20.315%（所得税・復興特別所得税15.315%＋地方税5%）で計算しています。':'法人：15.315%（所得税・復興特別所得税）で計算しています。'):`入金額 ${fmt(v)}円になるよう、税引前の利息金額を逆算しています。実際の入金額は ${fmt(net)}円です。`;document.getElementById('interest-formula').textContent=this.taxpayer==='individual'?'利息金額 × 15.315% ＋ 利息金額 × 5%':'利息金額 × 15.315%';}}
  const timer=setInterval(()=>{inject();if(ready)clearInterval(timer)},300);
})();
