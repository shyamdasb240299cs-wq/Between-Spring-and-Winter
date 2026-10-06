const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../Website'),ts=require(path.join(root,'node_modules/typescript')),THREE=require(path.join(root,'node_modules/three'));
const timers=[];
function load(file){
 const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={};
 vm.runInNewContext(output,{exports,require:name=>name==='three'?THREE:load(path.resolve(path.dirname(file),name+'.ts')),setTimeout:(fn,ms)=>{const timer={fn,ms};timers.push(timer);return timer;},clearTimeout:timer=>{const i=timers.indexOf(timer);if(i>=0)timers.splice(i,1);}});
 return exports;
}
const {PrintedPages}=load(path.join(root,'app/printed-pages.ts'));
const requests=[];let changed=0;
const loader={load(src,ok,progress,fail){requests.push({src,ok,fail});return new THREE.Texture();}};
const prints=new PrintedPages(loader,4,()=>changed++);
const front=prints.material('/p1.webp',false,THREE.FrontSide),duplicate=prints.material('/p1.webp',false,THREE.FrontSide),back=prints.material('/p2.webp',true,THREE.BackSide);
const placeholder=front.map;let placeholderDisposed=0;placeholder.addEventListener('dispose',()=>placeholderDisposed++);
prints.prioritize([{src:'/p1.webp',reverse:false,priority:0},{src:'/p2.webp',reverse:true,priority:0},{src:'/p3.webp',reverse:false,priority:1}]);
assert.equal(requests.length,2,'only two concurrent downloads');
const full=new THREE.Texture({width:1024,height:1536});full.needsUpdate=true;
requests[0].ok(full);
assert.notEqual(front.map.id,placeholder.id,'full image receives fresh GPU storage');
assert.equal(front.map,full);assert.equal(duplicate.map,full);assert.equal(placeholder.image.width,1);
assert.equal(placeholderDisposed,1);assert.equal(front.map.image.width,1024);assert.equal(front.map.colorSpace,THREE.SRGBColorSpace);
assert.equal(requests.length,3,'queue resumes after delayed completion');
const reversed=new THREE.Texture({width:1024,height:1536});requests[1].ok(reversed);
assert.equal(back.map.repeat.x,-1);assert.equal(back.map.offset.x,1);assert.equal(back.side,THREE.BackSide);
assert.equal(prints.loadedCount,2);
let fullDisposed=0;full.addEventListener('dispose',()=>fullDisposed++);
prints.prioritize([{src:'/p3.webp',reverse:false,priority:0}]);
assert.equal(fullDisposed,1,'distant spreads release GPU memory');assert.equal(front.map.image.width,1);
requests[2].fail();assert.equal(timers[0].ms,450);timers.shift().fn();
assert.equal(requests.length,4);requests[3].fail();assert.equal(timers[0].ms,900);timers.shift().fn();
assert.equal(requests.length,5);requests[4].fail();assert.equal(prints.failedCount,1);assert.equal(timers.length,0,'retry stops after three attempts');
prints.dispose();assert.ok(changed>=5);
const lateRequests=[],late=new PrintedPages({load(src,ok,progress,fail){lateRequests.push({ok});return new THREE.Texture();}},2,()=>{});
late.material('/late.webp',false,THREE.FrontSide);late.prioritize([{src:'/late.webp',reverse:false,priority:0}]);late.dispose();
const lateMap=new THREE.Texture({width:512,height:768});let lateDisposed=false;lateMap.addEventListener('dispose',()=>lateDisposed=true);lateRequests[0].ok(lateMap);assert.equal(lateDisposed,true);
const scene=load(path.join(root,'app/scenery-layout.ts'));
const r={eating:0,lifting:0};assert.equal(scene.rabbitFrame(r,9000,false,true,false),0);assert.equal(scene.rabbitFrame(r,9000,true,false,false),0);
assert.ok(scene.rabbitFrame(r,3599,true,true,false)<8);assert.equal(scene.rabbitFrame(r,1,true,true,false),8);assert.equal(scene.rabbitFrame(r,450,true,true,false),11);assert.equal(scene.rabbitFrame(r,10000,true,true,false),11);
const panda={eating:0,reaction:0,escape:0,phase:'eating'};
assert.equal(scene.pandaPose(panda,9000,false,true,true,false).phase,'eating');assert.equal(scene.pandaPose(panda,9000,true,false,true,false).phase,'eating');
assert.equal(scene.pandaPose(panda,scene.PANDA_EATING_MS-1,true,true,true,false).phase,'eating');assert.equal(scene.pandaPose(panda,1,true,true,true,false).phase,'standing');
const reactions=new Set();for(let t=0;t<scene.PANDA_STANDING_MS;t+=20)reactions.add(scene.pandaPose(panda,20,true,true,true,false).frame);
assert.ok([...Array(8)].every((_,i)=>reactions.has(8+i)),'all eight noticing, rising and turning poses are seen');
assert.equal(panda.phase,'running');
const seen=new Set();let previous=0;for(let t=0;t<scene.PANDA_ESCAPE_MS;t+=16){const pose=scene.pandaPose(panda,16,true,true,true,false);seen.add(pose.frame);assert.ok(pose.progress>=previous);assert.ok(pose.progress-previous<.006,'departure has no large position steps');previous=pose.progress;}assert.equal(seen.size,8);
assert.equal(panda.phase,'gone');
assert.equal(scene.pandaTravel(0),0);assert.equal(scene.pandaTravel(scene.PANDA_LAUNCH_MS),scene.PANDA_LAUNCH_MS/2);
assert.ok(Math.abs(scene.pandaTravel(scene.PANDA_LAUNCH_MS+.001)-scene.pandaTravel(scene.PANDA_LAUNCH_MS-.001)-.002)<1e-8,'launch velocity joins the steady run continuously');
const held={eating:0,reaction:0,escape:0,phase:'eating'};scene.pandaPose(held,10000,true,true,true,true);assert.equal(held.eating,0);
for(const [w,h] of [[1006,572],[844,390],[1440,900],[1920,1080]]){
 const l=scene.landscapeLayout(w,h),clock={eating:0,reaction:0,escape:0,phase:'eating'};let started=false;
 // Slow approach and a pause beside the bank show the complete gentler encounter.
 for(let elapsed=0;elapsed<=10000;elapsed+=16){const p=3.15+(4.05-3.15)*Math.min(1,elapsed/2200),c=l.camera(p),fy=c+(c-l.letterCamera)*.035;
 const visible=clock.phase!=='eating'||scene.visibleFraction(l.panda.left,l.panda.top-fy,l.panda.width,l.panda.height,w,h)>=.25;
 if(scene.pandaPose(clock,16,visible,true,p>=3.72,false).phase==='running')started=true;
 }
 assert.ok(started,`panda responds during a slow approach ${w}x${h}`);assert.equal(clock.phase,'gone');
 const c=l.camera(4.05),fy=c+(c-l.letterCamera)*.035;
 assert.ok(scene.visibleFraction(l.panda.left,l.panda.top-fy,l.panda.width,l.panda.height,w,h)>.999);
 assert.ok(scene.visibleFraction(l.rabbit.left,l.rabbit.top-fy,l.rabbit.width,l.rabbit.height,w,h)>.999);
 assert.ok(l.panda.width/l.rabbit.width>3.5,'panda is clearly larger than rabbit');
 assert.ok(l.panda.left+l.escapeDistance>w,'panda exits past the right viewport edge');
 const rabbitFoot=l.rabbit.top+l.rabbit.height*220/256,pandaFoot=l.panda.top+l.panda.height*220/256;
 assert.ok(Math.abs((rabbitFoot-l.foreground.top)/l.foreground.height-552/1254)<1e-9,'rabbit stays on source veranda footline');
 assert.ok(Math.abs((pandaFoot-l.foreground.top)/l.foreground.height-826/1254)<1e-9,'panda stays on source dry-bank footline');
 assert.ok(l.foreground.width>=w);assert.ok(l.foreground.top+l.foreground.height-fy>=h);
}
console.log('PASS: delayed page textures, bounded loading/retries and GPU eviction, rabbit sequence, 16 encounter poses, continuous slow departure, veranda/bank placement and size ratio at four sizes.');

