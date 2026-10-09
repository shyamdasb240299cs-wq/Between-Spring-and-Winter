import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {horizonBird,FLOCK_SIZE,FLOCK_PERIOD,SUN,createOpeningWind,advanceOpeningWind,createOpeningPetals,releaseOpeningPetal,advanceOpeningPetals}=await import('../../Website/app/opening-motion.ts');
const {landscapeLayout}=await import('../../Website/app/scenery-layout.ts');
for(const [width,height] of [[1280,720],[1920,1080],[390,844],[320,568]]){
  const layout=landscapeLayout(width,height);
  for(let i=0;i<FLOCK_SIZE;i++){
    const start=.4+i*.3,duration=14.6+i*.12,first=horizonBird(start+.00001,i,layout),last=horizonBird(start+duration,i,layout);
    assert.ok(first.visible&&first.x<0,'Each bird enters outside the left edge');
    assert.equal(first.opacity,1,'No mid-screen fade-in');
    assert.ok(Math.abs(last.x-(SUN.x*layout.paintedWidth-layout.cropX))<.001);
    assert.ok(Math.abs(last.y-SUN.y*layout.worldHeight)<.001);
    assert.ok(last.size<first.size*.11,'Birds recede to tiny silhouettes');
    let previous=horizonBird(start,i,layout).x;
    for(let t=.02;t<=duration;t+=.02){const bird=horizonBird(start+t,i,layout);assert.ok(bird.x>=previous-.001,`Bird ${i} must move toward the sun at ${width}x${height}, t=${t}`);previous=bird.x;}
    assert.equal(horizonBird(18,i,layout).visible,false,'A flock finishes before its replacement');
  }
  assert.ok(horizonBird(FLOCK_PERIOD+.41,0,layout).visible);
}
const results=[];
for(const fps of [24,60,120]){
  const wind=createOpeningWind();let peak=0;
  for(let i=0;i<fps*9;i++){advanceOpeningWind(wind,1/fps);assert.ok(wind.air>=0&&wind.air<.8,'Opening wind must travel left to right');peak=Math.max(peak,wind.angle);}
  assert.ok(peak>.005&&peak<.03,'The bough should sway gently');assert.ok(Math.abs(wind.angle)<.0005,'The bough settles after a gust');results.push(peak);
}
assert.ok(Math.max(...results)-Math.min(...results)<.00005,'Motion should be independent of display frame rate');
const petals=createOpeningPetals();releaseOpeningPetal(petals[0],0);const x=petals[0].x,y=petals[0].y;
for(let i=0;i<120;i++)advanceOpeningPetals(petals,1/60,.5);
assert.ok(petals[0].x>x&&petals[0].y>y,'Petals drift right while gradually falling');
for(let i=0;i<600;i++)advanceOpeningPetals(petals,1/60,0);
assert.ok(!petals[0].active,'The fixed petal pool retires old particles');assert.equal(petals.length,7);
console.log('Five-bird horizon flights, complete flock cycles, gentle spring settling and bounded petal physics pass.');
