"use client";
import {useEffect,useRef} from 'react';
import {SPRING_TRAIN_LOCK_LETTERS,type SpringSave} from './spring-treasure-state';

/** Hit areas follow the real wheels in the scene; the suitcase supplies all artwork. */
export function SpringSuitcaseLock({state,onCommand}:{state:SpringSave;onCommand:(action:string,value?:unknown)=>void}){
  const root=useRef<HTMLElement>(null);
  useEffect(()=>{
    root.current?.focus();
    const position=(event:Event)=>{
      const points=(event as CustomEvent<{x:number;y:number;width:number}[]>).detail;
      root.current?.querySelectorAll<HTMLElement>('[data-lock-anchor]').forEach((element,index)=>{
        const p=points[index];if(!p)return;
        element.style.left=`${p.x}%`;element.style.top=`${p.y}%`;
        if(index<5)element.style.width=`${p.width}%`;
      });
      if(root.current)root.current.dataset.ready='true';
    };
    window.addEventListener('spring-suitcase-layout',position);
    return()=>window.removeEventListener('spring-suitcase-layout',position);
  },[]);
  return <section ref={root} className="spring-suitcase-lock" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Built-in suitcase combination lock" onKeyDown={event=>{
    if(event.key==='Escape'){event.preventDefault();onCommand('close-train-case');}
    if(event.key==='Tab'){
      const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button')??[]),first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  }}>
    <p className="spring-lock-instructions">The suitcase lock <span>Turn the wheels, then press the brass clasp.</span></p>
    {state.trainLockWheels.map((value,index)=><div className="spring-lock-wheel" data-lock-anchor key={index}>
      <button type="button" aria-label={`Increase ${index===0?'letter':`digit ${index}`}`} onClick={()=>onCommand('turn-train-wheel',{index,delta:1})}>⌃</button>
      <output className="spring-lock-accessible" aria-live="polite">{`Wheel ${index+1}: ${index===0?SPRING_TRAIN_LOCK_LETTERS[value]:value}`}</output>
      <button type="button" aria-label={`Decrease ${index===0?'letter':`digit ${index}`}`} onClick={()=>onCommand('turn-train-wheel',{index,delta:-1})}>⌄</button>
    </div>)}
    <button type="button" className="spring-lock-clasp" data-lock-anchor aria-label="Try the clasp" onClick={()=>onCommand('unlock-train-case')}><span className="spring-lock-accessible">Try the clasp</span></button>
    <div className="spring-lock-footer"><p role="status">{state.inventoryNotice||'Your belongings stay safely in your hands.'}</p><button type="button" onClick={()=>onCommand('close-train-case')}>Step back <kbd>Esc</kbd></button></div>
  </section>;
}
