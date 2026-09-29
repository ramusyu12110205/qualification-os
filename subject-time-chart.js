(function(){
  function mt(m){m=Math.round(Number(m)||0);var h=Math.floor(m/60),n=m%60;return h?(n?h+'時間'+n+'分':h+'時間'):n+'分'}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
  var base=window.showQualificationResultAware;
  if(!base||base.__stc)return;
  window.showQualificationResultAware=function(id){
    var r=base.apply(this,arguments),box=document.getElementById('dashboard'),stat=box&&box.querySelector('.statgrid');
    if(!box||!stat)return r;
    var old=box.querySelector('.stc-card');if(old)old.remove();
    var card=document.createElement('div');card.className='item stc-card';card.style.margin='12px 0';
    card.innerHTML='<div class="row" style="justify-content:space-between;align-items:center"><div><b>科目別の勉強時間</b><div class="muted small">資格全体に占める割合を確認</div></div><button class="light" type="button">円グラフを見る</button></div><div class="stc-panel" style="display:none;margin-top:12px"></div>';
    var btn=card.querySelector('button'),panel=card.querySelector('.stc-panel');
    btn.onclick=function(){var open=panel.style.display!=='none';panel.style.display=open?'none':'block';btn.textContent=open?'円グラフを見る':'円グラフを閉じる';if(open)return;
      var rows=subjects.filter(function(s){return s.qualification_id===id}).map(function(s){return{name:s.name,m:sessions.filter(function(x){return x.subject_id===s.id}).reduce(function(a,x){return a+Number(x.minutes||0)},0)}}).filter(function(x){return x.m>0}).sort(function(a,b){return b.m-a.m});
      var total=rows.reduce(function(a,x){return a+x.m},0);if(!total){panel.innerHTML='<div class="muted small">まだ科目別の勉強記録がありません。</div>';return}
      var colors=['#8b5cf6','#22d3ee','#34d399','#fbbf24','#fb7185','#60a5fa','#a78bfa','#f472b6'],pos=0,stops=rows.map(function(x,i){var e=pos+x.m/total*360,z=colors[i%colors.length]+' '+pos+'deg '+e+'deg';pos=e;return z}).join(','),list=rows.map(function(x,i){return '<div class="stc-row"><span><i style="background:'+colors[i%colors.length]+'"></i>'+esc(x.name)+'</span><b>'+Math.round(x.m/total*100)+'%</b><small>'+mt(x.m)+'</small></div>'}).join('');
      panel.innerHTML='<div class="stc-wrap"><div class="stc-pie" style="background:conic-gradient('+stops+')"><div><strong>'+mt(total)+'</strong><span>科目合計</span></div></div><div class="stc-list">'+list+'</div></div>';
    };
    stat.insertAdjacentElement('afterend',card);return r;
  };
  window.showQualificationResultAware.__stc=true;
  var s=document.createElement('style');s.textContent='.stc-wrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.stc-pie{width:180px;height:180px;border-radius:50%;display:grid;place-items:center}.stc-pie>div{width:105px;height:105px;border-radius:50%;background:#0e1422;border:1px solid #26314d;display:flex;flex-direction:column;align-items:center;justify-content:center}.stc-pie strong{font-size:18px}.stc-pie span{font-size:11px;color:#98a3bf}.stc-list{flex:1;min-width:220px}.stc-row{display:grid;grid-template-columns:minmax(0,1fr) 45px 70px;gap:7px;padding:7px 0;border-bottom:1px solid #26314d}.stc-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stc-row i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px}.stc-row b,.stc-row small{text-align:right}.stc-row small{color:#98a3bf}@media(max-width:700px){.stc-wrap{justify-content:center}.stc-pie{width:165px;height:165px}.stc-list{width:100%}}';document.head.appendChild(s);
})();
