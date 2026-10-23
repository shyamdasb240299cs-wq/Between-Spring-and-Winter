import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import * as THREE from 'three';
const root=path.resolve(import.meta.dirname,'..'),cache=new Map();
async function sourceModule(filename){
  if(cache.has(filename))return cache.get(filename);
  let source=ts.transpileModule(await fs.readFile(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  for(const match of [...source.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const resolved=match[2].startsWith('.')?await sourceModule(path.resolve(path.dirname(filename),match[2]+'.ts')):import.meta.resolve(match[2]);source=source.replace(match[0],`from ${JSON.stringify(resolved)}`);}
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(filename,url);return url;
}
const {createSummerWildlife,SUMMER_FISH_SPECIES}=await import(await sourceModule(path.join(root,'app/shrine-void/summer-wildlife.ts')));
const {summerGroundHeight,summerWorldColliders,summerColliderIntersects}=await import(await sourceModule(path.join(root,'app/shrine-void/summer-layout.ts')));
const {SUMMER_ANEMONE_HOMES,reefPlantable}=await import(await sourceModule(path.join(root,'app/shrine-void/summer-habitat.ts')));
const camera=new THREE.PerspectiveCamera();camera.position.set(0,10,0);
const reef=createSummerWildlife({compact:false,camera,boatPose:()=>({x:106,y:0,z:-24,yaw:0})});
assert.equal(reef.stats.species,12);assert.ok(reef.stats.fish>230);assert.equal(reef.stats.drawCalls,12);
assert.ok(SUMMER_ANEMONE_HOMES.length>=6);
for(const home of SUMMER_ANEMONE_HOMES)assert.ok(reefPlantable(home.x,home.z,.9),'Host anemone leaves routes and structures clear');
const start=reef.snapshot();let maxResidentRange=0;
for(let step=0;step<1800;step++){
  reef.update(step/30,1/30);
  if(step%30!==0)continue;
  for(const fish of reef.snapshot()){
    const [x,y,z]=fish.position,r=SUMMER_FISH_SPECIES[fish.kind].size*.2;
    assert.ok(fish.position.every(Number.isFinite));assert.ok(y<-.7&&y>summerGroundHeight(x,z)+.17,'Fish stay below the surface and above the seabed');
    assert.ok(!summerWorldColliders.some(c=>summerColliderIntersects(c,x,z,y-r,y+r,r)),`Species ${fish.kind} stays outside solid reef/wreck geometry`);
    if(fish.role==='resident'){const distance=Math.hypot(x-fish.home[0],z-fish.home[2]);maxResidentRange=Math.max(maxResidentRange,distance);assert.ok(distance<1.6,'Clownfish stay with their visible host anemones');}
  }
}
const end=reef.snapshot();for(let kind=0;kind<12;kind++)assert.ok(end.some((f,i)=>f.kind===kind&&Math.hypot(...f.position.map((x,j)=>x-start[i].position[j]))>.1),`Species ${kind} moves`);
assert.ok(new Set(end.map(f=>Math.floor(f.position[0]/10))).size>=7,'Life is distributed through the reef, not a single mixed cluster');
const normal=createSummerWildlife({compact:true,camera,boatPose:()=>({x:106,y:0,z:-24,yaw:0})});
const reduced=createSummerWildlife({compact:true,camera,boatPose:()=>({x:106,y:0,z:-24,yaw:0})});
const before=normal.snapshot();for(let i=0;i<30;i++){normal.update(i/30,1/30);reduced.update(i/30,1/30,true);}
const travel=items=>items.reduce((sum,f,i)=>sum+Math.hypot(...f.position.map((x,j)=>x-before[i].position[j])),0);
assert.ok(travel(reduced.snapshot())<travel(normal.snapshot())*.6,'Reduced motion slows fish travel and animation continuously');
for(const world of [reef,normal,reduced])world.dispose();
console.log(`Summer ecosystem: 12 species, 60 simulated seconds, solid/bed/surface avoidance, resident anemone homes, distributed habitat, reduced motion and disposal passed. Resident range ${maxResidentRange.toFixed(2)}m.`);
