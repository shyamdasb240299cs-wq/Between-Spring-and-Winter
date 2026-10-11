import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {createPetalFlow,releaseFlowPetal,advancePetalFlow,flowPetalPose,SHRINE_ENTRY,PETAL_CAPACITY,createFlowEmitter,emitFlowPetals}=await import('../app/petal-flow.ts');
for(const source of ['opening','valley','roof','ambient']){
  const pool=createPetalFlow();releaseFlowPetal(pool,source,7,0,0,0,{x:-30,y:1000});const p=pool.find(p=>p.active);
  p.age=p.life;const end=flowPetalPose(p);assert.ok(Math.hypot(end.x-SHRINE_ENTRY.x,end.y-SHRINE_ENTRY.y)<1e-8);assert.equal(end.opacity,0);
}
for(const fps of [24,60,120]){
  const emitter=createFlowEmitter(),pool=createPetalFlow();let normal=0,charged=0;
  for(let frame=0;frame<fps*45;frame++){
    const charge=frame>=fps*35?1:0;
    emitFlowPetals(emitter,1/fps,4.5*(1+6*charge),serial=>{if(charge)charged++;else normal++;return releaseFlowPetal(pool,'valley',serial,0,0);});
    advancePetalFlow(pool,1/fps*(1+charge*3.8));
    if(frame>fps*3)assert.ok(pool.some(p=>p.active),'There are no periodic gaps between gusts');
    assert.ok(pool.filter(p=>p.active).length<=PETAL_CAPACITY);
  }
  assert.ok(Math.abs(normal-157.5)<=1);assert.ok(Math.abs(charged-315)<=1);
}
console.log('Petal stream passed: all sources enter/fade at the gate, continuous release, sevenfold hold emission and bounded 24/60/120Hz behaviour.');
