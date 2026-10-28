import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';

const {ADAVI_STONES,ADAVI_THROW_START,ADAVI_WATER_Y,ADAVI_TARGET,ADAVI_SKIP_GRAVITY,simulateSkip,sampleSkip,skipConditions}=await import(await typescriptUrl(new URL('../app/shrine-void/spring-adavi-physics.ts',import.meta.url)));
const good={power:.78,angle:10,aim:0};
const flat=ADAVI_STONES.find(stone=>stone.id==='slate-skipper');
const round=ADAVI_STONES.find(stone=>stone.shape==='round');
const optimal=simulateSkip(flat,good);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} should be close to ${expected}`);
const finite=p=>assert.ok(['x','y','z'].every(key=>Number.isFinite(p[key])),'Every displayed stone pose remains finite');

assert.equal(optimal.success,true,'An appropriate stone with achievable controls reaches the opposite bank');
assert.equal(optimal.skips,4,'The recommended throw has four clearly separated surface contacts');
assert.equal(optimal.landing,'bank');
assert.ok(optimal.end.x>ADAVI_TARGET.x);
assert.ok(Math.abs(optimal.end.z-ADAVI_TARGET.z)<ADAVI_TARGET.halfWidth);
assert.ok(optimal.impacts.every((impact,i)=>i===0||impact.t-optimal.impacts[i-1].t>.2),'Each splash is separated by a visible airborne arc');
assert.deepEqual(simulateSkip(flat,good),optimal,'Preview and launched throw use the same deterministic path');
assert.deepEqual(skipConditions(0),{drift:0,speed:1,lift:1},'Seed zero represents calm, reproducible conditions');
assert.deepEqual(simulateSkip(flat,{...good,seed:0}).segments,optimal.segments,'Omitting the seed preserves the calm baseline');

const seededAttempts=Array.from({length:64},(_,i)=>{
  const seed=i+1,conditions=skipConditions(seed),settings={...good,seed},trajectory=simulateSkip(flat,settings);
  assert.deepEqual(skipConditions(seed),conditions,'River conditions remain stable throughout an attempt');
  assert.ok(Math.abs(conditions.drift)<=12&&conditions.speed>=.965&&conditions.speed<=1.035&&conditions.lift>=.94&&conditions.lift<=1.06,'Conditions stay within readable, compensable bounds');
  assert.deepEqual(simulateSkip(flat,settings),trajectory,'Seeded preview and flight agree on every sample, contact and outcome');
  return {seed,conditions,trajectory};
});
assert.ok(seededAttempts.filter(attempt=>attempt.trajectory.success).length>=16,'Good slate throws remain reasonably winnable across changing conditions');
const failedAttempts=seededAttempts.filter(attempt=>!attempt.trajectory.success);
assert.ok(failedAttempts.length>0,'Repeating a good angle and power does not guarantee the crossing');
assert.ok(failedAttempts.some(attempt=>attempt.trajectory.landing==='miss'),'River drift can carry an otherwise good throw away from the landing');
assert.ok(failedAttempts.some(({seed,conditions})=>simulateSkip(flat,{...good,seed,aim:-conditions.drift}).success),'Aiming into the displayed drift can recover a failed crossing');
for(const {seed,conditions} of seededAttempts){
  const adjustedAim=-conditions.drift;
  assert.ok([.66,.70,.74,.78,.82].some(power=>[6,8,10,12,14,16].some(angle=>simulateSkip(flat,{power,angle,aim:adjustedAim,seed}).success)),'Each sampled condition has an achievable, compensated slate throw');
}

for(const seed of [0,7,15,32,64]){
  for(const power of [0,.12,.30])assert.equal(simulateSkip(flat,{...good,power,seed}).success,false,'Weak throws cannot complete the crossing, even in favorable conditions');
  for(const angle of [25,32,40])assert.equal(simulateSkip(flat,{...good,angle,seed}).success,false,'Steep releases do not skip across the river, even in favorable conditions');
}
for(const aim of [-25,25])assert.equal(simulateSkip(flat,{...good,aim}).success,false,'Aim must line up with the landing on the opposite bank');
for(const stone of ADAVI_STONES.filter(stone=>stone.shape==='round'))for(const seed of [0,7,15,32,64]){
  const trajectory=simulateSkip(stone,{...good,seed});
  assert.equal(trajectory.success,false,'A rounded stone cannot be used to bypass choosing a skimming stone');
  assert.equal(trajectory.skips,1);
  assert.equal(trajectory.landing,'sink');
  assert.ok(trajectory.end.y<ADAVI_WATER_Y-.3);
}
const tuningOptions=ADAVI_STONES.filter(stone=>stone.shape==='flat').map(stone=>{
  const successful=[];
  for(const power of [.62,.66,.70,.74,.78,.82,.86,.90])for(const angle of [4,6,8,10,12,14,16,18])if(simulateSkip(stone,{power,angle,aim:0}).success)successful.push({power,angle});
  assert.ok(successful.length>0,`${stone.name} has an achievable skimming throw`);return {stone,successful};
});
const slateOptions=tuningOptions.find(option=>option.stone.id===flat.id).successful.length;
for(const id of ['thin-shale','little-slate']){
  const {stone,successful}=tuningOptions.find(option=>option.stone.id===id);
  assert.equal(simulateSkip(stone,good).success,false,`${stone.name} needs a different release from the ideal slate`);
  assert.ok(successful.length<slateOptions*.75,`${stone.name} has a meaningfully narrower successful power/angle window`);
}
// A waist-height release travels farther before its first splash than the old low release.
assert.ok(optimal.distance>simulateSkip(round,good).distance*2.5,'Flatness still has a substantial physical effect on travel');

assert.equal(new Set(ADAVI_STONES.map(stone=>stone.id)).size,ADAVI_STONES.length);
assert.ok(ADAVI_STONES.length>=12);
assert.deepEqual(new Set(ADAVI_STONES.map(stone=>stone.model)),new Set(['river-pebble','river-rock','rock']),'Pickups use the imported 3D rock model variants');
for(const stone of ADAVI_STONES){
  assert.ok(stone.position.x<-6&&stone.position.z>3&&stone.position.z<15,'Collectible stones stay on the accessible left shore');
  assert.ok(stone.size>.15&&stone.size<.4,'Pickups are hand-sized stones');
  assert.ok(stone.scale.y>0&&stone.scale.x>0&&stone.scale.z>0);
  if(stone.shape==='flat')assert.ok(stone.scale.y<stone.scale.x*.4,'A flat stone is visibly thinner than a rounded one');
}

// Verify all rendered paths, including failures, at their actual impact times.
for(const stone of ADAVI_STONES)for(const settings of [good,{power:1,angle:4,aim:0},{power:.4,angle:20,aim:-12},{power:.8,angle:10,aim:10},{...good,seed:7},{...good,seed:15}]){
  const trajectory=simulateSkip(stone,settings);
  assert.ok(trajectory.duration>0&&trajectory.duration<12);
  near(distance(sampleSkip(trajectory,0),ADAVI_THROW_START),0);
  near(distance(sampleSkip(trajectory,trajectory.duration),trajectory.end),0);
  near(distance(sampleSkip(trajectory,trajectory.duration+4),trajectory.end),0);
  near(distance(sampleSkip(trajectory,-3),ADAVI_THROW_START),0);
  for(let i=0;i<trajectory.segments.length;i++){
    const segment=trajectory.segments[i];
    assert.ok(segment.t1>segment.t0);
    if(i>0){
      near(segment.t0,trajectory.segments[i-1].t1);
      near(distance(sampleSkip(trajectory,segment.t0),segment.start),0,1e-6);
    }
    if(segment.kind==='flight'){
      assert.equal(segment.gravity,ADAVI_SKIP_GRAVITY);
      const middle=(segment.t0+segment.t1)/2,dt=Math.min(.005,(segment.t1-segment.t0)/4);
      const before=sampleSkip(trajectory,middle-dt),now=sampleSkip(trajectory,middle),after=sampleSkip(trajectory,middle+dt);
      near((after.y-2*now.y+before.y)/(dt*dt),-ADAVI_SKIP_GRAVITY,1e-4);
      near((after.x-before.x)/(2*dt),segment.velocity.x,1e-6);
      near((after.z-before.z)/(2*dt),segment.velocity.z,1e-6);
    }
  }
  for(const impact of trajectory.impacts){
    near(impact.y,ADAVI_WATER_Y);
    near(distance(sampleSkip(trajectory,impact.t),impact),0,1e-6);
    assert.ok(trajectory.samples.some(sample=>Math.abs(sample.t-impact.t)<1e-8),'Guidance samples include the exact splash positions');
    const incoming=trajectory.segments.find(segment=>Math.abs(segment.t1-impact.t)<1e-8);
    const outgoing=trajectory.segments.find(segment=>Math.abs(segment.t0-impact.t)<1e-8);
    if(incoming&&outgoing&&outgoing.kind==='flight'){
      const vy=incoming.velocity.y-incoming.gravity*(incoming.t1-incoming.t0);
      const incomingEnergy=incoming.velocity.x**2+incoming.velocity.z**2+vy**2;
      const outgoingEnergy=outgoing.velocity.x**2+outgoing.velocity.z**2+outgoing.velocity.y**2;
      assert.ok(outgoingEnergy<incomingEnergy,'Water contact dissipates energy rather than adding speed');
    }
  }
  for(let i=0;i<trajectory.samples.length;i++){
    const sample=trajectory.samples[i];finite(sample);
    if(i)assert.ok(sample.t>trajectory.samples[i-1].t);
  }
  if(trajectory.success)assert.ok(trajectory.skips>=4&&trajectory.landing==='bank');
}

// Time sampling is exact at every frame rate, including a delayed final frame.
for(const hz of [15,30,60,120,144]){
  let end;
  for(let frame=0;frame<=Math.ceil(optimal.duration*hz);frame++){end=sampleSkip(optimal,frame/hz);finite(end);}
  near(distance(end,optimal.end),0);
}
const invalid=simulateSkip({...flat,flatness:NaN},{power:NaN,angle:Infinity,aim:NaN,seed:NaN});
finite(invalid.end);assert.ok(Number.isFinite(invalid.duration));finite(sampleSkip(invalid,NaN));
const clamped=simulateSkip(flat,{power:8,angle:-2,aim:90});
assert.deepEqual(clamped.settings,{power:1,angle:4,aim:25});
console.log('Adavi stone skipping passed: four-hop crossing, varied stone suitability, seeded river conditions, compensable drift, force/angle/aim failures, ballistic gravity, continuous water contact, energy loss, exact splash previews, deterministic paths and 15–144 Hz sampling.');
