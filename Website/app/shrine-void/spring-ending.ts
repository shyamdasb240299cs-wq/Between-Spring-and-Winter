import * as THREE from 'three';
import type {SpringSave,SpringTreasureController} from './spring-treasure-state';

type Pose={x:number;y:number;z:number;yaw:number;pitch:number};
/** The final walk uses the clear west-bank path and leaves the river untouched. */
export function createSpringEnding(source:THREE.Object3D,cover:THREE.Texture,height:(x:number,z:number)=>number,reduced:boolean,mobile:boolean){
  const group=new THREE.Group();group.name='Spring ending · book and falling blossoms';
  const book=source.clone(true);book.name='Part One · Spring';group.add(book);
  const ownMaterials:THREE.Material[]=[],ownGeometry:THREE.BufferGeometry[]=[];
  book.traverse(o=>{if(!(o instanceof THREE.Mesh))return;o.castShadow=o.receiveShadow=false;if(/^(PageEdge|TopPageEdge|WovenEndband|SpineFoil|BindingJoint)/.test(o.name))o.visible=false;if(o.name==='CoverArt'){const m=new THREE.MeshBasicMaterial({map:cover,side:THREE.DoubleSide});ownMaterials.push(m);o.material=m;}});
  const hinge=book.getObjectByName('CoverHinge');
  const pageGeometry=new THREE.PlaneGeometry(2.84,4.34);ownGeometry.push(pageGeometry);
  const pageMaterial=new THREE.MeshBasicMaterial({map:cover,side:THREE.DoubleSide});ownMaterials.push(pageMaterial);
  const titlePage=new THREE.Mesh(pageGeometry,pageMaterial);titlePage.position.z=.034;book.add(titlePage);
  if(hinge){const insideGeometry=new THREE.PlaneGeometry(2.98,4.48);ownGeometry.push(insideGeometry);const insideMaterial=new THREE.MeshBasicMaterial({color:0xf1e7d2,side:THREE.BackSide});ownMaterials.push(insideMaterial);const inside=new THREE.Mesh(insideGeometry,insideMaterial);inside.name='Ivory inside of the opened Spring cover';inside.position.set(1.5,0,-.021);hinge.add(inside);}
  const count=mobile?180:420,petalGeometry=new THREE.InstancedBufferGeometry(),quad=new THREE.PlaneGeometry(1,1);
  petalGeometry.index=quad.index;petalGeometry.attributes=quad.attributes;ownGeometry.push(petalGeometry);
  const seeds=new Float32Array(count*4);for(let i=0;i<seeds.length;i++)seeds[i]=(Math.sin(i*127.1+17)*43758.5453)%1+1,seeds[i]%=1;
  petalGeometry.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds,4));petalGeometry.instanceCount=count;
  const uniforms={elapsed:{value:0},gust:{value:0}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute vec4 seed;uniform float elapsed,gust;varying vec2 pUv;varying float fade;void main(){pUv=uv;float life=fract(seed.x+elapsed*.10);vec3 c=vec3(13.5+(seed.y-.5)*9.+sin(elapsed*.7+seed.w*20.)*.8+life*gust*2.,1.2+(1.-life)*6.,-17.+(seed.z-.5)*8.+life*gust*.6);float a=elapsed*(1.+seed.w)+seed.x*30.;vec3 p=position*(.045+seed.w*.045);p.xy=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xy;p.z+=sin(a)*p.x;fade=smoothstep(0.,.08,life)*(1.-smoothstep(.9,1.,life))*gust;gl_Position=projectionMatrix*viewMatrix*vec4(c+p,1.);}`,
    fragmentShader:`varying vec2 pUv;varying float fade;void main(){vec2 p=(pUv-.5)*vec2(2.1,1.7);float a=(1.-smoothstep(.65,.9,length(p)))*fade;if(a<.03)discard;gl_FragColor=vec4(mix(vec3(1.,.56,.71),vec3(1.,.9,.94),pUv.y),a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});ownMaterials.push(material);
  const petals=new THREE.Mesh(petalGeometry,material);petals.frustumCulled=false;group.add(petals);
  let phase='',elapsed=0,blossomTime=0,from:Pose|null=null,walkDuration=4,seated=false;
  const ease=(v:number)=>{const t=THREE.MathUtils.clamp(v,0,1);return t*t*(3-2*t);};
  const angle=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
  const seat:Pose={x:13.5,z:-17,y:height(13.5,-17)+1.15,yaw:-Math.PI/2,pitch:-.45};
  return {group,seat,
    update(dt:number,state:SpringSave,camera:THREE.Camera,pose:Pose,controller:SpringTreasureController){
      const active=['walking','sitting','opening'].includes(state.endingPhase);group.visible=active;
      if(!active){
        // A reader restored from storage skips the walk and sit animation.
        // Restore its bench pose once so closing it resumes on the same path.
        if(phase===''&&state.endingPhase==='reading'){
          Object.assign(pose,seat);camera.position.set(pose.x,pose.y,pose.z);
          camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');seated=true;
        }
        if(state.endingPhase==='complete'&&seated){
          // Resume on the clear path at standing height. Keeping the cinematic
          // seat height makes normal walking reject the 48 cm step to ground.
          pose.x=12.5;pose.z=seat.z;pose.y=height(pose.x,pose.z)+1.63;
          camera.position.set(pose.x,pose.y,pose.z);seated=false;
        }
        phase=state.endingPhase;return;
      }
      if(phase!==state.endingPhase){phase=state.endingPhase;elapsed=0;from={...pose};if(phase==='walking')walkDuration=Math.max(3,Math.hypot(pose.x-12.5,pose.z+17)/1.65);}
      elapsed+=dt;if(phase==='walking')blossomTime=0;else blossomTime+=dt;const start=from!;
      if(phase==='walking'){
        const u=ease(elapsed/walkDuration),x=THREE.MathUtils.lerp(start.x,12.5,u),z=THREE.MathUtils.lerp(start.z,-17,u);
        pose.x=x;pose.z=z;pose.y=THREE.MathUtils.lerp(start.y,height(x,z)+1.63,ease(elapsed/(reduced?.15:.9)))+(reduced?0:Math.sin(elapsed*8)*.015*Math.sin(Math.PI*u));pose.yaw=angle(start.yaw,-Math.PI/2,ease(elapsed/1.5));pose.pitch=THREE.MathUtils.lerp(start.pitch,-.12,ease(elapsed));
        if(elapsed>=walkDuration)controller.act('ending-phase','sitting');
      }else if(phase==='sitting'){
        seated=true;
        const u=ease(elapsed/2);pose.x=THREE.MathUtils.lerp(start.x,seat.x,u);pose.z=seat.z;pose.y=THREE.MathUtils.lerp(start.y,seat.y,u);pose.yaw=angle(start.yaw,seat.yaw,u);pose.pitch=THREE.MathUtils.lerp(start.pitch,seat.pitch,ease(elapsed/3));
        if(elapsed>=3.5)controller.act('ending-phase','opening');
      }else {Object.assign(pose,seat);if(elapsed>=4.5)controller.act('ending-phase','reading');}
      camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');
      book.position.copy(camera.position);book.quaternion.copy(camera.quaternion);book.translateZ(-.65);book.translateY(phase==='walking'?-.31:-.14);book.rotateX(-.25);book.scale.setScalar(.085);
      if(hinge)hinge.rotation.y=phase==='opening'?-Math.PI*.91*ease(elapsed/3.5):0;
      petals.visible=!reduced&&phase!=='walking';uniforms.elapsed.value=blossomTime;uniforms.gust.value=ease(blossomTime/1.8);
    },
    dispose(){ownGeometry.forEach(g=>g.dispose());ownMaterials.forEach(m=>m.dispose());group.removeFromParent();group.clear();}
  };
}
