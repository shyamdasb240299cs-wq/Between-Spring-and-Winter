"use client";
import {useEffect,useRef} from 'react';
import {Smartphone} from 'lucide-react';

export const landscapeBlocked=()=>document.documentElement.dataset.orientationBlocked==='true';
export default function LandscapeGuard(){
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const query=matchMedia('(max-width: 1024px) and (orientation: portrait)');
    const sync=()=>{
      const blocked=query.matches;
      document.documentElement.dataset.orientationBlocked=String(blocked);
      const main=document.querySelector('main');if(main)main.inert=blocked;
      if(blocked)host.current?.focus({preventScroll:true});
      window.dispatchEvent(new Event('journey-orientation-change'));
    };
    sync();query.addEventListener('change',sync);
    return()=>{query.removeEventListener('change',sync);delete document.documentElement.dataset.orientationBlocked;const main=document.querySelector('main');if(main)main.inert=false;};
  },[]);
  return <div className="landscape-guard" ref={host} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="landscape-title"><Smartphone aria-hidden="true"/><h2 id="landscape-title">Turn your phone sideways</h2><p>This little world is made for landscape.</p></div>;
}
