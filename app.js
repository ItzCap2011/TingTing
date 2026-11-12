'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const speaker = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>';
const KEY='tingxie.v1';
const uid=()=>globalThis.crypto?.randomUUID?.() || String(Date.now())+Math.random().toString(36).slice(2);
const starter=[{id:'everyday',name:'Everyday essentials',icon:'日',created:Date.now(),words:[['你好','nǐ hǎo','hello; hi'],['谢谢','xiè xie','thank you'],['朋友','péng you','friend'],['今天','jīn tiān','today'],['喜欢','xǐ huan','to like; to be fond of'],['快乐','kuài lè','happy; joyful'],['时间','shí jiān','time'],['明天','míng tiān','tomorrow']].map(w=>({hanzi:w[0],pinyin:w[1],meaning:w[2]}))},{id:'school',name:'School & learning',icon:'学',created:Date.now(),words:[['学校','xué xiào','school'],['老师','lǎo shī','teacher'],['学生','xué sheng','student'],['学习','xué xí','to study; to learn'],['努力','nǔ lì','to strive; to work hard'],['认真','rèn zhēn','conscientious; earnest; to take seriously'],['考试','kǎo shì','examination; test'],['进步','jìn bù','progress; to improve']].map(w=>({hanzi:w[0],pinyin:w[1],meaning:w[2]}))}];
const curatedDefinitions={
  '犹豫':{pinyin:'yóu yù',meaning:'to hesitate; to be undecided'},
  '内疚':{pinyin:'nèi jiù',meaning:'to feel guilty or remorseful'},
  '疏远':{pinyin:'shū yuǎn',meaning:'to become distant or estranged; to alienate'},
  '懊恼':{pinyin:'ào nǎo',meaning:'to feel upset, annoyed, or regretful'},
  '安抚':{pinyin:'ān fǔ',meaning:'to comfort, soothe, calm, or reassure someone'},
  '扪心自问':{pinyin:'mén xīn zì wèn',meaning:"to examine one's conscience; to ask oneself honestly"},
  '迎刃而解':{pinyin:'yíng rèn ér jiě',meaning:'to be readily or easily solved'},
  '艰巨':{pinyin:'jiān jù',meaning:'arduous; very difficult and demanding'},
  '因素':{pinyin:'yīn sù',meaning:'a factor; something that influences a result'},
  '妥善':{pinyin:'tuǒ shàn',meaning:'properly, carefully, and satisfactorily'},
  '趋势':{pinyin:'qū shì',meaning:'a trend or general direction of development'},
  '遏制':{pinyin:'è zhì',meaning:'to curb, restrain, or contain'},
  '倡导':{pinyin:'chàng dǎo',meaning:'to advocate, promote, or encourage'},
  '泛滥':{pinyin:'fàn làn',meaning:'to overflow or flood; to spread unchecked'},
  '充斥':{pinyin:'chōng chì',meaning:'to be filled or pervaded with something, usually undesirable'}
};
function resolvedWord(word){const curated=curatedDefinitions[word.hanzi];return curated?{...word,...curated,curated:true}:{...word,curated:false};}
let data={decks:structuredClone(starter),completed:0}, storageOK=true;
try{const old=localStorage.getItem(KEY);if(old){const parsed=JSON.parse(old);if(!validData(parsed))throw Error('invalid');data=parsed;}}catch(e){storageOK=false;}
let page='practice', selected=data.decks[0]?.id, session=null, dict=null, dictPromise=null, pending=[], editing=null, draftName='', draftWords='', libraryQuery='';
let activeWriter=null, writerLoadFailed=false;
function validData(d){return d&&Array.isArray(d.decks)&&d.decks.length<=200&&d.decks.every(x=>typeof x.id==='string'&&typeof x.name==='string'&&x.name.length<=100&&Array.isArray(x.words)&&x.words.length>0&&x.words.length<=500&&x.words.every(w=>typeof w.hanzi==='string'&&w.hanzi.length<=50&&typeof w.pinyin==='string'&&w.pinyin.length<=200&&typeof w.meaning==='string'&&w.meaning.length<=2000));}
function save(){try{localStorage.setItem(KEY,JSON.stringify(data));storageOK=true;return true;}catch(e){storageOK=false;toast('Device storage is unavailable or full. Export your decks to keep a backup.');return false;}}
let toastTimer;
function toast(msg){$('#toast').textContent=msg;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',5000);}
function dialog(html){$('#dialog-content').innerHTML=html;$('#dialog').showModal();}
$('#close-dialog').onclick=()=>$('#dialog').close();
$('#help').onclick=()=>dialog('<h2>A little practice, every day.</h2><p>1. Create a deck by pasting simplified Chinese words, separated by a comma, space or new line.</p><p>2. Review the learner definition. Triple-checked entries are marked, and every word links to MDBG, MOE and Han Dian for context.</p><p>3. Choose Flexible mode to move backward or forward through every word, including completed words, or Strict mode to follow the shuffled order.</p><p>4. In Flexible mode, turn Hint mode on to see the correct stroke after three errors. Strict mode never allows hints.</p><p>5. After completing a word, practise it again as many times as you like. When every word is complete, use Complete session when you are ready.</p><p>Decks are saved in this browser on this device. Export a backup to move them to another device.</p>');
document.querySelector('.brand').onclick=e=>{e.preventDefault();navigate('practice');};
document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));
function navigate(next){if(page==='create'){draftName=$('#deck-name')?.value??draftName;draftWords=$('#word-input')?.value??draftWords;}if(page==='practice'&&session&&!session.done&&next!=='practice'){cancelAudio();destroyWriter();}page=next;render();window.scrollTo(0,0);}
function currentDeck(){return data.decks.find(d=>d.id===selected)||data.decks[0];}
function top(title,subtitle,eyebrow='YOUR DAILY RITUAL',right=''){return `<div class="page-top"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${right}</div>`;}
function render(){document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===page||(page==='detail'&&b.dataset.nav==='decks')));$('#page-label').textContent={practice:'Practice',decks:'My decks',create:editing?'Edit deck':'Create a deck',detail:'My decks'}[page];if(page==='practice')renderPractice();else if(page==='decks')renderDecks();else if(page==='create')renderCreate();else renderDetail();}
function deckCard(d){return `<button class="card deck-card" data-deck="${esc(d.id)}"><span class="tiny-icon">${esc(d.icon||d.words[0]?.hanzi?.[0]||'词')}</span><h3>${esc(d.name)}</h3><p>${d.words.length} words <span aria-hidden="true">·</span> Simplified Chinese</p><span class="arrow">↗</span></button>`;}
function bindDeckCards(){document.querySelectorAll('[data-deck]').forEach(b=>b.onclick=()=>{selected=b.dataset.deck;page='detail';render();window.scrollTo(0,0);});}
function renderPractice(){
  destroyWriter();
  if(session)selected=session.deckId;
  const d=currentDeck();
  if(!d){
    $('#app').innerHTML=top('Make room for new words.','Your first deck is the start of something good.')+'<div class="card empty"><h2>No decks yet</h2><p>Add a word list to begin.</p><button class="primary" id="first-deck">Create a deck</button></div>';
    $('#first-deck').onclick=()=>navigate('create');
    return;
  }
  const q=session?.words[session.index]||d.words[0];
  const wordState=session?currentWordState():null;
  const finished=session?.done;
  const total=session?.words.length||d.words.length;
  const completed=session?completedWordCount():0;
  const allComplete=session&&completed===total;
  const characters=writableCharacters(q.hanzi);
  const drawing=session?`${wordState.revealed?`<div id="answer-feedback" aria-live="polite">${revealHtml(q)}</div><div class="post-answer-actions"><button type="button" id="retry-word" class="secondary">↺ Practise this word again</button>${allComplete?'<button type="button" id="complete-session" class="primary">Complete session &nbsp; ✓</button>':'<button type="button" id="next" class="primary">Next unfinished word &nbsp; →</button>'}</div><p class="retry-note">You can repeat this word as many times as you like${session.strict?'.':', or use the arrows to revisit any word.'}</p>`:`
    <div class="writing-label"><span>Draw the word in simplified Chinese</span><span class="character-progress">Character ${wordState.charIndex+1} of ${characters.length}</span></div>
    <div class="word-slots" aria-label="${characters.length} character word">${characters.map((_,i)=>`<span class="word-slot ${i<wordState.charIndex?'done':i===wordState.charIndex?'current':''}">${i<wordState.charIndex?'✓':'·'}</span>`).join('')}</div>
    <div class="writer-shell" aria-label="Handwriting area for character ${wordState.charIndex+1}"><div id="writer-target" class="writer-target"></div><div id="writer-loading" class="writer-loading">Preparing the writing grid…</div></div>
    <div id="writer-status" class="writer-status" role="status" aria-live="polite">Draw the first stroke.</div>
    <div class="writer-actions"><button type="button" id="restart-character" class="secondary">↺ Clear grid</button><label class="hint-switch ${session.strict?'is-disabled':''}"><input type="checkbox" id="hint-mode" ${session.hintsEnabled&&!session.strict?'checked':''} ${session.strict?'disabled':''}><span class="switch-track" aria-hidden="true"><span></span></span><span class="hint-switch-copy"><b>Hint mode</b><small id="hint-mode-copy">${session.strict?'Unavailable in Strict mode':session.hintsEnabled?'On · hint after 3 errors':'Off'}</small></span></label><button type="button" id="reveal" class="text-btn">Reveal word</button></div>
    <p class="stroke-note" id="hint-mode-note">Use your finger or stylus. ${session.strict?'Hints are disabled in Strict mode.':session.hintsEnabled?'After three incorrect strokes, the correct stroke will be highlighted.':'Hint mode is off.'}</p>`}`:`<div class="writing-ready"><p class="subtitle" style="margin:30px 0 22px">Pinyin and sound are your clues.<br>Every round begins in a fresh random order.</p><div class="writer-shell"><span class="pencil-mark">✎</span></div><fieldset class="mode-choice"><legend>Choose a practice mode</legend><label><input type="radio" name="practice-mode" value="flexible" checked><span><b>Flexible</b><small>Switch words and use optional hints</small></span></label><label><input type="radio" name="practice-mode" value="strict"><span><b>Strict</b><small>Fixed order · no hints</small></span></label></fieldset><label class="hint-switch ready-hint-switch"><input type="checkbox" id="hint-mode-ready" checked><span class="switch-track" aria-hidden="true"><span></span></span><span class="hint-switch-copy"><b>Hint mode</b><small id="hint-mode-ready-copy">On · hint after 3 errors</small></span></label><button id="start" class="primary wide">Start handwriting practice &nbsp; →</button><p class="keyboard-tip">${d.words.length} words · Randomised every round · Strict mode has no hints</p></div>`;
  const nav=session&&!session.strict&&total>1&&!finished?`<div class="word-nav"><button id="prev-word" aria-label="Previous word">←</button><span>${completed} of ${total} completed</span><button id="next-word" aria-label="Next word">→</button></div>`:`<span>${session?`${completed} of ${total} completed`:total+' words'}</span>`;
  $('#app').innerHTML=top('A little practice. A lot of progress.','Listen closely, draw each character, and make every word your own.','听写 · HANDWRITING DICTATION','<span class="pill">✎ &nbsp; Draw one character at a time</span>')+`<div class="workspace"><section class="card">${finished?resultHtml():`<div class="practice-head"><b>${esc(session?.name||d.name)}</b>${nav}</div><div class="progress"><span style="width:${session?completed/total*100:0}%"></span></div><div class="practice-body ${session?'has-writer':''}"><div class="mode-label">${session?`${session.strict?'Strict':'Flexible'} mode · Listen. Remember. Draw.`:'YOUR NEXT LITTLE CHALLENGE'}</div><div class="pinyin" lang="zh-Latn">${esc(q.pinyin)}</div><div class="sound-row"><button class="audio-btn" id="listen">${speaker} Listen</button><button class="slow" id="slow">0.7× &nbsp; Slower</button></div>${drawing}</div><div class="practice-bottom"><span>简体中文 &nbsp; • &nbsp; Stroke-aware handwriting</span><span>${session?'First-try correct: '+session.correct:'Listen as many times as you need'}</span></div>`}</section><aside class="stack"><div class="card deck-info"><span class="tiny-icon">写</span><div class="eyebrow">ON YOUR DESK</div><h3>${esc(session?.name||d.name)}</h3><p>Hear it, remember it,<br>then write it by hand.</p><div class="stats"><div class="stat"><strong>${total.toString().padStart(2,'0')}</strong><small>WORDS IN THIS ROUND</small></div><div class="stat-divider"></div><div class="stat"><strong>${data.decks.length.toString().padStart(2,'0')}</strong><small>SAVED DECKS</small></div></div><label class="field-label" for="deck-select" style="font-size:10px">Choose a deck</label><select id="deck-select">${data.decks.map(x=>`<option value="${esc(x.id)}" ${x.id===d.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>${session&&!finished?'<button id="end" class="text-btn">End this round</button>':''}</div><div class="tip"><div class="mini-label">A SMALL WRITING TIP</div><h3 style="margin-top:13px">Keep the character balanced.</h3><p>Watch where each stroke starts and ends. The centre lines help you judge spacing.</p></div></aside></div><div class="section-row"><h2>Your word collections</h2><button id="view-decks">View all decks &nbsp; ↗</button></div><div class="deck-grid">${data.decks.slice(0,2).map(deckCard).join('')}<button class="card new-card" id="new-deck"><span>＋</span><b>Create a new deck</b><small style="font-size:10px">Start with your own words</small></button></div>`;
  $('#deck-select').onchange=e=>{if(session&&!session.done&&!confirm('Switch decks and end this round?')){e.target.value=d.id;return;}selected=e.target.value;session=null;cancelAudio();destroyWriter();render();};
  $('#view-decks').onclick=()=>navigate('decks');
  $('#new-deck').onclick=()=>newDeck();
  bindDeckCards();
  if(finished){
    $('#repeat').onclick=()=>startSession(currentDeck(),session.strict?'strict':'flexible',session.hintsEnabled);
    $('#retry')?.addEventListener('click',()=>startSession({id:session.deckId,name:session.name,words:session.missed},session.strict?'strict':'flexible',session.hintsEnabled));
    return;
  }
  $('#listen').onclick=()=>speak(q.hanzi);
  $('#slow').onclick=()=>speak(q.hanzi,.65);
  if(!session){
    const hintToggle=$('#hint-mode-ready'),hintCopy=$('#hint-mode-ready-copy');
    const syncReadyHints=()=>{const strict=document.querySelector('[name="practice-mode"]:checked')?.value==='strict';hintToggle.disabled=strict;if(strict)hintToggle.checked=false;else if(!hintToggle.dataset.userChoice)hintToggle.checked=true;hintCopy.textContent=strict?'Unavailable in Strict mode':hintToggle.checked?'On · hint after 3 errors':'Off';hintToggle.closest('.hint-switch').classList.toggle('is-disabled',strict);};
    document.querySelectorAll('[name="practice-mode"]').forEach(input=>input.addEventListener('change',()=>{delete hintToggle.dataset.userChoice;syncReadyHints();}));
    hintToggle.addEventListener('change',()=>{hintToggle.dataset.userChoice='true';syncReadyHints();});
    syncReadyHints();
    $('#start').onclick=()=>{const mode=document.querySelector('[name="practice-mode"]:checked')?.value||'flexible';startSession(d,mode,mode==='strict'?false:hintToggle.checked);};return;
  }
  $('#end').onclick=()=>{if(confirm('End this practice round? Your deck will stay saved.')){session=null;cancelAudio();destroyWriter();render();}};
  $('#reveal')?.addEventListener('click',()=>revealAnswer());
  $('#restart-character')?.addEventListener('click',()=>restartCurrentCharacter(q));
  $('#hint-mode')?.addEventListener('change',e=>{if(session.strict){e.target.checked=false;return;}session.hintsEnabled=e.target.checked;const copy=$('#hint-mode-copy'),status=$('#writer-status'),note=$('#hint-mode-note');if(copy)copy.textContent=session.hintsEnabled?'On · hint after 3 errors':'Off';if(note)note.textContent=session.hintsEnabled?'Use your finger or stylus. After three incorrect strokes, the correct stroke will be highlighted.':'Use your finger or stylus. Hint mode is off.';wordState.strokeMistakes=0;if(status)status.textContent=session.hintsEnabled?'Hint mode is on. A stroke hint appears after three errors.':'Hint mode is off.';});
  $('#next')?.addEventListener('click',nextWord);
  $('#retry-word')?.addEventListener('click',retryCurrentWord);
  $('#complete-session')?.addEventListener('click',completeSession);
  $('#prev-word')?.addEventListener('click',()=>switchWord(-1));
  $('#next-word')?.addEventListener('click',()=>switchWord(1));
  if(!wordState.revealed)requestAnimationFrame(()=>initWriter(q));
}
function shuffleList(a){const original=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}if(a.length>1&&a.every((item,i)=>item===original[i]))[a[0],a[1]]=[a[1],a[0]];return a;}
function startSession(d,mode='flexible',hintsEnabled=true){
  const words=structuredClone(d.words.map(resolvedWord));
  shuffleList(words);
  const strict=mode==='strict';
  session={deckId:d.id,name:d.name,words,index:0,correct:0,missed:[],done:false,strict,hintsEnabled:strict?false:Boolean(hintsEnabled),states:words.map(()=>({attempted:false,revealed:false,wasCorrect:false,completed:false,charIndex:0,wordMistakes:0,strokeMistakes:0,strokeIndex:0,repetitions:0}))};
  selected=d.id;
  page='practice';
  render();
  speak(words[0].hanzi);
  window.scrollTo(0,0);
}
function currentWordState(){return session?.states?.[session.index];}
function completedWordCount(){return session?.states?.filter(s=>s.completed).length||0;}
function findUnfinishedIndex(direction){
  if(!session)return -1;
  for(let step=1;step<=session.words.length;step++){
    const index=(session.index+direction*step+session.words.length)%session.words.length;
    if(!session.states[index].completed)return index;
  }
  return -1;
}
function switchWord(direction){
  if(!session||session.strict||session.done)return;
  const index=(session.index+direction+session.words.length)%session.words.length;
  if(index===session.index)return;
  destroyWriter();cancelAudio();session.index=index;renderPractice();speak(session.words[index].hanzi);
}
function writableCharacters(text){return Array.from(text).filter(char=>/\p{Script=Han}/u.test(char));}
function destroyWriter(){
  if(activeWriter){try{activeWriter.destroy();}catch(e){}activeWriter=null;}
}
function loadCharacterData(char,onComplete,onError){
  fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(char)}.json`)
    .then(response=>{if(!response.ok)throw new Error(`Character data ${response.status}`);return response.json();})
    .then(onComplete,onError);
}
function initWriter(word){
  const state=currentWordState();
  if(!session||!state||state.revealed||session.done||page!=='practice')return;
  const target=$('#writer-target');
  const loading=$('#writer-loading');
  const status=$('#writer-status');
  if(!target)return;
  if(!window.HanziWriter){
    if(loading)loading.textContent='The handwriting checker could not start. Reload the app and try again.';
    return;
  }
  const characters=writableCharacters(word.hanzi);
  const character=characters[state.charIndex];
  if(!character){revealAnswer();return;}
  destroyWriter();
  writerLoadFailed=false;
  const size=Math.max(230,Math.min(310,target.parentElement?.clientWidth||290));
  activeWriter=window.HanziWriter.create(target,character,{
    width:size,height:size,padding:18,showCharacter:false,showOutline:false,
    strokeColor:'#284d40',drawingColor:'#284d40',highlightColor:'#d78e70',highlightCompleteColor:'#789078',
    drawingWidth:7,strokeHighlightSpeed:2,renderer:'svg',charDataLoader:loadCharacterData,
    onLoadCharDataSuccess:()=>{if(loading)loading.remove();if(status)status.textContent='Draw the first stroke.';},
    onLoadCharDataError:()=>{writerLoadFailed=true;if(loading)loading.textContent='Could not load this character. Check your connection, then clear the grid to retry.';if(status)status.textContent='Writing data is unavailable for this character.';}
  });
  activeWriter.quiz({
    leniency:1.1,showHintAfterMisses:999,markStrokeCorrectAfterMisses:false,acceptBackwardsStrokes:false,highlightOnComplete:true,
    onMistake:data=>{const current=currentWordState();if(!session||!current)return;current.attempted=true;current.wordMistakes++;const hintsActive=!session.strict&&session.hintsEnabled;if(!hintsActive){current.strokeMistakes=0;if(status)status.textContent=session.strict?'That stroke does not match. Hints are unavailable in Strict mode.':'That stroke does not match. Hint mode is off.';return;}current.strokeMistakes++;if(current.strokeMistakes>=3){current.strokeMistakes=0;try{activeWriter.highlightStroke(current.strokeIndex,{color:'#d78e70'});}catch(e){}if(status)status.textContent='Hint shown after three errors. Follow the highlighted stroke.';}else if(status){const remaining=3-current.strokeMistakes;status.textContent=`That stroke does not match. ${remaining} more error${remaining===1?'':'s'} until a hint.`;}},
    onCorrectStroke:data=>{const current=currentWordState();if(current){current.strokeIndex=(data.strokeNum??current.strokeIndex)+1;current.strokeMistakes=0;}if(status)status.textContent=data.strokesRemaining?`${data.strokesRemaining} stroke${data.strokesRemaining===1?'':'s'} left in this character.`:'Character complete.';},
    onComplete:()=>completeDrawnCharacter(word)
  });
}
function completeDrawnCharacter(word){
  const state=currentWordState();
  if(!session||!state||state.revealed||session.done)return;
  const characters=writableCharacters(word.hanzi);
  if(state.charIndex+1<characters.length){
    state.charIndex++;
    state.strokeIndex=0;
    state.strokeMistakes=0;
    renderPractice();
    return;
  }
  if(!state.completed){
    if(state.wordMistakes===0&&!state.attempted)session.correct++;
    else if(!session.missed.some(item=>item.hanzi===word.hanzi))session.missed.push(word);
  }
  state.completed=true;
  state.revealed=true;
  state.wasCorrect=true;
  destroyWriter();
  renderPractice();
  $('#next')?.focus();
}
function restartCurrentCharacter(word){
  const state=currentWordState();
  if(!session||!state||state.revealed)return;
  state.attempted=true;
  state.wordMistakes++;
  state.strokeIndex=0;
  state.strokeMistakes=0;
  const status=$('#writer-status');
  if(status)status.textContent=writerLoadFailed?'Retrying character data…':'Grid cleared. Start this character again.';
  initWriter(word);
}
function verifiedBadge(word){return word.curated?'<span class="verified-badge">✓ Triple-checked learner meaning</span>':'';}
function revealHtml(q){const state=currentWordState();return `<div class="success"><div class="eyebrow">${state?.wasCorrect?'✓ Nicely done!':'A WORD TO COME BACK TO'}</div><div class="characters" lang="zh-Hans">${esc(q.hanzi)}</div><div style="font-size:12px;color:#7c8c70">${esc(q.pinyin)}</div><p>${esc(q.meaning)}</p>${verifiedBadge(q)}${dictionaryLinks(q.hanzi)}</div>`;}
function revealAnswer(){const state=currentWordState();if(!session||!state||state.revealed)return;const q=session.words[session.index];destroyWriter();if(!state.completed&&!session.missed.some(w=>w.hanzi===q.hanzi))session.missed.push(q);state.completed=true;state.revealed=true;state.wasCorrect=false;renderPractice();$('#retry-word')?.focus();}
function nextWord(){
  if(!session)return;
  destroyWriter();cancelAudio();
  const index=findUnfinishedIndex(1);
  if(index<0){toast('Every word is complete. Repeat any word or finish the session when you are ready.');return;}
  session.index=index;renderPractice();speak(session.words[index].hanzi);
}
function retryCurrentWord(){
  const state=currentWordState();if(!session||!state||session.done)return;
  destroyWriter();cancelAudio();state.revealed=false;state.wasCorrect=false;state.attempted=false;state.charIndex=0;state.wordMistakes=0;state.strokeMistakes=0;state.strokeIndex=0;state.repetitions++;
  renderPractice();speak(session.words[session.index].hanzi);
}
function completeSession(){
  if(!session||completedWordCount()!==session.words.length)return;
  destroyWriter();cancelAudio();session.done=true;data.completed=(data.completed||0)+1;save();renderPractice();window.scrollTo(0,0);
}
function resultHtml(){return `<div class="result"><div class="result-icon">✧</div><div class="eyebrow">A LITTLE MORE CONFIDENT</div><h2>Practice, complete.</h2><div class="result-number">${session.correct}<span style="font-size:26px;color:#9aa58f"> / ${session.words.length}</span></div><p>Words correct on your first try.<br>${session.missed.length?'Every tricky word is another chance to learn.':'Beautiful work. Your words are staying with you.'}</p>${session.missed.length?`<div class="result-misses"><div class="eyebrow">WORDS TO REVISIT</div>${session.missed.map(w=>`<p><b lang="zh-Hans">${esc(w.hanzi)}</b> &nbsp; ${esc(w.pinyin)}<br>${esc(w.meaning)}</p>`).join('')}</div>`:''}<div class="action-row">${session.missed.length?'<button id="retry" class="primary">Practise tricky words</button>':''}<button id="repeat" class="${session.missed.length?'secondary':'primary'}">Practise deck again</button></div></div>`;}
function cancelAudio(){if('speechSynthesis'in window)window.speechSynthesis.cancel();}
function speak(text,rate=.85){if(!('speechSynthesis'in window)){toast('Audio is unavailable in this browser. Try Safari or Chrome with a Mandarin voice.');return;}const synth=window.speechSynthesis;const voices=synth.getVoices();const voice=voices.find(v=>/zh[-_]CN|cmn[-_]CN/i.test(v.lang))||voices.find(v=>/zh[-_]SG|cmn|zh[-_]TW/i.test(v.lang))||voices.find(v=>/^zh/i.test(v.lang)&&!/HK/i.test(v.lang));if(voices.length&&!voice){toast('Install a Mandarin Chinese voice in your device’s speech settings to hear pronunciation.');return;}synth.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=rate;if(voice)u.voice=voice;u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))toast('Could not play audio. Check your device’s Mandarin voice and tap Listen again.');};synth.speak(u);}
if('speechSynthesis'in window){speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();}
function newDeck(){editing=null;pending=[];draftName='';draftWords='';page='create';render();window.scrollTo(0,0);}
function renderDecks(){const q=libraryQuery.toLowerCase();const filtered=data.decks.filter(d=>(d.name+' '+d.words.map(w=>w.hanzi+' '+w.pinyin+' '+w.meaning).join(' ')).toLowerCase().includes(q));$('#app').innerHTML=top('A home for your words.','Keep your vocabulary close. Find a deck, revisit a word, start again.','YOUR COLLECTION','<button class="primary" id="add-deck">＋ New deck</button>')+`<label for="search" class="field-label">Search decks, Chinese words, pinyin or English meanings</label><input id="search" class="field search" placeholder="Search your collection…" value="${esc(libraryQuery)}"><div id="deck-results"><div class="deck-grid">${filtered.map(deckCard).join('')}</div>${!filtered.length?'<div class="empty">No matching decks. Try a different word or create a new deck.</div>':''}${q?filtered.map(d=>{const ws=d.words.filter(w=>(w.hanzi+' '+w.pinyin+' '+w.meaning).toLowerCase().includes(q));return ws.length?`<div class="section-row"><h2>${esc(d.name)}</h2></div><div class="card">${ws.map(wordRow).join('')}</div>`:'';}).join(''):''}</div><div class="action-row" style="margin-top:35px"><button id="export" class="secondary">↓ Export decks</button><button id="import" class="secondary">↑ Import backup</button><span class="saved-line">${storageOK?'Saved in this browser on this device.':'Storage unavailable. Export to keep your decks.'}</span></div>`;
$('#add-deck').onclick=newDeck;$('#search').oninput=e=>{const pos=e.target.selectionStart;libraryQuery=e.target.value;renderDecks();$('#search').focus();$('#search').setSelectionRange(pos,pos);};$('#export').onclick=exportDecks;$('#import').onclick=()=>$('#import-file').click();bindDeckCards();bindWordAudio();}
function dictionaryLinks(hanzi){const word=encodeURIComponent(hanzi);return `<div class="dict-links"><span>Check meaning:</span><a href="https://www.mdbg.net/chinese/dictionary?page=worddict&amp;wdrst=0&amp;wdqb=${word}" target="_blank" rel="noopener noreferrer">MDBG</a><a href="https://dict.revised.moe.edu.tw/search.jsp?word=${word}" target="_blank" rel="noopener noreferrer">MOE</a><a href="https://www.zdic.net/hans/${word}" target="_blank" rel="noopener noreferrer">Han Dian</a></div>`;}
function wordRow(rawWord){const w=resolvedWord(rawWord);return `<div class="word-row"><div><strong lang="zh-Hans">${esc(w.hanzi)}</strong><small>${esc(w.pinyin)}</small></div><div class="word-definition"><p>${esc(w.meaning)}</p>${verifiedBadge(w)}${dictionaryLinks(w.hanzi)}</div><button class="audio-btn" data-say="${esc(w.hanzi)}" aria-label="Listen to ${esc(w.hanzi)}">${speaker}</button></div>`;}
function bindWordAudio(){document.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(b.dataset.say));}
function renderDetail(){const d=currentDeck();if(!d){page='decks';render();return;}$('#app').innerHTML=top(esc(d.name),`${d.words.length} words ready to become part of your vocabulary.`,'YOUR WORD COLLECTION')+`<div class="action-row"><button id="detail-start" class="primary">▶ Practise this deck</button><button id="edit" class="secondary">Edit / refresh meanings</button><button id="back" class="text-btn">← All decks</button></div><div class="card word-list">${d.words.map(wordRow).join('')}</div><div class="deck-actions"><button id="delete" class="danger">Delete deck</button></div>`;$('#detail-start').onclick=()=>startSession(d,'flexible');$('#back').onclick=()=>navigate('decks');$('#edit').onclick=()=>{editing=d.id;draftName=d.name;draftWords=d.words.map(w=>w.hanzi).join('\n');pending=d.words.map(resolvedWord);page='create';render();};$('#delete').onclick=()=>{if(confirm(`Delete “${d.name}”? Export a backup first if you want to keep it.`)){data.decks=data.decks.filter(x=>x.id!==d.id);if(session?.deckId===d.id)session=null;save();selected=data.decks[0]?.id;page='decks';render();toast('Deck deleted.');}};bindWordAudio();}
async function loadDict(){if(dict)return dict;if(dictPromise)return dictPromise;dictPromise=fetch('dictionary.json').then(r=>{if(!r.ok)throw Error('dictionary');return r.json();}).then(d=>{dict=d;return d;}).catch(e=>{dictPromise=null;throw e;});return dictPromise;}
function tonePinyin(input){return input.replace(/([a-züÜvV:]+)([1-5])/gi,(_,raw,num)=>{let s=raw.replace(/u:/gi,'ü').replace(/v/gi,'ü');const n=Number(num);if(n===5)return s;let i=s.toLowerCase().indexOf('a');if(i<0)i=s.toLowerCase().indexOf('e');if(i<0&&s.toLowerCase().includes('ou'))i=s.toLowerCase().indexOf('o');if(i<0){for(let j=s.length-1;j>=0;j--)if('aeiouü'.includes(s[j].toLowerCase())){i=j;break;}}if(i<0)return s;const marks={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù','ü':'ǖǘǚǜ'};const ch=marks[s[i].toLowerCase()][n-1];return s.slice(0,i)+(s[i]===s[i].toUpperCase()?ch.toUpperCase():ch)+s.slice(i+1);});}
function cleanMeaning(raw=''){
  const notes=[];
  for(let sense of raw.split(';').map(x=>x.trim()).filter(Boolean)){
    if(/^(CL:|classifier for|variant of|old variant of|see |used in )/i.test(sense))continue;
    sense=sense.replace(/^\(bound form\)\s*/i,'').replace(/\b(sb)\b/g,'someone').replace(/\b(sth)\b/g,'something').replace(/\s*\((?:Taiwan|Tw) pr\.[^)]+\)/gi,'').trim();
    if(sense&&!notes.some(x=>x.toLowerCase()===sense.toLowerCase()))notes.push(sense);
  }
  if(!notes.length)notes.push(...raw.split(';').map(x=>x.trim()).filter(Boolean).slice(0,2));
  return notes.slice(0,4).join('; ');
}
function usableDictionaryOptions(options=[]){const useful=options.filter(([,meaning])=>!/^(variant of|old variant of|see |used in |surname )/i.test(meaning));return useful.length?useful:options;}
function dictionaryOptionScore(option){const [pinyin,meaning]=option;let score=0;if(!/^(variant of|old variant of|see |used in |surname )/i.test(meaning))score+=20;if(!/\barchaic\b|\bobsolete\b/i.test(meaning))score+=5;if(!/^[A-Z]/.test(pinyin))score+=3;score+=Math.min(cleanMeaning(meaning).split(';').length,4);return score;}
function bestDictionaryOption(options=[]){return options.slice().sort((a,b)=>dictionaryOptionScore(b)-dictionaryOptionScore(a))[0];}
async function upgradeSavedDefinitions(){
  if(data.definitionVersion>=3)return;
  try{
    const lookup=await loadDict();let changed=false;
    for(const deck of data.decks)for(const word of deck.words){
      const curated=curatedDefinitions[word.hanzi];
      if(curated){if(word.pinyin!==curated.pinyin||word.meaning!==curated.meaning){word.pinyin=curated.pinyin;word.meaning=curated.meaning;changed=true;}continue;}
      const rawOptions=lookup[word.hanzi];
      if(!rawOptions?.some(([,meaning])=>meaning===word.meaning))continue;
      const options=usableDictionaryOptions(rawOptions),best=bestDictionaryOption(options);
      if(!best)continue;
      const pinyin=tonePinyin(best[0]),meaning=cleanMeaning(best[1]);
      if(word.pinyin!==pinyin||word.meaning!==meaning){word.pinyin=pinyin;word.meaning=meaning;changed=true;}
    }
    data.definitionVersion=3;save();
    if(changed&&!session&&page!=='create'){render();toast('Saved meanings were upgraded with triple-checked learner definitions.');}
  }catch(e){}
}
function parseWords(text){return [...new Set(text.split(/[\s,，、;；]+/u).map(x=>x.trim()).filter(Boolean))];}
function renderCreate(){const title=editing?'Make it your own.':'New words, new possibilities.';$('#app').innerHTML=top(title,'Paste your word list. We’ll find the pinyin and meanings for you.','BUILD YOUR VOCABULARY')+`<section class="card form-card"><label class="field-label" for="deck-name">Deck name</label><input id="deck-name" class="field" maxlength="100" placeholder="e.g. Chinese · Chapter 3" value="${esc(draftName)}"><label class="field-label" for="word-input">Your simplified Chinese words</label><textarea id="word-input" class="field word-text" placeholder="勇敢\n坚持\n梦想\n进步" spellcheck="false">${esc(draftWords)}</textarea><p class="helper">Separate words with a new line, comma or space. Up to 200 words at a time.</p><div class="action-row"><button class="primary" id="prepare">${pending.length?'Refresh word list':'Find pinyin & meanings'} &nbsp; →</button><button id="sample" class="text-btn">Try an example list</button></div><div class="dict-status" id="dict-status" role="status"></div><div id="word-preview">${pending.length?previewHtml():''}</div></section>`;$('#prepare').onclick=prepareWords;$('#sample').onclick=()=>{$('#word-input').value='勇敢\n坚持\n梦想\n进步\n认真\n努力';if(!$('#deck-name').value)$('#deck-name').value='A little motivation';};$('#word-input').oninput=()=>{draftWords=$('#word-input').value;if(pending.length){pending=[];$('#word-preview').innerHTML='';}};$('#deck-name').oninput=()=>draftName=$('#deck-name').value;bindPreview();}
async function prepareWords(){draftWords=$('#word-input').value;draftName=$('#deck-name').value.trim();const words=parseWords(draftWords);if(!words.length){toast('Add at least one simplified Chinese word.');return;}if(words.length>200){toast('Please use no more than 200 words per list.');return;}if(words.some(w=>w.length>50||!/[\p{Script=Han}]/u.test(w))){toast('Use Chinese words, up to 50 characters each. Separate them with commas or new lines.');return;}const btn=$('#prepare');btn.disabled=true;$('#dict-status').textContent=dict?'Looking up your words…':'Loading the Chinese dictionary for the first time…';let lookup;try{lookup=await loadDict();}catch(e){lookup={};toast('Dictionary unavailable. You can enter pinyin and meanings below, or try again online.');}pending=words.map(hanzi=>{const curated=curatedDefinitions[hanzi];if(curated)return {hanzi,...curated,curated:true,options:[],optionIndex:-1};const options=usableDictionaryOptions(lookup[hanzi]||[]);const best=options.length?bestDictionaryOption(options):null;const optionIndex=best?options.indexOf(best):-1;return {hanzi,pinyin:best?tonePinyin(best[0]):'',meaning:best?cleanMeaning(best[1]):'',curated:false,options,optionIndex};});if(page!=='create')return;btn.disabled=false;$('#dict-status').textContent=`${words.length} words · Triple-checked meanings are marked; every entry includes MDBG, MOE and Han Dian references.`;$('#word-preview').innerHTML=previewHtml();bindPreview();}
function previewHtml(){return `<div class="section-row"><h2>Make sure it sounds right.</h2><span class="badge">${pending.length} words</span></div><p class="helper" style="margin-top:0">Triple-checked learner meanings are marked below. Other entries remain editable and include three references for context.</p>${pending.map((rawWord,i)=>{const w=resolvedWord(rawWord);return `<div class="preview-row"><div><span class="word" lang="zh-Hans">${esc(w.hanzi)}</span><button class="text-btn" data-say="${esc(w.hanzi)}" aria-label="Listen to ${esc(w.hanzi)}">${speaker}</button></div><div>${w.options?.length>1?`<label for="reading-${i}">Dictionary readings</label><select id="reading-${i}" data-reading="${i}">${w.options.map((o,n)=>`<option value="${n}" ${n===w.optionIndex?'selected':''}>${esc(tonePinyin(o[0]))} · ${esc(cleanMeaning(o[1]).slice(0,110))}</option>`).join('')}</select>`:''}${!w.pinyin||!w.meaning?'<div class="warning">No exact dictionary entry. Add the pinyin and meaning yourself.</div>':''}<label for="py-${i}">Pinyin</label><input id="py-${i}" data-py="${i}" value="${esc(w.pinyin)}" placeholder="e.g. yǒng gǎn" maxlength="200"><label for="meaning-${i}">English meaning</label><input id="meaning-${i}" data-meaning="${i}" value="${esc(w.meaning)}" placeholder="e.g. brave; courageous" maxlength="2000">${verifiedBadge(w)}${dictionaryLinks(w.hanzi)}</div></div>`;}).join('')}<div class="action-row" style="margin-top:25px"><button id="save-deck" class="primary">${editing?'Save changes':'Save deck'} &nbsp; ✓</button><span class="saved-line">Saved on this device.</span></div>`;}
function bindPreview(){bindWordAudio();document.querySelectorAll('[data-py]').forEach(e=>e.oninput=()=>pending[Number(e.dataset.py)].pinyin=e.value);document.querySelectorAll('[data-meaning]').forEach(e=>e.oninput=()=>pending[Number(e.dataset.meaning)].meaning=e.value);document.querySelectorAll('[data-reading]').forEach(e=>e.onchange=()=>{const i=Number(e.dataset.reading),optionIndex=Number(e.value),o=pending[i].options[optionIndex];pending[i].optionIndex=optionIndex;pending[i].pinyin=tonePinyin(o[0]);pending[i].meaning=cleanMeaning(o[1]);$('#py-'+i).value=pending[i].pinyin;$('#meaning-'+i).value=pending[i].meaning;});$('#save-deck')?.addEventListener('click',()=>{const name=$('#deck-name').value.trim();if(!name){toast('Give your deck a name.');$('#deck-name').focus();return;}if(pending.some(w=>!w.pinyin.trim()||!w.meaning.trim())){toast('Add pinyin and an English meaning for every word before saving.');return;}if(!editing&&data.decks.length>=200){toast('Your collection is full. Export or remove a deck first.');return;}const d={id:editing||uid(),name,icon:pending[0].hanzi[0],created:Date.now(),words:pending.map(w=>({hanzi:w.hanzi,pinyin:tonePinyin(w.pinyin.trim()),meaning:w.meaning.trim()}))};const i=data.decks.findIndex(x=>x.id===d.id);if(i>=0)data.decks[i]=d;else data.decks.push(d);const persisted=save();selected=d.id;if(session?.deckId===d.id)session=null;editing=null;pending=[];draftName='';draftWords='';page='detail';render();window.scrollTo(0,0);toast(persisted?'Deck saved. Your next practice is ready.':'Deck is available for this visit. Export it to keep a backup.');});}
function exportDecks(){const blob=new Blob([JSON.stringify({version:1,decks:data.decks,completed:data.completed},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tingxie-decks-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('size');const incoming=JSON.parse(await file.text());if(!validData(incoming)||data.decks.length+incoming.decks.length>200)throw Error('invalid');const copies=incoming.decks.map(d=>({id:uid(),name:d.name,icon:d.words[0]?.hanzi?.[0]||'词',created:Date.now(),words:d.words.map(w=>({hanzi:w.hanzi,pinyin:w.pinyin,meaning:w.meaning}))})).filter(d=>d.words.length>0);data.decks.push(...copies);const ok=save();render();toast(ok?`${copies.length} decks imported. Existing decks were kept.`:'Imported for this visit. Device storage is unavailable.');}catch(err){toast('Could not import this file. Use a Tingxie JSON backup, under 5 MB and 200 total decks.');}e.target.value='';};
render();upgradeSavedDefinitions();if(!storageOK)setTimeout(()=>toast('Saved data could not be loaded. Export your decks before closing this browser.'),500);
// Pure helpers are exported only in Node for focused validation.

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
