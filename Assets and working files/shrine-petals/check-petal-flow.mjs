import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {createPetalFlow,releaseFlowPetal,advancePetalFlow,flowPetalPose,SHRINE_ENTRY,PETAL_CAPACITY}=await import('../../Website/app/petal-flow.ts');
for(const source of ['opening','valley','roof']){
  const pool=createPetalFlow();assert.ok(releaseFlowPetal(pool,source,0,0,0));const petal=pool[0],start=flowPetalPose(petal);
  petal.age=petal.life*.05;const early=flowPetalPose(petal);
  assert.ok(source==='roof'?early.x<start.x:early.x>start.x,'Wind initially carries petals in the branch direction');
  petal.age=petal.life*.9;const entering=flowPetalPose(petal);assert.equal(entering.layer,1,'Petals enter behind the gate, below the house');assert.ok(entering.depth<.5);
  petal.age=petal.life;const end=flowPetalPose(petal);assert.ok(Math.hypot(end.x-SHRINE_ENTRY.x,end.y-SHRINE_ENTRY.y)<1e-8);assert.equal(end.opacity,0);
  for(let i=0;i<1000;i++)releaseFlowPetal(pool,source,i,.01,-12,1);
  assert.ok(pool.filter(p=>p.active).length<=34);assert.equal(pool.length,PETAL_CAPACITY);
  advancePetalFlow(pool,30);assert.equal(pool.filter(p=>p.active).length,0);
}
const combined=createPetalFlow();
for(let i=0;i<200;i++)for(const source of ['opening','valley','roof'])releaseFlowPetal(combined,source,i,0,0);
assert.equal(combined.filter(p=>p.active).length,PETAL_CAPACITY,'The whole shower uses one bounded pool');
for(const rate of [24,60,120]){
  const pool=createPetalFlow();releaseFlowPetal(pool,'valley',3,0,0);
  for(let i=0;i<rate*6;i++)advancePetalFlow(pool,1/rate);
  const pose=flowPetalPose(pool[0]);assert.ok(pose.x>200&&pose.x<SHRINE_ENTRY.x&&pose.opacity>.85);
}
console.log('Three wind directions, gate convergence/occlusion/fade, bounded petals and frame-rate-independent paths pass.');
