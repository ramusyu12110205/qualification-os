(function(){
  function escHtml(v){
    return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'})[c]});
  }
  function resultText(v){return v==='passed'?'合格':v==='failed'?'不合格':'未入力'}
  function resultBadge(v){
    var cls=v==='passed'?'good':v==='failed'?'bad':'';
    return '<span class="badge '+cls+'">'+resultText(v)+'</span>';
  }
  function totalMinutes(qid){
    return sessions.filter(function(s){return s.qualification_id===qid}).reduce(function(a,s){return a+Number(s.minutes||0)},0);
  }
  function retakeMinutes(q){
    if(q.result!=='failed'||!q.exam_date)return 0;
    return sessions.filter(function(s){return s.qualification_id===q.id && s.study_date>q.exam_date}).reduce(function(a,s){return a+Number(s.minutes||0)},0);
  }
  function selectResult(id,value){
    return '<select id="'+id+'"><option value="">未入力</option><option value="passed" '+(value==='passed'?'selected':'')+'>合格</option><option value="failed" '+(value==='failed'?'selected':'')+'>不合格</option></select>';
  }
  function modeSelect(id,value){
    return '<select id="'+id+'"><option value="overall" '+(value!=='subject'?'selected':'')+'>試験全体で合否を入力</option><option value="subject" '+(value==='subject'?'selected':'')+'>科目ごとに合否を入力</option></select>';
  }
  function renderSubjectResultFields(q){
    var ss=subjects.filter(function(s){return s.qualification_id===q.id});
    if(q.result_mode!=='subject')return '';
    return '<div class="item"><b>科目ごとの合否</b>'+ (ss.length?ss.map(function(s){
      return '<div class="row" style="margin:9px 0;align-items:center"><span style="flex:1">'+escHtml(s.name)+'</span><div style="width:180px">'+selectResult('sr-'+s.id,s.result)+'</div></div>';
    }).join(''):'<div class="muted small">科目がありません。</div>')+'</div>';
  }
  function renderQualificationMaster(){
    var box=document.getElementById('panel-qualification');if(!box)return;
    box.innerHTML='<h3>資格設定マスタ</h3><p class="muted small">資格・科目・試験結果・再試験日を管理します。</p>'+ 
      '<div class="item"><label>資格名</label><input id="newQName" placeholder="簿記1級">'+
      '<label>試験日</label><input id="newQDate" type="date">'+
      '<label>合否の管理方法</label>'+modeSelect('newQMode','overall')+
      '<div id="newQResultWrap"><label>試験全体の合否</label>'+selectResult('newQResult','')+'<label>不合格の場合の次回試験日</label><input id="newQNextDate" type="date"></div>'+
      '<label>科目（1行1科目）</label><textarea id="newQSubjects" placeholder="商業簿記\n工業簿記\n原価計算"></textarea>'+ 
      '<button class="primary" onclick="addQualification()">資格を追加</button></div>'+ 
      (qualifications.length?qualifications.map(function(q){
        return '<details class="item"><summary style="cursor:pointer"><b>'+escHtml(q.name)+'</b> '+resultBadge(q.result_mode==='subject'?(function(){var ss=subjects.filter(function(s){return s.qualification_id===q.id});return ss.some(function(s){return s.result==='failed'})?'failed':ss.length&&ss.every(function(s){return s.result==='passed'})?'passed':null})():q.result)+' <span class="badge">'+(q.exam_date?fmt(q.exam_date):'試験日未設定')+'</span></summary>'+ 
          '<div style="padding-top:10px"><label>資格名</label><input id="qn-'+q.id+'" value="'+escHtml(q.name)+'">'+
          '<label>試験日</label><input id="qd-'+q.id+'" type="date" value="'+(q.exam_date||'')+'">'+
          '<label>合否の管理方法</label>'+modeSelect('qm-'+q.id,q.result_mode)+'<div id="qrwrap-'+q.id+'">'+
          (q.result_mode==='subject'?renderSubjectResultFields(q):'<label>試験全体の合否</label>'+selectResult('qr-'+q.id,q.result)+'<label>不合格の場合の次回試験日</label><input id="qnext-'+q.id+'" type="date" value="'+(q.next_exam_date||'')+'">')+'</div>'+ 
          '<label>科目</label><textarea id="qs-'+q.id+'">'+subjects.filter(function(s){return s.qualification_id===q.id}).map(function(s){return s.name}).join('\n')+'</textarea>'+ 
          '<div class="row"><button class="primary" onclick="updateQualification(\''+q.id+'\')">保存</button><button class="danger" onclick="archiveQualification(\''+q.id+'\')">資格を削除</button></div>'+ 
          '<div class="item" style="margin-top:12px"><b>勉強時間</b><div class="statgrid" style="margin-top:8px"><div class="mini"><b>通算</b><strong>'+minutesText(totalMinutes(q.id))+'</strong></div><div class="mini"><b>再試験</b><strong>'+minutesText(retakeMinutes(q))+'</strong></div></div>'+(q.result==='failed'&&q.next_exam_date?'<div class="muted small" style="margin-top:8px">次回試験：'+fmt(q.next_exam_date)+'</div>':'')+'</div>'+ 
          '</div></details>'; 
      }).join(''):'<div class="item">まだ資格がありません。</div>');
    var nm=document.getElementById('newQMode');
    if(nm)nm.addEventListener('change',function(){
      var wrap=document.getElementById('newQResultWrap');
      if(wrap)wrap.innerHTML=this.value==='subject'?'<p class="muted small">資格を追加後、各科目の合否を個別に入力できます。</p>':'<label>試験全体の合否</label>'+selectResult('newQResult','')+'<label>不合格の場合の次回試験日</label><input id="newQNextDate" type="date">';
    });
    qualifications.forEach(function(q){
      var m=document.getElementById('qm-'+q.id);if(!m)return;
      m.addEventListener('change',function(){
        var w=document.getElementById('qrwrap-'+q.id);if(!w)return;
        if(this.value==='subject')w.innerHTML=renderSubjectResultFields(Object.assign({},q,{result_mode:'subject'}));
        else w.innerHTML='<label>試験全体の合否</label>'+selectResult('qr-'+q.id,q.result)+'<label>不合格の場合の次回試験日</label><input id="qnext-'+q.id+'" type="date" value="'+(q.next_exam_date||'')+'">';
      });
    });
  }

  var originalRender=window.renderQualificationMasterInline;
  window.renderQualificationMasterInline=renderQualificationMaster;

  var originalAdd=window.addQualification;
  window.addQualification=async function(){
    var mode=document.getElementById('newQMode')?.value||'overall';
    var result=document.getElementById('newQResult')?.value||null;
    var next=document.getElementById('newQNextDate')?.value||null;
    if(mode==='subject'){result=null;next=null;}
    var oldResult=originalAdd;
    if(!oldResult)return;
    // 元の登録処理を実行し、資格名から登録対象を特定して結果情報だけ追加保存する。
    await oldResult.apply(this,arguments);
    var name=document.getElementById('newQName')?.value.trim();
    if(name){
      var q=qualifications.find(function(x){return x.name===name});
      if(q){
        var patch={result_mode:mode,result:result,next_exam_date:result==='failed'?next:null};
        var r=await sb.from('qualifications').update(patch).eq('id',q.id).eq('user_id',currentUser.id);
        if(r.error){alert('合否情報の保存に失敗しました: '+r.error.message);return;}
        await loadAll();renderQualificationMaster();
      }
    }
  };

  var originalUpdate=window.updateQualification;
  window.updateQualification=async function(id){
    var q=qualifications.find(function(x){return x.id===id});if(!q)return;
    var mode=document.getElementById('qm-'+id)?.value||'overall';
    var result=mode==='overall'?(document.getElementById('qr-'+id)?.value||null):null;
    var next=mode==='overall'?(document.getElementById('qnext-'+id)?.value||null):null;
    var subjectResults={};
    if(mode==='subject'){
      subjects.filter(function(s){return s.qualification_id===id}).forEach(function(s){subjectResults[s.id]=document.getElementById('sr-'+s.id)?.value||null});
    }
    // まず既存の資格名・試験日・科目編集をそのまま利用。
    await originalUpdate.apply(this,arguments);
    var patch={result_mode:mode,result:result,next_exam_date:result==='failed'?next:null};
    var r=await sb.from('qualifications').update(patch).eq('id',id).eq('user_id',currentUser.id);
    if(r.error){alert('合否情報の保存に失敗しました: '+r.error.message);return;}
    if(mode==='subject'){
      for(var sid in subjectResults){
        var sr=await sb.from('subjects').update({result:subjectResults[sid]}).eq('id',sid).eq('user_id',currentUser.id);
        if(sr.error){alert('科目の合否保存に失敗しました: '+sr.error.message);return;}
      }
    }
    await loadAll();renderQualificationMaster();
    if(typeof updateHero==='function')updateHero();
    toast('資格情報を保存しました');
  };

  // 合格/不合格を資格一覧にも表示し、失敗時は再試験時間を分離して表示。
  var originalShowDashboard=window.showDashboard;
  window.showDashboard=function(){
    setStatusTab('qualification');
    var box=document.getElementById('dashboard');if(!box)return;
    var map={};sessions.forEach(function(s){map[s.qualification_id]=(map[s.qualification_id]||0)+Number(s.minutes||0)});
    var rows=qualifications.map(function(q){return [q.name,map[q.id]||0,q.id,q]}).sort(function(a,b){return b[1]-a[1]});
    box.innerHTML=rows.length?rows.map(function(row){
      var q=row[3],status=q.result_mode==='subject'?(function(){var ss=subjects.filter(function(s){return s.qualification_id===q.id});return ss.some(function(s){return s.result==='failed'})?'failed':ss.length&&ss.every(function(s){return s.result==='passed'})?'passed':null})():q.result;
      return '<div class="item clickable" onclick="showQualification(\''+q.id+'\')"><div class="row" style="justify-content:space-between"><b>'+escHtml(q.name)+'</b><strong>'+minutesText(row[1])+'</strong></div><div class="row" style="margin-top:7px">'+resultBadge(status)+(q.next_exam_date?'<span class="muted small">次回 '+fmt(q.next_exam_date)+'</span>':'')+'</div><div class="bar" style="margin:8px 0"><div style="width:'+(rows[0]?.[1]?row[1]/rows[0][1]*100:0)+'%"></div></div><span class="muted small">資格の攻略状況を見る</span></div>';
    }).join(''):'<div class="item">まだ資格がありません。</div>';
  };

  var originalShowQualification=window.showQualification;
  window.showQualification=function(id){
    var q=qualifications.find(function(x){return x.id===id});if(!q)return;
    var box=document.getElementById('dashboard'),ss=subjects.filter(function(s){return s.qualification_id===id}),total=totalMinutes(id),retake=retakeMinutes(q);
    var status=q.result_mode==='subject'?(ss.some(function(s){return s.result==='failed'})?'failed':ss.length&&ss.every(function(s){return s.result==='passed'})?'passed':null):q.result;
    box.innerHTML='<button class="light" onclick="showDashboard()">← 資格一覧</button><div class="quest"><div class="kicker">Qualification</div><h2>'+escHtml(q.name)+'</h2><div class="row" style="margin-top:8px">'+resultBadge(status)+(q.exam_date?'<span class="badge">試験 '+fmt(q.exam_date)+'</span>':'')+(q.next_exam_date?'<span class="badge">次回 '+fmt(q.next_exam_date)+'</span>':'')+'</div></div><div class="statgrid" style="margin:12px 0"><div class="mini"><b>通算勉強時間</b><strong>'+minutesText(total)+'</strong></div><div class="mini"><b>再試験の勉強時間</b><strong>'+minutesText(retake)+'</strong></div></div>'+(q.result_mode==='subject'?'<div class="item"><b>科目合否</b>'+ss.map(function(s){return '<div class="row" style="justify-content:space-between;margin-top:8px"><span>'+escHtml(s.name)+'</span>'+resultBadge(s.result)+'</div>'}).join('')+'</div>':'')+ss.map(function(s){var ps=problems.filter(function(p){return p.subject_id===s.id}),master=ps.filter(function(p){return p.status==='mastered'}).length;return '<div class="item clickable" onclick="showUnit(\''+s.id+'\')"><div class="row" style="justify-content:space-between"><b>'+escHtml(s.name)+'</b><strong>'+master+' / '+ps.length+' MASTER</strong></div><div class="bar" style="margin-top:8px"><div style="width:'+(ps.length?master/ps.length*100:0)+'%"></div></div></div>'}).join('')||'<div class="item">科目がありません。</div>';
  };

  // 試験日表示は、不合格後は次回試験日を優先。
  var originalUpdateHero=window.updateHero;
  window.updateHero=function(){
    if(originalUpdateHero)originalUpdateHero.apply(this,arguments);
    var next=qualifications.filter(function(q){return q.next_exam_date||q.exam_date}).sort(function(a,b){return (a.next_exam_date||a.exam_date).localeCompare(b.next_exam_date||b.exam_date)})[0];
    if(next){var d=next.next_exam_date||next.exam_date,diff=Math.ceil((parseDate(d)-parseDate(today()))/86400000);document.getElementById('heroCountdown').textContent=diff>=0?'あと '+diff+'日':'試験済み';document.getElementById('heroExamName').textContent=next.name+' / '+fmt(d);}
  };

  var style=document.createElement('style');style.textContent='.badge.good{color:#b7f7d5;border-color:#286c50;background:#102c23}.badge.bad{color:#ffc1cf;border-color:#6b2941;background:#3d1725}.statgrid .mini strong{font-size:18px}';document.head.appendChild(style);
})();
