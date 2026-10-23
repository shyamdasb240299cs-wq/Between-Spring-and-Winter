import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {summerGroundHeight, summerColliderIntersects, summerWorldColliders, summerClearance} from './summer-layout';
import type {SummerPose} from './summer-boat';
import type {SummerSurfaces} from './summer-surfaces';
import {SUMMER_REEF_PATCHES,SUMMER_ANEMONE_HOMES,reefPlantable} from './summer-habitat';

const random=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const Y=new THREE.Vector3(0,1,0);
function importedGeometry(templates:Record<string,THREE.Object3D>|undefined,key:string){
  const root=templates?.[key];if(!root)return null;let geometry:THREE.BufferGeometry|null=null;
  root.updateMatrixWorld(true);root.traverse(object=>{if(!geometry&&object instanceof THREE.Mesh)geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);});
  return geometry;
}

/** Original anatomical bodies, including dimensional eyes, gill covers and paired fins.
 * Body axis +X. The posterior vertices deform around the peduncle in the material. */
export function createSummerFishGeometry(kind:number){
  const gs:THREE.BufferGeometry[]=[];
  const add=(g:THREE.BufferGeometry,color:number,part=0)=>{
    const geometry=g.index?g.toNonIndexed():g,colour=new THREE.Color(color),p=geometry.getAttribute('position');
    const colours=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)colour.toArray(colours,i*3);
    geometry.setAttribute('color',new THREE.BufferAttribute(colours,3));geometry.setAttribute('fishPart',new THREE.Float32BufferAttribute(Array(p.count).fill(part),1));gs.push(geometry);if(g!==geometry)g.dispose();
  };
  const deep=[.39,.14,.25,.32,.23,.31,.16,.26,.36,.43,.27,.24][kind]??.23,wide=[.10,.065,.17,.085,.09,.10,.075,.12,.075,.085,.17,.09][kind]??.12;
  // Elliptical cross-sections define the slender peduncle and tapered, separate mouth.
  const rings=[[-.48,.045],[-.37,.30],[-.22,.78],[0,1],[.20,.88],[.36,.52],[.47,.18],[.50,.11]];
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<rings.length;i++)for(let j=0;j<20;j++){
    const [x,r]=rings[i],a=j/20*Math.PI*2;
    positions.push(x,Math.sin(a)*r*deep,Math.cos(a)*r*wide);uv.push((x+.5),j/20);
  }
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<20;j++){const a=i*20+j,b=i*20+(j+1)%20;indices.push(a,b,a+20,b,b+20,a+20);}
  const body=new THREE.BufferGeometry();body.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));body.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));body.setIndex(indices);body.computeVertexNormals();add(body,[0xf3df7b,0xbddde2,0x76968a,0x196adc,0xf2934d,0xd9dca3,0x2896b2,0xf77c22,0xf3d32c,0xf6edc1,0x47bb9e,0x68cbbc][kind]??0x7d969b,1);
  function fin(points:number[][],color:number){
    // A thin closed wedge catches real light from either side; it is not an alpha card.
    const vertices:number[]=[],faces:number[]=[];for(const z of [-.006,.006])for(const [x,y]of points)vertices.push(x,y,z);
    for(let i=1;i<points.length-1;i++){faces.push(0,i,i+1,points.length,points.length+i+1,points.length+i);}
    for(let i=0;i<points.length;i++){const j=(i+1)%points.length;faces.push(i,j,i+points.length,j,j+points.length,i+points.length);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(Array(vertices.length/3*2).fill(0),2));g.setIndex(faces);g.computeVertexNormals();add(g,color,2);
  }
  const finColour=[0xd8b947,0x8faeb4,0x63897b,0xf6ce38,0xe7ad61,0xb7b878,0x42afa1,0xf09c42,0xf0cb25,0x202a30,0x62b8bf,0x92ddd1][kind]??0x576e71;
  fin([[-.46,0],[-.72,.23],[-.67,0],[-.72,-.23]],finColour);
  fin([[-.30,deep*.60],[-.17,deep*1.40],[.12,deep*1.30],[.28,deep*.66]],finColour);
  fin([[-.29,-deep*.50],[-.17,-deep*1.23],[.12,-deep*1.12],[.22,-deep*.70]],finColour);
  for(const side of [-1,1]){
    const pectoral=new THREE.SphereGeometry(1,10,6);pectoral.scale(.19,.055,.018);pectoral.rotateY(side*.65);pectoral.translate(.06,-deep*.22,side*wide*.91);add(pectoral,finColour,2);
    const eye=new THREE.SphereGeometry(.035,12,8);eye.scale(1,1,.53);eye.translate(.34,deep*.22,side*wide*.55);add(eye,0xc8b78c);
    const pupil=new THREE.SphereGeometry(.022,10,6);pupil.scale(1,1,.5);pupil.translate(.346,deep*.22,side*(wide*.55+.016));add(pupil,0x061d20);
    const glint=new THREE.SphereGeometry(.006,6,4);glint.translate(.353,deep*.22+.008,side*(wide*.55+.025));add(glint,0xe7eee9);
  }
  if(kind===9)fin([[-.10,deep],[.12,deep],[.03,.96],[-.24,1.12],[-.15,.79]],0xf4e8bc);
  const mouth=new THREE.SphereGeometry(.018,8,6);mouth.scale(.6,.65,1);mouth.translate(.497,-deep*.04,0);add(mouth,kind===10?0xd9d49f:0x375851);
  const merged=mergeGeometries(gs)!;gs.forEach(g=>g.dispose());if(kind===6)merged.scale(1.38,.78,1);merged.computeBoundingSphere();return merged;
}

