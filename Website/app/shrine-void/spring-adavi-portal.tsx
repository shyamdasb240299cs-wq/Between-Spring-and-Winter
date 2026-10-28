"use client";
import {useEffect,useRef,useState} from 'react';
import './spring-adavi-portal.css';

export const SPRING_PORTAL_PASSAGE_EVENT='spring-portal-passage';
const PASSAGE_MS=1250;

/** A short veil for the moment the player's camera crosses the physical door. */
export function SpringPortalPassage(){
  const [passage,setPassage]=useState<{id:number;inside:boolean}|null>(null),sequence=useRef(0);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    const cross=(event:Event)=>{
      const detail=(event as CustomEvent<{inside?:unknown}>).detail;
      if(typeof detail?.inside!=='boolean')return;
      if(timer)clearTimeout(timer);
      setPassage({id:++sequence.current,inside:detail.inside});
      timer=setTimeout(()=>setPassage(null),PASSAGE_MS);
    };
    window.addEventListener(SPRING_PORTAL_PASSAGE_EVENT,cross);
    return()=>{window.removeEventListener(SPRING_PORTAL_PASSAGE_EVENT,cross);if(timer)clearTimeout(timer);};
  },[]);
  if(!passage)return null;
  return <div key={passage.id} className={`spring-portal-passage ${passage.inside?'spring-portal-arriving':'spring-portal-returning'}`}>
    <div className="spring-portal-light" aria-hidden="true"><span className="spring-portal-colour"/><span className="spring-portal-rings"/><span className="spring-portal-glow"/></div>
    <div className="spring-portal-caption" role="status" aria-live="polite" aria-atomic="true"><span>Through the hidden door</span><strong>{passage.inside?'Adavi · Kallar River':'Spring · Back among the blossoms'}</strong><i aria-hidden="true">✦</i></div>
  </div>;
}
