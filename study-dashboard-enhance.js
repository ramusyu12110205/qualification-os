(function(){
  function pad(n){return String(n).padStart(2,'0')}
  function localDate(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function parseDate(s){return new Date(s+'T00:00:00')}
  function addDays(s,n){var d=parseDate(s);d.setDate(d.getDate()+n);return localDate(d)}
  function fmtDate(s){if(!s)return '—';var d=parseDate(s);return (d.getMonth()+1)+'/'+d.getDate()}
  function minutesText(m){m=Number(m)||0;return Math.floor(m/60)+'時間'+(m%60)+'分'}
  function escapeHtml(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]})}
  function getData(){
    try{return {q:qualifications||[],s:subjects||[],st:sessions||[]}}
    catch(e){return {q:[],s:[],st:[]}}
  }
  function weekStart(d){
    var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    var day=x.getDay();
    x.setDate(x.getDate()-(day===0?6:day-1));
    return x
  }
  function iso(d){return localDate(d)}
  function sumRange(st,start,end){
    var total=0;
    st.forEach(function(s){if(s.study_date>=start&&s.study_date<=end)total+=Number(s.minutes||0)});
    return total
  }
  function dayMap(st){
    var m={};st.forEach(function(s){m[s.study_date]=(m[s.study_date]||0)+Number(s.minutes||0)});return m
  }
  function pctChange(a,b){return b?Math.round((a-b)/b*100):null}
  function projectStats(q,st){
    var rows=st.filter(function(s){return s.qualification_id===q.id});
    var total=rows.reduce(function(a,s){return a+Number(s.minutes||0)},0);
    var dates=rows.map(function(s){return s.study_date}).sort();
    var start=dates[0]||q.created_at&&q.created_at.slice(0,10);
    var days=0;
    if(start){days=Math.max(1,Math.floor((parseDate(localDate())-parseDate(start))/86400000)+1)}
    return {total:total,start:start,avg:days?Math.round(total/days):0,days:dates.length}
  }
  function renderStudyDashboard(){
    var box=document.getElementById('dashboard');if(!box)return;
    var data=getData(),st=data.st,q=data.q;
    var now=new Date(),ws=weekStart(now),start=iso(ws),end=iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+6));
    var prevStart=iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()-7)),prevEnd=iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()-1));
    var map=dayMap(st),weekTotal=sumRange(st,start,end),prevTotal=sumRange(st,prevStart,prevEnd);
    var activeThis=0;for(var i=0;i<7;i++){if((map[iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+i))]||0)>0)activeThis++}
    var lastMonth=new Date(now.getFullYear(),now.getMonth()-1,1),lmStart=iso(lastMonth),lmEnd=iso(new Date(now.getFullYear(),now.getMonth(),0));
    var lastMonthTotal=sumRange(st,lmStart,lmEnd),lmDays=0;for(var ld=1;ld<=new Date(now.getFullYear(),now.getMonth(),0).getDate();ld++){if((map[iso(new Date(lastMonth.getFullYear(),lastMonth.getMonth(),ld))]||0)>0)lmDays++}
    var thisAvg=Math.round(weekTotal/7),prevAvg=Math.round(prevTotal/7),lastMonthAvg=lmDays?Math.round(lastMonthTotal/lmDays):0;
    var change=pctChange(weekTotal,prevTotal);
    var bars='';
    for(var bi=0;bi<7;bi++){
      var d=new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+bi),key=iso(d),cur=map[key]||0,prevKey=iso(new Date(d.getFullYear(),d.getMonth(),d.getDate()-7)),prev=map[prevKey]||0;
      bars+='<div class="sd-day"><div class="sd-bars"><div class="sd-prev" style="height:'+Math.min(100,Math.round(prev/180*100))+'%"></div><div class="sd-current" style="height:'+Math.min(100,Math.round(cur/180*100))+'%"></div></div><div class="sd-min">'+(cur||0)+'分</div><div class="sd-label">'+['月','火','水','木','金','土','日'][bi]+'</div></div>'
    }
    var projects=q.map(function(qq){var ps=projectStats(qq,st);var exam=qq.exam_date?Math.ceil((parseDate(qq.exam_date)-parseDate(localDate()))/86400000):null;return {q:qq,p:ps,exam:exam}}).filter(function(x){return x.p.total>0||x.q.exam_date}).sort(function(a,b){return b.p.total-a.p.total});
    var projectHtml=projects.length?projects.map(function(x){return '<div class="sd-project"><div><div class="sd-project-name">'+escapeHtml(x.q.name)+'</div><div class="muted small">'+(x.p.start?'開始 '+fmtDate(x.p.start):'学習記録なし')+(x.exam!=null?' ・ '+(x.exam>=0?'試験まで '+x.exam+'日':'試験済み'):'')+'</div></div><div class="sd-project-time">'+minutesText(x.p.total)+'</div><div class="sd-project-sub">プロジェクト平均 '+x.p.avg+'分/日 ・ 学習日 '+x.p.days+'日</div></div>'}).join(''):'<div class="item">まだ学習プロジェクトがありません。</div>';
    var trend=change==null?'—':(change>0?'＋':'')+change+'%';
    box.innerHTML='<div class="sd-wrap">'+
      '<div class="sd-section-head"><div><div class="kicker">WEEKLY STUDY</div><h3>今週の学習時間</h3><div class="muted small">月曜〜日曜で比較。濃い棒が今週、薄い棒が先週。</div></div><span class="badge">'+start.replace(/-/g,'.')+' 〜 '+end.slice(5).replace('-','.')+'</span></div>'+
      '<div class="sd-chart">'+bars+'</div>'+
      '<div class="sd-summary"><div><span>今週</span><strong>'+minutesText(weekTotal)+'</strong></div><div><span>1日平均</span><strong>'+thisAvg+'分</strong></div><div><span>先週比</span><strong>'+trend+'</strong></div></div>'+
      '<div class="sd-compare"><div class="sd-compare-card"><span>先週の総合計</span><b>'+minutesText(prevTotal)+'</b><small>1日平均 '+prevAvg+'分</small></div><div class="sd-compare-card"><span>先月の学習</span><b>'+minutesText(lastMonthTotal)+'</b><small>学習日平均 '+lastMonthAvg+'分</small></div><div class="sd-compare-card"><span>今週の学習日数</span><b>'+activeThis+'日</b><small>7日中</small></div></div>'+
      '<div class="sd-project-head"><div><div class="kicker">PROJECTS</div><h3>学習プロジェクト</h3><div class="muted small">資格ごとの累計とプロジェクト期間平均。資格が終わっても記録は残ります。</div></div></div>'+projectHtml+
      '</div>';
    setStatusTabLocal('qualification');
  }
  function setStatusTabLocal(type){
    var buttons=document.querySelectorAll('#tab-status .row > button');
    buttons.forEach(function(b,i){var active=(type==='qualification'&&i===0)||(type==='all'&&i===1)||(type==='month'&&i===2);b.classList.toggle('primary',active);b.classList.toggle('light',!active)})
  }
  function installStyle(){
    if(document.getElementById('studyDashboardEnhanceStyle'))return;
    var s=document.createElement('style');s.id='studyDashboardEnhanceStyle';s.textContent='.sd-wrap{padding-top:4px}.sd-section-head,.sd-project-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.sd-section-head h3,.sd-project-head h3{margin:3px 0 4px;font-size:22px}.sd-chart{height:210px;display:flex;align-items:flex-end;gap:8px;padding:22px 8px 0;margin:10px 0 0;border-bottom:1px solid #26314d}.sd-day{flex:1;min-width:0;text-align:center}.sd-bars{height:150px;display:flex;align-items:flex-end;justify-content:center;gap:3px}.sd-bars>div{width:36%;max-width:24px;border-radius:7px 7px 2px 2px;min-height:2px}.sd-prev{background:#35405e;opacity:.65}.sd-current{background:linear-gradient(180deg,#22d3ee,#8b5cf6)}.sd-min{font-size:11px;color:#cbd4ec;margin-top:5px}.sd-label{font-weight:800;color:#9fa9c7;margin-top:5px}.sd-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.sd-summary>div,.sd-compare-card{background:#0e1422;border:1px solid #26314d;border-radius:14px;padding:13px}.sd-summary span,.sd-compare-card span{display:block;color:#98a3bf;font-size:12px;font-weight:800}.sd-summary strong{display:block;font-size:22px;margin-top:3px}.sd-compare{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}.sd-compare-card b{display:block;font-size:20px;margin:3px 0}.sd-compare-card small{color:#98a3bf}.sd-project-head{margin-top:8px;margin-bottom:8px}.sd-project{display:grid;grid-template-columns:1fr auto;gap:3px 12px;align-items:center;border:1px solid #26314d;border-radius:14px;padding:14px;margin:9px 0;background:#0f1627}.sd-project-name{font-size:17px;font-weight:900}.sd-project-time{font-size:20px;font-weight:900}.sd-project-sub{grid-column:1/-1;color:#98a3bf;font-size:12px}.sd-project .small{margin-top:3px}@media(max-width:700px){.sd-chart{height:190px;gap:4px}.sd-bars{height:135px}.sd-summary,.sd-compare{grid-template-columns:1fr}.sd-section-head,.sd-project-head{align-items:flex-start;flex-direction:column}.sd-project-time{font-size:17px}}';document.head.appendChild(s)
  }
  function boot(){
    installStyle();
    if(typeof window.showDashboard==='function')window.showDashboard=renderStudyDashboard;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
