(()=>{
  const STYLE_ID='knowledge-ai-organizer-style',MODAL_ID='knowledgeAiOrganizerModal';
  let aiResult=null, groups=[], tags=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el=id=>document.getElementById(id);
  function ensureStyle(){if(el(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
#${MODAL_ID}{position:fixed;inset:0;background:rgba(3,7,18,.78);backdrop-filter:blur(5px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
.ka-modal{width:min(900px,100%);max-height:92vh;overflow:auto;background:#0e1526;border:1px solid #354361;border-radius:20px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.45)}
.ka-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.ka-head h2{margin:0}.ka-close{background:#222b43;color:#e8ecff;border:1px solid #33405f}
.ka-section{margin-top:14px;padding:14px;border:1px solid #2d3956;border-radius:14px;background:#10192b}.ka-label{font-size:11px;letter-spacing:.12em;color:#c7b8ff;font-weight:900;margin-bottom:6px}.ka-summary{font-size:17px;font-weight:750;line-height:1.65}.ka-detail{white-space:pre-wrap;line-height:1.65}.ka-points{margin:7px 0 0;padding-left:22px}.ka-points li{margin:5px 0;line-height:1.5}.ka-choice{display:flex;gap:9px;align-items:flex-start;margin:8px 0;padding:9px 10px;border:1px solid #33405f;border-radius:11px;background:#0c1322}.ka-choice input{width:auto;margin-top:3px}.ka-choice b{display:block}.ka-reason{display:block;color:#98a3bf;font-size:12px;margin-top:3px;line-height:1.45}.ka-new{border-color:#5b4a91;background:#17142b}.ka-tag-wrap{display:flex;gap:7px;flex-wrap:wrap}.ka-tag-choice{display:flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid #33405f;border-radius:999px;background:#0c1322}.ka-tag-choice input{width:auto}.ka-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:16px}.ka-actions button{min-width:140px}.ka-muted{color:#98a3bf;font-size:13px;line-height:1.5}
@media(max-width:700px){#${MODAL_ID}{padding:8px}.ka-modal{padding:14px}.ka-actions button{width:100%}}
`;document.head.appendChild(s)}
  function ensureModal(){ensureStyle();if(el(MODAL_ID))return;const d=document.createElement('div');d.id=MODAL_ID;d.className='hidden';d.innerHTML=`<div class="ka-modal"><div class="ka-head"><div><div class="ka-label">AI KNOWLEDGE ORGANIZER</div><h2>🤖 知識を整理</h2><div class="ka-muted">AIが今ある知識・タグ・箱とのつながりを見て整理案を作りました。保存前に確認できます。</div></div><button class="ka-close" onclick="window.knowledgeAiOrganizer.close()">閉じる</button></div><div id="kaBody"></div></div>`;document.body.appendChild(d)}
  function open(){ensureModal();el(MODAL_ID).classList.remove('hidden');document.body.style.overflow='hidden'}
  function close(){const m=el(MODAL_ID);if(m)m.classList.add('hidden');document.body.style.overflow=''}
  function renderLoading(){open();el('kaBody').innerHTML='<div class="ka-section"><div class="ka-summary">AIが既存の知識・タグ・箱を確認しています…</div></div>'}
  function groupOptions(rec){
    const r=rec||{};const existingId=groups.find(g=>g.id===r.existing_id||g.name===r.name)?.id||'';const useExisting=r.mode!=='create'&&!!existingId;
    const items=groups.map(g=>`<label class="ka-choice"><input type="radio" name="ka-group" value="existing:${esc(g.id)}" ${useExisting&&existingId===g.id?'checked':''}><span><b>${esc(g.name)}</b></span></label>`).join('');
    const newName=useExisting?'':(r.name||'');
    return `<div class="ka-section"><div class="ka-label">箱</div><div class="ka-muted">AIのおすすめを初期選択しています。既存の箱に入れるか、新しい箱を作れます。</div>${items||'<div class="ka-muted" style="margin-top:8px">既存の箱はありません。</div>'}<label class="ka-choice ka-new"><input type="radio" name="ka-group" value="create" ${useExisting?'':'checked'}><span><b>＋ 新しい箱を作る</b><span class="ka-reason">AI提案：${esc(r.reason||'今回の知識を今後も整理しやすくするため')}</span><input id="ka-new-group" placeholder="新しい箱の名前" value="${esc(newName)}" style="margin-top:7px"></span></label></div>`;
  }
  function tagOptions(recs){
    const rows=(recs||[]).map((r,i)=>{const existing=tags.find(t=>t.id===r.existing_id||t.name===r.name);const mode=existing?'existing':'create';return `<label class="ka-tag-choice ${mode==='create'?'ka-new':''}"><input type="checkbox" class="ka-tag-check" data-mode="${mode}" data-id="${esc(existing?.id||'')}" data-name="${esc(existing?.name||r.name)}" checked><span>${esc(existing?.name||r.name)}${mode==='create'?' ＋':''}</span></label>`}).join('');
    return `<div class="ka-section"><div class="ka-label">タグ</div><div class="ka-muted" style="margin-bottom:8px">既存タグは紐づけ、新しいタグはこのまま保存するとタグマスタにも追加します。不要なものは外せます。</div><div class="ka-tag-wrap">${rows||'<span class="ka-muted">AIからタグ提案がありませんでした。</span>'}</div></div>`;
  }
  function renderResult(){
    const r=aiResult||{},pts=(r.key_points||[]).map(x=>`<li>${esc(x)}</li>`).join('');
    el('kaBody').innerHTML=`<div class="ka-section"><div class="ka-label">基本回答</div><div class="ka-summary">${esc(r.summary)}</div></div><div class="ka-section"><div class="ka-label">詳しく</div><div class="ka-detail">${esc(r.detail||'')}</div></div>${pts?`<div class="ka-section"><div class="ka-label">重要ポイント</div><ul class="ka-points">${pts}</ul></div>`:''}${groupOptions(r.group_recommendation)}${tagOptions(r.tag_recommendations)}<div class="ka-section"><div class="ka-label">関連知識</div><div class="ka-tag-wrap">${(r.related_topics||[]).map(x=>`<span class="ai-chip">${esc(x)}</span>`).join('')||'<span class="ka-muted">なし</span>'}</div></div><div class="ka-actions"><button class="light" onclick="window.knowledgeAiOrganizer.close()">キャンセル</button><button class="primary" onclick="window.knowledgeAiOrganizer.save()">この内容で保存</button></div>`;
  }
  async function consult(){
    const title=(el('miscTitle')?.value||'').trim(),content=(el('miscContent')?.value||'').trim();if(!title&&!content){alert('何について知りたいか入力してください。');return}
    renderLoading();
    try{
      const {data,error}=await sb.functions.invoke('knowledge-card-ai',{body:{question:[title,content].filter(Boolean).join('\n')}});if(error)throw error;if(!data||data.error)throw new Error(data?.error||'AI回答を取得できませんでした。');
      const g=await sb.from('knowledge_groups').select('id,name,description').order('name');if(g.error)throw g.error;const t=await sb.from('knowledge_tags').select('id,name').order('name');if(t.error)throw t.error;groups=g.data||[];tags=t.data||[];aiResult=data;renderResult();
    }catch(e){console.error(e);el('kaBody').innerHTML=`<div class="ka-section"><div class="ka-summary">AI整理に失敗しました。</div><div class="ka-muted" style="margin-top:8px">${esc(e?.message||e)}</div></div><div class="ka-actions"><button class="light" onclick="window.knowledgeAiOrganizer.close()">閉じる</button></div>`}
  }
  async function save(){
    const title=(el('miscTitle')?.value||'').trim(),content=(el('miscContent')?.value||'').trim();if(!title){alert('「何について？」を入力してください。');return}
    const groupRadio=document.querySelector('input[name="ka-group"]:checked');let groupId=null;
    try{
      const {data:{user:currentUser},error:authError}=await sb.auth.getUser();
      if(authError||!currentUser)throw new Error('ログイン情報を取得できませんでした。');
      const uid=currentUser.id;
      if(groupRadio?.value==='create'){const name=(el('ka-new-group')?.value||'').trim();if(!name){alert('新しい箱の名前を入力してください。');return}const {data,error}=await sb.from('knowledge_groups').insert({user_id:uid,name,description:'AIが知識整理時に提案'}).select('id').single();if(error)throw error;groupId=data.id}
      else if(groupRadio?.value?.startsWith('existing:'))groupId=groupRadio.value.slice(9);
      const cat=el('miscCategory')?.value||null;
      const payload={what_was_it:title,important_points:aiResult?.key_points||[],unknown_terms:[],in_my_words:aiResult?.summary||content,category_id:cat||null,card_type:'misc',ai_summary:aiResult?.summary||null,ai_detail:aiResult?.detail||null,ai_key_points:aiResult?.key_points||[],ai_related_topics:aiResult?.related_topics||[],updated_at:new Date().toISOString()};
      const {data:card,error:ce}=await sb.from('knowledge_cards').insert({...payload,user_id:uid}).select('id').single();if(ce)throw ce;
      if(groupId){const {error:ge}=await sb.from('knowledge_group_cards').upsert({user_id:uid,group_id:groupId,card_id:card.id},{onConflict:'group_id,card_id'});if(ge)throw ge}
      const checks=[...document.querySelectorAll('.ka-tag-check:checked')];
      for(const c of checks){let tagId=c.dataset.id||'';if(c.dataset.mode==='create'||!tagId){const name=(c.dataset.name||'').trim();if(!name)continue;const {data:td,error:te}=await sb.from('knowledge_tags').upsert({user_id:uid,name,updated_at:new Date().toISOString()},{onConflict:'user_id,name'}).select('id').single();if(te)throw te;tagId=td.id}const {error:re}=await sb.from('knowledge_card_tags').upsert({user_id:uid,card_id:card.id,tag_id:tagId},{onConflict:'card_id,tag_id'});if(re)throw re}
      close();el('miscAiResult')?.classList.add('hidden');if(typeof loadAll==='function')await loadAll();else if(typeof renderCards==='function')renderCards();if(typeof toast==='function')toast('AI整理した知識を保存しました');else alert('AI整理した知識を保存しました');
    }catch(e){console.error(e);alert('保存に失敗しました。\n'+(e?.message||e))}
  }
  function patchButton(){const b=document.querySelector('#miscForm button[onclick="askKnowledgeAI()"]');if(b){b.textContent='🤖 AIに相談して整理';b.onclick=consult}}
  window.knowledgeAiOrganizer={consult,save,close};window.askKnowledgeAI=consult;
  document.addEventListener('DOMContentLoaded',patchButton);setTimeout(patchButton,500);setTimeout(patchButton,1500);
})();