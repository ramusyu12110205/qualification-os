(function(){
  var baseRender=window.renderQualificationMasterInline;
  var baseUpdate=window.updateQualificationResultAware;
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'})[c]})}
  function transform(){
    var root=document.getElementById('panel-qualification');if(!root)return;
    root.querySelectorAll('textarea[id^="rs-"]').forEach(function(ta){
      if(ta.dataset.tabsReady==='1')return;
      var qid=ta.id.slice(3), q=qualifications.find(function(x){return x.id===qid});if(!q)return;
      var ss=subjects.filter(function(s){return s.qualification_id===qid});
      var wrap=document.createElement('div');wrap.className='q-subject-tabs-editor';
      var nav=document.createElement('div');nav.className='q-sub-tabs';
      var panes=document.createElement('div');panes.className='q-sub-panes';
      ss.forEach(function(s,i){
        var btn=document.createElement('button');btn.type='button';btn.className='light q-sub-tab'+(i===0?' active':'');btn.dataset.sid=s.id;btn.textContent=s.name;
        btn.onclick=function(){activate(qid,s.id)};nav.appendChild(btn);
        var pane=document.createElement('div');pane.className='q-sub-pane'+(i===0?'':' hidden');pane.dataset.sid=s.id;
        pane.innerHTML='<label>科目名</label><input class="q-sub-name" data-sub-id="'+s.id+'" value="'+esc(s.name)+'">';
        var oldResult=root.querySelector('#sr-'+s.id);
        if(oldResult){var lab=document.createElement('label');lab.textContent='合否';pane.appendChild(lab);pane.appendChild(oldResult)}
        panes.appendChild(pane);
      });
      wrap.appendChild(nav);wrap.appendChild(panes);ta.parentNode.insertBefore(wrap,ta);ta.style.display='none';ta.dataset.tabsReady='1';
      var label=ta.previousElementSibling;if(label&&label.tagName==='LABEL')label.style.display='none';
    });
  }
  function activate(qid,sid){
    var root=document.getElementById('panel-qualification');if(!root)return;
    root.querySelectorAll('.q-sub-tab').forEach(function(b){b.classList.toggle('active',b.dataset.sid===sid)});
    root.querySelectorAll('.q-sub-pane').forEach(function(p){p.classList.toggle('hidden',p.dataset.sid!==sid)});
  }
  window.renderQualificationMasterInline=function(){if(baseRender)baseRender.apply(this,arguments);setTimeout(transform,0)};
  window.updateQualificationResultAware=async function(id){
    var root=document.getElementById('panel-qualification'),ta=document.getElementById('rs-'+id),desired=[];
    if(root){root.querySelectorAll('.q-sub-name[data-sub-id]').forEach(function(i){desired.push({oldId:i.dataset.subId,name:i.value.trim(),result:(root.querySelector('#sr-'+i.dataset.subId)?.value||null)})})}
    if(ta)ta.value=desired.map(function(x){return x.name}).filter(Boolean).join('\n');
    var mode=document.getElementById('rm-'+id)?.value||'overall';
    await baseUpdate.apply(this,arguments);
    await loadAll();
    var current=subjects.filter(function(s){return s.qualification_id===id}),byName={};desired.forEach(function(x){if(x.name)byName[x.name]=x.result});
    if(mode==='subject'){
      for(var i=0;i<current.length;i++)if(Object.prototype.hasOwnProperty.call(byName,current[i].name))await sb.from('subjects').update({result:byName[current[i].name]}).eq('id',current[i].id).eq('user_id',currentUser.id);
      await loadAll();
    }
    if(typeof window.renderQualificationMasterInline==='function')window.renderQualificationMasterInline();
    if(typeof updateHero==='function')updateHero();
  };
  var st=document.createElement('style');st.textContent='.q-sub-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.q-sub-tab{border-radius:999px;padding:8px 13px}.q-sub-tab.active{background:#8b5cf6;color:#fff;border-color:#8b5cf6}.q-sub-panes{margin-top:8px}.q-sub-pane{padding:14px;border:1px solid #33405f;border-radius:14px;background:#10182a}.q-sub-pane select{margin-bottom:2px}.q-sub-pane .q-sub-name{margin-bottom:2px}';document.head.appendChild(st);
  setTimeout(transform,0);
})();