/** Species occupy homes, feeding grounds and open-water lanes. Schools share a
 * course only with their own species; individuals retain separation and inertia. */
export const SUMMER_FISH_SPECIES = [
  {name:'Butterflyfish',role:'pair',count:12,compact:6,size:.38,speed:.34},
  {name:'Silversides',role:'school',count:64,compact:34,size:.23,speed:.80},
  {name:'Reef grouper',role:'browser',count:5,compact:3,size:.78,speed:.28},
  {name:'Regal blue tang',role:'grazer',count:14,compact:8,size:.43,speed:.47},
  {name:'Orange anthias',role:'shoal',count:38,compact:20,size:.27,speed:.49},
  {name:'Sergeant major',role:'shoal',count:18,compact:10,size:.32,speed:.43},
  {name:'Cleaner wrasse',role:'cleaner',count:9,compact:5,size:.37,speed:.59},
  {name:'Clownfish',role:'resident',count:SUMMER_ANEMONE_HOMES.length*2,compact:SUMMER_ANEMONE_HOMES.length*2,size:.30,speed:.32},
  {name:'Yellow tang',role:'grazer',count:12,compact:6,size:.40,speed:.42},
  {name:'Moorish idol',role:'pair',count:8,compact:4,size:.44,speed:.34},
  {name:'Parrotfish',role:'grazer',count:7,compact:4,size:.69,speed:.38},
  {name:'Green chromis',role:'school',count:42,compact:24,size:.24,speed:.62},
] as const;

