type CaptureTarget=Pick<HTMLElement,'setPointerCapture'|'hasPointerCapture'|'releasePointerCapture'>;
/** Mouse, touch and pen use the same primary-pointer hold contract. */
export function createShrineInput(target:CaptureTarget,start:()=>boolean,cancel:()=>void,committed:()=>boolean){
  let pointer:number|null=null,key:string|null=null;
  const releaseCapture=()=>{if(pointer!==null&&target.hasPointerCapture(pointer)){const id=pointer;pointer=null;target.releasePointerCapture(id);}else pointer=null;};
  const abort=()=>{if(committed())return;releaseCapture();key=null;cancel();};
  return{
    down(event:PointerEvent){if(!event.isPrimary||event.button!==0||pointer!==null||key!==null||committed())return;event.preventDefault();if(start()){pointer=event.pointerId;target.setPointerCapture(pointer);}},
    up(event:PointerEvent){if(event.pointerId!==pointer)return;releaseCapture();abort();},
    lost(event:PointerEvent){if(event.pointerId===pointer)abort();},
    keyDown(event:KeyboardEvent){if(![' ','Enter'].includes(event.key))return;event.preventDefault();if(!event.repeat&&pointer===null&&key===null&&!committed()&&start())key=event.key;},
    keyUp(event:KeyboardEvent){if(event.key===key){event.preventDefault();abort();}},
    abort,dispose(){releaseCapture();key=null;},
  };
}
