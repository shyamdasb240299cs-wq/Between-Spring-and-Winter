import * as THREE from 'three';
import {groundHeight,islandDistance,ISLAND_SCALE,random,type SeasonLayout} from './season-layout';
import type {SeasonId} from './seasons';
import {createCampfireFlames} from './season-fire';
import type {GroundMaps} from './season-terrain';
import {createCoastalPlants} from './season-coastal-plants';
import {coastalArrangement} from './season-coastal-arrangement';
import {createBeachFurniture} from './season-beach-furniture';
import {createScenePickup,type PickupItem} from './scene-pickup';
import {createExpandedScenery} from './season-expanded-scenery';

export interface PropInteraction {kind:'ball'|'lantern';label:string;point:THREE.Vector3;}

/** Real downloaded model props use metre scale, grounded contact and bounded interactions. */
export function createSeasonProps(id:SeasonId,layout:SeasonLayout,models:Record<string,THREE.Object3D>,mobile=false,stoneMaps?:GroundMaps,coastalGrass?:THREE.Object3D,reduced=false){
  const group=new THREE.Group(),animated:((t:number)=>void)[]=[],ownedMaterials:THREE.Material[]=[],interactive:THREE.Object3D[]=[];
  const interactionKinds=new Map<THREE.Object3D,'ball'|'lantern'>();
  let ballBody:THREE.Group|null=null,ballSpin:THREE.Group|null=null,ballLift=0,ballVertical=0,lanternOn=true;
  let lanternLight:THREE.PointLight|null=null;const lanternMaterials:THREE.MeshStandardMaterial[]=[];
  const ballVelocity=new THREE.Vector2(),ballRadius=.27,rollAxis=new THREE.Vector3();
  const contactObstacles:{x:number;z:number;radius:number}[]=[];
  const loose:PickupItem[]=[],solids:THREE.Object3D[]=[],supports:THREE.Object3D[]=[];
  const names:Record<string,string>={'picnic-basket':'picnic basket',basket:'fruit tray',apple:'apple',plate:'plate',thermos:'thermos',shell:'seashell',coral:'coral',rock:'small stone','camp-thermos':'camp thermos',lantern:'lantern',log:'firewood'};
  group.name='Seasonal foreground arrangements';
  const {x:cx,z:cz}=layout.prop;
  const mat=(colour:number,roughness=.85)=>{const material=new THREE.MeshStandardMaterial({color:colour,roughness});ownedMaterials.push(material);return material;};
  function model(key:string,x:number,z:number,size:number,angle=0,lift=0){
    const prototype=models[key];if(!prototype)return null;
    const mesh=prototype.clone(true),box=new THREE.Box3().setFromObject(mesh),s=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
    const root=new THREE.Group(),scale=size/Math.max(s.x,s.z);mesh.position.sub(new THREE.Vector3(c.x,box.min.y,c.z));root.add(mesh);root.scale.setScalar(scale);root.rotation.y=angle;root.position.set(x,groundHeight(id,x,z)+lift,z);root.name=key;root.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});group.add(root);
    if(names[key]&&size<=.65)loose.push({object:root,label:names[key]});else if(key!=='ball'&&key!=='coastal-shrub')solids.push(root);
    return root;
  }
  function cloth(x:number,z:number,w:number,h:number,colour:number,angle=0,striped=false){
    const g=new THREE.PlaneGeometry(w,h,40,28);g.rotateX(-Math.PI/2);const p=g.attributes.position;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d')!;
    c.fillStyle='#'+colour.toString(16).padStart(6,'0');c.fillRect(0,0,128,128);
    for(let i=0;i<128;i+=2){c.strokeStyle=i%4?'#ffffff13':'#21101a16';c.beginPath();c.moveTo(i,0);c.lineTo(i,128);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(128,i);c.stroke();}
    c.fillStyle='#fff5e650';if(striped)for(let i=0;i<128;i+=32)c.fillRect(0,i,128,12);else{for(let i=0;i<128;i+=32){c.fillRect(i,0,12,128);c.fillRect(0,i,128,12);}}
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(3,2);
    for(let i=0;i<p.count;i++){const px=p.getX(i),pz=p.getZ(i),wx=x+px*Math.cos(angle)-pz*Math.sin(angle),wz=z+px*Math.sin(angle)+pz*Math.cos(angle);const edge=Math.max(Math.abs(px)/(w*.5),Math.abs(pz)/(h*.5));p.setXYZ(i,wx,groundHeight(id,wx,wz)+.035+Math.sin(px*12+pz*4)*.014+Math.sin(pz*16)*.015*edge*edge,wz);}
    g.computeVertexNormals();const m=new THREE.MeshStandardMaterial({map:tex,roughness:1,side:THREE.DoubleSide});ownedMaterials.push(m);const mesh=new THREE.Mesh(g,m);mesh.name=striped?'Beach towel':'Picnic blanket';mesh.receiveShadow=mesh.castShadow=true;group.add(mesh);supports.push(mesh);return mesh;
  }
  if(id==='spring'){
    cloth(cx,cz,3,2.2,0xbb6675,-.08);
    // A closed woven hamper and a separate shallow fruit tray are actual Poly Haven scans.
    // Their contact heights follow the cloth; no synthetic handle or primitive fruit remains.
    model('picnic-basket',cx-1,cz-.45,.62,-.14,.055);
    const tray=model('basket',cx+.08,cz-.40,.58,.12,.055);
    const trayTop=tray?new THREE.Box3().setFromObject(tray).max.y:groundHeight(id,cx+.08,cz-.40)+.17;
    for(const [n,p]of [[-.09,-.43],[.10,-.49],[.18,-.30]].entries()){
      const apple=model('apple',cx+p[0],cz+p[1],.115,n*1.7);
      if(apple){apple.position.y=trayTop+.004;tray?.attach(apple);}
    }
    for(const [x,z,a]of [[cx-.15,cz+.43,-.3],[cx+.78,cz+.27,.35]]){
      const plate=model('plate',x,z,.34,a,.055);
      const apple=model('apple',x+.012,z,.112,a+.6);
      if(apple&&plate){apple.position.y=new THREE.Box3().setFromObject(plate).max.y+.004;plate.attach(apple);}
    }
    model('thermos',cx+1.02,cz-.51,.20,-.45,.055);
    // Daisies: opaque petal meshes preserve detail at walking distance.
    const petalG=new THREE.SphereGeometry(1,5,3),flowerG=new THREE.SphereGeometry(.025,6,4),stemG=new THREE.CylinderGeometry(.004,.005,.2,4);
    const petalM=mat(0xffedf0),centreM=mat(0xeab946),stemM=mat(0x4f6c26);
    const petals=new THREE.InstancedMesh(petalG,petalM,720),centres=new THREE.InstancedMesh(flowerG,centreM,120),stems=new THREE.InstancedMesh(stemG,stemM,120),o=new THREE.Object3D();
    let count=0;for(let n=0;n<240&&count<120;n++){
      const x=(random(n+43)-.5)*29,z=-3+(random(n+711)-.5)*29;if(Math.hypot(x,z+3)>15||Math.hypot(x-cx,z-cz)<1.9)continue;
      const h=groundHeight(id,x,z)+.16+random(n)*.15;o.position.set(x,h-.09,z);o.scale.set(1,1,1);o.rotation.set(0,0,0);o.updateMatrix();stems.setMatrixAt(count,o.matrix);o.position.y=h;o.updateMatrix();centres.setMatrixAt(count,o.matrix);
      for(let k=0;k<6;k++){const a=k*Math.PI/3;o.position.set(x+Math.cos(a)*.037,h,z+Math.sin(a)*.037);o.rotation.set(0,-a,0);o.scale.set(.04,.007,.015);o.updateMatrix();petals.setMatrixAt(count*6+k,o.matrix);}count++;
    }
    petals.count=count*6;centres.count=stems.count=count;[petals,centres,stems].forEach(m=>{m.computeBoundingSphere();group.add(m);});
  }else if(id==='summer'){
    const furniture=createBeachFurniture(cx,cz);group.add(furniture);solids.push(furniture);
    model('thermos',cx+1.13,cz+.40,.20,-.3,.02);
    model('shell',cx+1.18,cz+1.05,.22,.5);
    model('shell',cx-.8,cz-.89,.13,-1.4);
    cloth(cx-1.25,cz+1.05,.85,1.65,0x377f92,-.20,true);
    // Loose tide-line clusters, never an evenly spaced row; the scanned bases sit in sand.
    for(let n=0;n<24;n++){
      const a=random(n+412)*6.28,r=(7.1+random(n+29)*1.6)*ISLAND_SCALE,x=Math.cos(a)*r,z=-3+Math.sin(a)*r/.83;
      if(groundHeight(id,x,z)<.035||Math.hypot(x-cx,z-cz)<2.1)continue;
      const shell=model('shell',x,z,.045+random(n+73)*.075,random(n+53)*6.28,-.005);
      if(shell){const normal=new THREE.Vector3(groundHeight(id,x-.05,z)-groundHeight(id,x+.05,z),.1,groundHeight(id,x,z-.05)-groundHeight(id,x,z+.05)).normalize();shell.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal));}
    }
    const ball=model('ball',cx-1.2,cz+1.4,ballRadius*2,.4);
    if(ball){
      ballBody=new THREE.Group();ballBody.name='Touch to roll the ball';ballBody.position.copy(ball.position);ballBody.position.y+=ballRadius;
      group.add(ballBody);ballSpin=new THREE.Group();ballBody.add(ballSpin);ballSpin.add(ball);ball.position.set(0,-ballRadius,0);
      interactive.push(ballBody);interactionKinds.set(ballBody,'ball');
      loose.push({object:ballBody,label:'beach ball',onLift:()=>{ballVelocity.set(0,0);ballLift=ballVertical=0;},onDrop:()=>{ballVelocity.set(0,0);ballLift=ballVertical=0;}});
    }
  }else if(id==='autumn'){
    // The source faces +Z; aim its seat north toward the lake.
    const bench=model('bench',cx+.35,cz,2.05,Math.PI);
    if(bench){const footprint=new THREE.Box3().setFromObject(bench);let y=-Infinity;
      for(const x of [footprint.min.x,footprint.max.x])for(const z of [footprint.min.z,footprint.max.z])y=Math.max(y,groundHeight(id,x,z));bench.position.y=y-.045;}
    model('thermos',cx-1.03,cz+.62,.20,-.25,.008);
    model('apple',cx-.56,cz+.91,.12,.6,.008);
    model('apple',cx-.31,cz+1.02,.115,1.8,.008);
  }else{
    const fireY=groundHeight(id,cx,cz);
    const campfire=model('campfire',cx,cz,1.7,.35);if(campfire)campfire.position.y-=.035;
    // Reuse the real timber and cast-iron park bench instead of rectangular placeholder blocks.
    const benchX=cx,benchZ=cz-1.8;
    const bench=model('bench',benchX,benchZ,2.05,0,-.03);
    if(bench)bench.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      const snowFrost=(source:THREE.Material)=>{
        const m=source.clone() as THREE.MeshStandardMaterial;ownedMaterials.push(m);
        m.onBeforeCompile=s=>{
          s.vertexShader='varying vec3 snowFacing;\n'+s.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nsnowFacing=normalize(mat3(modelMatrix)*objectNormal);');
          s.fragmentShader='varying vec3 snowFacing;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat frost=smoothstep(.45,.88,snowFacing.y)*.8;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.79,.84,.91),frost);');
        };m.customProgramCacheKey=()=> 'season-bench-frost-v1';return m;
      };o.material=Array.isArray(o.material)?o.material.map(snowFrost):snowFrost(o.material);
    });

    model('camp-thermos',cx+.87,cz-1.35,.18,.4,.01);
    model('log',cx+1.65,cz+.65,.48,.7,.008);
    const lantern=model('lantern',cx+1.5,cz-.8,.22,-.25,.01);
    if(lantern){
      lantern.traverse(object=>{if(!(object instanceof THREE.Mesh))return;const soften=(source:THREE.Material)=>{const material=source.clone() as THREE.MeshStandardMaterial;material.emissive.set(0xffc17a);material.emissiveMap=material.emissiveMap||material.map;material.emissiveIntensity=.22;material.toneMapped=true;ownedMaterials.push(material);lanternMaterials.push(material);return material;};object.material=Array.isArray(object.material)?object.material.map(soften):soften(object.material);});
      interactive.push(lantern);interactionKinds.set(lantern,'lantern');
      lanternLight=new THREE.PointLight(0xffc579,.65,4.5,2);lanternLight.position.set(cx+1.5,groundHeight(id,cx+1.5,cz-.8)+.48,cz-.8);group.add(lanternLight);
    }
    const flames=createCampfireFlames(new THREE.Vector3(cx,fireY+.77,cz),mobile);group.add(flames.mesh);
    const light=new THREE.PointLight(0xffa04a,9,8,2);light.position.set(cx,fireY+1,cz);group.add(light);
    animated.push(t=>{flames.update(t);light.intensity=8.3+Math.sin(t*9.1)*.7+Math.sin(t*17.3)*.4;});
    const emberG=new THREE.BufferGeometry(),emberP=new Float32Array(40*3);for(let i=0;i<40;i++){emberP[i*3]=(random(i)-.5)*.8;emberP[i*3+1]=random(i+41)*2;emberP[i*3+2]=(random(i+90)-.5)*.8;}emberG.setAttribute('position',new THREE.BufferAttribute(emberP,3));
    const emberM=new THREE.PointsMaterial({color:0xffa13b,size:.025,transparent:true,opacity:.8,depthWrite:false});const embers=new THREE.Points(emberG,emberM);embers.position.set(cx,fireY+.3,cz);group.add(embers);
    emberM.onBeforeCompile=s=>{s.uniforms.emberTime={value:0};emberM.userData.shader=s;s.vertexShader='uniform float emberTime;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y=mod(position.y+emberTime*.5,2.);transformed.x+=sin(position.y*10.+emberTime)*.12;');};animated.push(t=>{if(emberM.userData.shader)emberM.userData.shader.uniforms.emberTime.value=t;});
  }
  // Rocks and low shrubs connect the trees to the soil instead of leaving exposed stems.
  for(let n=0;n<(id==='summer'?0:7);n++){
    const a=n/7*Math.PI*2,r=11+random(n+59)*8;
    const x=Math.cos(a)*r,z=-3+Math.sin(a)*r;
    if(Math.hypot(x-cx,z-cz)<2)continue;
    const rock=model('rock',x,z,.5+random(n+33)*.8,random(n)*6.28);if(rock)rock.position.y-=.05;
  }
  if(id==='summer'){
    if(coastalGrass)group.add(createCoastalPlants(layout,coastalGrass));
    const detail=new THREE.Group();detail.name='Palm-base shells, stones and coral';group.add(detail);
    for(const p of coastalArrangement(layout)){
      const object=model(p.kind,p.x,p.z,p.size,p.yaw,-p.bury);if(!object)continue;
      if(p.kind==='rock')object.scale.y*=.70;
      if(p.kind==='coral'){object.rotation.x=.95;object.updateMatrixWorld(true);object.position.y+=groundHeight(id,p.x,p.z)-new THREE.Box3().setFromObject(object).min.y-p.bury;}
      detail.attach(object);
    }
  }
  const expanded=createExpandedScenery(id,layout,models);group.add(expanded);solids.push(...expanded.children);
  const ballObstacles=[...layout.obstacles,...contactObstacles];
  // Some scanned pebbles have wider silhouettes than their nominal placement size.
  // Resolve their real bounds once, so the starting arrangement is clear too.
  const placed:THREE.Object3D[]=[];
  for(const {object}of loose){
    if(object.parent!==group&&object.parent?.name!=='Palm-base shells, stones and coral')continue;
    const start=object.position.clone(),base=groundHeight(id,start.x,start.z);
    const overlaps=()=>{object.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(object).expandByScalar(-.006);return placed.some(other=>box.intersectsBox(new THREE.Box3().setFromObject(other).expandByScalar(-.006)));};
    if(overlaps()){
      let clear=false;
      for(let ring=1;ring<=10&&!clear;ring++)for(let n=0;n<16;n++){
        const angle=n/16*Math.PI*2,x=start.x+Math.cos(angle)*ring*.07,z=start.z+Math.sin(angle)*ring*.07;
        if(layout.obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.radius+.15))continue;
        object.position.set(x,start.y+groundHeight(id,x,z)-base,z);
        if(!overlaps()){clear=true;break;}
      }
      if(!clear)object.position.copy(start);
    }
    placed.push(object);
  }
  const pickup=createScenePickup(id,layout,loose,solids,reduced,supports);
  const lanternObject=loose.find(item=>item.label==='lantern')?.object;
  function hit(raycaster:THREE.Raycaster){
    const intersection=raycaster.intersectObjects(interactive,true).find(i=>i.distance<2.8);
    if(!intersection)return null;
    let object:THREE.Object3D|null=intersection.object;
    while(object&&!interactionKinds.has(object))object=object.parent;
    return object?{object,kind:interactionKinds.get(object)!,point:intersection.point}:null;
  }
  function kick(dx:number,dz:number,strength:number){
    const length=Math.hypot(dx,dz)||1;ballVelocity.set(dx/length*strength,dz/length*strength);ballVertical=.65;ballLift=Math.max(ballLift,.008);
  }
  return {
    group,
    pickup,solids,
    interact(raycaster:THREE.Raycaster):PropInteraction|null{
      const touched=hit(raycaster);if(!touched)return null;
      if(touched.kind==='ball'){if(pickup.held===ballBody)return null;kick(raycaster.ray.direction.x,raycaster.ray.direction.z,2.8);}
      else{lanternOn=!lanternOn;if(lanternLight)lanternLight.intensity=lanternOn?.65:0;lanternMaterials.forEach(material=>material.emissiveIntensity=lanternOn?.22:.015);}
      return {kind:touched.kind,label:touched.kind==='ball'?'The ball rolls through the sand':lanternOn?'Lantern lit':'Lantern dimmed',point:touched.point.clone()};
    },
    interactionHint(raycaster:THREE.Raycaster){const touched=hit(raycaster);return touched?(touched.kind==='ball'?'Touch the ball to roll it':lanternOn?'Touch the lantern to dim it':'Touch the lantern to light it'):null;},
    snapshot(){return {ballPosition:ballBody?[ballBody.position.x,ballBody.position.y,ballBody.position.z]:null,lanternOn,...pickup.snapshot()};},
    get moving(){return pickup.moving||ballVelocity.lengthSq()>.0004||ballLift>0;},
    update(time:number,dt=1/60,camera?:THREE.Camera){
      animated.forEach(fn=>fn(time));
      if(camera)pickup.update(dt,camera);
      if(lanternLight&&lanternObject){lanternObject.getWorldPosition(lanternLight.position);lanternLight.position.y+=.47;}
      if(pickup.held===ballBody||pickup.settling)return;
      if(!ballBody||!ballSpin)return;
      const step=Math.min(.04,Math.max(0,dt)),p=ballBody.position;
      if(step>0&&camera){const dx=p.x-camera.position.x,dz=p.z-camera.position.z,distance=Math.hypot(dx,dz);if(distance<.63&&distance>.001&&ballVelocity.length()<1)kick(dx,dz,1.65);}
      if(ballVelocity.lengthSq()>.0004){
        const oldX=p.x,oldZ=p.z,speed=ballVelocity.length();
        p.x+=ballVelocity.x*step;p.z+=ballVelocity.y*step;
        // At the wet sand limit reflect along the shoreline normal and retain the ball on land.
        if(groundHeight('summer',p.x,p.z)<.11||islandDistance(p.x,p.z)>8.25){
          const nx=p.x,nz=(p.z+3)*.83*.83,nLength=Math.hypot(nx,nz)||1;
          const normal=new THREE.Vector2(nx/nLength,nz/nLength);ballVelocity.addScaledVector(normal,-1.6*ballVelocity.dot(normal));p.x=oldX;p.z=oldZ;
        }
        for(const obstacle of ballObstacles){
          const dx=p.x-obstacle.x,dz=p.z-obstacle.z,d=Math.hypot(dx,dz),limit=ballRadius+obstacle.radius;
          if(d<limit&&d>.001){const nx=dx/d,nz=dz/d,dot=ballVelocity.x*nx+ballVelocity.y*nz;p.x=obstacle.x+nx*limit;p.z=obstacle.z+nz*limit;if(dot<0){ballVelocity.x-=1.45*dot*nx;ballVelocity.y-=1.45*dot*nz;}}
        }
        for(const b of pickup.collisionBoxes(ballBody)){
          if(b.min.y>p.y+ballRadius||b.max.y<p.y-ballRadius)continue;
          const qx=THREE.MathUtils.clamp(p.x,b.min.x,b.max.x),qz=THREE.MathUtils.clamp(p.z,b.min.z,b.max.z),dx=p.x-qx,dz=p.z-qz,d=Math.hypot(dx,dz);
          if(d<ballRadius){if(d>.001){const nx=dx/d,nz=dz/d,dot=ballVelocity.x*nx+ballVelocity.y*nz;p.x=qx+nx*(ballRadius+.008);p.z=qz+nz*(ballRadius+.008);if(dot<0){ballVelocity.x-=1.45*dot*nx;ballVelocity.y-=1.45*dot*nz;}}else{p.x=oldX;p.z=oldZ;ballVelocity.multiplyScalar(-.45);}}
        }
        const moveX=p.x-oldX,moveZ=p.z-oldZ,distance=Math.hypot(moveX,moveZ);
        if(distance>.00001){rollAxis.set(moveZ,0,-moveX).normalize();ballSpin.rotateOnWorldAxis(rollAxis,distance/ballRadius);}
        // Sand rolling resistance brings even repeated taps to rest quickly and predictably.
        ballVelocity.multiplyScalar(Math.exp(-1.65*step));
        if(speed<.06)ballVelocity.set(0,0);
      }
      if(ballLift>0||ballVertical>0){ballVertical-=5.8*step;ballLift+=ballVertical*step;if(ballLift<0){ballLift=0;ballVertical=Math.abs(ballVertical)>.4?-ballVertical*.23:0;}}
      p.y=pickup.supportHeight(p.x,p.z)+ballRadius+ballLift;
    },
    dispose(){ownedMaterials.forEach(m=>m.dispose());},
  };
}
