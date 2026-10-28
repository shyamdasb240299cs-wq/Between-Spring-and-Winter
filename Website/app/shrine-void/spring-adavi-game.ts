import * as THREE from 'three';

import {ADAVI_ORIGIN,ADAVI_WATER_LEVEL,adaviGround} from './spring-adavi-environment';
import {ADAVI_STONES,ADAVI_TARGET,ADAVI_THROW_START,simulateSkip,sampleSkip,skipConditions,type AdaviStone,type SkipTrajectory} from './spring-adavi-physics';
import type {SpringSave,SpringTreasureController} from './spring-treasure-state';

export const ADAVI_THROW_WINDUP=.42;

/** Physical shore pickups and the same analytic arcs used by the aiming guide. */
export function createSpringAdaviGame(models:Record<string,THREE.Object3D>,cloth:THREE.Texture,paper:THREE.Texture,reduced:boolean){
  const group=new THREE.Group();group.name='Adavi · skipping stones and keepsake bag';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const keep=<T extends THREE.BufferGeometry>(g:T)=>{geometries.add(g);return g;};
  const material=<T extends THREE.Material>(m:T)=>{materials.add(m);return m;};
  const mesh=(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
  function asset(key:string,parent:THREE.Object3D,size:number){
    const source=models[key];if(!source)return null;
    const clone=source.clone(true),bounds=new THREE.Box3().setFromObject(clone),d=bounds.getSize(new THREE.Vector3()),c=bounds.getCenter(new THREE.Vector3());
    clone.position.sub(new THREE.Vector3(c.x,bounds.min.y,c.z));const root=new THREE.Group();root.add(clone);root.scale.setScalar(size/Math.max(d.x,d.z));parent.add(root);
    clone.traverse(o=>{if(!(o instanceof THREE.Mesh))return;o.castShadow=o.receiveShadow=true;const convert=(m:THREE.Material)=>{const copy=material(m.clone());if(copy instanceof THREE.MeshStandardMaterial){copy.roughness=.65;copy.envMapIntensity=.8;}return copy;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});return {root,size:d};
  }
  function stoneAsset(stone:AdaviStone,parent:THREE.Object3D){const imported=asset(stone.model,parent,stone.size);if(imported)imported.root.scale.set(stone.size*stone.scale.x/imported.size.x,stone.size*stone.scale.y/imported.size.y,stone.size*stone.scale.z/imported.size.z);return imported?.root??null;}
  const stones=ADAVI_STONES.map(stone=>{const root=new THREE.Group();root.name='Pickup stone · '+stone.name;root.position.set(stone.position.x,adaviGround(stone.position.x,stone.position.z)+.008,stone.position.z);root.rotation.y=stone.rotation;group.add(root);stoneAsset(stone,root);return {stone,root};});
  const held=new THREE.Group();held.name='Held Adavi skipping stone';group.add(held);
  let heldId:string|null=null;
  const markerMat=material(new THREE.MeshBasicMaterial({color:0xf4dfa0,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));
  const marker=mesh(group,keep(new THREE.RingGeometry(.19,.205,36)),markerMat);marker.rotation.x=-Math.PI/2;marker.castShadow=false;marker.visible=false;
  const guideMaterial=material(new THREE.LineDashedMaterial({color:0xe7efc0,dashSize:.16,gapSize:.10,transparent:true,opacity:.85,depthTest:false}));
  const guide=new THREE.Line(keep(new THREE.BufferGeometry()),guideMaterial);guide.name='Parabolic stone trajectory guide';guide.frustumCulled=false;guide.renderOrder=6;group.add(guide);
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(ADAVI_THROW_START.x,ADAVI_THROW_START.y,ADAVI_THROW_START.z),1,0xf0d397,.12,.07);arrow.name='Stone release direction and power';group.add(arrow);
  materials.add(arrow.line.material as THREE.Material);materials.add(arrow.cone.material as THREE.Material);geometries.add(arrow.line.geometry);geometries.add(arrow.cone.geometry);
  const targetMat=material(new THREE.MeshBasicMaterial({color:0xd1dbaa,transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}));
  const target=mesh(group,keep(new THREE.RingGeometry(.55,.60,48)),targetMat,ADAVI_TARGET.x,adaviGround(ADAVI_TARGET.x,7)+.055,7);target.rotation.x=-Math.PI/2;target.castShadow=false;target.name='Opposite-bank landing marker';
  const landing=mesh(group,keep(new THREE.RingGeometry(.15,.18,32)),markerMat);landing.rotation.x=-Math.PI/2;landing.castShadow=false;landing.visible=false;
  // Reusable contact rings and droplets, created once. Each begins at its exact water intersection.
  const effects=Array.from({length:10},()=>{
    const root=new THREE.Group();root.visible=false;group.add(root);const ringMaterial=material(new THREE.MeshBasicMaterial({color:0xe0f2e7,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    const ring=mesh(root,keep(new THREE.RingGeometry(.80,1,40)),ringMaterial);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
    const pointsGeometry=keep(new THREE.BufferGeometry());const positions=new Float32Array(24*3);pointsGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const dropletsMat=material(new THREE.PointsMaterial({color:0xebfff3,size:.035,transparent:true,opacity:0,depthWrite:false}));const droplets=new THREE.Points(pointsGeometry,dropletsMat);droplets.frustumCulled=false;root.add(droplets);return {root,ring,ringMaterial,dropletsMat,pointsGeometry,positions};
  });
  const sphere=new THREE.Sphere(),hit=new THREE.Vector3(),world=new THREE.Vector3(),facing=new THREE.Vector3();
  let trajectory:SkipTrajectory|null=null,flightClock=0,lastPhase:SpringSave['skipPhase']='exploring',previewKey='',lastContact=0;
  const cameraPosition=new THREE.Vector3(),cameraLook=new THREE.Vector3(),trackingLook=new THREE.Vector3();let cameraBlend=0;
  const firstPersonPosition=new THREE.Vector3();
  function invalidateShadows(){group.parent?.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.shadow.needsUpdate=true;});}
  function targetAt(camera:THREE.Camera,ray:THREE.Raycaster,state:SpringSave){
    if(state.skipPhase!=='exploring'||state.adaviIntroStep<4||state.stoneChallengeComplete&&state.adaviWinStep<2||state.bagNoteOpen)return null;
    if(state.selectedStone||state.stoneChallengeComplete)return null;
    let best:{id:string;label:string;action:string;payload:string;distance:number}|null=null;
    for(const {stone,root} of stones){root.getWorldPosition(world);if(camera.position.distanceTo(world)>3.1)continue;sphere.set(world,.28);if(!ray.ray.intersectSphere(sphere,hit))continue;const distance=camera.position.distanceTo(hit);if(!best||distance<best.distance)best={id:stone.id,label:'Pick up '+stone.name.toLowerCase(),action:'pick-stone',payload:stone.id,distance};}return best;
  }
  return {group,target:targetAt,
    canPick(id:unknown,camera:THREE.Camera){const s=stones.find(s=>s.stone.id===id);return !!s&&Math.hypot(camera.position.x-ADAVI_ORIGIN-s.root.position.x,camera.position.z-s.root.position.z)<2.7;},
    get flying(){return trajectory!==null&&lastPhase==='flying';},
    get readyToFinish(){return !!trajectory&&flightClock>=trajectory.duration+.85;},
    get result(){return trajectory;},
    update(dt:number,state:SpringSave,camera:THREE.Camera,controller?:SpringTreasureController){
      const selected=ADAVI_STONES.find(stone=>stone.id===state.selectedStone);
      if(heldId!==state.selectedStone){held.clear();heldId=state.selectedStone;if(selected)stoneAsset(selected,held);invalidateShadows();}
      stones.forEach(({stone,root})=>root.visible=stone.id!==state.selectedStone);
      held.visible=!!selected&&(state.skipPhase==='exploring'||state.skipPhase==='aiming'||state.skipPhase==='flying');
      const view=state.skipPhase==='aiming'||state.skipPhase==='flying'||state.skipPhase==='result';
      if(view){
        if(!['aiming','flying','result'].includes(lastPhase)){cameraPosition.copy(camera.position);cameraLook.copy(camera.position);camera.getWorldDirection(facing);cameraLook.addScaledVector(facing,8);cameraBlend=0;}
        cameraBlend=Math.min(1,cameraBlend+dt/(reduced?.15:.65));const ease=cameraBlend*cameraBlend*(3-2*cameraBlend);
        // Keep the observer on the shore at eye level. Only the head follows the
        // thrown stone; the viewpoint never cuts to a spectator camera.
        const angle=(state.skipAim+skipConditions(state.skipSeed).drift)*Math.PI/180,aspect=camera instanceof THREE.PerspectiveCamera?camera.aspect:16/9,offset=Math.min(.35,Math.max(.04,aspect*.14));
        // Keep the suspended stone inside the frame when turning or using a narrow screen.
        firstPersonPosition.set(ADAVI_ORIGIN+ADAVI_THROW_START.x-Math.cos(angle)*.85+Math.sin(angle)*offset,1.80,ADAVI_THROW_START.z-Math.sin(angle)*.85-Math.cos(angle)*offset);
        camera.position.lerpVectors(cameraPosition,firstPersonPosition,ease);
        const to=new THREE.Vector3(firstPersonPosition.x+Math.cos(angle)*8,.22,firstPersonPosition.z+Math.sin(angle)*8);
        if(state.skipPhase==='flying'&&trajectory&&flightClock>=0){const follow=sampleSkip(trajectory,Math.min(trajectory.duration,flightClock+.24));to.set(follow.x+ADAVI_ORIGIN,follow.y+.12,follow.z);const delta=to.clone().sub(firstPersonPosition);delta.y=Math.max(-Math.hypot(delta.x,delta.z)*.55,delta.y);to.copy(firstPersonPosition).add(delta);}
        if(cameraBlend<1)trackingLook.copy(cameraLook).lerp(to,ease);else trackingLook.lerp(to,1-Math.exp(-dt*(reduced?30:7)));
        camera.lookAt(trackingLook);camera.updateMatrixWorld();
      }
      if(selected&&state.skipPhase==='aiming'){
        const key=[selected.id,state.skipPower,state.skipAngle,state.skipAim,state.skipSeed].join(':');if(key!==previewKey){previewKey=key;const prediction=simulateSkip(selected,{power:state.skipPower,angle:state.skipAngle,aim:state.skipAim,seed:state.skipSeed});guide.geometry.dispose();geometries.delete(guide.geometry);guide.geometry=keep(new THREE.BufferGeometry().setFromPoints(prediction.samples.map(p=>new THREE.Vector3(p.x,p.y+.018,p.z))));guide.computeLineDistances();landing.position.set(prediction.end.x,Math.max(ADAVI_WATER_LEVEL,adaviGround(prediction.end.x,prediction.end.z))+.025,prediction.end.z);}
        const heading=(state.skipAim+skipConditions(state.skipSeed).drift)*Math.PI/180,tilt=state.skipAngle*Math.PI/180;arrow.setDirection(new THREE.Vector3(Math.cos(heading)*Math.cos(tilt),-Math.sin(tilt),Math.sin(heading)*Math.cos(tilt)));arrow.setLength(.6+state.skipPower*.5,.12,.07);held.position.set(ADAVI_THROW_START.x,ADAVI_THROW_START.y,ADAVI_THROW_START.z);held.rotation.set(.04,0,0);
      }else if(selected&&state.skipPhase==='flying'){
        if(lastPhase!=='flying'){trajectory=simulateSkip(selected,{power:state.skipPower,angle:state.skipAngle,aim:state.skipAim,seed:state.skipSeed});flightClock=-ADAVI_THROW_WINDUP;lastContact=0;effects.forEach(e=>e.root.visible=false);}
        flightClock+=dt;const p=sampleSkip(trajectory!,Math.max(0,flightClock));held.position.set(p.x,p.y,p.z);held.rotation.set(.07,Math.max(0,flightClock)*24,.025);
        if(flightClock<0){const windup=Math.sin((flightClock+ADAVI_THROW_WINDUP)/ADAVI_THROW_WINDUP*Math.PI);held.position.x-=windup*.23;held.position.y+=windup*.06;held.position.z+=windup*.23;}
        for(const impact of trajectory!.impacts)if(flightClock>=impact.t&&impact.skip>lastContact){lastContact=impact.skip;controller?.act('skip-contact',lastContact);}
        if(flightClock>=trajectory!.duration+.85)controller?.act('finish-throw',{success:trajectory!.success,skips:trajectory!.skips,distance:trajectory!.distance,feedback:trajectory!.feedback});
      }else if(selected&&state.skipPhase==='exploring'){
        group.worldToLocal(camera.getWorldPosition(world));held.position.copy(world);held.quaternion.copy(camera.quaternion);held.translateX(.32);held.translateY(-.30);held.translateZ(-.65);held.rotation.z+=.13;
      }
      if(trajectory&&['flying','result'].includes(state.skipPhase))for(let i=0;i<effects.length;i++){
        const effect=effects[i],impact=trajectory.impacts[i],age=impact?flightClock-impact.t:-1;effect.root.visible=!!impact&&age>=0&&age<2.3;if(!effect.root.visible)continue;
        effect.root.position.set(impact.x,ADAVI_WATER_LEVEL+.018,impact.z);effect.ring.scale.setScalar(.10+age*.86);effect.ringMaterial.opacity=Math.max(0,.60*(1-age/2.3));effect.dropletsMat.opacity=Math.max(0,.9-age*1.6);
        for(let n=0;n<24;n++){const angle=n*2.39996,v=.45+(n%5)*.12,t=Math.min(age,.7);effect.positions[n*3]=Math.cos(angle)*v*t+age*.20;effect.positions[n*3+1]=Math.max(0,(1.05+(n%4)*.17)*t-3.8*t*t);effect.positions[n*3+2]=Math.sin(angle)*v*t;}effect.pointsGeometry.attributes.position.needsUpdate=true;
      }else effects.forEach(e=>e.root.visible=false);
      if(state.skipPhase==='result')flightClock+=dt;
      guide.visible=arrow.visible=landing.visible=state.skipPhase==='aiming';target.visible=view;
      marker.visible=false;if(state.skipPhase==='exploring'&&!state.selectedStone&&!state.stoneChallengeComplete){const nearest=stones.map(s=>({s,d:Math.hypot(camera.position.x-ADAVI_ORIGIN-s.root.position.x,camera.position.z-s.root.position.z)})).sort((a,b)=>a.d-b.d)[0];if(nearest&&nearest.d<2.3){marker.position.copy(nearest.s.root.position);marker.position.y+=.008;marker.visible=true;}}
      if(lastPhase!==state.skipPhase&&state.skipPhase==='exploring'){trajectory=null;previewKey='';}lastPhase=state.skipPhase;
    },
    stats:()=>({pickupStones:stones.length,trajectory:trajectory?{skips:trajectory.skips,success:trajectory.success,duration:trajectory.duration}:null}),
    dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();group.clear();}
  };
}
