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
})();