const routes=load(path.join(root,'app/water-routes.ts')).waterRoutes;
const traced=JSON.parse(fs.readFileSync(path.join(__dirname,'../waterfall-redesign/water-alignment-paths.json'),'utf8'));
for(const plane of ['background','foreground']){
 assert.equal(routes[plane].length,Object.keys(traced[plane].paths).length);
 const [sw,sh]=traced[plane].size;
 for(const route of routes[plane]){
  const localPoints=[...route.clip.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(m=>[Number(m[1])/100,Number(m[2])/100]);
  localPoints.forEach(([u,v],i)=>{const [sx,sy]=traced[plane].paths[route.id][i];assert.ok(Math.abs((route.left+u*route.width)*sw-sx)<.001);assert.ok(Math.abs((route.top+v*route.height)*sh-sy)<.001);});
 }
}
console.log('PASS: all 21 water curtains reconstruct their exact source-art coordinates to within .001 source pixels.');

const {settleBookYaw,CLOSED_BOOK_CENTER}=load(path.join(root,'app/book-motion.ts'));
assert.equal(CLOSED_BOOK_CENTER.x,-2.86);assert.equal(CLOSED_BOOK_CENTER.z,-.02135);
let yaw=.025;const target=Math.PI-.1;
for(let i=0;i<150;i++){const next=settleBookYaw(yaw,target,1/60,false);assert.ok(Math.abs(next-yaw)<=3.8/60+1e-9);assert.ok(next<=target);yaw=next;}
assert.equal(yaw,target,'settled rotation reaches exact front-cover target');
assert.equal(settleBookYaw(0,target,.016,true),target,'reduced motion has no timed rotation');
console.log('PASS: exact closed center, bounded angular speed, settled front cover and reduced motion.');
