(()=>{
  const PANEL_ID='panel-transport-expense';
  const STORAGE_KEY='qualification-os-transport-expense-v1';
  let ready=false;
  let state={routes:[],visits:[],usage:{}};

  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const yen=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const monthNow=()=>today().slice(0,7);
  const id=()=>crypto.randomUUID();
  const visitAmount=v=>Math.round(Number(v?.amount??v?.roundTrip)||0);

  function load(){
    try{
      const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      state={
        routes:Array.isArray(x.routes)?x.routes.map(r=>({...r,station:r.station||''})):[],
        visits:Array.isArray(x.visits)?x.visits:[],
        usage:x.usage&&typeof x.usage==='object'?x.usage:{}
      };
    }catch{state={routes:[],visits:[],usage:{}}}
  }
  const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));

  function inject(){
    if(ready)return;
    const tools=document.getElementById('panel-tools');
    const grid=tools?.querySelector('.tool-grid');
    if(!tools||!grid)return;
    ready=true;load();

    const card=document.createElement('button');
    card.className='tool-card';
    card.innerHTML='<span class="tool-icon">🚃</span><span><b>交通費精算</b><small>訪問日を記録して月ごとの交通費一覧を作成・印刷</small></span>';
    card.addEventListener('click',()=>transportExpenseTool.open());
    grid.appendChild(card);

    const panel=document.createElement('div');
    panel.id=PANEL_ID;
    panel.className='card tool-panel hidden';
    panel.innerHTML=`
      <div class="kicker">TRANSPORTATION EXPENSE</div>
      <div class="transport-head"><div><h2>交通費精算</h2><p class="muted small">固定ルートの通常金額を登録し、実際の訪問時は必要に応じて金額を変更できます。</p></div><button class="light" id="transport-back">← 業務ツール</button></div>

      <div class="tool-section">
        <div class="tool-section-title">① 固定ルート</div>
        <div class="transport-add-grid">
          <input id="transport-name" placeholder="訪問先・研修先">
          <input id="transport-station" placeholder="駅・経路（例：大船→上大岡）">
          <input id="transport-roundtrip" type="number" min="0" step="1" inputmode="numeric" placeholder="通常金額（円）">
          <button class="primary" id="transport-add">＋ ルート追加</button>
        </div>
        <div id="transport-routes" class="transport-routes"></div>
      </div>

      <div class="tool-section">
        <div class="tool-section-title">② 訪問を記録</div>
        <div class="transport-visit-add">
          <input id="transport-visit-date" type="date" value="${today()}">
          <select id="transport-visit-route"><option value="">訪問先を選択</option></select>
          <input id="transport-visit-amount" type="number" min="0" step="1" inputmode="numeric" placeholder="今回の金額（円）">
          <button class="primary" id="transport-add-visit">＋ 訪問を記録</button>
        </div>
        <div class="muted small transport-visit-note">通常金額が自動入力されます。遅延・振替・別ルートなどがあった日は、今回の金額だけ変更してください。</div>
      </div>

      <div class="tool-section">
        <div class="tool-section-title">③ 月別一覧</div>
        <div class="transport-month-row">
          <input id="transport-month" type="month" value="${monthNow()}">
          <button class="light" id="transport-print">🖨 印刷</button>
        </div>
        <div id="transport-list"></div>
      </div>

      <div class="tool-section">
        <div class="transport-total"><span>月間合計</span><b id="transport-total">0円</b></div>
      </div>

      <div id="transport-print-area" class="transport-print-area"></div>`;
    tools.appendChild(panel);

    const style=document.createElement('style');
    style.textContent=`
      .transport-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.transport-head h2{margin:0}.transport-head button{white-space:nowrap}
      .transport-add-grid{display:grid;grid-template-columns:1.4fr 1fr .8fr auto;gap:8px}.transport-routes{margin-top:10px}
      .transport-route{display:grid;grid-template-columns:1.35fr 1fr .7fr auto auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid #26314d}.transport-route:last-child{border-bottom:0}.transport-route strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.transport-price{color:#b9c4df;font-size:13px}.transport-remove,.transport-edit{min-height:38px;padding:7px 10px}
      .transport-visit-add{display:grid;grid-template-columns:170px minmax(0,1fr) 150px auto;gap:8px}.transport-visit-note{margin-top:7px}.transport-month-row{display:flex;gap:8px;align-items:center}.transport-month-row input{max-width:190px}.transport-month-row button{margin-left:auto}
      .transport-list{margin-top:12px;border:1px solid #33405f;border-radius:14px;overflow:hidden}.transport-list-head,.transport-list-row{display:grid;grid-template-columns:80px minmax(0,1.5fr) minmax(0,1fr) 90px 44px;gap:8px;align-items:center;padding:9px 10px}.transport-list-head{background:#11182a;color:#98a3bf;font-size:12px;font-weight:900}.transport-list-row{border-top:1px solid #26314d;font-size:13px}.transport-list-row>span{min-width:0;overflow-wrap:anywhere}.transport-list-empty{padding:18px;text-align:center;color:#98a3bf;border:1px dashed #33405f;border-radius:12px;margin-top:12px}.transport-delete{background:transparent;color:#fb7185;padding:4px;font-size:16px;min-height:30px}
      .transport-total{display:flex;justify-content:space-between;align-items:center;padding:18px;border-radius:15px;background:linear-gradient(145deg,#191735,#101627);border:1px solid #4a3d78}.transport-total span{color:#c5cce0}.transport-total b{font-size:28px;color:#fff}
      .transport-print-area{display:none}
      @media(max-width:700px){.transport-add-grid{grid-template-columns:1fr 1fr}.transport-add-grid input:first-child{grid-column:1/-1}.transport-add-grid button{grid-column:1/-1}.transport-route{grid-template-columns:1fr 1fr}.transport-route strong{grid-column:1/-1}.transport-visit-add{grid-template-columns:1fr 1fr}.transport-visit-add button{grid-column:1/-1}.transport-month-row{flex-wrap:wrap}.transport-month-row button{margin-left:0}.transport-list-head,.transport-list-row{grid-template-columns:62px minmax(0,1.4fr) minmax(0,1fr) 75px 36px;padding:8px 6px;gap:5px}}
      @media(max-width:600px){.transport-head{flex-direction:column}.transport-head button{width:100%}.transport-visit-add{grid-template-columns:1fr}.transport-visit-add button{grid-column:auto}}

      @media print{
        @page{size:A4 portrait;margin:0}
        body{background:#fff!important;color:#000!important;max-width:none!important;margin:0!important;padding:0!important}
        body>*:not(#app){display:none!important}
        #app{display:block!important}
        #app>*:not(#panel-tools){display:none!important}
        #panel-tools{display:block!important;margin:0!important;padding:0!important;background:#fff!important;border:0!important;box-shadow:none!important}
        #panel-tools>*:not(#panel-transport-expense){display:none!important}
        #panel-transport-expense{display:block!important;margin:0!important;padding:0!important;background:#fff!important;border:0!important;box-shadow:none!important}
        #panel-transport-expense>*:not(#transport-print-area){display:none!important}
        #transport-print-area{display:block!important}
        .transport-print-sheet{width:90mm;height:125mm;box-sizing:border-box;padding:4mm;border:0;overflow:hidden;background:#fff;color:#000;page-break-after:always;break-after:page}
        .transport-print-sheet:last-child{page-break-after:auto;break-after:auto}
        .transport-print-title{font-size:13pt;font-weight:900;margin:0 0 1.5mm;text-align:center}
        .transport-print-sub{font-size:7pt;margin-bottom:2mm;text-align:right}
        .transport-print-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.5pt;line-height:1.2}
        .transport-print-table th,.transport-print-table td{border:0.25mm solid #000;padding:1mm 0.8mm;vertical-align:top;word-break:break-word}
        .transport-print-table th{font-weight:900;text-align:center;white-space:nowrap}.transport-print-table .date{width:13%}.transport-print-table .dest{width:31%}.transport-print-table .station{width:31%}.transport-print-table .fare{width:25%;text-align:right;white-space:nowrap}
        .transport-print-total{margin-top:2mm;text-align:right;font-size:9pt;font-weight:900}
      }
    `;
    document.head.appendChild(style);

    document.getElementById('transport-back').onclick=()=>transportExpenseTool.close();
    document.getElementById('transport-add').onclick=addRoute;
    document.getElementById('transport-add-visit').onclick=addVisit;
    document.getElementById('transport-print').onclick=printMonth;
    document.getElementById('transport-month').addEventListener('change',render);
    document.getElementById('transport-visit-route').addEventListener('change',fillVisitAmount);
    render();
  }

  function addRoute(){
    const name=document.getElementById('transport-name').value.trim();
    const station=document.getElementById('transport-station').value.trim();
    const round=Math.max(0,Number(document.getElementById('transport-roundtrip').value)||0);
    if(!name){alert('訪問先・研修先の名前を入力してください。');return}
    if(!station){alert('駅・経路を入力してください。');return}
    if(!round){alert('通常金額を入力してください。');return}
    state.routes.push({id:id(),name,station,oneWay:Math.floor(round/2),roundTrip:round});
    save();
    document.getElementById('transport-name').value='';document.getElementById('transport-station').value='';document.getElementById('transport-roundtrip').value='';
    render();
  }

  function editRoute(routeId){
    const r=state.routes.find(x=>x.id===routeId);if(!r)return;
    const name=prompt('訪問先・研修先',r.name);if(name===null)return;
    const station=prompt('駅・経路',r.station||'');if(station===null)return;
    const round=prompt('通常金額（円）',String(r.roundTrip||0));if(round===null)return;
    const n=Math.max(0,Number(round)||0);if(!name.trim()||!station.trim()||!n){alert('訪問先・駅・通常金額を正しく入力してください。');return}
    r.name=name.trim();r.station=station.trim();r.roundTrip=Math.floor(n);r.oneWay=Math.floor(n/2);save();render();
  }

  function removeRoute(routeId){
    if(!confirm('この固定ルートを削除しますか？\n過去に記録した訪問実績は残ります。'))return;
    state.routes=state.routes.filter(r=>r.id!==routeId);save();render();
  }

  function fillVisitAmount(){
    const routeId=document.getElementById('transport-visit-route')?.value;
    const r=state.routes.find(x=>x.id===routeId);
    const input=document.getElementById('transport-visit-amount');
    if(input)input.value=r?Math.round(Number(r.roundTrip)||0):'';
  }

  function addVisit(){
    const date=document.getElementById('transport-visit-date').value;
    const routeId=document.getElementById('transport-visit-route').value;
    const amount=Math.max(0,Number(document.getElementById('transport-visit-amount').value)||0);
    const r=state.routes.find(x=>x.id===routeId);
    if(!date||!r){alert('訪問日と訪問先を選択してください。');return}
    if(!amount){alert('今回の金額を入力してください。');return}
    state.visits.push({id:id(),visitDate:date,routeId:r.id,destination:r.name,station:r.station,amount:Math.round(amount)});
    save();
    document.getElementById('transport-visit-date').value=today();
    document.getElementById('transport-visit-route').value='';
    document.getElementById('transport-visit-amount').value='';
    render();
  }

  function removeVisit(visitId){
    if(!confirm('この訪問実績を削除しますか？'))return;
    state.visits=state.visits.filter(v=>v.id!==visitId);save();render();
  }

  function render(){
    if(!ready)return;
    renderRoutes();renderRouteSelect();renderMonthList();
  }

  function renderRoutes(){
    const el=document.getElementById('transport-routes');
    if(!state.routes.length){el.innerHTML='<div class="transport-list-empty">固定ルートがまだありません。上から訪問先・駅・通常金額を登録してください。</div>';return}
    el.innerHTML=state.routes.map(r=>`<div class="transport-route"><strong>${esc(r.name)}</strong><span class="transport-price">${esc(r.station||'駅未設定')}</span><span class="transport-price">通常 ${yen(r.roundTrip)}円</span><button class="light transport-edit" onclick="transportExpenseTool.edit('${r.id}')">編集</button><button class="danger transport-remove" onclick="transportExpenseTool.remove('${r.id}')">削除</button></div>`).join('');
  }

  function renderRouteSelect(){
    const el=document.getElementById('transport-visit-route');if(!el)return;
    const current=el.value;
    el.innerHTML='<option value="">訪問先を選択</option>'+state.routes.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}${r.station?`（${esc(r.station)}）`:''}</option>`).join('');
    if(state.routes.some(r=>r.id===current)){el.value=current}else{el.value=''}
  }

  function monthVisits(){
    const month=document.getElementById('transport-month')?.value||monthNow();
    return state.visits.filter(v=>String(v.visitDate||'').slice(0,7)===month).sort((a,b)=>String(a.visitDate).localeCompare(String(b.visitDate)));
  }

  function renderMonthList(){
    const el=document.getElementById('transport-list');const visits=monthVisits();
    const total=visits.reduce((sum,v)=>sum+visitAmount(v),0);
    document.getElementById('transport-total').textContent=`${yen(total)}円`;
    if(!visits.length){el.innerHTML='<div class="transport-list-empty">この月の訪問実績はありません。</div>';return}
    const rows=visits.map(v=>`<div class="transport-list-row"><span>${esc(String(v.visitDate).slice(5).replace('-','/'))}</span><span>${esc(v.destination)}</span><span>${esc(v.station)}</span><span style="text-align:right">${yen(visitAmount(v))}円</span><button class="transport-delete" title="削除" onclick="transportExpenseTool.deleteVisit('${v.id}')">×</button></div>`).join('');
    el.innerHTML=`<div class="transport-list"><div class="transport-list-head"><span>日付</span><span>訪問先</span><span>駅</span><span>金額</span><span></span></div>${rows}</div>`;
  }

  function printMonth(){
    const visits=monthVisits();
    if(!visits.length){alert('印刷する訪問実績がありません。');return}
    const month=document.getElementById('transport-month').value||monthNow();
    const [y,m]=month.split('-');
    const total=visits.reduce((sum,v)=>sum+visitAmount(v),0);
    const chunks=[];
    for(let i=0;i<visits.length;i+=12)chunks.push(visits.slice(i,i+12));
    document.getElementById('transport-print-area').innerHTML=chunks.map((chunk,index)=>{
      const rows=chunk.map(v=>`<tr><td class="date">${esc(String(v.visitDate).slice(5).replace('-','/'))}</td><td class="dest">${esc(v.destination)}</td><td class="station">${esc(v.station)}</td><td class="fare">${yen(visitAmount(v))}円</td></tr>`).join('');
      const sub=chunks.length>1?`<div class="transport-print-sub">${index+1} / ${chunks.length}</div>`:'';
      const totalLine=index===chunks.length-1?`<div class="transport-print-total">月間合計：${yen(total)}円</div>`:'';
      return `<section class="transport-print-sheet"><div class="transport-print-title">${y}年${Number(m)}月 交通費精算</div>${sub}<table class="transport-print-table"><thead><tr><th class="date">日付</th><th class="dest">訪問先</th><th class="station">駅</th><th class="fare">金額</th></tr></thead><tbody>${rows}</tbody></table>${totalLine}</section>`;
    }).join('');
    setTimeout(()=>window.print(),50);
  }

  window.transportExpenseTool={
    open(){inject();document.getElementById('tool-withholding')?.classList.add('hidden');document.getElementById('panel-interest')?.classList.add('hidden');document.getElementById(PANEL_ID)?.classList.remove('hidden');document.querySelectorAll('#panel-tools .tool-card').forEach(x=>x.classList.remove('active'));const cards=document.querySelectorAll('#panel-tools .tool-card');cards[cards.length-1]?.classList.add('active');render()},
    close(){document.getElementById(PANEL_ID)?.classList.add('hidden');document.getElementById('tool-withholding')?.classList.remove('hidden');document.getElementById('panel-interest')?.classList.add('hidden');document.querySelector('#panel-tools .tool-card')?.classList.add('active')},
    remove:removeRoute,
    edit:editRoute,
    deleteVisit:removeVisit
  };

  const timer=setInterval(()=>{inject();if(ready)clearInterval(timer)},300);
})();