export function createSummerWildlife(options:{compact:boolean;camera:THREE.Camera;boatPose:()=>SummerPose;reduced?:boolean;templates?:Record<string,THREE.Object3D>}){
  const group=new THREE.Group();group.name='Summer · a living reef ecosystem';
  const clock={value:0},geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[],meshes:THREE.InstancedMesh[]=[];
  const dummy=new THREE.Object3D(),target=new THREE.Vector3(),steer=new THREE.Vector3(),next=new THREE.Vector3(),away=new THREE.Vector3();
  type Fish={kind:number;index:number;school:number;position:THREE.Vector3;velocity:THREE.Vector3;anchor:THREE.Vector3;phase:number;scale:number;fear:number;yaw:number;pitch:number;beat:number};
  const fishes:Fish[]=[],cadences:THREE.InstancedBufferAttribute[]=[];
  const patterns=[
    'float band=1.-smoothstep(.025,.055,abs(p.x-.28+p.y*.25)); c=mix(c,vec3(.025,.04,.045),band*.92);float spot=1.-smoothstep(.05,.085,length((p.xy-vec2(-.22,.12))*vec2(1.,1.5)));c=mix(c,vec3(.05,.07,.07),spot);',
    'c=mix(c,vec3(.77,.89,.92),(1.-smoothstep(.015,.032,abs(p.y)))*.7);',
    'float spot=smoothstep(.65,.84,sin(p.x*73.+sin(p.y*39.))*sin(p.y*61.));c*=1.-spot*.38;',
    'float palette=1.-smoothstep(.075,.105,length((p.xy-vec2(-.04,.10))*vec2(.75,1.4)));float inner=1.-smoothstep(.038,.059,length((p.xy-vec2(.01,.12))*vec2(.8,1.4)));c=mix(c,vec3(.015,.035,.075),palette*(1.-inner));',
    'c=mix(c,vec3(.82,.26,.51),smoothstep(.08,.24,p.y)*.42);',
    'float band=smoothstep(.58,.82,sin(p.x*34.+p.y*1.8));c=mix(c,vec3(.035,.07,.09),band*.86);',
    'float line=1.-smoothstep(.025,.046,abs(p.y-p.x*.03));c=mix(c,vec3(.02,.045,.08),line);',
    'float b=min(abs(p.x-.27+p.y*.16),min(abs(p.x+.035-p.y*.23),abs(p.x+.35+p.y*.12)));c=mix(c,vec3(.025,.035,.035),1.-smoothstep(.061,.077,b));c=mix(c,vec3(.96,.94,.84),1.-smoothstep(.039,.052,b));',
    'float mark=(1.-smoothstep(.012,.023,abs(p.y)))*(1.-smoothstep(.025,.045,abs(p.x+.31)));c=mix(c,vec3(.95,.94,.77),mark);',
    'float band=max(1.-smoothstep(.07,.09,abs(p.x-.22+p.y*.12)),1.-smoothstep(.065,.085,abs(p.x+.20-p.y*.25)));c=mix(c,vec3(.025,.035,.04),band);c=mix(c,vec3(.98,.70,.12),(1.-band)*smoothstep(.14,.28,p.y)*.6);',
    'float scale=sin(p.x*61.+sin(p.y*39.)*1.6)*sin(p.y*39.);c=mix(c,vec3(.27,.51,.80),smoothstep(.5,.85,scale)*.38);c=mix(c,vec3(.89,.56,.64),(1.-smoothstep(.009,.025,abs(p.y-p.x*.18)))*.42);',
    'c=mix(c,vec3(.18,.49,.77),smoothstep(.05,.25,p.y)*.45);',
  ];
  SUMMER_FISH_SPECIES.forEach((species,kind)=>{
    const count=options.compact?species.compact:species.count,geometry=createSummerFishGeometry(kind);geometries.push(geometry);
    geometry.setAttribute('swimPhase',new THREE.InstancedBufferAttribute(Float32Array.from({length:count},(_,i)=>random(i+kind*71)*Math.PI*2),1));
    const beats=new THREE.InstancedBufferAttribute(new Float32Array(count),1);beats.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('swimBeat',beats);cadences.push(beats);
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:kind===1?.32:.57,metalness:kind===1?.22:.035});
    material.onBeforeCompile=shader=>{
      shader.uniforms.summerFishTime=clock;
      shader.vertexShader='attribute float fishPart; attribute float swimPhase; attribute float swimBeat; uniform float summerFishTime; varying vec3 summerFishLocal; varying float summerFishPart;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        summerFishLocal=position;summerFishPart=fishPart;
        float tail=pow(clamp((-position.x+.15)/.87,0.,1.),1.7);
        transformed.z+=sin(swimBeat+swimPhase+position.x*4.6)*tail*.105;
        if(fishPart>1.5&&position.x>-.2)transformed.z+=sin(swimBeat*1.6+swimPhase)*.012;`);
      shader.fragmentShader='varying vec3 summerFishLocal; varying float summerFishPart;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 p=summerFishLocal;vec3 c=diffuseColor.rgb;
        if(summerFishPart>.5&&summerFishPart<1.5){
          ${patterns[kind]}
          float fade=1.-smoothstep(.004,.02,length(fwidth(p)));
          c*=mix(1.13,.79,smoothstep(-.22,.25,p.y))*(1.+sin(p.x*150.+sin(p.y*90.))*sin(p.y*90.)*.025*fade);
        }
        diffuseColor.rgb=c;`);
    };
    material.customProgramCacheKey=()=>`summer-ecosystem-fish-${kind}-2`;materials.push(material);
    const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=species.name+' · '+species.role;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=false;group.add(mesh);meshes.push(mesh);
    for(let index=0;index<count;index++){
      const school=Math.floor(index/(kind===1?22:kind===11?14:kind===4?13:2));
      const patch=SUMMER_REEF_PATCHES[(school*5+kind*3)%SUMMER_REEF_PATCHES.length];
      const home=species.role==='resident'?SUMMER_ANEMONE_HOMES[Math.floor(index/2)%SUMMER_ANEMONE_HOMES.length]:null;
      const anchor=new THREE.Vector3(home?.x??patch[0],home?.y??0,home?.z??patch[1]);
      if(!home)anchor.y=summerGroundHeight(anchor.x,anchor.z)+(species.role==='school'?3.3:species.role==='shoal'?2:1.1);
      const phase=random(index+kind*67)*Math.PI*2,spread=home?.4:species.role==='school'?2.2:1.1;
      const p=anchor.clone().add(new THREE.Vector3(Math.cos(phase)*spread,random(index+kind*31)*.35,Math.sin(phase)*spread));
      p.y=Math.max(p.y,summerGroundHeight(p.x,p.z)+.8);
      for(let attempt=0;attempt<120&&!safe(p,.35);attempt++){p.y=Math.min(-1.2,p.y+.12);p.x+=.045;}
      fishes.push({kind,index,school,position:p,velocity:new THREE.Vector3(species.speed*.6,0,0),anchor,phase,scale:species.size*(.82+random(index+kind*51)*.36),fear:0,yaw:0,pitch:0,beat:phase});
    }
  });
  function safe(p:THREE.Vector3,r:number){
    if(p.y>-.75||p.y<summerGroundHeight(p.x,p.z)+r+.18)return false;
    if(summerWorldColliders.some(c=>summerColliderIntersects(c,p.x,p.z,p.y-r,p.y+r,r)))return false;
    const hull=options.boatPose();if(p.y>-1.25&&Math.hypot(p.x-hull.x,p.z-hull.z)<3.4)return false;
    return true;
  }
  const neighbourhood=new Map<string,Fish[]>(),alignment=new THREE.Vector3(),cohesion=new THREE.Vector3();
  const cellKey=(x:number,y:number,z:number)=>`${x}:${y}:${z}`;
  let motionTime=0;
  function update(_t:number,dt:number,reduced=options.reduced??false){
    dt=Math.max(0,Math.min(.07,dt));motionTime+=dt*(reduced?.30:1);clock.value=motionTime;const t=motionTime,step=dt*(reduced?.30:1);
    neighbourhood.clear();
    for(const fish of fishes){const p=fish.position,key=cellKey(Math.floor(p.x/2.5),Math.floor(p.y/2.5),Math.floor(p.z/2.5));let bucket=neighbourhood.get(key);if(!bucket){bucket=[];neighbourhood.set(key,bucket);}bucket.push(fish);}
    for(const fish of fishes){
      const p=fish.position,species=SUMMER_FISH_SPECIES[fish.kind],role=species.role,distance=p.distanceTo(options.camera.position),a=fish.anchor;
      fish.fear+=((distance<2.8?1:0)-fish.fear)*(1-Math.exp(-step*(distance<2.8?4:.65)));
      const schoolPhase=fish.school*2.399+fish.kind*.7;
      let feeding=false;
      if(role==='resident'){
        const r=fish.fear>.2?.20:.62;
        target.set(a.x+Math.cos(t*.42+fish.phase)*r,a.y+.26+Math.sin(t*.63+fish.phase)*.16,a.z+Math.sin(t*.35+fish.phase)*r);
      }else if(role==='school'||role==='shoal'){
        const r=role==='school'?5.2:2.1;
        target.set(a.x+Math.cos(t*.075+schoolPhase)*r,a.y+Math.sin(t*.13+schoolPhase)*.45,a.z+Math.sin(t*.09+schoolPhase)*r*.65);
      }else{
        const phase=t*.10+schoolPhase,r=role==='cleaner'?.85:role==='pair'?2.7:3.7;
        target.set(a.x+Math.cos(phase)*r,0,a.z+Math.sin(phase*.83)*r*.7);
        feeding=role==='grazer'&&(t+fish.phase*5)%14<4;
        target.y=summerGroundHeight(target.x,target.z)+(feeding?.48:role==='cleaner'?1.5:1.0)+Math.sin(t*.43+fish.phase)*.09;
        if(role==='pair'){target.x+=Math.cos(fish.phase)*.55;target.z+=Math.sin(fish.phase)*.55;}
      }
      target.y=Math.min(-1.25,Math.max(target.y,summerGroundHeight(target.x,target.z)+.42));
      steer.copy(target).sub(p).multiplyScalar(role==='resident'?1.3:.5);
      alignment.set(0,0,0);cohesion.set(0,0,0);let neighbours=0;
      const cx=Math.floor(p.x/2.5),cy=Math.floor(p.y/2.5),cz=Math.floor(p.z/2.5);
      for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
        const bucket=neighbourhood.get(cellKey(cx+x,cy+y,cz+z));if(!bucket)continue;
        for(const other of bucket){if(other===fish)continue;away.copy(p).sub(other.position);const d=away.lengthSq(),separation=(fish.scale+other.scale)*.48;
          if(d>.00001&&d<separation*separation)steer.addScaledVector(away,.09/d);
          if(d<6.25&&other.kind===fish.kind&&other.school===fish.school){alignment.add(other.velocity);cohesion.add(other.position);neighbours++;}
        }
      }
      if(neighbours&&(role==='school'||role==='shoal')){steer.addScaledVector(alignment,.85/neighbours);cohesion.multiplyScalar(1/neighbours).sub(p);steer.addScaledVector(cohesion,.12);}
      if(role!=='resident'&&fish.fear>.01)steer.addScaledVector(away.copy(p).sub(options.camera.position).normalize(),fish.fear*2.2);
      // Predictive obstacle steering. Choose a tangent and lift before contact instead of reversing a fish on impact.
      next.copy(p).addScaledVector(fish.velocity,1.4);
      const radius=fish.scale*.28;
      for(const c of summerWorldColliders){
        if(!summerColliderIntersects(c,next.x,next.z,next.y-radius-.25,next.y+radius+.25,radius+.8))continue;
        away.set(p.x-c.x,0,p.z-c.z);if(away.lengthSq()<.001)away.set(0,0,1);away.normalize();
        steer.addScaledVector(away,.8);steer.x+=away.z*.48;steer.z-=away.x*.48;steer.y+=.48;
      }
      const bed=summerGroundHeight(next.x,next.z);if(next.y<bed+.7)steer.y+=Math.max(.3,(bed+.7-next.y)*1.4);
      const speed=species.speed*(feeding?.26:1)+fish.fear*.8;
      steer.clampLength(0,speed);fish.velocity.lerp(steer,1-Math.exp(-step*1.8));next.copy(p).addScaledVector(fish.velocity,step);
      if(safe(next,radius))p.copy(next);else{fish.velocity.multiplyScalar(.8);fish.velocity.y+=step*.6;}
      const horizontal=Math.hypot(fish.velocity.x,fish.velocity.z),heading=-Math.atan2(fish.velocity.z,fish.velocity.x);
      const turn=THREE.MathUtils.clamp(Math.atan2(Math.sin(heading-fish.yaw),Math.cos(heading-fish.yaw)),-step*1.6,step*1.6);fish.yaw+=turn;
      fish.pitch+=((feeding?-.24:Math.atan2(fish.velocity.y,Math.max(.02,horizontal))*.7)-fish.pitch)*(1-Math.exp(-step*2));
      fish.beat+=step*(3.5+fish.velocity.length()/species.speed*6.5);cadences[fish.kind].setX(fish.index,fish.beat);
      dummy.position.copy(p);dummy.rotation.set(THREE.MathUtils.clamp(-turn/Math.max(.001,step)*.10,-.18,.18),fish.yaw,fish.pitch,'YXZ');dummy.scale.setScalar(fish.scale);dummy.updateMatrix();meshes[fish.kind].setMatrixAt(fish.index,dummy.matrix);
    }
    meshes.forEach((mesh,i)=>{mesh.instanceMatrix.needsUpdate=true;cadences[i].needsUpdate=true;});
  }
  update(0,.016);
  return {group,update,stats:{fish:fishes.length,drawCalls:meshes.length,species:SUMMER_FISH_SPECIES.length},snapshot:()=>fishes.map(f=>({kind:f.kind,role:SUMMER_FISH_SPECIES[f.kind].role,position:f.position.toArray(),home:f.anchor.toArray(),speed:f.velocity.length()})),dispose(){meshes.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.clear();}};
}

