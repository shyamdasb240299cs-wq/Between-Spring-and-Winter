"use client";

import {useRef,type KeyboardEvent,type PointerEvent} from 'react';
import type {SpringSave} from './spring-treasure-state';
import {skipConditions} from './spring-adavi-physics';

type Props={state:SpringSave;stoneName:string;onCommand:(action:string,value?:unknown)=>void};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/** A persistent two-axis aim pad: horizontal direction, vertical release tilt. */
export function AdaviThrowControls({state,stoneName,onCommand}:Props){
  const pointer=useRef<number|null>(null);
  const aim=(event:PointerEvent<HTMLDivElement>)=>{
    const bounds=event.currentTarget.getBoundingClientRect();
    let x=(event.clientX-bounds.left-bounds.width/2)/(bounds.width*.34),y=(event.clientY-bounds.top-bounds.height/2)/(bounds.height*.34);
    const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
    onCommand('set-skip-aim',Math.round(clamp(x*25,-25,25)));
    onCommand('set-skip-angle',Math.round(clamp(22+y*18,4,40)));
  };
  const keyboard=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    if(event.key==='Home'){onCommand('set-skip-aim',0);onCommand('set-skip-angle',10);}
    else if(event.key==='ArrowLeft'||event.key==='ArrowRight')onCommand('set-skip-aim',clamp(state.skipAim+(event.key==='ArrowLeft'?-1:1),-25,25));
    else onCommand('set-skip-angle',clamp(state.skipAngle+(event.key==='ArrowUp'?-1:1),4,40));
  };
  const end=(event:PointerEvent<HTMLDivElement>)=>{if(pointer.current!==event.pointerId)return;pointer.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);};
  const direction=state.skipAim===0?'Straight across':`${Math.abs(state.skipAim)}° ${state.skipAim<0?'left':'right'}`;
  const conditions=skipConditions(state.skipSeed),breeze=Math.abs(conditions.drift)<.5?'Breeze: calm':`Cross-breeze ${conditions.drift<0?'←':'→'} ${Math.abs(conditions.drift).toFixed(1)}°`;
  return <section className="spring-throw-controls" aria-label="Aim your stone">
    <div className="spring-throw-heading"><span className="spring-adavi-eyebrow">Your throw</span><strong>{stoneName}</strong><span>Follow the arc across the water</span><span className="spring-throw-breeze">{breeze} · Allow for the drift</span></div>
    <label className="spring-throw-power" htmlFor="spring-skip-power">
      <span>Power</span><output>{Math.round(state.skipPower*100)}<small>%</small></output>
      <span className="spring-throw-power-track" aria-hidden="true"><i style={{height:`${(state.skipPower-.15)/.85*100}%`}}/><b style={{bottom:`${(state.skipPower-.15)/.85*100}%`}}/></span>
      <input id="spring-skip-power" aria-label="Throw power" type="range" min="15" max="100" step="1" value={Math.round(state.skipPower*100)} onChange={event=>onCommand('set-skip-power',Number(event.target.value)/100)}/>
      <span className="spring-throw-power-help">Slide up</span>
    </label>
    <div className="spring-throw-aim"><span className="spring-adavi-eyebrow">Angle & direction</span>
      <div className="spring-throw-pad" role="group" aria-roledescription="two-axis joystick" aria-label="Throw aiming joystick" aria-describedby="spring-throw-aim-value spring-throw-aim-help" tabIndex={0}
        onKeyDown={keyboard}
        onPointerDown={event=>{if(event.button!==0||pointer.current!==null)return;event.preventDefault();pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.focus({preventScroll:true});aim(event);}}
        onPointerMove={event=>{if(event.pointerId===pointer.current)aim(event);}}
        onPointerUp={end} onPointerCancel={end} onLostPointerCapture={()=>{pointer.current=null;}}>
        <span className="spring-throw-pad-shallow" aria-hidden="true">Shallow</span><span className="spring-throw-pad-steep" aria-hidden="true">Steep</span>
        <span className="spring-throw-pad-cross" aria-hidden="true"/>
        <span className="spring-throw-pad-knob" aria-hidden="true" style={{left:`${50+state.skipAim/25*34}%`,top:`${50+(state.skipAngle-22)/18*34}%`}}><i/></span>
      </div>
      <output id="spring-throw-aim-value">{state.skipAngle}° down <span>·</span> {direction}</output>
      <span id="spring-throw-aim-help" className="spring-throw-aim-help">Drag to aim · Arrow keys to fine-tune</span>
    </div>
    <div className="spring-throw-actions"><button type="button" className="spring-adavi-primary" onClick={()=>onCommand('throw-stone')}>Throw stone <span aria-hidden="true">↗</span></button><button type="button" className="spring-adavi-quiet" onClick={()=>onCommand('cancel-aim')}>Back</button></div>
  </section>;
}
