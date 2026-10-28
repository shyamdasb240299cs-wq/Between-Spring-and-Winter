"use client";
import {useEffect,useState,useSyncExternalStore} from 'react';
import {ADAVI_INTRO_PAGES,ADAVI_WIN_PAGES,INTRO_PAGES,SPRING_EAT_MS,SPRING_FOOD_NAMES,SPRING_DUMPLING_COUNT,springAdaviDialogue,springHeldItem,springInventoryHeld,springQuestBusy,springRemaining,type SpringSave,type SpringTreasureController} from './spring-treasure-state';
import {ADAVI_STONES} from './spring-adavi-physics';
import {AdaviThrowControls} from './spring-adavi-throw-controls';
import {BackpackControls as BagInventory} from './spring-backpack-controls';
import {SpringInventoryControls} from './spring-inventory-controls';
import {SpringLakeQuestHUD} from './spring-lake-quest-ui';
import './spring-treasure.css';
export const SPRING_INTRO=['Aamiii… it’s me, Syamu. I hid a box and its key in Spring. Let’s play!','Your first clue: look where you admired me most.'];
export const ADAVI_INTRO=[
  'Okay, nice. I guess you remember this place better than me — the place where we made the most memories.',
  'Now I want you to do the impossible. For your next clue, find the perfect stone and skip it across the river, all the way to the other side.',
  'Choose carefully. Not all stones are worthy. Look along the shore for a flat stone, and keep your throw low and almost parallel to the water.',
  'Find your angle, mind the breeze, and let it skip: one, two, three, four. A good angle alone won’t do it — each stone carries differently. I guess next time we come here, you’ll beat me at my own game.'
];
export const ADAVI_WIN=[
  'Good job! Okay, now you’ve mastered the technique. I shall give you the next clue.',
  'You’ll find your next clue and a few things you might need inside this backpack. Open it when you pick it up — there’s a mushroom toy, a candle, and a note.'
];
function AdaviHUD({state,onCommand,hint,blocked}:{state:SpringSave;onCommand:(action:string,value?:unknown)=>void;hint:string;blocked:boolean}){
  const stone=ADAVI_STONES.find(item=>item.id===state.selectedStone),talking=springAdaviDialogue(state),exploring=state.skipPhase==='exploring',aiming=state.skipPhase==='aiming',flying=state.skipPhase==='flying',result=state.skipResult;
  const description=stone?stone.shape==='flat'?stone.flatness<.82?'Thin but uneven · Needs a careful release':'Thin, balanced face · A promising skipper':stone.shape==='oval'?'Smooth and oval · A trickier throw':'Rounded, thick edges · Hard to skip':'';
  return <div className="spring-game-hud spring-adavi-hud" data-phase={state.skipPhase} data-dialogue={talking} aria-label="Adavi river game controls" inert={blocked}>
    <div className="spring-adavi-quest"><span className="spring-adavi-eyebrow">Adavi · eco tourism</span><strong>{state.bridgeVisited?'A memory to keep':state.bagTaken?'The next clue is yours':state.stoneChallengeComplete?'Across to the other side': 'A stone, four skips, one river'}</strong><span>{state.bagTaken?'Read your note, then return through the door.':state.bagRevealed?'Your bag is waiting on the shore.':state.stoneChallengeComplete?'Syamu has something for you.':'Find a flat stone along the shore.'}</span></div>
    {!talking&&!state.bagNoteOpen&&exploring&&<>
      {stone?<div className="spring-adavi-stone-card"><span className={`spring-adavi-stone-icon ${stone.shape}`} aria-hidden="true"/><div><strong>{stone.name}</strong><span>{description}</span></div><button type="button" className="spring-adavi-primary" onClick={()=>onCommand('aim-stone')}>Give it a throw <span aria-hidden="true">↗</span></button><button type="button" className="spring-adavi-quiet" onClick={()=>onCommand('put-stone')}>Put down</button></div>:hint&&!state.bagHeld&&<div className="spring-hand-actions spring-adavi-use"><button type="button" onClick={()=>onCommand('interact')}><kbd>E</kbd>{hint}</button></div>}
    </>}
    {aiming&&<AdaviThrowControls state={state} stoneName={stone?.name??'River stone'} onCommand={onCommand}/> }
    {(aiming||flying)&&<div className="spring-adavi-skip-counter" aria-label={`${state.skipContacts} water skips; four needed`} aria-live="polite"><span>{flying?'Watch it fly':'The river is waiting'}</span><div>{[1,2,3,4].map(n=><span key={n} className={state.skipContacts>=n?'complete':''} aria-label={`Skip ${n}${state.skipContacts>=n?' complete':''}`}>{n}</span>)}</div></div>}
    {state.skipPhase==='result'&&result&&!talking&&!state.bagRevealed&&<section className={`spring-adavi-result${result.success?' success':''}`} aria-live="polite"><span className="spring-adavi-eyebrow">{result.success?'The far bank':'Every throw teaches you'}</span><h2>{result.success?'You made it across.':result.skips>0?`${result.skips} ${result.skips===1?'skip':'skips'}. Keep trying.`:'One more stone, one more chance.'}</h2><p>{result.feedback}</p><span>{result.skips} {result.skips===1?'skip':'skips'} · {result.distance.toFixed(1)} m</span>{!result.success&&<button type="button" className="spring-adavi-primary" onClick={()=>onCommand('retry-stone')}>Find another stone</button>}</section>}
    {!talking&&state.stoneChallengeComplete&&!state.bagRevealed&&state.adaviWinStep===ADAVI_WIN_PAGES&&<div className="spring-adavi-reveal"><button type="button" className="spring-adavi-primary" onClick={()=>onCommand('reveal-bag')}>Reveal backpack <span aria-hidden="true">✧</span></button></div>}
    {!talking&&<><BagInventory state={state} onCommand={onCommand}/><SpringInventoryControls state={state} onCommand={onCommand} disabled={state.bagNoteOpen||!!state.questNoteOpen||!exploring}/><SpringLakeQuestHUD state={state} onCommand={onCommand}/></>}
  </div>;
}
export function SpringGameHUD({controller,onCommand,canPutBack,hint,blocked=false}:{controller:SpringTreasureController;onCommand:(action:string,value?:unknown)=>void;canPutBack:()=>boolean;hint:string;blocked?:boolean}){
  const state=useSyncExternalStore(controller.subscribe,controller.snapshot,controller.snapshot),[,tick]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>tick(v=>v+1),250);return()=>clearInterval(timer);},[]);
  const held=springHeldItem(state),busy=state.eatRevision>0&&Date.now()-state.eatStarted<SPRING_EAT_MS||state.dumplingEatStarted>0&&Date.now()-state.dumplingEatStarted<1500,remaining=held?springRemaining(state,held):0,keyVisible=held==='basket'&&remaining===0&&!state.keyTaken;
  useEffect(()=>{const key=(event:KeyboardEvent)=>{
    if(blocked||springQuestBusy(state)||state.bagNoteOpen||springAdaviDialogue(state)||state.skipPhase!=='exploring'||event.repeat||event.target instanceof Element&&event.target.closest('input,textarea,select,a'))return;
    if(/^[0-9]$/.test(event.key)){event.preventDefault();event.stopPropagation();onCommand('equip-storage',event.key==='0'?9:Number(event.key)-1);}
    else if(event.key.toLowerCase()==='h'){event.preventDefault();event.stopPropagation();onCommand('select-hand',1-state.activeHand);}
    else if(event.key.toLowerCase()==='q'&&(state.paperHeld||springInventoryHeld(state))){event.preventDefault();event.stopPropagation();onCommand('put-away');}
    else if(event.key.toLowerCase()==='x'&&keyVisible&&!busy){event.preventDefault();event.stopPropagation();onCommand('take-key');}
    else if(event.key.toLowerCase()==='n'&&held==='basket'&&remaining===0&&!busy){event.preventDefault();event.stopPropagation();onCommand('read-door-note');}
  };window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);},[blocked,onCommand,state,held,remaining,keyVisible,busy]);
  const near=canPutBack();
  if(['walking','sitting','opening','reading'].includes(state.endingPhase))return null;
  if(state.adaviActive)return <AdaviHUD state={state} onCommand={onCommand} hint={hint} blocked={blocked}/>;
  return <div className="spring-game-hud" data-paper={!!state.paperHeld} data-backpack={state.bagHeld} data-dream={state.dreamPhase} aria-label="Spring game controls" inert={blocked}>
    <div className="spring-hand-actions">
      {!springQuestBusy(state)&&!state.benchSeated&&!(state.dreamPhase==='bus'&&state.busSeated)&&hint&&<button className="spring-use-action" onClick={()=>onCommand('interact')}><kbd>E</kbd> {hint}</button>}
      {!springQuestBusy(state)&&state.hands.includes('shovel')&&<button type="button" onClick={()=>onCommand('put-shovel')}><kbd>Q</kbd> Set the shovel down</button>}
      {!springQuestBusy(state)&&state.hands.includes('dumpling-tray')&&<>
        {!state.dumplingTrayOpen?<button type="button" onClick={()=>onCommand('open-dumplings')}>Open the steamer</button>:state.dumplingsEaten<SPRING_DUMPLING_COUNT?<button type="button" disabled={busy} onClick={()=>onCommand('eat-dumpling')}>{busy?'Enjoying a dumpling…':`Eat a dumpling · ${SPRING_DUMPLING_COUNT-state.dumplingsEaten} left`}</button>:<span>Every little dumpling, enjoyed.</span>}
        {near&&<button type="button" disabled={busy} onClick={()=>onCommand('return-dumplings')}><kbd>Q</kbd> Put the steamer back</button>}
      </>}
      {!springQuestBusy(state)&&!state.benchSeated&&!(state.dreamPhase==='bus'&&state.busSeated)&&(state.paperHeld?<button onClick={()=>onCommand('put-paper')}><kbd>Q</kbd> Store note</button>:held&&held!=='key'?<>
        {remaining>0&&<button disabled={busy} onClick={()=>onCommand('eat-held')}><kbd>E</kbd>{busy?'…':`Eat ${SPRING_FOOD_NAMES[held].toLowerCase()}`}</button>}
        {keyVisible&&<button className="spring-key-action" disabled={busy} onClick={()=>onCommand('take-key')}><kbd>X</kbd> Take key</button>}
        {held==='basket'&&remaining===0&&<button disabled={busy} onClick={()=>onCommand('read-door-note')}><kbd>N</kbd> Read note</button>}
        {near?<button disabled={busy} onClick={()=>onCommand('return-held')}><kbd>Q</kbd> Put back</button>:<span className="spring-return-serving">Return the serving to the stall to free your hands.</span>}
      </>:null)}
    </div>
    <SpringInventoryControls state={state} onCommand={onCommand} disabled={busy||springQuestBusy(state)||state.bagNoteOpen}/>
    <SpringLakeQuestHUD state={state} onCommand={onCommand}/>
    <BagInventory state={state} onCommand={onCommand}/>
  </div>;
}
export function SpringCompanion({controller}:{controller:SpringTreasureController}){
  const state=useSyncExternalStore(controller.subscribe,controller.snapshot,controller.snapshot),introducing=state.introStep<INTRO_PAGES;
  useEffect(()=>{if(!introducing||state.adaviActive)return;const timer=setTimeout(()=>controller.act('intro-next'),state.introStep===0?4300:3200);return()=>clearTimeout(timer);},[controller,state.introStep,state.adaviActive,introducing]);
  if(state.treasureOpen&&!state.finalDialogueSeen&&!state.adaviActive)return <aside className="spring-companion spring-adavi-companion spring-adavi-pose-welcome spring-final-companion" role="dialog" aria-modal="true" aria-labelledby="spring-final-companion-name"><div className="spring-companion-portrait" role="img" aria-label="Syamu smiles beside his gift"/><div className="spring-companion-line"><span id="spring-final-companion-name">Syamu · one last little task</span><p>You found my gift. But it is still dark inside, isn’t it? This is your final task: find something that can light the inside. You already have everything you need. I’ll leave you to it.</p><button type="button" className="spring-companion-next" onClick={()=>controller.act('dismiss-final-dialogue')}>I’ll find a little light <span aria-hidden="true">→</span></button></div></aside>;
  if(['walking','sitting','opening','reading'].includes(state.endingPhase))return null;
  if(springAdaviDialogue(state)){
    const arrival=state.adaviIntroStep<ADAVI_INTRO_PAGES,index=arrival?state.adaviIntroStep:state.adaviWinStep,pages=arrival?ADAVI_INTRO:ADAVI_WIN;
    const pose=arrival?index===0?'welcome':index===2?'teaching':'challenge':'celebrate',gesture=pose==='welcome'?'Syamu warmly remembers Adavi':pose==='teaching'?'Syamu shows a flat stone with a teaching gesture':pose==='challenge'?'Syamu playfully challenges you':'Syamu celebrates your throw';
    return <aside className={`spring-companion spring-adavi-companion spring-adavi-pose-${pose}`} role="dialog" aria-modal="true" aria-labelledby="spring-adavi-companion-name"><div className="spring-companion-portrait" role="img" aria-label={gesture}/><div className="spring-companion-line"><span id="spring-adavi-companion-name">Syamu · {index+1}/{pages.length}</span><p aria-live="polite">{pages[index]}</p><button type="button" className="spring-companion-next" onClick={()=>controller.act(arrival?'adavi-intro-next':'adavi-win-next')}>{index===pages.length-1?arrival?'Let’s find a stone':'I’m ready':'Next'} <span aria-hidden="true">→</span></button></div></aside>;
  }
  if(state.questDialogue&&!state.questNoteOpen&&!state.adaviActive&&!springQuestBusy(state)){
    const lines:Record<number,{pose:string;expression:string;text:string}>={
      1:{pose:'thought',expression:'A thoughtful, curious look',text:'Five pieces near the water… Someone has hidden a whole little sentence here. I should look closely.'},
      2:{pose:'search',expression:'An intent, searching look',text:'A coffee stain, and a torn edge. This belongs to something. I’ll keep the pieces together and search the banks.'},
      3:{pose:'relief',expression:'A relieved smile',text:'“You are my aiteall.” All five pieces fit. I want to keep this. The note mentioned a shovel, and a little patch of sunlight.'},
      4:{pose:'drowsy',expression:'A quietly uncertain, drowsy look',text:'A bench, a pill, and another mystery. Let me sit for a moment and close my eyes.'},
      5:{pose:'thought',expression:'A surprised, waking look',text:'That sound… a Super Fast bus? Sunshine through the shutters. Where is this road taking me?'},
      6:{pose:'thought',expression:'A thoughtful look after waking',text:'The bench… I’m back. There was sunshine on that road. Now I can hear rain in the leaves. The little paper is still here.'}
    },line=lines[state.questDialogue];
    if(line)return <aside className={`spring-companion spring-lake-companion spring-lake-pose-${line.pose}`} aria-label="Your thoughts"><div className="spring-companion-portrait" role="img" aria-label={line.expression}/><div className="spring-companion-line"><button type="button" aria-label="Continue exploring" onClick={()=>controller.act('dismiss-quest-dialogue')}>×</button><span>A thought, to myself</span><p aria-live="polite">{line.text}</p></div></aside>;
  }
  if(state.adaviActive)return null;
  if(!introducing)return null;
  return <aside className="spring-companion spring-pose-wave" aria-label="Syamu"><div className="spring-companion-portrait" role="img" aria-label="Syamu waves hello"/><div className="spring-companion-line"><button aria-label="Dismiss Syamu’s introduction" onClick={()=>controller.act('dismiss-guide')}>×</button><span>Syamu</span><p aria-live="polite">{SPRING_INTRO[state.introStep]}</p></div></aside>;
}
