import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile(new URL('../app/shrine-void/footstep-motion.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {createFootstepMotion}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
for(const hz of [30,60,120]){
  const gait=createFootstepMotion();gait.update(0,0,true);
  let first=-1,contacts=0,previousSide=0;
  for(let i=1;i<=hz*3;i++){
    const step=gait.update(0,3.8*i/hz,true);
    if(step.contact){if(first<0)first=i/hz;contacts++;assert.notEqual(step.side,previousSide);previousSide=step.side;}
  }
  assert.ok(first<=.067,'First contact has no half-second stride delay');
  assert.equal(contacts,7,'Contact cadence is frame-rate independent');
  for(let i=0;i<120;i++)assert.equal(gait.update(0,11.4,true).contact,false,'Standing still emits nothing');
  assert.equal(gait.update(0,12,false).contact,false,'Blocked movement never emits');
  assert.equal(gait.update(.2,12,true).contact,true,'Strafing also makes immediate contact');
}
console.log('Water contacts passed: prompt first impact, 30/60/120Hz cadence, alternating feet, still/blocked silence and strafing.');
