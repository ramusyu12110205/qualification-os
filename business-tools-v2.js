(()=>{
  const STYLE_ID='business-tools-style';
  const PANEL_ID='panel-tools';
  const TAB_ID='tab-tools';

  function inject(){
    if(document.getElementById(TAB_ID))return;
    const nav=document.querySelector('.tabs');
    const box=document.getElementById('panel-box');
    if(!nav||!box)return;

    const tab=document.createElement('button');
    tab.id=TAB_ID;tab.className='tab-button';tab.textContent='業務ツール';
    tab.onclick=()=>window.switchTab('tools');nav.appendChild(tab);

    const panel=document.createElement('section');
    panel.id=PANEL_ID;panel.className='tab-panel hidden';
    panel.innerHTML=`
      <div class="card">
        <div class="kicker">BUSINESS TOOLS</div>
        <div class="consult-head"><div><h2 class="hero-title">業務ツール</h2><p class="muted">税務・会計の実務で使う計算ツールをまとめています。</p></div><div class="icon">🧮</div></div>
        <div class="tool-grid"><button class="tool-card active" onclick="businessTools.open('withholding')"><span class="tool-icon">🧾</span><span><b>源泉徴収税額計算</b><small>報酬から源泉徴収税額・手取りを計算</small></span></button></div>
      </div>
      <div id="tool-withholding" class="card tool-panel">
        <div class="kicker">WITHHOLDING TAX</div><h2>源泉徴収税額計算</h2>
        <p class="muted small">「報酬金額 → 手取り」と「手取り → 報酬金額」の2方向から計算できます。</p>
        <div class="tool-section"><div class="tool-section-title">① 計算方向</div>
          <div class="tool-switch tool-direction" id="withholding-direction">
            <button class="tool-mode active" data-direction="from-fee">報酬金額から<br><span>源泉・手取りを計算</span></button>
            <button class="tool-mode" data-direction="from-takehome">手取り金額から<br><span>報酬金額を逆算</span></button>
          </div>
        </div>
        <div class="tool-section"><div class="tool-section-title">② 消費税の扱い</div>
          <div class="tool-switch" id="withholding-tax-mode">
            <button class="tool-mode active" data-mode="inclusive">消費税計算あり<br><span>内税</span></button>
            <button class="tool-mode" data-mode="exclusive">消費税計算あり<br><span>外税</span></button>
            <button class="tool-mode" data-mode="none">消費税計算なし</button>
          </div>
        </div>
        <div class="tool-section"><label for="withholding-amount" id="withholding-input-label">③ 報酬金額</label>
          <div class="amount-input-wrap"><input id="withholding-amount" type="number" min="0" step="1" inputmode="numeric" placeholder="例：110000"><span>円</span></div>
          <div class="tool-hint" id="withholding-amount-hint">税込の請求金額を入力してください。</div>
        </div>
        <div class="tool-section"><div class="tool-section-title">③ 計算結果</div>
          <div id="withholding-result" class="result-grid">
            <div class="result-box"><span>請求金額（税込）</span><b id="wr-gross">—</b><em>円</em></div>
            <div class="result-box"><span>消費税額</span><b id="wr-consumption">—</b><em>円</em></div>
            <div class="result-box"><span>報酬金額（消費税別）</span><b id="wr-net-fee">—</b><em>円</em></div>
            <div class="result-box highlight"><span>源泉徴収税額</span><b id="wr-withholding">—</b><em>円</em></div>
            <div class="result-box highlight"><span>手取り金額</span><b id="wr-takehome">—</b><em>円</em></div>
          </div><div id="withholding-note" class="notice small">金額を入力すると計算します。</div>
        </div>
        <div class="tool-formula"><b>計算式</b><div id="withholding-formula">報酬金額（消費税別） × 10.21%</div><div class="muted small">100万円を超える部分は20.42%を適用します。源泉徴収税額の1円未満は切り捨てます。</div></div>
      </div>`;
    box.insertAdjacentElement('afterend',panel);

    if(!document.getElementById(STYLE_ID)){
      const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
        .tool-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:16px}.tool-card{display:flex;align-items:center;gap:12px;text-align:left;padding:15px;border:1px solid #33405f;border-radius:16px;background:#0f1627;color:#f5f7ff;cursor:pointer}.tool-card.active{border-color:#7257c8;box-shadow:0 0 0 1px rgba(139,92,246,.2)}.tool-icon{font-size:28px}.tool-card b{display:block}.tool-card small{display:block;color:#98a3bf;margin-top:4px;line-height:1.45}.tool-panel{margin-top:14px}.tool-section{margin-top:20px;padding-top:18px;border-top:1px solid #26314d}.tool-section-title{font-weight:900;margin-bottom:10px}.tool-switch{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tool-switch.tool-direction{grid-template-columns:repeat(2,1fr)}.tool-mode{background:#11182a;color:#aeb8d3;border:1px solid #2b3550;min-height:58px}.tool-mode.active{background:#30205f;color:#fff;border-color:#7257c8}.tool-mode span{font-size:13px;color:#cbd4ea}.amount-input-wrap{display:flex;align-items:center;gap:9px}.amount-input-wrap input{text-align:right;font-size:24px}.amount-input-wrap span{font-size:16px;white-space:nowrap}.tool-hint{color:#98a3bf;font-size:12px;margin-top:7px}.result-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.result-box{display:grid;grid-template-columns:1fr auto;align-items:end;gap:4px;padding:14px;border:1px solid #33405f;border-radius:14px;background:#0f1627}.result-box span{grid-column:1/-1;color:#b8c2da;font-size:13px}.result-box b{text-align:right;font-size:24px}.result-box em{font-style:normal;font-size:13px}.result-box.highlight{border-color:#4a3d78;background:linear-gradient(145deg,#15132a,#0c1220)}.tool-formula{margin-top:16px;padding:14px;border:1px solid #33405f;border-radius:14px;background:#0c1322;line-height:1.7}@media(max-width:600px){.tool-switch,.tool-switch.tool-direction{grid-template-columns:1fr}.result-grid{grid-template-columns:1fr}.result-box b{font-size:22px}}
      `;document.head.appendChild(style);
    }
    [...document.querySelectorAll('#withholding-tax-mode .tool-mode')].forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('#withholding-tax-mode .tool-mode').forEach(x=>x.classList.toggle('active',x===btn));businessTools.mode=btn.dataset.mode;businessTools.updateLabels();businessTools.calculate()}));
    [...document.querySelectorAll('#withholding-direction .tool-mode')].forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('#withholding-direction .tool-mode').forEach(x=>x.classList.toggle('active',x===btn));businessTools.direction=btn.dataset.direction;businessTools.updateLabels();businessTools.calculate()}));
    document.getElementById('withholding-amount').addEventListener('input',()=>businessTools.calculate());
    const original=window.switchTab;window.switchTab=function(tab){if(tab==='tools'){['consult','history','box'].forEach(name=>{document.getElementById('panel-'+name)?.classList.add('hidden');document.getElementById('tab-'+name)?.classList.remove('active')});document.getElementById(PANEL_ID)?.classList.remove('hidden');document.getElementById(TAB_ID)?.classList.add('active');businessTools.updateLabels();businessTools.calculate();return}original(tab);document.getElementById(PANEL_ID)?.classList.add('hidden');document.getElementById(TAB_ID)?.classList.remove('active')};
  }
  window.businessTools={mode:'inclusive',direction:'from-fee',open(name){if(name==='withholding')window.switchTab('tools')},floorYen(v){return Math.floor(v+1e-9)},calcWithholding(fee){return fee<=1000000?this.floorYen(fee*0.1021):this.floorYen((fee-1000000)*0.2042+102100)},invoiceFromFee(fee){return this.mode==='none'?fee:fee+this.floorYen(fee*0.1)},consumptionFromFee(fee){return this.mode==='none'?0:this.floorYen(fee*0.1)},takehomeFromFee(fee){return this.invoiceFromFee(fee)-this.calcWithholding(fee)},reverseTakehome(target){if(target<=0)return 0;const taxIncluded=this.mode!=='none';const factor=taxIncluded?1.1:1;const boundary=this.takehomeFromFee(1000000);let fee;if(target<=boundary)fee=target/(factor-0.1021);else fee=(target-102100)/(factor-0.2042);let c=Math.max(0,this.floorYen(fee));while(this.takehomeFromFee(c)<target)c++;while(c>0&&this.takehomeFromFee(c-1)>=target)c--;return c},updateLabels(){const fromFee=this.direction==='from-fee';document.getElementById('withholding-input-label').textContent=fromFee?'③ 報酬金額':'③ 手取り金額';document.getElementById('withholding-amount').placeholder=fromFee?'例：110000':'例：99790';const hint={inclusive:'税込の請求金額を入力してください。',exclusive:'消費税を除いた報酬金額を入力してください。',none:'源泉徴収の対象となる報酬金額を入力してください。'}[this.mode];document.getElementById('withholding-amount-hint').textContent=fromFee?hint:'希望する手取り金額を入力してください。'},calculate(){const input=document.getElementById('withholding-amount');if(!input)return;const v=Math.max(0,Number(input.value)||0);if(!v){['wr-gross','wr-consumption','wr-net-fee','wr-withholding','wr-takehome'].forEach(id=>document.getElementById(id).textContent='—');document.getElementById('withholding-note').textContent='金額を入力すると計算します。';return}let fee;if(this.direction==='from-fee')fee=this.mode==='inclusive'?this.floorYen(v/1.1):v;else fee=this.reverseTakehome(v);const consumption=this.consumptionFromFee(fee),gross=this.invoiceFromFee(fee),withholding=this.calcWithholding(fee),takehome=gross-withholding,fmt=n=>n.toLocaleString('ja-JP');document.getElementById('wr-gross').textContent=fmt(gross);document.getElementById('wr-consumption').textContent=fmt(consumption);document.getElementById('wr-net-fee').textContent=fmt(fee);document.getElementById('wr-withholding').textContent=fmt(withholding);document.getElementById('wr-takehome').textContent=fmt(takehome);document.getElementById('withholding-note').textContent=this.direction==='from-fee'?(fee<=1000000?'100万円以下のため、10.21%で計算しています。':'100万円を超える部分に20.42%を適用して計算しています。'):`手取り ${fmt(v)}円になるよう、報酬金額を逆算しています。実際の手取りは ${fmt(takehome)}円です。`;document.getElementById('withholding-formula').textContent=fee<=1000000?'報酬金額（消費税別） × 10.21%':'（報酬金額（消費税別） − 1,000,000円）× 20.42% ＋ 102,100円'}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});else inject();
})();
