import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
let enabled=false,blocked=false,contexts=0,closed=0,stopped=0;const scheduled=[];
globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.hidden=false;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userActivation:{isActive:false}}});
function param(initial=0){return {value:initial,setTargetAtTime(value){this.value=value;scheduled.push(value);},setValueAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.value=value;},exponentialRampToValueAtTime(value){this.value=value;}};}
function node(){return {connect(){},disconnect(){}};}
const gains=[];globalThis.AudioContext=class{
  constructor(){contexts++;this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.destination=node();}
  createGain(){const n={...node(),gain:param()};gains.push(n);return n;}
  createBiquadFilter(){return {...node(),frequency:param(),Q:param(),gain:param()};}
  createBuffer(channels,count){const data=Array.from({length:channels},()=>new Float32Array(count));return {getChannelData(i){return data[i];}};}
  createBufferSource(){return {...node(),start(){},stop(){stopped++;}};}
  createOscillator(){return {...node(),frequency:param(),start(){},stop(){stopped++;this.onended?.();}};}
  createStereoPanner(){return {...node(),pan:param()};}
  async resume(){this.state='running';}
  async suspend(){this.state='suspended';}
  async close(){closed++;this.state='closed';}
};
// Inject only the two shared application settings; exercise the actual authored
// audio graph, gesture gate, update rules and cleanup in a deterministic host.
const source=readFileSync(new URL('../app/shrine-void/spring-rain-audio.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const js=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}).replace('export function','function');
const create=new Function('getAudioEnabled','landscapeBlocked',js+';return createSpringRainAudio;')(()=>enabled,()=>blocked);
const rain=create();rain.update(1,false,false);window.dispatchEvent(new Event('pointerdown'));assert.equal(contexts,0,'Muted audio must not create a context');
enabled=true;window.dispatchEvent(new Event('journey-audio-change'));assert.equal(contexts,0,'A programmatic setting event cannot unlock audio');
navigator.userActivation.isActive=true;window.dispatchEvent(new Event('journey-audio-change'));navigator.userActivation.isActive=false;assert.equal(contexts,1);
rain.update(1,false,false);assert.equal(gains[0].gain.value,.115);rain.update(.25,false,false);assert.equal(gains[0].gain.value,.0575);
rain.update(1,true,false);assert.equal(gains[0].gain.value,.055,'Coach shelter muffles rain');rain.update(1,false,true);assert.equal(gains[0].gain.value,0,'Pause silences the synthesis');
document.hidden=true;rain.update(1,false,false);assert.equal(gains[0].gain.value,0);document.hidden=false;blocked=true;rain.update(1,false,false);assert.equal(gains[0].gain.value,0);blocked=false;
rain.update(1,false,false);enabled=false;window.dispatchEvent(new Event('journey-audio-change'));assert.equal(gains[0].gain.value,0,'Central mute applies immediately');
rain.dispose();rain.dispose();assert.equal(closed,1);assert.ok(stopped>=1);enabled=true;navigator.userActivation.isActive=true;window.dispatchEvent(new Event('pointerdown'));assert.equal(contexts,1,'Disposal removes the gesture listeners');
console.log('Rain audio checks passed: silent initialization, real-gesture authorization, route gain, shelter filtering, pause/visibility/orientation/mute and cleanup.');
