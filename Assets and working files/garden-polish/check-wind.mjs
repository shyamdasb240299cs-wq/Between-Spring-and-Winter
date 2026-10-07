import assert from 'node:assert/strict';
import {advanceWind,createWindClock} from '../../Website/app/wind-motion.ts';

const still=createWindClock();
advanceWind(still,1);
assert.equal(still.angle,0,'A calm chime must start at rest');
assert.equal(still.paper,0,'The paper must stay still before the first breeze');

const settling=createWindClock();
settling.start=1e9;settling.angle=.16;settling.paper=.6;
for(let i=0;i<1200;i++)advanceWind(settling,1/120);
assert.ok(Math.abs(settling.angle)<.00001,'Bell must settle under gravity and damping');
assert.ok(Math.abs(settling.paper)<.00001,'Paper must settle when wind stops');

const results=[];
for(const rate of [24,60,120]){
  const clock=createWindClock();let peak=0,paperPeak=0;const starts=new Set();
  for(let i=0;i<rate*180;i++){
    advanceWind(clock,1/rate);starts.add(clock.start);
    peak=Math.max(peak,Math.abs(clock.angle));paperPeak=Math.max(paperPeak,Math.abs(clock.paper));
    assert.ok(Number.isFinite(clock.angle)&&Number.isFinite(clock.paper));
  }
  assert.ok(peak>.04&&peak<.25,'Gentle gusts must produce bounded visible swings');
  assert.ok(paperPeak>peak&&paperPeak<1,'Light paper should respond more than the glass bell');
  assert.ok(starts.size>10,'Long visits must receive varied gusts');
  results.push({rate,peakRadians:peak,paperPeak,gusts:starts.size});
}
assert.ok(Math.max(...results.map(r=>r.peakRadians))-Math.min(...results.map(r=>r.peakRadians))<.002,'Swing amplitude should remain consistent across frame rates');
console.log('Wind physics checks passed',results);
