(async()=>{try{const {data:{session:s}}=await sb.auth.getSession();if(s&&window.loadMasters){await loadMasters();if(window.loadHistory)await loadHistory();}}catch(e){console.error(e)}})();
const baseStart=window.startSession;
window.startSession=async function(mode){
  if(mode==='choice'&&currentDeck?.question_mode==='shared_choices'){
    const u=[...new Set(currentCards.map(c=>c.answer))];
    if(u.length<2)return toast('同じ答えを共有する4択には2種類以上の答えが必要です');
  }
  return baseStart(mode);
};
const baseShowDeckForm=window.showDeckForm;
window.showDeckForm=async function(d){
  if(!window.qualifications?.length||!window.subjects?.length)await loadMasters();
  return baseShowDeckForm(d);
};
window.deleteCard=async function(id){
  if(!confirm('このカードを削除しますか？'))return;
  const{error}=await sb.from('flashcards').delete().eq('id',id).eq('user_id',user.id);
  if(error)return toast(error.message);
  toast('カードを削除しました');
  const{data,error:e}=await sb.from('flashcards').select('*').eq('deck_id',currentDeck.id).order('created_at');
  if(e)return toast(e.message);
  currentCards=data||[];
  await manageCards();
};

// 暗記ファイルを「資格 → 科目」ごとにまとめて表示する。
const baseLoadDecks=window.loadDecks;
window.loadDecks=async function(){
  const result=await baseLoadDecks();
  const box=document.getElementById('decks');
  if(!box||!Array.isArray(window.decks))return result;
  const items=[...box.children].filter(el=>el.classList.contains('item'));
  if(!items.length)return result;
  const byId=new Map(window.decks.map(d=>[String(d.id),d]));
  const groups=new Map();
  items.forEach(item=>{
    const btn=item.querySelector('button[onclick^="openDeck("]');
    const m=btn?.getAttribute('onclick')?.match(/openDeck\('([^']+)'\)/);
    const d=m?byId.get(m[1]):null;
    const q=(window.qualifications||[]).find(x=>x.id===d?.qualification_id);
    const s=(window.subjects||[]).find(x=>x.id===d?.subject_id);
    const key=(q?.name||'資格未設定')+'\u0000'+(s?.name||'科目未設定');
    if(!groups.has(key))groups.set(key,{q:q?.name||'資格未設定',s:s?.name||'科目未設定',items:[]});
    groups.get(key).items.push(item);
  });
  box.innerHTML='';
  [...groups.values()].forEach(g=>{
    const section=document.createElement('div');
    section.style.margin='18px 0 8px';
    const title=document.createElement('div');
    title.style.cssText='font-weight:900;font-size:16px;margin:8px 2px 6px;color:#e8ecff';
    title.textContent=g.s==='科目未設定'?g.q:g.q+' ／ '+g.s;
    section.appendChild(title);
    g.items.forEach(item=>section.appendChild(item));
    box.appendChild(section);
  });
  return result;
};