import assert from 'node:assert/strict';
import {advanceWind,createWindClock,BELL_WIND_DELAY} from '../../Website/app/wind-motion.ts';

const still=createWindClock();
advanceWind(still,1);
assert.equal(still.angle,0,'A calm chime must start at rest');
assert.equal(still.paper,0,'The paper must stay still before the first breeze');
const arrival=createWindClock();
advanceWind(arrival,1.9);
assert.ok(arrival.air<0,'The breeze should leave the blossoms toward the left');
assert.ok(arrival.branch<0,'The source branch must respond before the bell');
assert.equal(arrival.wind,0,'The chime should not receive force before the breeze arrives');
assert.equal(arrival.angle,0);
advanceWind(arrival,BELL_WIND_DELAY);
assert.ok(arrival.wind<0 && arrival.angle<0,'Leftward wind must displace the bell leftward after arrival');

const settling=createWindClock();
settling.start=1e9;settling.angle=-.16;settling.paper=-.6;settling.branch=-.04;
for(let i=0;i<1200;i++)advanceWind(settling,1/120);
assert.ok(Math.abs(settling.angle)<.00001,'Bell must settle under gravity and damping');
assert.ok(Math.abs(settling.paper)<.00001,'Paper must settle when wind stops');
assert.ok(Math.abs(settling.branch)<.00001,'The blossom branch must return to rest');

const results=[];
for(const rate of [24,60,120]){
  const clock=createWindClock();let peak=0,paperPeak=0;const starts=new Set();
  for(let i=0;i<rate*180;i++){
    advanceWind(clock,1/rate);starts.add(clock.start);
    peak=Math.max(peak,Math.abs(clock.angle));paperPeak=Math.max(paperPeak,Math.abs(clock.paper));
    assert.ok(Number.isFinite(clock.angle)&&Number.isFinite(clock.paper));
    assert.ok(clock.air<=0&&clock.wind<=0,'Gusts must always travel left from the marked blossoms');
    assert.ok(clock.angle<.0003&&clock.branch<.0003,'Return to rest must avoid a conspicuous wrong-way swing');
  }
  assert.ok(peak>.04&&peak<.25,'Gentle gusts must produce bounded visible swings');
  assert.ok(paperPeak>peak&&paperPeak<1,'Light paper should respond more than the glass bell');
  assert.ok(starts.size>10,'Long visits must receive varied gusts');
  results.push({rate,peakRadians:peak,paperPeak,gusts:starts.size});
}
assert.ok(Math.max(...results.map(r=>r.peakRadians))-Math.min(...results.map(r=>r.peakRadians))<.002,'Swing amplitude should remain consistent across frame rates');
console.log('Wind physics checks passed',results);
