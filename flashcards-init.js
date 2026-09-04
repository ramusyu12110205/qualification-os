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