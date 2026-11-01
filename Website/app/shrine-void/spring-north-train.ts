import * as THREE from 'three';
import {extendOriginalCoach,COACH_BAYS,COACH_EXTENSION,COACH_NORTH,COACH_SOUTH,COACH_CENTRE} from './spring-coach-layout';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createSpringTrainLighting,cleanSpringTrainUpholstery} from './spring-train-lighting';

export const SPRING_NORTH_RAIL={x:12,startZ:-38,endZ:-119,trainZ:-76,weatherStartZ:-32,nightZ:-67} as const;
export const SPRING_TRAIN_MODEL='/seasons/kit/spring-train/indian-coach.glb';
/** Nine intact bays, numbered from the opposite (north) washroom end. */
export const SPRING_SL_BAYS=COACH_BAYS;
const clamp=THREE.MathUtils.clamp;
type Door={id:string;pivot:THREE.Group;bounds:THREE.Box3;closed:THREE.Box3;angle:number;open:number;wanted:number;kind:'entry'|'toilet'|'vestibule';side:number;};
type Point={x:number;y:number;z:number};

/** One real, furnished coach. North is -Z; the earth-to-rail grade is shared by rendering and navigation. */
export function createSpringNorthTrain(model:THREE.Object3D,height:(x:number,z:number)=>number,compact=false){
  const rail=SPRING_NORTH_RAIL,group=new THREE.Group();group.name='North rail · solitary Indian sleeper coach';
  const trainBase=height(rail.x,rail.trainZ)+.20,floorY=trainBase+1.35;
  const ownedGeometries=new Set<THREE.BufferGeometry>(),ownedMaterials=new Set<THREE.Material>(),ownedTextures=new Set<THREE.Texture>();
  const mat=(p:THREE.MeshStandardMaterialParameters)=>{const m=new THREE.MeshStandardMaterial(p);ownedMaterials.add(m);return m;};
  const steel=mat({color:0x555e60,metalness:.83,roughness:.35}),rust=mat({color:0x5b3728,metalness:.52,roughness:.82}),dark=mat({color:0x252b2d,roughness:.74,metalness:.6}),timber=mat({color:0x5b4a38,roughness:.94});
  const gravel=mat({color:0x6d6d64,roughness:1}),earth=mat({color:0x3e4536,roughness:1}),lampMat=mat({color:0xfff0c8,emissive:0xffd28a,emissiveIntensity:1.2,roughness:.32}),redLamp=mat({color:0x6c1713,emissive:0xff1c0a,emissiveIntensity:.9}),grabPaint=mat({color:0xc4ad63,metalness:.55,roughness:.5});
  function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0){ownedGeometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function box(parent:THREE.Object3D,w:number,h:number,d:number,m:THREE.Material,x=0,y=0,z=0){return mesh(parent,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
  function rod(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.Material){const o=mesh(parent,new THREE.CylinderGeometry(r,r,a.distanceTo(b),8),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}
  // The approach rises gradually, then becomes a level maintenance siding beneath the coach.
  function railHeight(z:number){const natural=height(rail.x,z)+.07,t=clamp((-z-38)/24,0,1),level=THREE.MathUtils.lerp(natural,trainBase,t*t*(3-2*t)),north=clamp((COACH_NORTH-z)/7.2,0,1);return THREE.MathUtils.lerp(level,Math.max(level,natural),north*north*(3-2*north));}
  function apronHeight(x:number,z:number){const edge=Math.max(Math.abs(x-rail.x)/8,Math.abs(z-COACH_CENTRE)/28),blend=clamp((edge-.66)/.34,0,1);return THREE.MathUtils.lerp(trainBase-.04,height(x,z)+.025,blend*blend*(3-2*blend));}
  function ballastHeight(x:number,z:number){const edge=clamp((Math.abs(x-rail.x)-2)/4,0,1),verge=Math.abs(z-COACH_CENTRE)<28?apronHeight(x,z):height(x,z)+.025;return THREE.MathUtils.lerp(railHeight(z)-.01,verge,edge*edge*(3-2*edge));}
  const bedGeometry=new THREE.BufferGeometry(),bedPositions:number[]=[],bedIndices:number[]=[];
  const bedXs=[-6,-4,-2,2,4,6];
  for(let i=0;i<=162;i++){const z=rail.startZ-i*.5;for(const x of bedXs)bedPositions.push(rail.x+x,ballastHeight(rail.x+x,z),z);if(i<162)for(let q=0;q<bedXs.length-1;q++){const a=i*bedXs.length+q;bedIndices.push(a,a+bedXs.length,a+1,a+1,a+bedXs.length,a+bedXs.length+1);}}
  bedGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bedPositions,3));bedGeometry.setIndex(bedIndices);bedGeometry.computeVertexNormals();mesh(group,bedGeometry,gravel).name='Graded ballast embankment';
  for(let z=rail.startZ;z>=rail.endZ;z-=.64){const y=railHeight(z);box(group,2.65,.13,.24,timber,rail.x,y+.055,z);for(const s of [-1,1]){box(group,.22,.055,.22,dark,rail.x+s*.837,y+.14,z);box(group,.038,.07,.045,rust,rail.x+s*.965,y+.18,z);}}
  // Indian broad gauge: 1,676 mm between running edges.
  for(const s of [-1,1])for(let z=rail.startZ-.5;z>rail.endZ;z-=1){const a=new THREE.Vector3(rail.x+s*.867,railHeight(z)+.235,z),b=new THREE.Vector3(rail.x+s*.867,railHeight(z-1)+.235,z-1);const web=box(group,.060,.145,1.005,rust);web.position.copy(a).add(b).multiplyScalar(.5);web.rotation.x=Math.atan2(b.y-a.y,1);box(group,.105,.035,1.01,steel,web.position.x,web.position.y+.075,web.position.z);}
  // A broad, feathered patch conceals the original uneven terrain beneath the level siding.
  const apron=new THREE.BufferGeometry(),ap:number[]=[],ai:number[]=[];
  for(let zi=0;zi<=48;zi++)for(let xi=0;xi<=24;xi++){const x=rail.x-8+xi*2/3,z=COACH_CENTRE-28+zi*56/48;ap.push(x,apronHeight(x,z),z);if(xi<24&&zi<48){const a=zi*25+xi;ai.push(a,a+25,a+1,a+1,a+25,a+26);}}
  apron.setAttribute('position',new THREE.Float32BufferAttribute(ap,3));apron.setIndex(ai);apron.computeVertexNormals();mesh(group,apron,earth).name='Level siding with sloped natural verge';
  const coach=new THREE.Group();coach.name='Imported ICF sleeper coach';coach.position.set(rail.x,trainBase+2.413,rail.trainZ);coach.scale.set(.79,.85,1);group.add(coach);
  const imported=model.clone(true);coach.add(imported);imported.updateMatrixWorld(true);
  // Clone the source materials and geometry: disposal/repaint never mutates the asset cache.
  const colorMap=new Map<THREE.Material,THREE.Material>();
  imported.traverse(o=>{if(!(o instanceof THREE.Mesh))return;o.geometry=o.geometry.clone();ownedGeometries.add(o.geometry);o.castShadow=o.receiveShadow=true;
    const convert=(source:THREE.Material)=>{let m=colorMap.get(source);if(m)return m;m=source.clone();ownedMaterials.add(m);colorMap.set(source,m);if(m instanceof THREE.MeshStandardMaterial){m.envMapIntensity=.45;m.roughness=Math.max(.42,m.roughness);m.metalness=Math.min(.34,m.metalness);if(/Seats/i.test(source.name)){m.color.set(0xabc6ed);m.metalness=.02;m.roughness=.9;cleanSpringTrainUpholstery(m);}if(/Outside/i.test(source.name)){m.color.set(0xffffff);m.vertexColors=true;m.metalness=.38;m.roughness=.48;}if(/Gates|Outergate/i.test(source.name))m.emissiveIntensity=.025;}return m;};
    o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
    const sourceName=Array.isArray(o.material)?o.material[0].name:o.material.name;
    if(/Outside/.test(sourceName)){const pos=o.geometry.getAttribute('position'),colors=new Float32Array(pos.count*3),p=new THREE.Vector3(),inv=coach.matrixWorld.clone().invert(),transform=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),color=new THREE.Color();for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(transform);color.set(p.y>1.55?0x929a98:p.y< -1.22?0x333d41:p.y>-.06&&p.y<1.2?0x7aa6c2:0x254c78);const patina=.94+.06*Math.sin(p.z*2.1+p.y*31)*Math.sin(p.x*83);color.multiplyScalar(patina);color.toArray(colors,i*3);}o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));}
  });
  group.updateMatrixWorld(true);
  extendOriginalCoach(imported,ownedGeometries);
  group.updateMatrixWorld(true);
  const doorCandidates:THREE.Object3D[]=[];
  imported.traverse(o=>{if(o instanceof THREE.Mesh||/_(?:Outergate|Gates)_0$/.test(o.name))return;if(/^Compartment_Door(?:_|$)/.test(o.name)||/^Coachslidding_door/.test(o.name)||/^Door2?$/.test(o.name)||/^Bathroom_Door$/.test(o.name)||/^Bathroom_Door__1_$/.test(o.name))doorCandidates.push(o);});
  const doors:Door[]=[];
  for(const node of doorCandidates){const bounds=new THREE.Box3().setFromObject(node),size=bounds.getSize(new THREE.Vector3());if(size.y<1.2)continue;const center=bounds.getCenter(new THREE.Vector3()),kind:Door['kind']=/^Compartment/.test(node.name)?'entry':/^Coachslidding/.test(node.name)?'vestibule':'toilet',side=center.x>rail.x?1:-1,pivot=new THREE.Group();pivot.name='Working '+kind+' door '+doors.length;group.add(pivot);pivot.position.set(kind==='vestibule'?bounds.min.x:center.x,bounds.min.y,kind==='entry'?bounds.min.z:bounds.max.z);pivot.updateMatrixWorld(true);pivot.attach(node);const id='train-door-'+doors.length;doors.push({id,pivot,bounds,closed:bounds.clone(),angle:0,open:0,wanted:0,kind,side});}
  // The supplied coach shell omits wheelsets. Raise the entire suspension from
  // the running surface, so wheel treads touch the rail rather than sink into it.
  const railTop=.235+.075+.035/2,wheelRadius=.455;
  for(const z of [-7.7-COACH_EXTENSION,7.7]){const bogie=new THREE.Group();bogie.name='Two-axle suspension bogie';bogie.position.set(rail.x,railHeight(rail.trainZ+z)+railTop+wheelRadius-.49,rail.trainZ+z);group.add(bogie);box(bogie,2.15,.25,2.85,dark,0,.68,0);for(const dz of [-.92,.92]){const axle=mesh(bogie,new THREE.CylinderGeometry(.09,.09,2.1,10),dark,0,.49,dz);axle.rotation.z=Math.PI/2;for(const s of [-1,1]){const wheel=mesh(bogie,new THREE.CylinderGeometry(wheelRadius,wheelRadius,.15,24),steel,s*.88,.49,dz);wheel.rotation.z=Math.PI/2;const hub=mesh(bogie,new THREE.CylinderGeometry(.13,.13,.22,12),dark,s*1.02,.49,dz);hub.rotation.z=Math.PI/2;box(bogie,.19,.18,.41,dark,s*1.08,.52,dz);for(let n=0;n<5;n++){const spring=mesh(bogie,new THREE.TorusGeometry(.1,.023,5,12),rust,s*1.03,.67+n*.047,dz+.3);spring.rotation.x=Math.PI/2;}}}for(const s of [-1,1])box(bogie,.15,.24,2.7,dark,s*1.12,.72,0);}
  for(const z of [-11.8-COACH_EXTENSION,11.8]){box(group,.27,.3,.85,dark,rail.x,trainBase+.94,rail.trainZ+z);for(const s of [-1,1]){const buffer=mesh(group,new THREE.CylinderGeometry(.14,.14,.42,12),dark,rail.x+s*.95,trainBase+.98,rail.trainZ+z);buffer.rotation.x=Math.PI/2;}}
  const entryDoors=doors.filter(d=>d.kind==='entry');
  const steps=entryDoors.map(d=>({x:d.closed.getCenter(new THREE.Vector3()).x,z:d.closed.getCenter(new THREE.Vector3()).z,side:d.side}));
  // Steel treads belong to each doorway, with short upright grab handles on the
  // coach itself. No platform, bridge, or boarding ramp spans the siding.
  const stepInner=1.46,stepOuter=2.18,stepRun=stepOuter-stepInner;
  const stairGroup=new THREE.Group();stairGroup.name='Normal coach entrance steps';group.add(stairGroup);
  for(const entry of steps){
    for(let i=0;i<3;i++){
      const out=stepOuter-(i+.5)*stepRun/3,x=rail.x+entry.side*out,y=trainBase+(i+1)*.34;
      box(stairGroup,stepRun/3+.025,.065,1.02,steel,x,y-.0325,entry.z);
      for(const dz of [-.44,.44])box(stairGroup,.055,.26,.055,dark,x,y-.16,entry.z+dz);
      for(const offset of [-.085,0,.085])box(stairGroup,.018,.008,.90,dark,x+offset,y+.004,entry.z);
    }
    for(const dz of [-.54,.54])rod(stairGroup,new THREE.Vector3(entry.x+entry.side*.08,floorY+.22,entry.z+dz),new THREE.Vector3(entry.x+entry.side*.08,floorY+1.67,entry.z+dz),.024,grabPaint);
  }
  const lights:{position:THREE.Vector3;color:THREE.Color;range:number;power:number}[]=[];
  for(const z of COACH_BAYS.filter((_,i)=>!compact||i%2===0).map(b=>b.z-rail.trainZ)){lights.push({position:new THREE.Vector3(rail.x-.22,trainBase+3.50,rail.trainZ+z),color:new THREE.Color(0xffe0ab),range:7,power:15});box(group,.15,.045,1.4,lampMat,rail.x-.22,trainBase+3.74,rail.trainZ+z);}
  for(const z of [-7.86-COACH_EXTENSION,7.86])for(const s of [-1,1]){box(group,.14,.095,.25,lampMat,rail.x+s*1.64,trainBase+3.25,rail.trainZ+z);lights.push({position:new THREE.Vector3(rail.x+s*1.9,trainBase+2.9,rail.trainZ+z),color:new THREE.Color(0xffc886),range:5,power:9});}
  const lighting=createSpringTrainLighting(lights);for(const m of ownedMaterials)if(m instanceof THREE.MeshStandardMaterial&&m!==lampMat&&m!==redLamp)lighting.bind(m);
  for(const s of [-1,1]){const l=mesh(group,new THREE.CylinderGeometry(.085,.085,.04,16),redLamp,rail.x+s*1.15,trainBase+2,rail.trainZ+11.55);l.rotation.x=Math.PI/2;}
  // Labels are authored text only. Preserve the source's detailed interior textures and fittings.
  if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const c=canvas.getContext('2d');if(c){c.clearRect(0,0,1024,128);c.fillStyle='#e4d7a5';c.font='bold 54px Arial';c.textAlign='center';c.fillText('SLEEPER   ·   SOUTHERN RAILWAY',512,85,1000);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;ownedTextures.add(map);const m=mat({map,roughness:.75,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});for(const s of [-1,1]){const label=mesh(group,new THREE.PlaneGeometry(6.5,.46),m,s===1?13.727:10.328,trainBase+1.65,COACH_CENTRE);label.rotation.y=s*Math.PI/2;label.castShadow=false;label.name="Painted Southern Railway lettering";}}}
  // Bake collision from actual furnishings/walls at body height. Clipping avoids roof/upper-berth bounding boxes filling the aisle.
  const cell=.10,gridMinX=rail.x-1.9,gridMinZ=COACH_NORTH,cols=39,rows=Math.ceil((COACH_SOUTH-COACH_NORTH)/.1)+1,occupied=new Uint8Array(cols*rows);
  const doorNodes=new Set<THREE.Object3D>();doors.forEach(d=>d.pivot.traverse(o=>doorNodes.add(o)));
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  function clip(poly:Point[],y:number,above:boolean){const out:Point[]=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],pin=above?p.y>=y:p.y<=y,qin=above?q.y>=y:q.y<=y;if(pin)out.push(p);if(pin!==qin){const u=(y-p.y)/(q.y-p.y);out.push({x:p.x+(q.x-p.x)*u,y,z:p.z+(q.z-p.z)*u});}}return out;}
  function segmentDistance(x:number,z:number,p:Point,q:Point){const dx=q.x-p.x,dz=q.z-p.z,u=clamp(((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-p.x-u*dx,z-p.z-u*dz);}
  function inPolygon(x:number,z:number,p:Point[]){let inside=false,near=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;if(segmentDistance(x,z,a,b)<.19)near=true;}return inside||near;}
  group.updateMatrixWorld(true);imported.traverse(o=>{if(!(o instanceof THREE.Mesh)||doorNodes.has(o))return;const pos=o.geometry.getAttribute('position'),idx=o.geometry.index;for(let i=0;i<(idx?.count??pos.count);i+=3){a.fromBufferAttribute(pos,idx?idx.getX(i):i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(pos,idx?idx.getX(i+1):i+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(pos,idx?idx.getX(i+2):i+2).applyMatrix4(o.matrixWorld);let p=clip(clip([{x:a.x,y:a.y,z:a.z},{x:b.x,y:b.y,z:b.z},{x:c.x,y:c.y,z:c.z}],floorY+.18,true),floorY+1.40,false);if(p.length<2)continue;const minX=Math.min(...p.map(v=>v.x))-.2,maxX=Math.max(...p.map(v=>v.x))+.2,minZ=Math.min(...p.map(v=>v.z))-.2,maxZ=Math.max(...p.map(v=>v.z))+.2;for(let iz=Math.max(0,Math.floor((minZ-gridMinZ)/cell));iz<=Math.min(rows-1,Math.ceil((maxZ-gridMinZ)/cell));iz++)for(let ix=Math.max(0,Math.floor((minX-gridMinX)/cell));ix<=Math.min(cols-1,Math.ceil((maxX-gridMinX)/cell));ix++)if(inPolygon(gridMinX+ix*cell,gridMinZ+iz*cell,p))occupied[iz*cols+ix]=1;}});
  function inside(x:number,z:number){return Math.abs(x-rail.x)<1.48&&z>COACH_NORTH+.25&&z<COACH_SOUTH-.25;}
  function blockedAt(x:number,z:number){if(Math.abs(x-rail.x)>3.5||(z<COACH_NORTH-.4||z>COACH_SOUTH+.4))return false;const ix=Math.round((x-gridMinX)/cell),iz=Math.round((z-gridMinZ)/cell);if(ix>=0&&ix<cols&&iz>=0&&iz<rows&&occupied[iz*cols+ix])return true;for(const d of doors){if(d.kind==='vestibule'&&d.open>.9)continue;if(x>d.bounds.min.x-.17&&x<d.bounds.max.x+.17&&z>d.bounds.min.z-.17&&z<d.bounds.max.z+.17)return true;}return false;}
  function walkingHeight(x:number,z:number){
    if(inside(x,z))return floorY;
    // Smooth the eye's support over the real treads; this also keeps the body
    // radius samples from rejecting two adjacent stair risers as one tall wall.
    for(const entry of steps){const out=(x-rail.x)*entry.side;if(out>=stepInner-.05&&out<=stepOuter+.1&&Math.abs(z-entry.z)<.66)return trainBase+.34+clamp((stepOuter-out)/stepRun,0,1)*1.01;}
    if(z<=rail.startZ+.5&&z>=rail.endZ-.5&&Math.abs(x-rail.x)<6)return ballastHeight(x,z)+.13;
    if(Math.abs(x-rail.x)<8&&Math.abs(z-COACH_CENTRE)<28)return apronHeight(x,z)+.04;
    return null;
  }
  const targetBox=new THREE.Box3(),targetHit=new THREE.Vector3();
  function target(camera:THREE.Camera,ray:THREE.Raycaster){if(Math.abs(camera.position.x-rail.x)>5||(camera.position.z<COACH_NORTH-3||camera.position.z>COACH_SOUTH+3))return null;let best:Door|undefined,distance=Infinity;for(const d of doors){const p=ray.ray.intersectBox(targetBox.copy(d.bounds).expandByScalar(.09),targetHit);if(p){const n=camera.position.distanceTo(p);if(n<2.6&&n<distance){best=d;distance=n;}}}return best?{id:best.id,action:'train-door' as const,label:(best.wanted?'Close ':'Open ')+(best.kind==='entry'?'coach door':best.kind==='toilet'?'washroom door':'vestibule door')}:null;}
  function interact(id:string,observer?:THREE.Vector3){const d=doors.find(d=>d.id===id);if(!d)return false;if(d.wanted&&observer&&d.closed.clone().expandByScalar(.42).containsPoint(observer))return false;d.wanted=d.wanted?0:1;return true;}
  function update(_time:number,dt:number,camera:THREE.Camera,night=1){let changed=false;for(const d of doors){if(d.open===d.wanted)continue;if(!d.wanted&&d.open>.2){const pos=camera.position;if(Math.abs(pos.x-d.closed.getCenter(a).x)<.56&&Math.abs(pos.z-d.closed.getCenter(a).z)<.85)continue;}const previous=d.open;d.open=THREE.MathUtils.damp(d.open,d.wanted,6,Math.min(dt,.08));changed ||= d.open!==previous;if(Math.abs(d.open-d.wanted)<.0001)d.open=d.wanted;if(d.kind==='vestibule')d.pivot.position.x=d.closed.min.x+d.open*.95;else d.pivot.rotation.y=-d.side*d.open*Math.PI*.51;d.pivot.updateWorldMatrix(true,true);d.bounds.setFromObject(d.pivot);}const active=Math.hypot(camera.position.x-rail.x,camera.position.z-COACH_CENTRE)<40;lighting.update(night,active,camera);lampMat.emissiveIntensity=.7+night*.7;redLamp.emissiveIntensity=.5+night*.8;return changed;}
  function constrainPosition(position:THREE.Vector3){if(!blockedAt(position.x,position.z))return;const before=position.clone();for(let r=.1;r<=.8;r+=.1)for(let i=0;i<16;i++){const angle=i*Math.PI/8,x=before.x+Math.cos(angle)*r,z=before.z+Math.sin(angle)*r;if(!blockedAt(x,z)&&walkingHeight(x,z)!==null){position.x=x;position.z=z;return;}}}
  // Hundreds of sleepers, fasteners, rail pieces and entrance steps share ten materials.
  // Identical materials share one static draw, including the imported body and
  // furniture. Every moving door remains independent and retains its UVs.
  group.updateMatrixWorld(true);const parts=new Map<string,{material:THREE.Material;geometries:THREE.BufferGeometry[];sources:THREE.Mesh[]}>();
  group.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material)||o.material.transparent)return;let p:THREE.Object3D|null=o;while(p&&p!==group){if(doors.some(d=>d.pivot===p))return;p=p.parent;}
    const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));
    // Imported metal carries tangents for its normal map; authored rails and
    // fittings do not. Keep complete compatible attribute sets in each batch.
    const signature=Object.keys(g.attributes).sort().map(name=>{const a=g.getAttribute(name);return `${name}:${a.array.constructor.name}:${a.itemSize}:${a.normalized}`;}).join('|'),key=o.material.uuid+'|'+signature;
    let batch=parts.get(key);
    if(!batch){batch={material:o.material,geometries:[],sources:[]};parts.set(key,batch);}
    batch.geometries.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();batch.sources.push(o);});
  for(const {material:m,geometries:gs,sources}of parts.values()){
    const merged=mergeGeometries(gs,false);
    if(merged){mesh(group,merged,m).name='Batched railway '+m.uuid.slice(0,8);for(const o of sources){o.removeFromParent();o.geometry.dispose();ownedGeometries.delete(o.geometry);}}
    gs.forEach(g=>g.dispose());
  }
  // Only door pivots change their local transforms during play. Their children
  // still inherit each animated world transform, without recomposing fixtures.
  group.updateMatrixWorld(true);group.traverse(o=>{
    o.matrixAutoUpdate=false;
    // Fill depth with the coach before shading foliage hidden by its walls.
    // Transparent materials retain their normal separate render ordering.
    if(o instanceof THREE.Mesh&&(Array.isArray(o.material)?o.material:[o.material]).every(m=>!m.transparent))o.renderOrder=-1;
  });
  doors.forEach(d=>{d.pivot.matrixAutoUpdate=true;});
  const stepAllowance=(x:number,z:number)=>steps.some(entry=>Math.abs(z-entry.z)<.66&&(x-rail.x)*entry.side>=stepInner-.35&&(x-rail.x)*entry.side<=stepOuter+.6)?.72:.3;
  return {group,coach,doors,railHeight,walkingHeight,stepAllowance,blockedAt,constrainPosition,target,interact,update,inside,floorY,trainBase,bindLighting:lighting.bind,entrancePosition:new THREE.Vector3(rail.x+stepOuter+.32,trainBase+1.76,rail.trainZ+7.86),aislePosition:new THREE.Vector3(rail.x-.52,floorY+1.63,rail.trainZ+6.1),
    dispose(){ownedGeometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());ownedTextures.forEach(t=>t.dispose());group.removeFromParent();group.clear();},
  };
}
