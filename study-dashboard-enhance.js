// study dashboard: weekly / monthly / qualification views
(function(){
  function pad(n){return String(n).padStart(2,'0')}
  function localDate(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function parseDate(s){return new Date(s+'T00:00:00')}
  function fmtDate(s){if(!s)return '—';var d=parseDate(s);return (d.getMonth()+1)+'/'+d.getDate()}
  function minutesText(m){m=Number(m)||0;return Math.floor(m/60)+'時間'+(m%60)+'分'}
  function escapeHtml(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]})}
  function studyDay(d){d=d||new Date();var x=new Date(d);if(x.getHours()<5)x.setDate(x.getDate()-1);return localDate(x)}
  function weekStart(d){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()),day=x.getDay();x.setDate(x.getDate()-(day===0?6:day-1));return x}
  function iso(d){return localDate(d)}
  function sumRange(st,start,end){var total=0;st.forEach(function(s){if(s.study_date>=start&&s.study_date<=end)total+=Number(s.minutes||0)});return total}
  function dayMap(st){var m={};st.forEach(function(s){m[s.study_date]=(m[s.study_date]||0)+Number(s.minutes||0)});return m}
  function pctChange(a,b){return b?Math.round((a-b)/b*100):null}
  function projectStats(q,st){var rows=st.filter(function(s){return s.qualification_id===q.id}),total=rows.reduce(function(a,s){return a+Number(s.minutes||0)},0),dates=rows.map(function(s){return s.study_date}).sort(),start=dates[0]||(q.created_at&&q.created_at.slice(0,10)),last=dates[dates.length-1]||null;return {total:total,start:start,last:last,days:[].filter.call(dates,function(v,i,a){return a.indexOf(v)===i}).length}}
  function currentWeekData(st){
    var baseDate=parseDate(studyDay()),ws=weekStart(baseDate),start=iso(ws),end=iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+6)),prevStart=iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()-7)),prevEnd=iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()-1)),map=dayMap(st),weekTotal=sumRange(st,start,end),prevTotal=sumRange(st,prevStart,prevEnd),activeThis=0;
    for(var i=0;i<7;i++)if((map[iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+i))]||0)>0)activeThis++;
    return {baseDate:baseDate,ws:ws,start:start,end:end,prevTotal:prevTotal,weekTotal:weekTotal,activeThis:activeThis,map:map};
  }
  function renderWeekly(st,q){
    var d=currentWeekData(st),change=pctChange(d.weekTotal,d.prevTotal),trend=change==null?'—':(change>0?'＋':'')+change+'%',bars='';
    for(var bi=0;bi<7;bi++){var day=new Date(d.ws.getFullYear(),d.ws.getMonth(),d.ws.getDate()+bi),key=iso(day),cur=d.map[key]||0,prev=d.map[iso(new Date(day.getFullYear(),day.getMonth(),day.getDate()-7))]||0;bars+='<div class="sd-day"><div class="sd-bars"><div class="sd-prev" style="height:'+Math.min(100,Math.round(prev/180*100))+'%"></div><div class="sd-current" style="height:'+Math.min(100,Math.round(cur/180*100))+'%"></div></div><div class="sd-min">'+minutesText(cur)+'</div><div class="sd-label">'+['月','火','水','木','金','土','日'][bi]+'</div></div>'}
    return '<div class="sd-wrap"><div class="sd-section-head"><div><div class="kicker">WEEKLY STUDY</div><h3>今週の学習時間</h3><div class="muted small">濃い棒が今週、薄い棒が先週。</div></div><span class="badge">'+d.start.replace(/-/g,'.')+' 〜 '+d.end.slice(5).replace('-','.')+'</span></div><div class="sd-chart">'+bars+'</div><div class="sd-summary"><div><span>今週</span><strong>'+minutesText(d.weekTotal)+'</strong></div><div><span>1日平均</span><strong>'+minutesText(Math.round(d.weekTotal/7))+'</strong></div><div><span>先週比</span><strong>'+trend+'</strong></div></div><div class="sd-compare"><div class="sd-compare-card"><span>先週の総合計</span><b>'+minutesText(d.prevTotal)+'</b></div><div class="sd-compare-card"><span>今週の学習日数</span><b>'+d.activeThis+'日</b><small>7日中</small></div></div></div>';
  }
  function monthStart(d){return new Date(d.getFullYear(),d.getMonth(),1)}
  function addMonths(d,n){return new Date(d.getFullYear(),d.getMonth()+n,1)}
  function monthKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)}
  function monthLabel(d){return (d.getMonth()+1)+'月'}
  function daysInMonth(d){return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}
  function renderMonthly(st){
    var base=parseDate(studyDay()),currentMonth=monthStart(base),firstStudy=null;
    st.forEach(function(s){if(s.study_date&&(!firstStudy||s.study_date<firstStudy))firstStudy=s.study_date});
    var start=firstStudy?monthStart(parseDate(firstStudy)):currentMonth,months=[],map={};
    st.forEach(function(s){if(s.study_date){var d=parseDate(s.study_date),k=monthKey(d);map[k]=(map[k]||0)+Number(s.minutes||0)}});
    for(var d=new Date(start);d<=currentMonth;d=addMonths(d,1))months.push({key:monthKey(d),label:monthLabel(d),minutes:map[monthKey(d)]||0,days:daysInMonth(d)});
    if(!months.length)months=[{key:monthKey(currentMonth),label:monthLabel(currentMonth),minutes:0,days:daysInMonth(currentMonth)}];
    var current=months[months.length-1].minutes,previous=months.length>1?months[months.length-2].minutes:0,change=months.length>1?pctChange(current,previous):null,trend=change==null?'—':(change>0?'＋':'')+change+'%',total=months.reduce(function(a,m){return a+m.minutes},0),active=months.filter(function(m){return m.minutes>0}).length,max=months.reduce(function(a,m){return Math.max(a,m.minutes)},0)||1;
    var bars=months.map(function(m){var height=Math.max(m.minutes?2:0,Math.min(100,Math.round(m.minutes/max*100)));return '<div class="sd-day"><div class="sd-month-value">'+minutesText(m.minutes)+'</div><div class="sd-bars"><div class="sd-current" style="height:'+height+'%"></div></div><div class="sd-label">'+m.label+'</div><div class="sd-month-avg">平均 '+minutesText(Math.round(m.minutes/m.days))+'/日</div></div>'}).join('');
    return '<div class="sd-wrap"><div class="sd-section-head"><div><div class="kicker">MONTHLY STUDY</div><h3>月別の学習時間</h3><div class="muted small">記録を始めた月から現在まで。</div></div><span class="badge">'+months[0].label+' 〜 '+months[months.length-1].label+'</span></div><div class="sd-month-total"><span>総合計</span><strong>'+minutesText(total)+'</strong></div><div class="sd-chart sd-month-chart">'+bars+'</div><div class="sd-compare"><div class="sd-compare-card"><span>今月</span><b>'+minutesText(current)+'</b><small>月の日数 '+months[months.length-1].days+'日</small></div><div class="sd-compare-card"><span>先月比</span><b>'+trend+'</b><small>'+ (months.length>1?minutesText(previous):'比較対象なし') +'</small></div></div><div class="sd-compare"><div class="sd-compare-card"><span>月平均</span><b>'+minutesText(Math.round(total/months.length))+'</b><small>'+months.length+'か月</small></div><div class="sd-compare-card"><span>学習した月</span><b>'+active+'か月</b><small>'+months.length+'か月中</small></div></div></div>';
  }
  function renderQualificationOverview(st,q){
    var base=parseDate(studyDay()),rows=q.map(function(qq){var ps=projectStats(qq,st),exam=qq.exam_date?Math.ceil((parseDate(qq.exam_date)-base)/86400000):null;return {q:qq,p:ps,exam:exam}}).filter(function(x){return x.p.total>0||x.q.exam_date}).sort(function(a,b){return (a.exam==null?999999:a.exam)-(b.exam==null?999999:b.exam)});
    var total=rows.reduce(function(a,x){return a+x.p.total},0),active=rows.filter(function(x){return x.p.total>0}).length;
    var cards=rows.length?rows.map(function(x){var examText=x.exam==null?'試験日未設定':x.exam>=0?'試験まで '+x.exam+'日':'試験済み';return '<div class="sd-overview-card"><div class="sd-overview-head"><div><div class="kicker">QUALIFICATION</div><div class="sd-project-name">'+escapeHtml(x.q.name)+'</div></div><span class="badge">'+escapeHtml(examText)+'</span></div><div class="sd-overview-stats"><div><span>累計</span><b>'+minutesText(x.p.total)+'</b></div><div><span>学習日</span><b>'+x.p.days+'日</b></div><div><span>開始</span><b>'+(x.p.start?fmtDate(x.p.start):'—')+'</b></div><div><span>直近</span><b>'+(x.p.last?fmtDate(x.p.last):'—')+'</b></div></div></div>'}).join(''):'<div class="item">まだ学習資格がありません。</div>';
    return '<div class="sd-wrap"><div class="sd-section-head"><div><div class="kicker">QUALIFICATION OVERVIEW</div><h3>資格の学習状況</h3><div class="muted small">資格ごとの進み具合を一覧で確認。</div></div><span class="badge">'+active+'資格 学習中</span></div><div class="sd-summary"><div><span>学習時間</span><strong>'+minutesText(total)+'</strong></div><div><span>学習資格数</span><strong>'+active+'資格</strong></div><div><span>平均</span><strong>'+minutesText(active?Math.round(total/active):0)+'</strong></div></div>'+cards+'</div>';
  }
  function renderQualification(st,q){
    var rows=q.map(function(qq){var ps=projectStats(qq,st);return {q:qq,total:ps.total,days:ps.days,start:ps.start}}).filter(function(x){return x.total>0||x.q.exam_date}).sort(function(a,b){return b.total-a.total});
    var total=rows.reduce(function(a,x){return a+x.total},0),active=rows.filter(function(x){return x.total>0}).length,max=rows.reduce(function(a,x){return Math.max(a,x.total)},0)||1;
    var bars=rows.length?rows.map(function(x){var width=Math.max(x.total?3:0,Math.round(x.total/max*100));return '<div class="sd-qual-row"><div class="sd-qual-head"><strong>'+escapeHtml(x.q.name)+'</strong><span>'+minutesText(x.total)+'</span></div><div class="sd-qual-track"><div class="sd-qual-fill" style="width:'+width+'%"></div></div><div class="sd-qual-sub">学習日 '+x.days+'日'+(x.start?' ・ 開始 '+fmtDate(x.start):'')+(x.q.exam_date?' ・ 試験 '+fmtDate(x.q.exam_date):'')+'</div></div>'}).join(''):'<div class="item">まだ学習記録がありません。</div>';
    return '<div class="sd-wrap"><div class="sd-section-head"><div><div class="kicker">QUALIFICATION STUDY</div><h3>資格別の累計学習時間</h3><div class="muted small">資格ごとに、これまでの学習時間を比較。</div></div><span class="badge">'+active+'資格 学習記録あり</span></div><div class="sd-summary"><div><span>総学習時間</span><strong>'+minutesText(total)+'</strong></div><div><span>学習資格数</span><strong>'+active+'資格</strong></div><div><span>平均</span><strong>'+minutesText(active?Math.round(total/active):0)+'</strong></div></div><div class="sd-qual-list">'+bars+'</div></div>';
  }
  function getSavedMode(){return localStorage.getItem('qualification-os-dashboard-mode')||sessionStorage.getItem('qualification-os-dashboard-mode')||'qualification'}
  function saveMode(mode){localStorage.setItem('qualification-os-dashboard-mode',mode);sessionStorage.setItem('qualification-os-dashboard-mode',mode)}
  function setViewButtons(mode){
    var row=document.querySelector('#tab-status .row');if(!row)return;
    row.innerHTML='<button type="button" class="'+(mode==='qualification'?'primary':'light')+'" data-dashboard-mode="qualification">資格一覧</button><button type="button" class="'+((mode==='weekly'||mode==='monthly')?'primary':'light')+'" data-dashboard-mode="weekly">週・月</button><button type="button" class="'+(mode==='qualification-chart'?'primary':'light')+'" data-dashboard-mode="qualification-chart">資格別</button>';
    var active=document.querySelector('#dashboardPeriodToggle');if(active)active.remove();
    if(mode==='weekly'||mode==='monthly'){
      var sub=document.createElement('div');sub.id='dashboardPeriodToggle';sub.className='row sd-subnav';sub.innerHTML='<button type="button" class="'+(mode==='weekly'?'primary':'light')+'" data-dashboard-mode="weekly">今週</button><button type="button" class="'+(mode==='monthly'?'primary':'light')+'" data-dashboard-mode="monthly">月別</button>';
      row.parentNode.insertBefore(sub,row.nextSibling);
    }
  }
  function renderDashboardMode(mode){
    var box=document.getElementById('dashboard');if(!box)return;
    var st=(typeof sessions!=='undefined'&&Array.isArray(sessions))?sessions:[],q=(typeof qualifications!=='undefined'&&Array.isArray(qualifications))?qualifications:[];
    if(mode==='monthly')box.innerHTML=renderMonthly(st);else if(mode==='qualification-chart')box.innerHTML=renderQualification(st,q);else if(mode==='weekly')box.innerHTML=renderWeekly(st,q);else box.innerHTML=renderQualificationOverview(st,q);
    saveMode(mode);setViewButtons(mode);
  }
  function renderStudyDashboard(){renderDashboardMode(getSavedMode())}
  function reviewSubjectLabel(p){
    if(p.subject_name)return p.subject_name;
    if(p.subject)return typeof p.subject==='string'?p.subject:(p.subject.name||'');
    var ss=(typeof subjects!=='undefined'&&Array.isArray(subjects))?subjects:[];
    var s=ss.find(function(x){return x.id===p.subject_id});
    return s?s.name:'科目未設定';
  }
  function reviewLabel(p){return p.name||p.question||p.question_text||p.text||p.title||p.content||p.problem||p.description||'問題'}
  function renderFutureReviewSchedule(){
    var card=document.querySelector('#tab-review .card');if(!card)return;
    var today=studyDay(),tomorrow=addDays(today,1),dayAfter=addDays(today,2);
    var ps=(typeof problems!=='undefined'&&Array.isArray(problems))?problems:[];
    var tomorrowProblems=ps.filter(function(p){return p.status==='pending'&&p.next_review_date===tomorrow});
    var dayAfterProblems=ps.filter(function(p){return p.status==='pending'&&p.next_review_date===dayAfter});
    var box=document.getElementById('futureReviewSchedule');
    if(!box){box=document.createElement('div');box.id='futureReviewSchedule';box.className='future-review-schedule';var list=document.getElementById('reviewList');if(list)card.insertBefore(box,list);else card.appendChild(box)}
    box.innerHTML='<div class="kicker">UPCOMING REVIEW</div><div class="future-review-grid"><button type="button" class="future-review-toggle" data-review-date="'+tomorrow+'" aria-expanded="false"><span>明日</span><strong>'+tomorrowProblems.length+'問</strong></button><button type="button" class="future-review-toggle" data-review-date="'+dayAfter+'" aria-expanded="false"><span>明後日</span><strong>'+dayAfterProblems.length+'問</strong></button></div><div class="future-review-details" id="futureReviewDetail-'+tomorrow+'"></div><div class="future-review-details" id="futureReviewDetail-'+dayAfter+'"></div>';
    box.querySelectorAll('.future-review-toggle').forEach(function(btn){btn.addEventListener('click',function(){var date=btn.getAttribute('data-review-date'),detail=document.getElementById('futureReviewDetail-'+date),items=ps.filter(function(p){return p.status==='pending'&&p.next_review_date===date});if(!detail)return;var open=detail.classList.contains('open');box.querySelectorAll('.future-review-details').forEach(function(el){el.classList.remove('open');el.innerHTML=''});box.querySelectorAll('.future-review-toggle').forEach(function(el){el.setAttribute('aria-expanded','false')});if(open)return;var groups=[];items.forEach(function(p){var subject=reviewSubjectLabel(p),group=groups.find(function(g){return g.subject===subject});if(!group){group={subject:subject,items:[]};groups.push(group)}group.items.push(p)});detail.innerHTML=groups.length?groups.map(function(g){return '<div class="future-review-group"><div class="future-review-group-title">'+escapeHtml(g.subject)+'<span>'+g.items.length+'問</span></div><div class="future-review-group-items">'+g.items.map(function(p,i){return '<div class="future-review-item"><span>'+(i+1)+'.</span><div>'+escapeHtml(reviewLabel(p))+'</div></div>'}).join('')+'</div></div>'}).join(''):'<div class="muted small">予定されている問題はありません。</div>';detail.classList.add('open');btn.setAttribute('aria-expanded','true')})});
  }
  function installStyle(){if(document.getElementById('studyDashboardEnhanceStyle'))return;var s=document.createElement('style');s.id='studyDashboardEnhanceStyle';s.textContent='.sd-wrap{padding-top:4px}.sd-section-head,.sd-project-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.sd-section-head h3,.sd-project-head h3{margin:3px 0 4px;font-size:22px}.sd-chart{height:210px;display:flex;align-items:flex-end;gap:8px;padding:22px 8px 0;margin:10px 0 0;border-bottom:1px solid #26314d}.sd-day{flex:1;min-width:0;text-align:center}.sd-bars{height:150px;display:flex;align-items:flex-end;justify-content:center;gap:3px}.sd-bars>div{width:36%;max-width:24px;border-radius:7px 7px 2px 2px;min-height:2px}.sd-prev{background:#35405e;opacity:.65}.sd-current{background:linear-gradient(180deg,#22d3ee,#8b5cf6)}.sd-min{font-size:11px;color:#cbd4ec;margin-top:5px;line-height:1.3}.sd-label{font-weight:800;color:#9fa9c7;margin-top:5px}.sd-month-value{font-size:11px;color:#cbd4ec;line-height:1.3;min-height:16px;margin-bottom:3px;white-space:nowrap}.sd-month-avg{font-size:10px;color:#98a3bf;line-height:1.3;margin-top:4px;white-space:nowrap}.sd-month-total{display:flex;justify-content:space-between;align-items:baseline;padding:12px 14px;margin:12px 0 0;background:#0e1422;border:1px solid #26314d;border-radius:14px}.sd-month-total span{color:#98a3bf;font-size:12px;font-weight:800}.sd-month-total strong{font-size:25px}.sd-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.sd-summary>div,.sd-compare-card{background:#0e1422;border:1px solid #26314d;border-radius:14px;padding:13px}.sd-summary span,.sd-compare-card span{display:block;color:#98a3bf;font-size:12px;font-weight:800}.sd-summary strong{display:block;font-size:22px;margin-top:3px}.sd-compare{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px}.sd-compare-card b{display:block;font-size:20px;margin:3px 0}.sd-compare-card small{color:#98a3bf}.sd-project-head{margin-top:8px;margin-bottom:8px}.sd-project{display:grid;grid-template-columns:1fr auto;gap:3px 12px;align-items:center;border:1px solid #26314d;border-radius:14px;padding:14px;margin:9px 0;background:#0f1627}.sd-project-name{font-size:17px;font-weight:900}.sd-project-time{font-size:20px;font-weight:900}.sd-project-sub{grid-column:1/-1;color:#98a3bf;font-size:12px}.sd-project .small{margin-top:3px}.sd-subnav{margin:8px 0 12px;padding:8px;border:1px solid #26314d;border-radius:13px;background:#0e1422}.sd-qual-list{margin-top:10px}.sd-qual-row{padding:13px 0;border-bottom:1px solid #202a42}.sd-qual-row:last-child{border-bottom:0}.sd-qual-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.sd-qual-head strong{font-size:16px}.sd-qual-head span{font-size:16px;font-weight:900}.sd-qual-track{height:10px;background:#252e47;border-radius:99px;overflow:hidden;margin-top:8px}.sd-qual-fill{height:100%;background:linear-gradient(90deg,#8b5cf6,#22d3ee);border-radius:99px}.sd-qual-sub{color:#98a3bf;font-size:12px;margin-top:6px}.sd-overview-card{border:1px solid #26314d;border-radius:15px;padding:15px;margin:10px 0;background:#0f1627}.sd-overview-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.sd-overview-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.sd-overview-stats>div{background:#0e1422;border:1px solid #202a42;border-radius:11px;padding:9px}.sd-overview-stats span{display:block;color:#98a3bf;font-size:11px}.sd-overview-stats b{display:block;font-size:14px;margin-top:3px}.future-review-schedule{margin:12px 0 14px;padding:13px 14px;border:1px solid #26314d;border-radius:14px;background:#0e1422}.future-review-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:8px}.future-review-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;padding:11px 12px;background:#121a2b;border:1px solid #26314d;border-radius:12px;color:inherit;font:inherit;text-align:left;cursor:pointer}.future-review-toggle span{color:#98a3bf;font-size:13px;font-weight:800}.future-review-toggle strong{font-size:20px}.future-review-details{display:none;margin:6px 0 10px;padding:8px 10px;border:1px solid #26314d;border-radius:12px;background:#0b111e}.future-review-details.open{display:block}.future-review-group{margin:4px 0 10px;border:1px solid #26314d;border-radius:11px;overflow:hidden}.future-review-group:last-child{margin-bottom:4px}.future-review-group-title{display:flex;justify-content:space-between;align-items:center;padding:10px 11px;background:#121a2b;font-weight:900}.future-review-group-title span{color:#98a3bf;font-size:12px;font-weight:800}.future-review-group-items{padding:2px 10px}.future-review-item{display:flex;gap:8px;padding:9px 2px;border-bottom:1px solid #202a42;font-size:13px;line-height:1.5}.future-review-item:last-child{border-bottom:0}.future-review-item>span{color:#98a3bf;min-width:18px}.future-review-item>div{min-width:0;overflow-wrap:anywhere}.future-review-schedule button:focus-visible{outline:2px solid #8b5cf6;outline-offset:2px}@media(max-width:700px){.sd-chart{height:210px;gap:4px;overflow-x:auto;overflow-y:hidden}.sd-month-chart{justify-content:flex-start}.sd-month-chart .sd-day{flex:0 0 72px}.sd-bars{height:135px}.sd-summary,.sd-compare{grid-template-columns:1fr}.sd-section-head,.sd-project-head{align-items:flex-start;flex-direction:column}.sd-project-time{font-size:17px}.sd-month-chart .sd-min{font-size:10px}.sd-month-chart .sd-label{font-size:11px}.sd-month-chart .sd-month-value,.sd-month-chart .sd-month-avg{font-size:9px}.sd-overview-stats{grid-template-columns:repeat(2,1fr)}.sd-overview-head{flex-direction:column}.future-review-grid{grid-template-columns:1fr}}'
    document.head.appendChild(s)}
  function addDays(s,n){var d=parseDate(s);d.setDate(d.getDate()+n);return localDate(d)}
  function patch(){
    installStyle();
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('#tab-status [data-dashboard-mode]');
      if(b){e.preventDefault();e.stopImmediatePropagation();renderDashboardMode(b.getAttribute('data-dashboard-mode'));return}
      var legacy=e.target.closest&&e.target.closest('#tab-status .row > button');
      if(!legacy)return;
      e.preventDefault();e.stopImmediatePropagation();
      var t=(legacy.textContent||'');
      renderDashboardMode(t.includes('資格一覧')?'qualification':t.includes('月別')?'monthly':'weekly');
    },true);
    try{window.showDashboard=function(){renderDashboardMode(getSavedMode())}}catch(_){}
    try{window.showStats=function(mode){renderDashboardMode(mode==='month'?'monthly':'weekly')}}catch(_){}
    try{window.today=studyDay}catch(_){}
    var rd=document.getElementById('recordDate');if(rd)rd.value=studyDay();
    setInterval(function(){var r=document.getElementById('recordDate');if(r&&!document.activeElement?.isSameNode(r))r.value=studyDay();renderFutureReviewSchedule()},30000);
    renderFutureReviewSchedule();
    var list=document.getElementById('reviewList');if(list){new MutationObserver(renderFutureReviewSchedule).observe(list,{childList:true,subtree:true})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
})();
