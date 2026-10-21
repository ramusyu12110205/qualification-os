(function(){
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'})[c]})}

  function transform(){
    var root=document.getElementById('panel-qualification');
    if(!root || typeof qualifications==='undefined' || typeof subjects==='undefined')return;

    root.querySelectorAll('textarea[id^="qs-"]').forEach(function(ta){
      if(ta.dataset.tabsReady==='1')return;
      var qid=ta.id.slice(3);
      var q=qualifications.find(function(x){return x.id===qid});
      if(!q)return;
      var ss=subjects.filter(function(s){return s.qualification_id===qid && !s.archived}).sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0)});
      if(!ss.length)return;

      var wrap=document.createElement('div');
      wrap.className='q-subject-tabs-editor';
      var nav=document.createElement('div');
      nav.className='q-sub-tabs';
      var panes=document.createElement('div');
      panes.className='q-sub-panes';

      ss.forEach(function(s,i){
        var btn=document.createElement('button');
        btn.type='button';
        btn.className='light q-sub-tab'+(i===0?' active':'');
        btn.dataset.sid=s.id;
        btn.textContent=s.name;
        btn.onclick=function(){activate(qid,s.id)};
        nav.appendChild(btn);

        var pane=document.createElement('div');
        pane.className='q-sub-pane'+(i===0?'':' hidden');
        pane.dataset.sid=s.id;
        pane.innerHTML=
          '<label>科目名</label>'+ 
          '<input class="q-sub-name" data-sub-id="'+s.id+'" value="'+esc(s.name)+'">'+
          '<label>合否</label>'+ 
          '<select class="q-sub-result" data-sub-id="'+s.id+'">'+
            '<option value="">未設定</option>'+ 
            '<option value="合格"'+(s.result==='合格'?' selected':'')+'>合格</option>'+ 
            '<option value="不合格"'+(s.result==='不合格'?' selected':'')+'>不合格</option>'+ 
          '</select>';
        panes.appendChild(pane);
      });

      wrap.appendChild(nav);
      wrap.appendChild(panes);
      ta.parentNode.insertBefore(wrap,ta);
      ta.style.display='none';
      ta.dataset.tabsReady='1';
      var label=ta.previousElementSibling;
      if(label&&label.tagName==='LABEL')label.style.display='none';
    });
  }

  function activate(qid,sid){
    var root=document.getElementById('panel-qualification');
    if(!root)return;
    root.querySelectorAll('.q-sub-tab').forEach(function(b){b.classList.toggle('active',b.dataset.sid===sid)});
    root.querySelectorAll('.q-sub-pane').forEach(function(p){p.classList.toggle('hidden',p.dataset.sid!==sid)});
  }

  window.renderQualificationMasterInline=(function(base){
    return function(){
      if(base)base.apply(this,arguments);
      setTimeout(transform,0);
    };
  })(window.renderQualificationMasterInline);

  window.updateQualification=async function(id){
    var root=document.getElementById('panel-qualification');
    if(!root)return;
    var name=document.getElementById('qn-'+id)?.value.trim();
    var exam_date=document.getElementById('qd-'+id)?.value||null;
    if(!name){alert('資格名を入力してください');return}
    if(!currentUser?.id){alert('ログイン状態を確認してください。');return}

    var rows=[...root.querySelectorAll('.q-sub-name[data-sub-id]')].map(function(input,index){
      var sid=input.dataset.subId;
      var result=root.querySelector('.q-sub-result[data-sub-id="'+sid+'"]')?.value||null;
      return {id:sid,name:input.value.trim(),result:result,sort_order:index};
    }).filter(function(x){return x.name});

    var oldSubjects=subjects.filter(function(s){return s.qualification_id===id && !s.archived});

    var qUpdate=await sb.from('qualifications').update({name:name,exam_date:exam_date}).eq('id',id).eq('user_id',currentUser.id);
    if(qUpdate.error){alert('資格の更新に失敗しました: '+qUpdate.error.message);return}

    var keepIds=[];
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      if(oldSubjects.some(function(s){return s.id===row.id})){ 
        var u=await sb.from('subjects').update({name:row.name,result:row.result||null,sort_order:i,archived:false}).eq('id',row.id).eq('user_id',currentUser.id);
        if(u.error){alert('科目の更新に失敗しました: '+u.error.message);return}
        keepIds.push(row.id);
      }else{
        var ins=await sb.from('subjects').insert({user_id:currentUser.id,qualification_id:id,name:row.name,result:row.result||null,sort_order:i,archived:false}).select().single();
        if(ins.error){alert('科目の追加に失敗しました: '+ins.error.message);return}
        keepIds.push(ins.data.id);
      }
    }

    var remove=oldSubjects.filter(function(s){return !keepIds.includes(s.id)});
    if(remove.length){
      var ar=await sb.from('subjects').update({archived:true}).in('id',remove.map(function(s){return s.id})).eq('user_id',currentUser.id);
      if(ar.error){alert('科目の更新に失敗しました: '+ar.error.message);return}
    }

    await loadAll();
    renderQualificationMasterInline();
    toast('資格を保存しました');
  };

  var st=document.createElement('style');
  st.textContent='.q-sub-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.q-sub-tab{border-radius:999px;padding:8px 13px}.q-sub-tab.active{background:#8b5cf6;color:#fff;border-color:#8b5cf6}.q-sub-panes{margin-top:8px}.q-sub-pane{padding:14px;border:1px solid #33405f;border-radius:14px;background:#10182a}.q-sub-pane select{margin-bottom:2px}.q-sub-pane .q-sub-name{margin-bottom:2px}.q-sub-pane.hidden{display:none}';
  document.head.appendChild(st);
  setTimeout(transform,0);

  function injectWeaknessLink(){
    if(document.getElementById('weaknessNavButton'))return;
    var header=document.querySelector('#app > .sectiontitle');
    if(!header)return;
    var btn=document.createElement('button');
    btn.id='weaknessNavButton';
    btn.className='light';
    btn.type='button';
    btn.textContent='🎯 弱点分析';
    btn.onclick=function(){location.href='weakness.html'};
    header.insertBefore(btn,header.querySelector('button.light:last-child')||null);
  }
  setTimeout(injectWeaknessLink,0);
  setTimeout(injectWeaknessLink,300);
})();