/** Detailed original, ground-rooted coral sources, shared by large instanced colonies. */
export function createSummerCorals(options:{compact:boolean;templates?:Record<string,THREE.Object3D>;surfaces?:SummerSurfaces}){
  const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[],group=new THREE.Group();group.name='Summer · dimensional coral gardens';
  function geometry(kind:number){
    const gs:THREE.BufferGeometry[]=[];
    function rod(a:THREE.Vector3,b:THREE.Vector3,r:number){const g=new THREE.CylinderGeometry(r*.55,r,a.distanceTo(b),6);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y,b.clone().sub(a).normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());gs.push(g.toNonIndexed());g.dispose();}
    if(kind===0){ // An open branched crown, with short secondary branchlets.
      rod(new THREE.Vector3(),new THREE.Vector3(0,.45,0),.095);
      for(let i=0;i<13;i++){const a=i*2.399,r=.25+random(i)*.45,start=new THREE.Vector3(0,.18,0),end=new THREE.Vector3(Math.cos(a)*r,.62+random(i+5)*.65,Math.sin(a)*r);rod(start,end,.035+random(i)*.018);for(let j=0;j<3;j++){const branch=end.clone().lerp(start,.24+j*.19),tip=branch.clone().add(new THREE.Vector3(Math.cos(a+j)*.22,.25,Math.sin(a+j)*.22));rod(branch,tip,.018);}}
    }else if(kind===1){ // Fan: fine radial branches in an upright, curved plane.
      const origin=new THREE.Vector3(0,.12,0);rod(new THREE.Vector3(),origin,.052);
      for(let i=0;i<21;i++){const a=-1.20+i/20*2.40,r=.85*(.85+random(i+1)*.15),tip=new THREE.Vector3(Math.sin(a)*r,.32+Math.cos(a)*r,Math.sin(a*2)*.055);rod(origin,tip,.018);for(let j=1;j<=5;j++){const p=origin.clone().lerp(tip,j/6),offset=new THREE.Vector3(Math.cos(a)*.16,.10,Math.sin(a)*.03);rod(p,p.clone().add(offset),.007);rod(p,p.clone().sub(offset.clone().multiplyScalar(.8)).add(new THREE.Vector3(0,.12,0)),.007);}}
      for(let row=1;row<=5;row++)for(let i=0;i<20;i++){const a=-1.2+i/20*2.4,b=a+2.4/20,r=row/6*.85;rod(new THREE.Vector3(Math.sin(a)*r,.12+(.2+Math.cos(a)*.85)*row/6,Math.sin(a*2)*.055*row/6),new THREE.Vector3(Math.sin(b)*r,.12+(.2+Math.cos(b)*.85)*row/6,Math.sin(b*2)*.055*row/6),.005);}
    }else if(kind===2){
      // One continuous eroded colony; overlapping hemispheres read as toy blocks.
      const g=new THREE.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI*.56),p=g.getAttribute('position');
      for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.10*Math.sin(x*5+z*3)*Math.cos(z*6-y*4)+.025*Math.sin(x*29+Math.sin(z*17));p.setXYZ(i,x*r*.75,y*r*.58,z*r*.66);}g.computeVertexNormals();gs.push(g.toNonIndexed());g.dispose();
    }else if(kind===3){
      rod(new THREE.Vector3(),new THREE.Vector3(0,.65,0),.09);
      for(let level=0;level<3;level++){const g=new THREE.CylinderGeometry(.55+level*.15,.51+level*.15,.045,28);const p=g.getAttribute('position');for(let v=0;v<p.count;v++){const x=p.getX(v),z=p.getZ(v),a=Math.atan2(z,x),r=1+Math.sin(a*5+level)*.055+Math.sin(a*9)*.025;p.setXYZ(v,x*r,p.getY(v)+Math.sin(a*6+level)*Math.hypot(x,z)*.035,z*r);}g.computeVertexNormals();g.translate(0,.45+level*.18,0);gs.push(g.toNonIndexed());g.dispose();for(let n=0;n<17;n++){const a=n/17*Math.PI*2;rod(new THREE.Vector3(0,.25+level*.18,0),new THREE.Vector3(Math.cos(a)*(.53+level*.15),.44+level*.18,Math.sin(a)*(.53+level*.15)),.018);}}
    }else if(kind===4){
      for(let index=0;index<7;index++){
        const angle=index*2.399,height=.40+random(index+18)*.65,x=Math.cos(angle)*.31,z=Math.sin(angle)*.31;
        const profile=[new THREE.Vector2(.13,0),new THREE.Vector2(.115,height*.25),new THREE.Vector2(.10,height*.65),new THREE.Vector2(.095,height),new THREE.Vector2(.073,height),new THREE.Vector2(.065,height*.70)];
        const tube=new THREE.LatheGeometry(profile,16),p=tube.getAttribute('position');
        for(let i=0;i<p.count;i++){const y=p.getY(i),bend=y*y*.14;p.setXYZ(i,p.getX(i)+x+bend*Math.cos(angle),y,p.getZ(i)+z+bend*Math.sin(angle));}tube.computeVertexNormals();gs.push(tube.toNonIndexed());tube.dispose();
      }
    }else if(kind===5){
      for(let index=0;index<10;index++){
        const angle=index*2.399,height=.40+random(index+23)*.55,x=Math.cos(angle)*.31,z=Math.sin(angle)*.31;
        rod(new THREE.Vector3(x*.5,0,z*.5),new THREE.Vector3(x,height,z),.10);
        const tip=new THREE.SphereGeometry(.056,8,6);tip.translate(x,height,z);gs.push(tip.toNonIndexed());tip.dispose();
      }
    }else if(kind===6){
      for(let index=0;index<11;index++){
        const angle=index*2.399,height=.7+random(index+29)*.8;
        for(let segment=0;segment<5;segment++){
          const base=segment/5,end=(segment+1)/5;
          rod(new THREE.Vector3(Math.cos(angle)*base*.45+base*base*.13,height*base,Math.sin(angle)*base*.45),new THREE.Vector3(Math.cos(angle)*end*.45+end*end*.13,height*end,Math.sin(angle)*end*.45),.012);
        }
      }
    }else{
      rod(new THREE.Vector3(),new THREE.Vector3(0,.28,0),.07);
      for(let level=0;level<3;level++){
        const plate=new THREE.CircleGeometry(.65+level*.12,28,0,Math.PI*2),vertices=plate.getAttribute('position');
        for(let vertex=0;vertex<vertices.count;vertex++){const x=vertices.getX(vertex),z=vertices.getY(vertex),radius=Math.hypot(x,z),angle=Math.atan2(z,x);vertices.setXYZ(vertex,x,.20+level*.19+radius*radius*.12+Math.sin(angle*7+level)*radius*.04,z);}
        plate.computeVertexNormals();gs.push(plate.toNonIndexed());plate.dispose();
      }
    }
    const merged=mergeGeometries(gs)!;gs.forEach(g=>g.dispose());geometries.push(merged);return merged;
  }
  const sources=[0,1,2,3,4,5,6,7].map(kind=>{const source=kind<4?importedGeometry(options.templates,['coral-branch','coral-fan','coral-mound','coral-table'][kind]):null;if(source){geometries.push(source);return source;}return geometry(kind);});
  const colours=[0xd0a476,0xb0799d,0xa7ad72,0xc4a37b,0xb87b59,0xc2ae8c,0xb397b5,0x91b29e];
  const mats=colours.map(color=>{const material=new THREE.MeshStandardMaterial({color,roughness:.93,normalMap:options.surfaces?.gravel.normal??null,normalScale:new THREE.Vector2(.45,.45),roughnessMap:options.surfaces?.gravel.roughness??null});material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 summerCoralP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsummerCoralP=position;');shader.fragmentShader='varying vec3 summerCoralP;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat broad=sin(summerCoralP.x*7.3+sin(summerCoralP.z*5.1))*sin(summerCoralP.y*8.7+summerCoralP.z*3.);float polyp=sin(summerCoralP.x*117.+sin(summerCoralP.z*49.)*2.)*sin(summerCoralP.y*109.+summerCoralP.z*71.);float fade=1.-smoothstep(.004,.025,length(fwidth(summerCoralP)));diffuseColor.rgb*=.91+broad*.065+polyp*.025*fade;');};materials.push(material);return material;});
  const dummy=new THREE.Object3D(),count=options.compact?340:680,placements:{kind:number;x:number;z:number;scale:number;yaw:number}[]=[];
  for(let i=0;i<count*15&&placements.length<count;i++){
    const cluster=i%SUMMER_REEF_PATCHES.length,patch=SUMMER_REEF_PATCHES[cluster],angle=random(i*9+4)*Math.PI*2,radius=Math.sqrt(random(i*9+5))*patch[2];
    const x=patch[0]+Math.cos(angle)*radius,z=patch[1]+Math.sin(angle)*radius;
    const scale=.25+Math.pow(random(i*9+6),1.55)*1.32;
    if(!reefPlantable(x,z,scale*.8)||SUMMER_ANEMONE_HOMES.some(p=>Math.hypot(p.x-x,p.z-z)<1)||placements.some(p=>Math.hypot(p.x-x,p.z-z)<(p.scale+scale)*.58))continue;
    placements.push({kind:random(i+932)<.62?[0,2,3,0,7,1][cluster%6]:i%8,x,z,scale,yaw:random(i*9+7)*Math.PI*2});
  }
  const meshes=sources.map((g,kind)=>{const all=placements.filter(p=>p.kind===kind),mesh=new THREE.InstancedMesh(g,mats[kind],all.length);mesh.name=['Branching colonies','Upright sea fans','Lobed mound corals','Tiered table corals','Open tube sponges','Finger coral colonies','Soft sea whip gardens','Ruffled plating corals'][kind];all.forEach((p,i)=>{dummy.position.set(p.x,summerGroundHeight(p.x,p.z)+.10,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);return mesh;});
  const foundationGeometry=importedGeometry(options.templates,'reef-limestone')??new THREE.IcosahedronGeometry(1,2);
  foundationGeometry.computeBoundingBox();const fb=foundationGeometry.boundingBox!,fs=fb.getSize(new THREE.Vector3()),fc=fb.getCenter(new THREE.Vector3());
  foundationGeometry.translate(-fc.x,-fb.min.y,-fc.z);foundationGeometry.scale(2/Math.max(.01,fs.x),1/Math.max(.01,fs.y),2/Math.max(.01,fs.z));geometries.push(foundationGeometry);
  const sourceStone=options.templates?.['reef-limestone']?.getObjectByProperty('isMesh',true) as THREE.Mesh|undefined;
  const stoneMaterial=sourceStone&&!Array.isArray(sourceStone.material)?sourceStone.material:null;
  const foundationMaterial=stoneMaterial instanceof THREE.MeshStandardMaterial?stoneMaterial.clone():new THREE.MeshStandardMaterial({color:0x8f9781,roughness:1});materials.push(foundationMaterial);
  const foundations=new THREE.InstancedMesh(foundationGeometry,foundationMaterial,placements.length);foundations.name='Limestone foundations rooted beneath coral colonies';
  placements.forEach((placement,index)=>{dummy.position.set(placement.x,summerGroundHeight(placement.x,placement.z)-.03,placement.z);dummy.rotation.set(0,placement.yaw,0);dummy.scale.set(placement.scale*.70,.13,placement.scale*.58);dummy.updateMatrix();foundations.setMatrixAt(index,dummy.matrix);});foundations.computeBoundingSphere();group.add(foundations);meshes.push(foundations);
  const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),sphere=new THREE.Sphere();let lastView='';
  function update(camera:THREE.Camera){
    const key=`${Math.round(camera.position.x)}:${Math.round(camera.position.y)}:${Math.round(camera.position.z)}:${Math.round(camera.rotation.y*16)}:${Math.round(camera.rotation.x*16)}`;if(key===lastView)return;lastView=key;
    camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);meshes.forEach(mesh=>mesh.count=0);
    for(const placement of placements){
      const bed=summerGroundHeight(placement.x,placement.z);sphere.center.set(placement.x,bed+.7,placement.z);sphere.radius=placement.scale*2;
      if(sphere.center.distanceToSquared(camera.position)>3600||!frustum.intersectsSphere(sphere))continue;
      dummy.position.set(placement.x,bed+.06,placement.z);dummy.rotation.set(0,placement.yaw,0);dummy.scale.set(placement.scale*(.85+random(placement.x)*.3),placement.scale,placement.scale*(.85+random(placement.z)*.3));dummy.updateMatrix();const coral=meshes[placement.kind];coral.setMatrixAt(coral.count++,dummy.matrix);
      dummy.position.y=bed-.03;dummy.scale.set(placement.scale*.70,.13,placement.scale*.58);dummy.updateMatrix();foundations.setMatrixAt(foundations.count++,dummy.matrix);
    }
    meshes.forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;});
  }
  return {group,sources,materials:mats,geometries,update,stats:{colonies:placements.length,coralForms:sources.length},dispose(){meshes.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.clear();}};
}
