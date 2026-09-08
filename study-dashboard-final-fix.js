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
  function bindPreviousWeekToggle(box,st){
    var chart=box.querySelector('.sd-chart:not(.sd-month-chart)');if(!chart)return;
    var base=parseDate(studyDay()),ws=weekStart(base),map={};st.forEach(function(s){map[s.study_date]=(map[s.study_date]||0)+Number(s.minutes||0)});
    chart.querySelectorAll('.sd-day').forEach(function(dayEl,index){
      var prevDate=new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+index-7),prevMinutes=map[iso(prevDate)]||0;
      var prevValue=dayEl.querySelector('.sd-prev-value');
      if(!prevValue){prevValue=document.createElement('div');prevValue.className='sd-prev-value';dayEl.appendChild(prevValue)}
      prevValue.textContent='先週 '+minutesText(prevMinutes);
      dayEl.setAttribute('role','button');dayEl.setAttribute('tabindex','0');dayEl.setAttribute('aria-label',(['月','火','水','木','金','土','日'][index]||'')+'曜日の先週の学習時間 '+minutesText(prevMinutes)+'。タップで表示・非表示');
      if(dayEl.dataset.prevToggleBound==='1')return;
      dayEl.dataset.prevToggleBound='1';
      function toggle(){dayEl.classList.toggle('sd-prev-open')}
      dayEl.addEventListener('click',toggle);
      dayEl.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
    });
  }
  function patchWeekly(box,st){
    var base=parseDate(studyDay()),ws=weekStart(base),todayKey=iso(base),elapsed=Math.floor((base-ws)/86400000)+1,start=iso(ws),prevStart=iso(new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()-7)),prevEnd=iso(new Date(base.getFullYear(),base.getMonth(),base.getDate()-7)),current=sumRange(st,start,todayKey),previous=sumRange(st,prevStart,prevEnd),change=pctChange(current,previous),summary=box.querySelectorAll('.sd-summary > div');
    if(summary.length>=3){summary[0].querySelector('strong').textContent=minutesText(current);summary[1].querySelector('strong').textContent=minutesText(current/elapsed);summary[2].querySelector('strong').textContent=change==null?'—':(change>0?'＋':'')+change+'%'}
    var compare=box.querySelectorAll('.sd-compare');if(compare.length){var cards=compare[0].querySelectorAll('.sd-compare-card');if(cards.length>=2){cards[0].querySelector('span').textContent='先週の同曜日まで';cards[0].querySelector('b').textContent=minutesText(previous);cards[1].querySelector('span').textContent='今週の学習日数';cards[1].querySelector('small').textContent=elapsed+'日中'}}
    bindPreviousWeekToggle(box,st);
  }
  function renderYearMonthly(box,st){
    var base=parseDate(studyDay()),year=base.getFullYear(),months=[],map={};st.forEach(function(s){if(s.study_date){var d=parseDate(s.study_date),k=monthKey(d);map[k]=(map[k]||0)+Number(s.minutes||0)}});for(var i=0;i<12;i++){var d=new Date(year,i,1);months.push({d:d,key:monthKey(d),label:(i+1)+'月',minutes:map[monthKey(d)]||0,days:daysInMonth(d)})}
    var currentIndex=base.getMonth(),current=months[currentIndex].minutes,prevDate=new Date(year,base.getMonth()-1,base.getDate()),prevMonthStart=monthStart(prevDate),prevDay=Math.min(base.getDate(),daysInMonth(prevDate)),prevEnd=new Date(prevDate.getFullYear(),prevDate.getMonth(),prevDay),previous=sumRange(st,iso(prevMonthStart),iso(prevEnd)),change=pctChange(current,previous),trend=change==null?'—':(change>0?'＋':'')+change+'%',total=months.reduce(function(a,m){return a+m.minutes},0),active=months.filter(function(m){return m.minutes>0}).length,max=months.reduce(function(a,m){return Math.max(a,m.minutes)},0)||1,bars=months.map(function(m){var height=Math.max(m.minutes?2:0,Math.min(100,Math.round(m.minutes/max*100)));return '<div class="sd-day"><div class="sd-month-value">'+minutesText(m.minutes)+'</div><div class="sd-bars"><div class="sd-current" style="height:'+height+'%"></div></div><div class="sd-label">'+m.label+'</div><div class="sd-month-avg">平均 '+minutesText(m.minutes/m.days)+'/日</div></div>'}).join('');
    box.innerHTML='<div class="sd-wrap"><div class="sd-section-head"><div><div class="kicker">MONTHLY STUDY</div><h3>月別の学習時間</h3><div class="muted small">'+year+'年（1月〜12月）の学習時間。</div></div><span class="badge">'+year+'年</span></div><div class="sd-month-total"><span>年間総合計</span><strong>'+minutesText(total)+'</strong></div><div class="sd-chart sd-month-chart sd-year-chart">'+bars+'</div><div class="sd-compare"><div class="sd-compare-card"><span>今月</span><b>'+minutesText(current)+'</b><small>月の日数 '+months[currentIndex].days+'日</small></div><div class="sd-compare-card"><span>先月比</span><b>'+trend+'</b><small>先月同日まで '+minutesText(previous)+'</small></div></div><div class="sd-compare"><div class="sd-compare-card"><span>年間月平均</span><b>'+minutesText(total/12)+'</b><small>12か月</small></div><div class="sd-compare-card"><span>学習した月</span><b>'+active+'か月</b><small>12か月中</small></div></div></div>';box.dataset.monthlyYear=String(year)
  }
  function sync(){var box=document.getElementById('dashboard');if(!box)return;var st=(typeof sessions!=='undefined'&&Array.isArray(sessions))?sessions:[],h=box.querySelector('h3');if(!h)return;if(h.textContent.indexOf('今週の学習時間')!==-1){patchWeekly(box,st);return}if(h.textContent.indexOf('月別の学習時間')!==-1){var year=String(parseDate(studyDay()).getFullYear()),total=st.reduce(function(a,s){return a+Number(s.minutes||0)},0),signature=year+':'+total+':'+st.length;if(!box.querySelector('.sd-year-chart')||box.dataset.monthlySignature!==signature){renderYearMonthly(box,st);box.dataset.monthlySignature=signature}}}
  function install(){
    if(!window.__qResultEnhanceLoading){window.__qResultEnhanceLoading=true;var qscript=document.createElement('script');qscript.src='qualification-result-enhance-v2.js?v=20260908-1200';document.head.appendChild(qscript)}
    if(!document.getElementById('dashboardFinalFixStyle')){var s=document.createElement('style');s.id='dashboardFinalFixStyle';s.textContent='.sd-month-total{display:flex;justify-content:space-between;align-items:center;margin:10px 0;padding:14px 16px;background:#0e1422;border:1px solid #26314d;border-radius:14px}.sd-month-total span{color:#98a3bf;font-size:12px;font-weight:800}.sd-month-total strong{font-size:24px}.sd-year-chart{overflow-x:auto}.sd-year-chart .sd-day{min-width:70px}.sd-month-avg{font-size:10px;color:#98a3bf;margin-top:4px;white-space:nowrap}.sd-chart:not(.sd-month-chart) .sd-day{cursor:pointer;user-select:none}.sd-chart:not(.sd-month-chart) .sd-day:focus-visible{outline:2px solid #8b5cf6;outline-offset:3px;border-radius:8px}.sd-prev-value{height:16px;line-height:16px;font-size:10px;color:#98a3bf;opacity:0;white-space:nowrap;transition:opacity .15s}.sd-prev-open .sd-prev-value{opacity:1}@media(max-width:700px){.sd-year-chart{justify-content:flex-start}.sd-year-chart .sd-day{min-width:68px}}';document.head.appendChild(s)}
    var old=window.scrollTo;window.scrollTo=function(x,y){if(typeof x==='object'&&x&&Number(x.top)===0)return;return old.apply(window,arguments)};
    var originalShowDashboard=window.showDashboard;window.showDashboard=function(){var mode=localStorage.getItem('qualification-os-dashboard-mode')||'qualification';var b=document.querySelector('#tab-status [data-dashboard-mode="'+mode+'"]');if(!b){var buttons=document.querySelectorAll('#tab-status .row > button');buttons.forEach(function(x){var t=x.textContent||'';if((mode==='qualification'&&t.indexOf('資格一覧')!==-1)||(mode==='weekly'&&t.indexOf('週・月')!==-1))b=x});}if(b)b.click();else if(originalShowDashboard)originalShowDashboard()};
    var originalShowStats=window.showStats;window.showStats=function(type){if(type==='month'){localStorage.setItem('qualification-os-dashboard-mode','monthly');var box=document.getElementById('dashboard'),st=(typeof sessions!=='undefined'&&Array.isArray(sessions))?sessions:[];if(box){renderYearMonthly(box,st);return}}if(originalShowStats)return originalShowStats.apply(this,arguments)};
    var box=document.getElementById('dashboard');if(!box)return;var scheduled=false;new MutationObserver(function(){if(scheduled)return;scheduled=true;setTimeout(function(){scheduled=false;sync()},0)}).observe(box,{childList:true,subtree:true});sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();

// 過去の勉強記録入力の補正。既存の入力UI・保存処理はそのまま使い、解析だけを拡張する。
(function(){
  function normalizeDate(value){
    var m=String(value||'').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(!m)return null;
    var y=Number(m[1]),mo=Number(m[2]),day=Number(m[3]);
    var d=new Date(y,mo-1,day);
    if(d.getFullYear()!==y||d.getMonth()!==mo-1||d.getDate()!==day)return null;
    return y+'-'+String(mo).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  }
  function parsePastRowsFixed(){
    var text=document.getElementById('pastRows')?.value||'';
    var qid=document.getElementById('pastQualification')?.value;
    var rows=[],errors=[];
    var allowed={new_problems:'新規問題',review:'復習',textbook:'テキスト',lecture:'講義',mock:'模試',other:'その他'};
    var reverse=Object.fromEntries(Object.entries(allowed).map(function(x){return [x[1],x[0]]}));
    var cumulative=[];
    text.split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean).forEach(function(line,i){
      var parts=line.split(/[|｜]/).map(function(x){return x.trim()});
      if(parts.length<4){errors.push((i+1)+'行目：「日付｜科目｜内容｜分｜メモ」の形式で入力してください');return}
      var date=normalizeDate(parts[0]),subjectName=parts[1],activityText=parts[2],minutesText=parts[3],memo=parts.slice(4).join('｜');
      var subject=(typeof subjects!=='undefined'&&Array.isArray(subjects))?subjects.find(function(s){return s.qualification_id===qid&&s.name===subjectName}):null;
      if(!date){errors.push((i+1)+'行目：日付が不正です');return}
      if(!subject){errors.push((i+1)+'行目：科目「'+subjectName+'」が資格マスタにありません');return}
      var minutes=Number(String(minutesText).replace(/分$/,'').replace(/,/g,'').trim());
      if(!Number.isInteger(minutes)||minutes<=0){errors.push((i+1)+'行目：勉強時間は1分以上の整数で入力してください');return}
      if(activityText==='累計'){
        cumulative.push({index:i,date:date,subject:subject,minutes:minutes,memo:memo||null});
        return;
      }
      var activityType=reverse[activityText]||activityText;
      if(!Object.keys(allowed).includes(activityType)){errors.push((i+1)+'行目：内容「'+activityText+'」は使えません');return}
      rows.push({study_date:date,subject_id:subject.id,subject_name:subject.name,activity_type:activityType,activity_label:allowed[activityType],minutes:minutes,memo:memo||null});
    });
    var grouped={};
    cumulative.forEach(function(x){var key=x.subject.id;if(!grouped[key])grouped[key]=[];grouped[key].push(x)});
    Object.values(grouped).forEach(function(list){
      list.sort(function(a,b){return a.date.localeCompare(b.date)||a.index-b.index});
      var previous=0;
      list.forEach(function(x){
        var delta=x.minutes-previous;
        if(delta<0)delta=x.minutes;
        if(delta>0)rows.push({study_date:x.date,subject_id:x.subject.id,subject_name:x.subject.name,activity_type:'other',activity_label:'累計',minutes:delta,memo:x.memo});
        previous=x.minutes;
      });
    });
    rows.sort(function(a,b){return a.study_date.localeCompare(b.study_date)});
    return {rows:rows,errors:errors};
  }
  function escLocal(value){return String(value??'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]})}
  function previewPastStudyFixed(){
    var preview=document.getElementById('pastPreview');if(!preview)return;
    var result=parsePastRowsFixed(),rows=result.rows,errors=result.errors,out='';
    if(errors.length)out+='<div class="item" style="border-color:#6b2941"><b style="color:#ffb4c3">入力エラー</b><ul style="margin:8px 0">'+errors.map(function(e){return '<li>'+escLocal(e)+'</li>'}).join('')+'</ul></div>';
    if(rows.length){var total=rows.reduce(function(a,r){return a+r.minutes},0);out+='<div class="item"><div class="sectiontitle"><b>登録プレビュー</b><span class="badge">'+rows.length+'件 / '+(Math.floor(total/60)?Math.floor(total/60)+'時間':'')+(total%60?total%60+'分':total?'':'0分')+'</span></div>'+rows.map(function(r){return '<div class="record-meta" style="margin:8px 0"><span>📅 '+escLocal(r.study_date)+'</span><span>'+escLocal(r.subject_name)+'</span><span>'+escLocal(r.activity_label)+'</span><span>'+r.minutes+'分</span>'+(r.memo?'<span>💬 '+escLocal(r.memo)+'</span>':'')+'</div>'}).join('')+'<div class="row" style="margin-top:12px"><button class="primary" onclick="savePastStudy()">この内容で登録</button><button class="light" onclick="document.getElementById(\'pastPreview\').innerHTML=\'\'">閉じる</button></div></div>'}
    if(!rows.length&&!errors.length)out='<div class="item">入力がありません。</div>';
    preview.innerHTML=out;
  }
  window.parsePastRows=parsePastRowsFixed;
  window.previewPastStudy=previewPastStudyFixed;
})();