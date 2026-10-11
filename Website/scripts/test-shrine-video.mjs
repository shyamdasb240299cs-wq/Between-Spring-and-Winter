import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

async function load(file){
  const source=await fs.readFile(new URL(file,import.meta.url),'utf8');
  const js=ts.transpileModule(source.replace(/import \{[^}]+\} from '.\/journey-data';/,'const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));const smooth=(n,a,b)=>{const x=clamp((n-a)/(b-a));return x*x*(3-2*x);};'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
  return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const {filmLayout,shrineVideoPose,filmBlack,SHRINE_FILM}=await load('../app/shrine-video-motion.ts');
const {createEntryClock,beginEntryHold,cancelEntryHold,advanceEntry}=await load('../app/shrine-entry-motion.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} must equal ${b}`);
for(const [width,height] of [[1021,572],[1920,1080],[2560,1080],[390,844],[844,390]]){
  const origin={x:width*.66,y:height*.32,w:width*.14},target=filmLayout(width,height);
  const start=shrineVideoPose(0,origin,width,height),end=shrineVideoPose(SHRINE_FILM.zoomMs,origin,width,height);
  near(start.scale,1);near(start.tx,0);near(start.ty,0);near(end.plateScale,1);near(end.plateX,0);near(end.plateY,0);near(end.plateOpacity,1);
  for(let ms=0;ms<=SHRINE_FILM.zoomMs;ms+=10){
    const pose=shrineVideoPose(ms,origin,width,height);
    // Both gate representations share position and apparent roof width throughout.
    near(origin.x*pose.scale+pose.tx,target.x*pose.plateScale+pose.plateX);
    near(origin.y*pose.scale+pose.ty,target.y*pose.plateScale+pose.plateY);
    near(origin.w*pose.scale,target.gateWidth*pose.plateScale);
    assert.ok(Number.isFinite(pose.scale));
  }
  assert.ok(target.width>=width-.001&&target.height>=height-.001,'Film fills the viewport without bars');
}
let black=0;
for(let t=0;t<=10;t+=1/240){const next=filmBlack(t,10);assert.ok(next>=black);black=next;}
near(filmBlack(8.7,10),0);near(filmBlack(10,10),1);near(filmBlack(0,NaN),0);
const short=createEntryClock();beginEntryHold(short);advanceEntry(short,140);cancelEntryHold(short);advanceEntry(short,250);assert.equal(short.phase,'idle');assert.equal(short.committed,false);near(short.charge,0);
const hold=createEntryClock();beginEntryHold(hold);advanceEntry(hold,699);assert.equal(hold.committed,false);advanceEntry(hold,1);assert.equal(hold.committed,true);assert.equal(beginEntryHold(hold),false);cancelEntryHold(hold);assert.equal(hold.committed,true);
console.log('Shrine video passed: gate registration at 5 aspect ratios, exact ending plate, monotonic media-clock fade, short-hold cancellation and single commitment.');
