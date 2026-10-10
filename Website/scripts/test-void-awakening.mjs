import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile(new URL('../app/shrine-void/awakening.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {createAwakening}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
function advance(clock,seconds,hz=60){for(let i=0;i<Math.ceil(seconds*hz);i++)clock.advance(1/hz);}
for(const reduced of [false,true])for(const hz of [30,60,120]){
  const clock=createAwakening(reduced);assert.equal(clock.pose().black,1);assert.equal(clock.pose().reveal,0);
  advance(clock,2,hz);assert.equal(clock.state.phase,'seeking');assert.equal(clock.pose().movement,true);
  advance(clock,90,hz);assert.equal(clock.state.phase,'seeking','Idle never activates crystal');
  clock.contact(0,0,0);assert.equal(clock.touch(0),false,'Distant crystal cannot be activated');
  clock.contact(15,0,Math.PI);assert.equal(clock.pose().canTouch,false,'Must face the crystal');
  clock.contact(15,0,0);assert.equal(clock.pose().canTouch,true);assert.equal(clock.touch(15),true);assert.equal(clock.touch(15),false,'Duplicate press rejected');
  assert.equal(clock.pose().movement,false);advance(clock,reduced?1.25:3.85,hz);assert.equal(clock.state.phase,'blackout');assert.equal(clock.pose().black,1);
  advance(clock,1.8,hz);assert.equal(clock.state.phase,'blackout');assert.equal(clock.pose().black,1);assert.equal(clock.pose().crystalPower,0);assert.equal(clock.lantern(2,-1),0);
  advance(clock,.25,hz);assert.equal(clock.state.phase,'relighting');assert.equal(clock.pose().reveal,0);assert.equal(clock.lantern(2,-1),0,'Lanterns wait for the crystal');
  advance(clock,1,hz);assert.ok(clock.pose().crystalPower>0&&clock.pose().crystalPower<1,'Crystal relights gradually');assert.equal(clock.pose().movement,false);
  advance(clock,1.2,hz);assert.equal(clock.state.phase,'lanterns');assert.equal(clock.pose().crystalPower,1);assert.ok(clock.lantern(2,-1)>=clock.lantern(14,1),'Near lights precede far lights');
  advance(clock,6,hz);assert.equal(clock.state.phase,'awake');assert.equal(clock.pose().black,0);assert.equal(clock.pose().reveal,1);assert.equal(clock.pose().movement,true);assert.equal(clock.lantern(14,1),1);
  if(reduced)assert.equal(clock.pose().flash,0);
}
console.log('Awakening passed at 30/60/120 Hz: black arrival, deliberate proximity/facing interaction, duplicate guard, pulse, blackout, ordered lights, reveal and reduced motion.');
