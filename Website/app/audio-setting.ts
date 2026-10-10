import {useSyncExternalStore} from 'react';

let enabled=false;
const changed='journey-audio-change';
export function setAudioEnabled(value:boolean){enabled=value;window.dispatchEvent(new Event(changed));}
export function requestAudioToggle(){window.dispatchEvent(new Event('journey-audio-request'));}
export function getAudioEnabled(){return enabled;}
function subscribe(listener:()=>void){window.addEventListener(changed,listener);return()=>window.removeEventListener(changed,listener);}
export function useAudioEnabled(){return useSyncExternalStore(subscribe,getAudioEnabled,()=>false);}
