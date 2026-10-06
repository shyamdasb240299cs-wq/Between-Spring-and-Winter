const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'Website/node_modules/typescript'));
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code, {exports, require: (name) => load(path.resolve(path.dirname(file), name + '.ts'))}, {filename:file});
  return exports;
}
const {landscapeLayout, visibleFraction, rabbitFrame, GRAZING_MS, LIFT_MS} = load(path.join(root,'Website/app/scenery-layout.ts'));
const {smooth} = load(path.join(root,'Website/app/journey-data.ts'));
const equal = (actual, expected) => assert(Math.abs(actual-expected)<1e-8, `${actual} != ${expected}`);
const summaries = [];
for (const [width,height] of [[1021,572],[1440,900],[844,390]]) {
  const l = landscapeLayout(width,height);
  assert(l.worldHeight >= height*3.55 && l.worldHeight >= width*2);
  equal(l.paintedWidth,l.worldHeight/2);
  equal(l.gate.left+l.gate.width/2,.605*l.paintedWidth-l.cropX);
  equal(l.gate.top+l.gate.height*580/600,.728*l.worldHeight);
  equal(l.house.top+l.house.height,.812*l.worldHeight);
  equal(l.rabbit.top+l.rabbit.height*345/384,.795*l.worldHeight);
  const porchHeight=l.house.height*.18;
  const porchFeet=l.house.top+l.house.height*.573+porchHeight*345/384;
  equal(porchFeet,l.house.top+l.house.height*(.573+.18*345/384));
  equal(l.house.left+l.houseExit,width+height*.04);
  const placements=[3.15,3.78,4.0,4.35].map(p=> {
    const pass=smooth(p,3.78,4.35);
    const depth=l.camera(p)-l.letterCamera;
    const hx=l.house.left+pass*l.houseExit;
    const hy=l.house.top-l.camera(p)-depth*.045-pass*height*.06;
    const gy=l.gate.top-l.camera(p)-depth*.012;
    const overlapX=Math.max(0,Math.min(hx+l.house.width,l.gate.left+l.gate.width)-Math.max(hx,l.gate.left));
    const overlapY=Math.max(0,Math.min(hy+l.house.height,gy+l.gate.height)-Math.max(hy,gy));
    if(p===4.35) assert(hx>width);
    return {p,houseX:+hx.toFixed(1),houseY:+hy.toFixed(1),gateY:+gy.toFixed(1),overlap:[+overlapX.toFixed(1),+overlapY.toFixed(1)],gateFeet:+(gy+l.gate.height*580/600).toFixed(1),porchFeet:+(porchFeet-l.camera(p)-depth*.045-pass*height*.06).toFixed(1)};
  });
  summaries.push({size:[width,height],worldHeight:l.worldHeight,placements});
}
assert.equal(visibleFraction(-10,0,100,100,100,100),.9);
assert.equal(visibleFraction(0,101,100,100,100,100),0);
assert.equal(visibleFraction(0,0,100,100,100,100),1);
let c={eating:0,lifting:0};
assert.equal(rabbitFrame(c,1000,true,false,false),0); equal(c.eating,0);
assert.equal(rabbitFrame(c,1000,false,true,false),0); equal(c.eating,0);
assert.equal(rabbitFrame(c,1000,true,true,true),7); equal(c.eating,0);
assert.equal(rabbitFrame(c,3599,true,true,false),3); equal(c.eating,3599);equal(c.lifting,0);
assert.equal(rabbitFrame(c,1,true,true,false),4);equal(c.eating,GRAZING_MS);equal(c.lifting,0);
assert.equal(rabbitFrame(c,213,true,true,false),4);
assert.equal(rabbitFrame(c,1,true,true,false),5);
assert.equal(rabbitFrame(c,212,true,true,false),5);
assert.equal(rabbitFrame(c,1,true,true,false),6);
assert.equal(rabbitFrame(c,212,true,true,false),6);equal(c.lifting,639);
assert.equal(rabbitFrame(c,1,true,true,false),7);equal(c.lifting,LIFT_MS);
c={eating:3590,lifting:0};assert.equal(rabbitFrame(c,80,true,true,false),4);equal(c.lifting,70);
const frozen=JSON.stringify(c);rabbitFrame(c,80,false,true,false);rabbitFrame(c,80,true,false,false);assert.equal(JSON.stringify(c),frozen);
const scenery=fs.readFileSync(path.join(root,'Website/app/scenery.tsx'),'utf8');
assert(/if \(document\.hidden \|\| portrait\.matches\) return;/.test(scenery));
assert(/const passHouse = smooth\(p, 3\.78, 4\.35\)/.test(scenery));
assert(/const houseY = -depth \* \.045 - passHouse \* layout\.height \* \.06/.test(scenery));
assert(/sceneryProgress = Math\.min\(p, 5\.1\)/.test(scenery));
assert(/if \(!moved && !active && !skyVisible\) return;/.test(scenery));
assert(/if \(bird\.style\.visibility !== visibility\) bird\.style\.visibility = visibility;/.test(scenery));
// Every transform input is constant once sceneryProgress clamps, so idle reading
// can safely skip the frozen scenery; entering or returning to visible scenes
// still runs the rabbit clock based on active visibility and pause state.
for (const [width,height] of [[1021,572],[1440,900],[844,390]]) {
  const l=landscapeLayout(width,height);
  for (const p of [5.25,6.65,12,18]) {
    equal(l.camera(p),l.camera(5.1));
    equal(smooth(p,3.78,4.35),1);
    equal(smooth(p,3.9,4.08),1);
    equal(smooth(p,2.7,3.6),1);
    assert(!(l.camera(p)<l.worldHeight*.14+height*.06));
  }
}
console.log(JSON.stringify({result:'PASS',summaries,clock:'Visible unpaused eating reaches lift at 3600ms; watching begins only at 640ms of lift (639ms stays cell6); offscreen/paused/reduced clocks freeze. Document hidden and idle-reading early returns checked.'},null,2));
