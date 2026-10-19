import * as THREE from 'three';

/** Four recent contacts plus one visitor position, shared by every instanced tile. */
export function createGroundMotion(){
  const time={value:0},walker={value:new THREE.Vector3(1000,1000,0)},contacts={value:Array.from({length:4},()=>new THREE.Vector4(0,0,-100,0))};
  let slot=0,lastX=1000,lastZ=1000,lastStep=-1;
  return {
    disturb(x:number,z:number,t:number){contacts.value[slot].set(x,z,t,1);slot=(slot+1)%4;},
    update(t:number,camera:THREE.Camera,moving:boolean){time.value=t;walker.value.set(camera.position.x,camera.position.z,1);
      if(moving&&t-lastStep>.22&&Math.hypot(camera.position.x-lastX,camera.position.z-lastZ)>.32){this.disturb(camera.position.x,camera.position.z,t);lastX=camera.position.x;lastZ=camera.position.z;lastStep=t;}
    },
    apply(material:THREE.MeshStandardMaterial|THREE.MeshLambertMaterial,kind:'grass'|'leaf'|'petal'){
      const previous=material.onBeforeCompile.bind(material);
      material.customProgramCacheKey=()=>`ground-contact-${kind}-v1`;
      material.onBeforeCompile=(shader,renderer)=>{
        previous(shader,renderer);Object.assign(shader.uniforms,{contactTime:time,groundWalker:walker,groundContacts:contacts});
        shader.vertexShader='uniform float contactTime;uniform vec3 groundWalker;uniform vec4 groundContacts[4];\n'+shader.vertexShader.replace('#include <project_vertex>',`
          vec2 root=instanceMatrix[3].xz,delta=root-groundWalker.xy;float reach=1.-smoothstep(.12,.85,length(delta));
          vec2 away=normalize(delta+vec2(.001));float burst=0.;vec2 impulse=vec2(0.);
          for(int c=0;c<4;c++){float age=contactTime-groundContacts[c].z;if(age<0.||age>2.4)continue;vec2 offset=root-groundContacts[c].xy;
            float strength=(1.-smoothstep(.12,1.0,length(offset)))*exp(-age*2.1)*smoothstep(0.,.13,age);
            burst=max(burst,strength);impulse+=normalize(offset+vec2(.001))*strength;
          }
          vec3 worldOffset=vec3(0.);float contactPhase=root.x*1.7+root.y*2.3;
          ${kind==='grass'?`float bladeHeight=clamp(position.y,0.,1.);worldOffset.xz=away*reach*.10*bladeHeight+vec2(sin(contactTime*1.1+contactPhase),cos(contactTime*.8+contactPhase))*.012*bladeHeight;worldOffset.y=-reach*.045*bladeHeight;`:
          `float flutter=sin(contactTime*2.2+contactPhase);worldOffset.xz=impulse*.16+vec2(flutter,cos(contactTime*1.4+contactPhase))*.005;worldOffset.y=burst*(.065+.025*sin(contactPhase))+abs(flutter)*.003;`}
          // Invert only the orthogonal scale/rotation of an instance; no matrix inverse per vertex.
          transformed+=vec3(dot(worldOffset,instanceMatrix[0].xyz)/dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),dot(worldOffset,instanceMatrix[1].xyz)/dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),dot(worldOffset,instanceMatrix[2].xyz)/dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz));
          #include <project_vertex>`);
      };
    },
  };
}
export type GroundMotion=ReturnType<typeof createGroundMotion>;
