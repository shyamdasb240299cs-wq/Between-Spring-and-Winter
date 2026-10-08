import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
// Source-only TS modules use bundler-style extensionless imports.
registerHooks({resolve(specifier,context,next){
  try{return next(specifier,context);}catch(error){
    if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('./'))return next(specifier+'.ts',context);
    throw error;
  }
}});
const {soundMix}=await import('../../Website/app/sound-mix.ts');
const {READ_START}=await import('../../Website/app/journey-data.ts');
for(const [width,height] of [[1024,576],[1440,900],[844,390],[320,568],[390,844],[768,1024]]){
  const sky=soundMix(0,width,height,0);
  assert.equal(sky.birds,0,'Forest birds belong to the campfire, not the sky');
  assert.equal(sky.fire,0);assert.equal(sky.waterfall,0);assert.equal(sky.breeze,0);
  assert.ok(sky.openingBird>0);
  assert.equal(soundMix(1.4,width,height,.5).openingBird,0,'Opening calls must fade before the garden');
  const garden=soundMix(4.02,width,height,.5);
  assert.ok(garden.fire>0&&garden.birds>0,'Campfire and morning birds must share the visible garden');
  assert.ok(garden.waterfall>0);
  const calm=soundMix(3.15,width,height,0),gust=soundMix(3.15,width,height,1);
  assert.ok(gust.breeze>calm.breeze,'Breeze volume must follow the passing wind');
  const reading=soundMix(READ_START,width,height,1);
  for(const key of ['birds','openingBird','waterfall','breeze','fire','bell'])assert.equal(reading[key],0,'Reading must fade '+key+' away');
  assert.ok(reading.music>0&&reading.music<sky.music);
  assert.ok(reading.frequency<sky.frequency,'Reading keeps the melody and warms its tone');
  for(let p=0;p<READ_START+1;p+=.01){
    const current=soundMix(p,width,height,.5),next=soundMix(p+.01,width,height,.5);
    for(const key of ['music','openingBird','waterfall','birds','breeze','fire','bell']){
      assert.ok(current[key]>=0&&current[key]<=1);
      assert.ok(Math.abs(next[key]-current[key])<.06,'Scroll targets should change continuously: '+key);
    }
  }
}
console.log('Audio placement, reading fades, wind response and continuous scroll targets pass at six portrait/landscape sizes.');
