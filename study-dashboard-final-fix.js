// qualification dashboard final fixes
(function(){
  function pad(n){return String(n).padStart(2,'0')}
  function localDate(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function parseDate(s){return new Date(s+'T00:00:00')}
  function studyDay(){var d=new Date();if(d.getHours()<5)d.setDate(d.getDate()-1);return localDate(d)}
  function weekStart(d){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()),day=x.getDay();x.setDate(x.getDate()-(day===0?6:day-1));return x}
  function iso(d){return localDate(d)}
  function sumRange(st,start,end){var total=0;st.forEach(function(s){if(s.study_date>=start&&s.study_date<=end)total+=Number(s.minutes||0)});return total}
  function minutesText(m){m=Math.max(0,Math.round(Number(m)||0));if(!m)return '0分';var h=Math.floor(m/60),min=m%60;return h?(min?h+'時間'+min+'分':h+'時間'):min+'分'}
  function pctChange(a,b){return b?Math.round((a-b)/b*100):null}
  function monthStart(d){return new Date(d.getFullYear(),d.getMonth(),1)}
  function monthKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)}
  function daysInMonth(d){return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}

  function patchWeekly(box,st){
    var base=parseDate(studyDay()),ws=weekStart(base),todayKey=iso(base);
    var elapsed=Math.floor((base-ws)/86400000)+1;
    var start=iso(ws),prevStart=iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()-7)),prevEnd=iso(new Date(base.getFullYear(),base.getMonth(),base.getDate()-7));
    var current=sumRange(st,start,todayKey),previous=sumRange(st,prevStart,prevEnd),change=pctChange(current,previous);
    var summary=box.querySelectorAll('.sd-summary > div');
    if(summary.length>=3){
      summary[0].querySelector('strong').textContent=minutesText(current);
      summary[1].querySelector('strong').textContent=minutesText(current/elapsed);
      summary[2].querySelector('strong').textContent=change==null?'—':(change>0?'＋':'')+change+'%';
    }
    var compare=box.querySelectorAll('.sd-compare');
    if(compare.length){
      var cards=compare[0].querySelectorAll('.sd-compare-card');
      if(cards.length>=2){
        cards[0].querySelector('span').textContent='先週の同曜日まで';
        cards[0].querySelector('b').textContent=minutesText(previous);
        cards[1].querySelector('span').textContent='今週の学習日数';
        cards[1].querySelector('small').textContent=elapsed+'日中';
      }
    }
  }

  function renderYearMonthly(box,st){
    var base=parseDate(studyDay()),year=base.getFullYear(),months=[],map={};
    st.forEach(function(s){if(s.study_date){var d=parseDate(s.study_date),k=monthKey(d);map[k]=(map[k]||0)+Number(s.minutes||0)}});
    for(var i=0;i<12;i++){var d=new Date(year,i,1);months.push({d:d,key:monthKey(d),label:(i+1)+'月',minutes:map[monthKey(d)]||0,days:daysInMonth(d)})}
    var currentIndex=base.getMonth(),current=months[currentIndex].minutes,prevDate=new Date(year,base.getMonth()-1,base.getDate()),prevMonthStart=monthStart(prevDate),prevDay=Math.min(base.getDate(),daysInMonth(prevDate)),prevEnd=new Date(prevDate.getFullYear(),prevDate.getMonth(),prevDay),previous=sumRange(st,iso(prevMonthStart),iso(prevEnd));
    var change=pctChange(current,previous),trend=change==null?'—':(change>0?'＋':'')+change+'%',total=months.reduce(function(a,m){return a+m.minutes},0),active=months.filter(function(m){return m.minutes>0}).length,max=months.reduce(function(a,m){return Math.max(a,m.minutes)},0)||1;
    var bars=months.map(function(m){var height=Math.max(m.minutes?2:0,Math.min(100,Math.round(m.minutes/max*100)));return '<div class="sd-day"><div class="sd-month-value">'+minutesText(m.minutes)+'</div><div class="sd-bars"><div class="sd-current" style="height:'+height+'%"></div></div><div class="sd-label">'+m.label+'</div><div class="sd-month-avg">平均 '+minutesText(m.minutes/m.days)+'/日</div></div>'}).join('');
    box.innerHTML='<div class="sd-wrap"><div class="sd-section-head"><div><div class="kicker">MONTHLY STUDY</div><h3>月別の学習時間</h3><div class="muted small">'+year+'年（1月〜12月）の学習時間。</div></div><span class="badge">'+year+'年</span></div><div class="sd-month-total"><span>年間総合計</span><strong>'+minutesText(total)+'</strong></div><div class="sd-chart sd-month-chart sd-year-chart">'+bars+'</div><div class="sd-compare"><div class="sd-compare-card"><span>今月</span><b>'+minutesText(current)+'</b><small>月の日数 '+months[currentIndex].days+'日</small></div><div class="sd-compare-card"><span>先月比</span><b>'+trend+'</b><small>先月同日まで '+minutesText(previous)+'</small></div></div><div class="sd-compare"><div class="sd-compare-card"><span>年間月平均</span><b>'+minutesText(total/12)+'</b><small>12か月</small></div><div class="sd-compare-card"><span>学習した月</span><b>'+active+'か月</b><small>12か月中</small></div></div></div>';
    box.dataset.monthlyYear=String(year);
  }

  function sync(){
    var box=document.getElementById('dashboard');if(!box)return;
    var st=(typeof sessions!=='undefined'&&Array.isArray(sessions))?sessions:[];
    var h=box.querySelector('h3');if(!h)return;
    if(h.textContent.indexOf('今週の学習時間')!==-1){patchWeekly(box,st);return}
    if(h.textContent.indexOf('月別の学習時間')!==-1){
      var year=String(parseDate(studyDay()).getFullYear());
      var total=st.reduce(function(a,s){return a+Number(s.minutes||0)},0);
      var signature=year+':'+total+':'+st.length;
      if(!box.querySelector('.sd-year-chart')||box.dataset.monthlySignature!==signature){
        renderYearMonthly(box,st);
        box.dataset.monthlySignature=signature;
      }
    }
  }

  function install(){
    if(!document.getElementById('dashboardFinalFixStyle')){var s=document.createElement('style');s.id='dashboardFinalFixStyle';s.textContent='.sd-month-total{display:flex;justify-content:space-between;align-items:center;margin:10px 0;padding:14px 16px;background:#0e1422;border:1px solid #26314d;border-radius:14px}.sd-month-total span{color:#98a3bf;font-size:12px;font-weight:800}.sd-month-total strong{font-size:24px}.sd-year-chart{overflow-x:auto}.sd-year-chart .sd-day{min-width:70px}.sd-month-avg{font-size:10px;color:#98a3bf;margin-top:4px;white-space:nowrap}@media(max-width:700px){.sd-year-chart{justify-content:flex-start}.sd-year-chart .sd-day{min-width:68px}}';document.head.appendChild(s)}
    var old=window.scrollTo;window.scrollTo=function(x,y){if(typeof x==='object'&&x&&Number(x.top)===0)return;return old.apply(window,arguments)};
    var originalShowDashboard=window.showDashboard;window.showDashboard=function(){var mode=localStorage.getItem('qualification-os-dashboard-mode')||'qualification';var b=document.querySelector('#tab-status [data-dashboard-mode="'+mode+'"]');if(!b){var buttons=document.querySelectorAll('#tab-status .row > button');buttons.forEach(function(x){var t=x.textContent||'';if((mode==='qualification'&&t.indexOf('資格一覧')!==-1)||(mode==='weekly'&&t.indexOf('週・月')!==-1))b=x});}if(b)b.click();else if(originalShowDashboard)originalShowDashboard()};
    var box=document.getElementById('dashboard');if(!box)return;
    var scheduled=false;
    new MutationObserver(function(){if(scheduled)return;scheduled=true;setTimeout(function(){scheduled=false;sync()},0)}).observe(box,{childList:true,subtree:true});
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
