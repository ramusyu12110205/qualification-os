(function(){
  function mt(m){m=Math.round(Number(m)||0);var h=Math.floor(m/60),n=m%60;return h?(n?h+'時間'+n+'分':h+'時間'):n+'分'}
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'})[c]})}
  function getVisibleSubjectIds(box){
    var ids=[];
    box.querySelectorAll('.item[onclick]').forEach(function(el){
      var m=(el.getAttribute('onclick')||'').match(/showUnit\(['\"]([^'\"]+)['\"]\)/);
      if(m&&m[1]&&!ids.includes(m[1]))ids.push(m[1]);
    });
    return ids;
  }
  function addCard(box){
    // 資格詳細画面だけに表示する。科目詳細画面などには追加しない。
    var quest=box.querySelector('.quest');
    var stat=box.querySelector('.quest + .stat');
    if(!quest||!stat||box.querySelector('.stc-card'))return;
    var card=document.createElement('div');
    card.className='item stc-card';
    card.style.margin='12px 0';
    card.innerHTML='<div class="row" style="justify-content:space-between;align-items:center"><div><b>科目別の勉強時間</b><div class="muted small">資格全体に占める割合を確認</div></div><button class="light" type="button">円グラフを見る</button></div><div class="stc-panel" style="display:none;margin-top:12px"></div>';
    var btn=card.querySelector('button'),panel=card.querySelector('.stc-panel');
    btn.onclick=function(){
      var opening=panel.style.display==='none';
      panel.style.display=opening?'block':'none';
      btn.textContent=opening?'円グラフを閉じる':'円グラフを見る';
      if(!opening)return;
      var ids=getVisibleSubjectIds(box);
      var rows=ids.map(function(id){
        var s=(typeof subjects!=='undefined'&&Array.isArray(subjects))?subjects.find(function(x){return x.id===id}):null;
        var m=(typeof sessions!=='undefined'&&Array.isArray(sessions))?sessions.filter(function(x){return x.subject_id===id}).reduce(function(a,x){return a+Number(x.minutes||0)},0):0;
        return s?{name:s.name,m:m}:null;
      }).filter(function(x){return x&&x.m>0}).sort(function(a,b){return b.m-a.m});
      var total=rows.reduce(function(a,x){return a+x.m},0);
      if(!total){panel.innerHTML='<div class="muted small">まだ科目別の勉強記録がありません。</div>';return}
      var colors=['#8b5cf6','#22d3ee','#34d399','#fbbf24','#fb7185','#60a5fa','#a78bfa','#f472b6'],pos=0;
      var stops=rows.map(function(x,i){var e=pos+x.m/total*360,z=colors[i%colors.length]+' '+pos+'deg '+e+'deg';pos=e;return z}).join(',');
      var list=rows.map(function(x,i){return '<div class="stc-row"><span><i style="background:'+colors[i%colors.length]+'"></i>'+esc(x.name)+'</span><b>'+Math.round(x.m/total*100)+'%</b><small>'+mt(x.m)+'</small></div>'}).join('');
      panel.innerHTML='<div class="stc-wrap"><div class="stc-pie" style="background:conic-gradient('+stops+')"><div><strong>'+mt(total)+'</strong><span>科目合計</span></div></div><div class="stc-list">'+list+'</div></div>';
    };
    stat.insertAdjacentElement('afterend',card);
  }
  function install(){
    if(!document.getElementById('stc-style')){
      var s=document.createElement('style');s.id='stc-style';
      s.textContent='.stc-wrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.stc-pie{width:180px;height:180px;border-radius:50%;display:grid;place-items:center}.stc-pie>div{width:105px;height:105px;border-radius:50%;background:#0e1422;border:1px solid #26314d;display:flex;flex-direction:column;align-items:center;justify-content:center}.stc-pie strong{font-size:18px}.stc-pie span{font-size:11px;color:#98a3bf}.stc-list{flex:1;min-width:220px}.stc-row{display:grid;grid-template-columns:minmax(0,1fr) 45px 70px;gap:7px;padding:7px 0;border-bottom:1px solid #26314d}.stc-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stc-row i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px}.stc-row b,.stc-row small{text-align:right}.stc-row small{color:#98a3bf}@media(max-width:700px){.stc-wrap{justify-content:center}.stc-pie{width:165px;height:165px}.stc-list{width:100%}}';
      document.head.appendChild(s);
    }
    var box=document.getElementById('dashboard');
    if(!box)return false;
    addCard(box);
    if(!box.__stcObserver){
      var scheduled=false;
      new MutationObserver(function(){
        if(scheduled)return;
        scheduled=true;
        setTimeout(function(){scheduled=false;addCard(box)},0);
      }).observe(box,{childList:true,subtree:true});
      box.__stcObserver=true;
    }
    return true;
  }
  function boot(){install();setTimeout(install,300);setTimeout(install,1000);setTimeout(install,2000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

// 科目詳細の問題並び順切替を読み込む
(function(){
  if(window.__qosProblemSortLoading)return;
  window.__qosProblemSortLoading=true;
  var s=document.createElement('script');
  s.src='subject-problem-sort.js?v=20260929-2';
  document.head.appendChild(s);
})();