(function(){
  var original=window.renderRecordManagerInline;
  window.renderRecordManagerInline=async function(){
    var box=document.getElementById('panel-record');
    if(!box)return;
    var labels={new_problems:'新規問題',review:'復習',textbook:'テキスト',lecture:'講義',mock:'模試',other:'その他'};
    box.innerHTML='<h3>勉強記録を管理</h3><p class="muted small">'+sessions.length+'件。勉強内容を読み込んでいます…</p>';

    var sessionIds=sessions.map(function(s){return s.id}).filter(Boolean);
    var links=[];
    if(sessionIds.length){
      var res=await sb.from('study_session_problems').select('session_id,problem_id,role,result').in('session_id',sessionIds);
      if(!res.error)links=res.data||[];
    }
    var problemMap=new Map((problems||[]).map(function(p){return [p.id,p]}));
    var linksBySession=new Map();
    links.forEach(function(link){
      if(!linksBySession.has(link.session_id))linksBySession.set(link.session_id,[]);
      linksBySession.get(link.session_id).push(link);
    });

    function resultLabel(result){return result==='wrong'?'× 誤答':result==='correct'?'○ 正解':''}
    function resultStyle(result){return result==='wrong'?'color:var(--bad)':result==='correct'?'color:var(--good)':''}

    var cards=sessions.length?sessions.map(function(s){
      var q=qualifications.find(function(x){return x.id===s.qualification_id});
      var sub=subjects.find(function(x){return x.id===s.subject_id});
      var type=labels[s.activity_type]||s.activity_type;
      var sessionLinks=linksBySession.get(s.id)||[];
      var detailId='record-detail-'+String(s.id).replace(/[^a-zA-Z0-9_-]/g,'');
      var problemsHtml=sessionLinks.length?'<div style="margin-top:10px;padding-top:10px;border-top:1px solid #293551"><div class="muted small" style="margin-bottom:6px">📚 '+sessionLinks.length+'問</div>'+sessionLinks.map(function(link,i){
        var p=problemMap.get(link.problem_id);
        var name=p?.name||'問題';
        var result=resultLabel(link.result);
        return '<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;font-size:13px"><span class="muted" style="min-width:24px">'+(i+1)+'.</span><span style="flex:1">'+esc(name)+'</span>'+(result?'<span class="small" style="'+resultStyle(link.result)+';white-space:nowrap">'+result+'</span>':'')+'</div>';
      }).join('')+'</div>':'';
      return '<div class="item clickable" onclick="toggleRecordDetail(\''+detailId+'\')">'+
        '<div class="record-grid"><div><b>'+esc(q?.name||'資格')+(sub?' / '+esc(sub.name):'')+'</b><div class="muted small">'+fmt(s.study_date)+' ・ '+type+'</div></div><strong>'+minutesText(s.minutes)+'</strong></div>'+
        '<div class="record-meta"><span>📅 '+s.study_date+'</span>'+(sessionLinks.length?'<span>📚 '+sessionLinks.length+'問</span>':'')+(s.memo?'<span>💬 '+esc(s.memo)+'</span>':'')+'<span style="margin-left:auto">詳細 ▾</span></div>'+
        '<div id="'+detailId+'" style="display:none;margin-top:10px" onclick="event.stopPropagation()">'+
          (s.memo?'<div class="muted small" style="margin-bottom:8px">メモ：'+esc(s.memo)+'</div>':'')+
          (problemsHtml||'<div class="muted small" style="padding-top:4px">この記録には問題の紐付けはありません。</div>')+
          '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="danger" onclick="deleteStudySession(\''+s.id+'\')">削除</button></div>'+
        '</div></div>';
    }).join(''):'<div class="item">勉強記録はありません。</div>';

    box.innerHTML='<h3>勉強記録を管理</h3><p class="muted small">'+sessions.length+'件。クリックすると、その日にやった内容を確認できます。</p>'+cards;
  };

  window.toggleRecordDetail=function(id){
    var el=document.getElementById(id);
    if(!el)return;
    el.style.display=el.style.display==='none'?'block':'none';
  };
})();

