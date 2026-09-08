(function(){
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'})[c]})}
  function rtext(v){return v==='passed'?'合格':v==='failed'?'不合格':'未入力'}
  function badge(v){return '<span class="badge '+(v==='passed'?'good':v==='failed'?'bad':'')+'">'+rtext(v)+'</span>'}
  function qstatus(q){if(q.result_mode!=='subject')return q.result;var ss=subjects.filter(function(s){return s.qualification_id===q.id});return ss.some(function(s){return s.result==='failed'})?'failed':ss.length&&ss.every(function(s){return s.result==='passed'})?'passed':null}
  function total(qid){return sessions.filter(function(s){return s.qualification_id===qid}).reduce(function(a,s){return a+Number(s.minutes||0)},0)}
  function retake(q){if((q.result!=='failed'&&qstatus(q)!=='failed')||!q.exam_date)return 0;return sessions.filter(function(s){return s.qualification_id===q.id&&s.study_date>q.exam_date}).reduce(function(a,s){return a+Number(s.minutes||0)},0)}
  function resultSelect(id,v){return '<select id="'+id+'"><option value="">未入力</option><option value="passed" '+(v==='passed'?'selected':'')+'>合格</option><option value="failed" '+(v==='failed'?'selected':'')+'>不合格</option></select>'}
  function modeSelect(id,v){return '<select id="'+id+'"><option value="overall" '+(v!=='subject'?'selected':'')+'>試験全体で合否を入力</option><option value="subject" '+(v==='subject'?'selected':'')+'>科目ごとに合否を入力</option></select>'}
  function subjectFields(q){return '<div class="item"><b>科目ごとの合否</b>'+subjects.filter(function(s){return s.qualification_id===q.id}).map(function(s){return '<div class="row" style="margin:9px 0;align-items:center"><span style="flex:1">'+esc(s.name)+'</span><div style="width:180px">'+resultSelect('sr-'+s.id,s.result)+'</div></div>'}).join('')+'</div>'}
  function render(){
    var box=document.getElementById('panel-qualification');if(!box)return;
    var html='<h3>資格設定マスタ</h3><p class="muted small">資格名・試験日・科目・合否・再試験日を管理します。</p><div class="item"><label>資格名</label><input id="newQName" placeholder="簿記1級"><label>試験日</label><input id="newQDate" type="date"><label>合否の管理方法</label>'+modeSelect('newQMode','overall')+'<div id="newResultWrap"><label>試験全体の合否</label>'+resultSelect('newResult','')+'<label>不合格の場合の次回試験日</label><input id="newNextDate" type="date"></div><label>科目（1行1科目）</label><textarea id="newQSubjects" placeholder="商業簿記\n工業簿記\n原価計算"></textarea><button class="primary" onclick="addQualificationResultAware()">資格を追加</button></div>';
    html+=qualifications.length?qualifications.map(function(q){return '<details class="item"><summary style="cursor:pointer"><b>'+esc(q.name)+'</b> '+badge(qstatus(q))+' <span class="badge">'+(q.exam_date?fmt(q.exam_date):'試験日未設定')+'</span></summary><div style="padding-top:10px"><label>資格名</label><input id="rn-'+q.id+'" value="'+esc(q.name)+'"><label>試験日</label><input id="rd-'+q.id+'" type="date" value="'+(q.exam_date||'')+'"><label>合否の管理方法</label>'+modeSelect('rm-'+q.id,q.result_mode)+'<div id="rw-'+q.id+'">'+(q.result_mode==='subject'?subjectFields(q):'<label>試験全体の合否</label>'+resultSelect('rr-'+q.id,q.result)+'<label>不合格の場合の次回試験日</label><input id="rnxt-'+q.id+'" type="date" value="'+(q.next_exam_date||'')+'">')+'</div><label>科目</label><textarea id="rs-'+q.id+'">'+subjects.filter(function(s){return s.qualification_id===q.id}).map(function(s){return s.name}).join('\n')+'</textarea><div class="row"><button class="primary" onclick="updateQualificationResultAware(\''+q.id+'\')">保存</button><button class="danger" onclick="archiveQualification(\''+q.id+'\')">資格を削除</button></div><div class="item" style="margin-top:12px"><b>勉強時間</b><div class="statgrid" style="margin-top:8px"><div class="mini"><b>通算</b><strong>'+minutesText(total(q.id))+'</strong></div><div class="mini"><b>再試験</b><strong>'+minutesText(retake(q))+'</strong></div></div>'+(q.next_exam_date?'<div class="muted small" style="margin-top:8px">次回試験：'+fmt(q.next_exam_date)+'</div>':'')+'</div></div></details>'}).join(''):'<div class="item">まだ資格がありません。</div>';
    box.innerHTML=html;
    var nm=document.getElementById('newQMode');if(nm)nm.onchange=function(){var w=document.getElementById('newResultWrap');w.innerHTML=this.value==='subject'?'<p class="muted small">資格を追加後、各科目の合否を個別に入力できます。</p>':'<label>試験全体の合否</label>'+resultSelect('newResult','')+'<label>不合格の場合の次回試験日</label><input id="newNextDate" type="date">'};
    qualifications.forEach(function(q){var m=document.getElementById('rm-'+q.id);if(m)m.onchange=function(){var w=document.getElementById('rw-'+q.id);w.innerHTML=this.value==='subject'?subjectFields(Object.assign({},q,{result_mode:'subject'})):'<label>試験全体の合否</label>'+resultSelect('rr-'+q.id,q.result)+'<label>不合格の場合の次回試験日</label><input id="rnxt-'+q.id+'" type="date" value="'+(q.next_exam_date||'')+'">'}});
  }
  window.renderQualificationMasterInline=render;
  window.addQualificationResultAware=async function(){
    var name=document.getElementById('newQName')?.value.trim(),date=document.getElementById('newQDate')?.value||null,mode=document.getElementById('newQMode')?.value||'overall',result=document.getElementById('newResult')?.value||null,next=document.getElementById('newNextDate')?.value||null,raw=document.getElementById('newQSubjects')?.value||'';
    if(!name){alert('資格名を入力してください');return}
    var qres=await sb.from('qualifications').insert({user_id:currentUser.id,name:name,exam_date:date,result_mode:mode,result:mode==='overall'?result:null,next_exam_date:mode==='overall'&&result==='failed'?next:null}).select().single();
    if(qres.error){alert('資格の登録に失敗しました: '+qres.error.message);return}
    var names=[...new Set(raw.split(/\r?\n|,|、/).map(function(x){return x.trim()}).filter(Boolean))];
    if(names.length){var sr=await sb.from('subjects').insert(names.map(function(n,i){return{user_id:currentUser.id,qualification_id:qres.data.id,name:n,sort_order:i}}));if(sr.error){alert('科目の登録に失敗しました: '+sr.error.message);return}}
    await loadAll();render();toast('資格を登録しました');
  };
  window.updateQualificationResultAware=async function(id){
    var q=qualifications.find(function(x){return x.id===id});if(!q)return;
    var name=document.getElementById('rn-'+id)?.value.trim(),date=document.getElementById('rd-'+id)?.value||null,mode=document.getElementById('rm-'+id)?.value||'overall',result=mode==='overall'?(document.getElementById('rr-'+id)?.value||null):null,next=mode==='overall'?(document.getElementById('rnxt-'+id)?.value||null):null;
    var ur=await sb.from('qualifications').update({name:name,exam_date:date,result_mode:mode,result:result,next_exam_date:result==='failed'?next:null}).eq('id',id).eq('user_id',currentUser.id);if(ur.error){alert('資格の更新に失敗しました: '+ur.error.message);return}
    var old=subjects.filter(function(s){return s.qualification_id===id}),raw=document.getElementById('rs-'+id)?.value||'',names=[...new Set(raw.split(/\r?\n|,|、/).map(function(x){return x.trim()}).filter(Boolean))];
    var add=names.filter(function(n){return !old.some(function(s){return s.name===n})});if(add.length){var ar=await sb.from('subjects').insert(add.map(function(n,i){return{user_id:currentUser.id,qualification_id:id,name:n,sort_order:old.length+i}}));if(ar.error){alert('科目の追加に失敗しました: '+ar.error.message);return}}
    var remove=old.filter(function(s){return !names.includes(s.name)});if(remove.length){var rr=await sb.from('subjects').update({archived:true}).in('id',remove.map(function(s){return s.id})).eq('user_id',currentUser.id);if(rr.error){alert('科目の更新に失敗しました: '+rr.error.message);return}}
    if(mode==='subject'){for(var i=0;i<old.length;i++){var s=old[i],v=document.getElementById('sr-'+s.id)?.value||null;var sr=await sb.from('subjects').update({result:v}).eq('id',s.id).eq('user_id',currentUser.id);if(sr.error){alert('科目の合否保存に失敗しました: '+sr.error.message);return}}}
    await loadAll();render();if(typeof updateHero==='function')updateHero();toast('資格情報を保存しました');
  };
  var oldDashboard=window.showDashboard;window.showDashboard=function(){setStatusTab('qualification');var box=document.getElementById('dashboard');if(!box)return;var map={};sessions.forEach(function(s){map[s.qualification_id]=(map[s.qualification_id]||0)+Number(s.minutes||0)});var rows=qualifications.map(function(q){return[q,map[q.id]||0]}).sort(function(a,b){return b[1]-a[1]});box.innerHTML=rows.length?rows.map(function(r){return '<div class="item clickable" onclick="showQualificationResultAware(\''+r[0].id+'\')"><div class="row" style="justify-content:space-between"><b>'+esc(r[0].name)+'</b><strong>'+minutesText(r[1])+'</strong></div><div class="row" style="margin-top:7px">'+badge(qstatus(r[0]))+(r[0].next_exam_date?'<span class="muted small">次回 '+fmt(r[0].next_exam_date)+'</span>':'')+'</div><div class="bar" style="margin:8px 0"><div style="width:'+(rows[0]?.[1]?r[1]/rows[0][1]*100:0)+'%"></div></div></div>'}).join(''):'<div class="item">まだ勉強記録がありません。</div>'};
  window.showQualificationResultAware=function(id){var q=qualifications.find(function(x){return x.id===id});if(!q)return;var box=document.getElementById('dashboard'),ss=subjects.filter(function(s){return s.qualification_id===id}),status=qstatus(q);box.innerHTML='<button class="light" onclick="showDashboard()">← 資格一覧</button><div class="quest"><div class="kicker">Qualification</div><h2>'+esc(q.name)+'</h2><div class="row" style="margin-top:8px">'+badge(status)+(q.exam_date?'<span class="badge">試験 '+fmt(q.exam_date)+'</span>':'')+(q.next_exam_date?'<span class="badge">次回 '+fmt(q.next_exam_date)+'</span>':'')+'</div></div><div class="statgrid" style="margin:12px 0"><div class="mini"><b>通算勉強時間</b><strong>'+minutesText(total(q.id))+'</strong></div><div class="mini"><b>再試験の勉強時間</b><strong>'+minutesText(retake(q))+'</strong></div></div>'+(q.result_mode==='subject'?'<div class="item"><b>科目合否</b>'+ss.map(function(s){return '<div class="row" style="justify-content:space-between;margin-top:8px"><span>'+esc(s.name)+'</span>'+badge(s.result)+'</div>'}).join('')+'</div>':'')+ss.map(function(s){var ps=problems.filter(function(p){return p.subject_id===s.id}),m=ps.filter(function(p){return p.status==='mastered'}).length;return '<div class="item clickable" onclick="showUnit(\''+s.id+'\')"><div class="row" style="justify-content:space-between"><b>'+esc(s.name)+'</b><strong>'+m+' / '+ps.length+' MASTER</strong></div><div class="bar" style="margin-top:8px"><div style="width:'+(ps.length?m/ps.length*100:0)+'%"></div></div></div>'}).join('')||'<div class="item">科目がありません。</div>'};
  var style=document.createElement('style');style.textContent='.badge.good{color:#b7f7d5;border-color:#286c50;background:#102c23}.badge.bad{color:#ffc1cf;border-color:#6b2941;background:#3d1725}.statgrid .mini strong{font-size:18px}';document.head.appendChild(style);
  render();

  function refreshHeroExam(){
    var el=document.getElementById('heroCountdown'),nameEl=document.getElementById('heroExamName');
    if(!el||!nameEl)return;
    var todayStr=typeof today==='function'?today():new Date().toISOString().slice(0,10);
    var todayDate=parseDate(todayStr),candidates=[];
    qualifications.forEach(function(q){
      var status=qstatus(q);
      if(status==='passed')return;
      if(status==='failed'){
        if(q.next_exam_date)candidates.push({q:q,date:q.next_exam_date});
        return;
      }
      if(q.exam_date&&parseDate(q.exam_date)>=todayDate)candidates.push({q:q,date:q.exam_date});
    });
    candidates.sort(function(a,b){return a.date.localeCompare(b.date)});
    var next=candidates[0];
    if(!next){el.textContent='—';nameEl.textContent='次回試験を設定してください';return}
    var diff=Math.ceil((parseDate(next.date)-todayDate)/86400000);
    el.textContent=diff===0?'本日':'あと '+diff+'日';
    nameEl.textContent=next.q.name+' / '+fmt(next.date);
  }
  var baseUpdateHero=window.updateHero;
  window.updateHero=function(){if(baseUpdateHero)baseUpdateHero();refreshHeroExam()};
  refreshHeroExam();

  var baseShowUnit=window.showUnit;
  window.showUnit=function(id){
    if(baseShowUnit)baseShowUnit.apply(this,arguments);
    setTimeout(function(){
      var box=document.getElementById('dashboard');if(!box)return;
      var title=box.querySelector('h2');if(!title)return;
      var items=[...box.querySelectorAll('.item')].filter(function(el){return /^\s*\d+/.test((el.textContent||'').trim())});
      items.sort(function(a,b){
        var ma=(a.textContent||'').trim().match(/^\d+/),mb=(b.textContent||'').trim().match(/^\d+/);
        var na=ma?parseInt(ma[0],10):999999,nb=mb?parseInt(mb[0],10):999999;
        return na-nb;
      });
      if(items.length){var parent=items[0].parentElement;items.forEach(function(el){parent.appendChild(el)})}
    },0);
  };

  // 「今日の復習」も問題番号を文字列順ではなく数値順に並べる。
  function sortDueReviewItems(){
    var list=document.getElementById('reviewList');if(!list)return;
    list.querySelectorAll('details').forEach(function(details){
      var container=details.querySelector(':scope > div');if(!container)return;
      var items=[...container.children].filter(function(el){return el.classList.contains('item')});
      items.sort(function(a,b){
        var am=(a.textContent||'').trim().match(/^\s*(\d+)/),bm=(b.textContent||'').trim().match(/^\s*(\d+)/);
        if(am&&bm)return parseInt(am[1],10)-parseInt(bm[1],10);
        if(am)return -1;if(bm)return 1;
        return (a.textContent||'').localeCompare(b.textContent||'','ja');
      });
      items.forEach(function(el){container.appendChild(el)});
    });
  }
  var reviewList=document.getElementById('reviewList');
  if(reviewList){
    var reviewSortScheduled=false;
    new MutationObserver(function(){
      if(reviewSortScheduled)return;
      reviewSortScheduled=true;
      setTimeout(function(){reviewSortScheduled=false;sortDueReviewItems()},0);
    }).observe(reviewList,{childList:true,subtree:true});
    sortDueReviewItems();
  }
})();