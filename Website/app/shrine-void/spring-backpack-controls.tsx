"use client";
import {useEffect,useRef} from 'react';
import {SPRING_BAG_ITEMS,type SpringBagItem,type SpringSave} from './spring-treasure-state';

const names:Record<SpringBagItem,string>={'mushroom-toy':'Mushroom',candle:'Candle',note:'Note'};
function Icon({item}:{item:SpringBagItem}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{item==='mushroom-toy'?<><path d="M3 13C3 2 21 2 21 13H3Zm7 0-1 8h6l-1-8"/><circle cx="9" cy="8" r="1"/><circle cx="16" cy="10" r="1"/></>:item==='candle'?<><path d="M8 10h8v11H8Zm4-7c-4 5 4 7 0 0ZM12 8v2"/><path d="M8 12c4 4 5-3 8 0"/></>:<><path d="M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7M9 16h5"/></>}</svg>;}

export function BackpackControls({state,onCommand}:{state:SpringSave;onCommand:(action:string,value?:unknown)=>void}){
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{if(!state.bagNoteOpen)return;document.exitPointerLock?.();panel.current?.focus();},[state.bagNoteOpen]);
  // Stored notes are opened from their inventory slot. A floating backpack
  // toolbar without a held bag would cover the seat/door interaction button.
  if(!state.bagTaken||!state.bagHeld&&!state.bagNoteOpen)return null;
  const available=state.bagHeld&&state.bagOpen?SPRING_BAG_ITEMS.filter(item=>!state.bagItemsTaken.includes(item)):[];
  return <><div className="spring-backpack-controls" aria-label="Backpack controls" data-held={state.bagHeld} data-open={state.bagOpen}>
    {state.bagHeld&&state.dreamPhase==='awake'&&<button type="button" className="spring-pack-drop" onClick={()=>onCommand('put-bag')} aria-label="Set down backpack"><kbd>E</kbd>Set down</button>}
    {state.bagHeld&&!state.bagNoteOpen&&<button type="button" onClick={()=>onCommand(state.bagOpen?'close-bag':'open-bag')} aria-label={state.bagOpen?'Close backpack':'Open backpack'}>{state.bagOpen?'Close':'Open'}<span aria-hidden="true">{state.bagOpen?'⌃':'⌄'}</span></button>}
    {!state.bagNoteOpen&&available.map(item=><button key={item} type="button" aria-label={`Take ${item==='mushroom-toy'?'mushroom toy':item} into inventory`} onClick={()=>onCommand('take-bag-item',item)}><Icon item={item}/><span>Take {names[item]}</span></button>)}
    {state.bagHeld&&state.bagOpen&&!available.length&&!state.bagNoteOpen&&<span className="spring-pack-empty">Everything is safely in your inventory.</span>}
    {!state.bagNoteOpen&&state.bagItemsTaken.includes('note')&&<button type="button" onClick={()=>onCommand('read-bag-note')}>Read note</button>}
    {state.bagItemHeld&&<>
      <button type="button" onClick={()=>onCommand('return-bag-item')} aria-label="Put item back inside backpack" title="Put back"><span aria-hidden="true">↩</span></button>
      <button type="button" onClick={()=>onCommand('stow-bag-item')} aria-label="Put held item away">Put away</button>
    </>}
  </div>{state.bagNoteOpen&&<div className="spring-bag-note-backdrop"><section className="spring-bag-note" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="spring-backpack-note-title"><span className="spring-adavi-eyebrow">A note from the backpack</span><h2 id="spring-backpack-note-title">A little further, together.</h2><p>Go back to the overworld and enjoy the view near the bridge.</p><span className="spring-bag-note-signature">— Syamu</span><button type="button" onClick={()=>onCommand('close-bag-note')}>Keep the note</button></section></div>}</>;
}
