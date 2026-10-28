"use client";
import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {createPortal} from 'react-dom';
import './spring-inventory.css';
import {SPRING_INVENTORY_HOLD_MS,SPRING_INVENTORY_DOUBLE_MS,SPRING_INVENTORY_DRAG_PX,springInventoryDropTarget} from './spring-inventory-drag';
import {SPRING_CARRY_NAMES,SPRING_FOOD_COUNTS,springItemHands,springCanStore,springRemaining,type SpringCarryItem,type SpringItem,type SpringSave} from './spring-treasure-state';

export function CarryIcon({item}:{item:SpringCarryItem|null}){
  if(item==='glasses')return <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 16 2-7 9-2m23 9-2-7-9-2M3 18c0-4 13-4 13 0v8c0 8-12 8-12 0L3 18Zm21 0c0-4 13-4 13 0l-1 8c0 8-12 8-12 0v-8Zm-8 1c3-3 5-3 8 0"/></svg>;
  return <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {item==='compass'?<><circle cx="20" cy="22" r="15"/><circle cx="20" cy="22" r="11"/><path d="m20 10 4 16-4-4-4 4 4-16ZM17 3h6v4M20 29v2M9 22h2m18 0h2"/></>:item==='river-stone'?<path d="M5 24C1 11 28 7 35 18s-16 15-24 12Z" fill="currentColor" fillOpacity=".3"/>:item==='key'?<><circle cx="12" cy="12" r="7"/><path d="m17 17 17 17m-5-5 4-4m-9-1 4-4"/></>:item==='backpack'?<><path d="M12 11V8c0-7 16-7 16 0v3M8 12q12-8 24 0v23H8V12ZM8 18h24M14 24h12v8H14Z"/><path d="M5 17v14m30-14v14M18 18v4m5-4v4"/></>:item==='pill'?<><path d="m14 9 16 16a8 8 0 0 1-11 11L3 20A8 8 0 0 1 14 9Z" transform="translate(4 -2)"/><path d="m15 23 11-11"/></>:item==='mushroom-toy'?<><path d="M4 23C4 1 36 1 36 23H4Zm13 0-2 13h10l-2-13"/><circle cx="13" cy="16" r="2"/><circle cx="25" cy="18" r="2"/></>:item==='candle'?<><path d="M13 17h14v20H13Zm7-14c-8 10 8 13 0 0ZM20 13v5M13 20c7 7 8-6 14 0"/></>:item&&['letter','door-note','bridge-note','pill-letter','journey-note','note','paper-fragments'].includes(item)?<><path d={item==='paper-fragments'?'m7 5 8 2 4-4 7 4 7-1-2 9 3 5-4 7 2 9-12-2-7 3-6-6 2-9-4-6 2-11Z':'M8 4h18l7 7v25H8V4Zm18 0v8h7'}/><path d="M13 17h14M13 23h11M13 29h12"/>{item==='paper-fragments'&&<path d="m19 4-3 11 7 5-5 16"/>}</>:item?<><path d="M5 21h30l-4 14H9L5 21ZM12 21l5-11m11 11L23 10"/><ellipse cx="19" cy="17" rx="7" ry="5"/><path d="M13 24v7m7-7v8m7-8v7"/></>:<path d="M12 25V12a2 2 0 0 1 4 0v10-15a2 2 0 0 1 4 0v15-13a2 2 0 0 1 4 0v14-9a2 2 0 0 1 4 0v14c0 7-4 10-10 10s-10-5-14-11c-3-4 2-7 5-3l3 4"/>}
  </svg>;
}
function count(state:SpringSave,item:SpringCarryItem){if(item==='paper-fragments')return `${state.paperPieces.length}/5`;if(Object.hasOwn(SPRING_FOOD_COUNTS,item)&&item!=='key')return springRemaining(state,item as SpringItem);return null;}
export function SpringInventoryControls({state,onCommand,disabled=false}:{state:SpringSave;onCommand:(action:string,value?:unknown)=>void;disabled?:boolean}){
  const root=useRef<HTMLDivElement>(null),pendingClick=useRef<ReturnType<typeof setTimeout>|null>(null),lastTap=useRef({slot:-1,time:0});
  type Gesture={pointer:number;slot:number;item:SpringCarryItem|null;x:number;y:number;armed:boolean;active:boolean;cancelled:boolean;timer:ReturnType<typeof setTimeout>|null};
  type Preview={slot:number;item:SpringCarryItem;x:number;y:number;target:ReturnType<typeof springInventoryDropTarget>};
  const gesture=useRef<Gesture|null>(null),[drag,setDrag]=useState<Preview|null>(null);
  const twoHands=!!state.hands[0]&&state.hands[0]===state.hands[1];
  function cancel(){if(gesture.current?.timer)clearTimeout(gesture.current.timer);gesture.current=null;setDrag(null);}
  useEffect(()=>{const stop=(event:KeyboardEvent)=>{if(event.key==='Escape')cancel();};window.addEventListener('keydown',stop);window.addEventListener('blur',cancel);return()=>{window.removeEventListener('keydown',stop);window.removeEventListener('blur',cancel);if(gesture.current?.timer)clearTimeout(gesture.current.timer);if(pendingClick.current)clearTimeout(pendingClick.current);};},[]);
  useEffect(()=>{if(disabled){cancel();if(pendingClick.current)clearTimeout(pendingClick.current);}},[disabled]);
  function dropTarget(x:number,y:number){const bounds=root.current!.getBoundingClientRect(),slots=Array.from(root.current!.querySelectorAll<HTMLElement>('[data-inventory-slot]')).map(el=>({index:Number(el.dataset.inventorySlot),...rect(el.getBoundingClientRect())}));return springInventoryDropTarget(x,y,slots,bounds);}
  function rect(r:DOMRect){return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}
  function show(g:Gesture,x:number,y:number){if(g.item)setDrag({slot:g.slot,item:g.item,x,y,target:dropTarget(x,y)});}
  function activate(slot:number){if(disabled)return;if(slot<10)onCommand('equip-storage',slot);else onCommand('select-hand',slot-10);}
  function down(event:ReactPointerEvent<HTMLButtonElement>,slot:number,item:SpringCarryItem|null){
    event.stopPropagation();if(disabled||event.button!==0)return;
    if(pendingClick.current){clearTimeout(pendingClick.current);pendingClick.current=null;}
    cancel();event.currentTarget.setPointerCapture(event.pointerId);
    const double=lastTap.current.slot===slot&&performance.now()-lastTap.current.time<SPRING_INVENTORY_DOUBLE_MS;
    const g:Gesture={pointer:event.pointerId,slot,item,x:event.clientX,y:event.clientY,armed:event.pointerType==='mouse'||double,active:false,cancelled:false,timer:null};gesture.current=g;
    if(item)g.timer=setTimeout(()=>{if(gesture.current!==g)return;g.armed=true;g.active=true;show(g,g.x,g.y);},SPRING_INVENTORY_HOLD_MS);
  }
  function move(event:ReactPointerEvent<HTMLButtonElement>){
    event.stopPropagation();const g=gesture.current;if(!g||g.pointer!==event.pointerId||!g.item)return;
    const moved=Math.hypot(event.clientX-g.x,event.clientY-g.y)>=SPRING_INVENTORY_DRAG_PX;
    if(!g.armed&&moved){if(g.timer)clearTimeout(g.timer);g.cancelled=true;return;}
    if(g.armed&&(moved||g.active)){event.preventDefault();g.active=true;if(g.timer)clearTimeout(g.timer);show(g,event.clientX,event.clientY);}
  }
  function up(event:ReactPointerEvent<HTMLButtonElement>){
    event.stopPropagation();const g=gesture.current;if(!g||g.pointer!==event.pointerId)return;
    const target=g.active?dropTarget(event.clientX,event.clientY):null;
    cancel();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(g.active&&g.item){lastTap.current={slot:-1,time:0};if(target?.kind==='slot'&&target.index!==g.slot)onCommand('move-inventory',{from:g.slot,to:target.index,item:g.item});else if(target?.kind==='world')onCommand('drop-inventory',{slot:g.slot,item:g.item});return;}
    if(g.cancelled){lastTap.current={slot:-1,time:0};return;}
    lastTap.current={slot:g.slot,time:performance.now()};
    pendingClick.current=setTimeout(()=>{pendingClick.current=null;activate(g.slot);},SPRING_INVENTORY_DOUBLE_MS);
  }
  function handlers(slot:number,item:SpringCarryItem|null){return {'data-inventory-slot':slot,'data-drag-source':drag?.slot===slot||undefined,'data-drop-target':drag?.target.kind==='slot'&&drag.target.index===slot||undefined,onPointerDown:(e:ReactPointerEvent<HTMLButtonElement>)=>down(e,slot,item),onPointerMove:move,onPointerUp:up,onPointerCancel:cancel,onLostPointerCapture:()=>{if(gesture.current)cancel();},onContextMenu:(e:React.MouseEvent)=>e.preventDefault(),onClick:(e:React.MouseEvent)=>{e.stopPropagation();if(e.detail===0)activate(slot);}};}
  const slots=(start:number)=><div className="spring-storage-side" role="group" aria-label={start===0?'Left storage · five slots':'Right storage · five slots'}><span className="spring-storage-label">{start===0?'Inventory I':'Inventory II'}</span>{state.storageSlots.slice(start,start+5).map((item,index)=>{const i=start+index,quantity=item?count(state,item):null;return <button type="button" className={`spring-slot spring-storage-slot${item?' occupied':''}`} key={i} disabled={disabled} {...handlers(i,item)} aria-label={`Storage ${i+1}: ${item?SPRING_CARRY_NAMES[item]:'empty'}`} title={item?`${SPRING_CARRY_NAMES[item]} · drag to move, swap or drop`:'Empty storage'}><small>{(i+1)%10}</small>{item&&<CarryIcon item={item}/>}<span className="spring-slot-count">{quantity}</span></button>;})}</div>;
  return <div className="spring-inventory-wrap" aria-label="Inventory: ten storage slots and two hands">
    {state.inventoryNotice&&<div className="spring-inventory-notice" role="status">{state.inventoryNotice}</div>}
    <div className="spring-physical-inventory" ref={root} data-dragging={!!drag}>
      {slots(0)}
      <div className="spring-hands" role="group" aria-label="Your hands" data-linked={twoHands}>
        {([0,1] as const).map(hand=><div className="spring-hand-slot-wrap" key={hand}><button type="button" className={`spring-slot spring-hand-slot${state.activeHand===hand?' selected':''}`} disabled={disabled} {...handlers(10+hand,state.hands[hand])} aria-label={`${hand===0?'Left':'Right'} hand: ${state.hands[hand]?SPRING_CARRY_NAMES[state.hands[hand]]:'empty'}`} aria-pressed={state.activeHand===hand}><small>{hand===0?'L':'R'}</small><CarryIcon item={state.hands[hand]}/>{twoHands&&<span className="spring-linked-hands" aria-label="Both hands required">↔</span>}</button>{state.hands[hand]&&springCanStore(state.hands[hand])&&(!twoHands||hand===0)&&<button type="button" className="spring-stow-hand" disabled={disabled} onClick={()=>onCommand('stow-hand',hand)} title="Store held item">Stow</button>}</div>)}
      </div>
      {slots(5)}
    </div>
    <span className="spring-inventory-caption" aria-live="polite">{drag?drag.target.kind==='world'?'Release to drop into the world':drag.target.kind==='slot'?'Release to move or swap':'Move onto a slot or outside to drop':twoHands?`${SPRING_CARRY_NAMES[state.hands[0]!]} · both hands`:'Drag to move · hold or double-tap, then drag on touch · H switches hands'}</span>
    {drag&&createPortal(<div className="spring-inventory-drag" data-world-drop={drag.target.kind==='world'} style={{left:drag.x,top:drag.y}}><CarryIcon item={drag.item}/><span>{SPRING_CARRY_NAMES[drag.item]}</span><small>{drag.target.kind==='world'?'Drop into world ↗':drag.target.kind==='slot'?'Move / swap':'Drag to a slot'}</small></div>,document.body)}
  </div>;
}
