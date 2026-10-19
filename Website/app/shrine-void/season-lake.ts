import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {AUTUMN_LAKE,AUTUMN_LAKE_LEVEL,autumnLakeDistance,groundGLSL,groundHeight,random} from './season-layout';
import {createLakeFish} from './season-fish';

const lakeSurface=`
  uniform float lakeTime;uniform vec4 lakeImpacts[8];
  ${groundGLSL}
  vec3 lakeWave(vec2 p){
    float a=dot(p,vec2(.73,.37))-lakeTime*.8,b=dot(p,vec2(-1.1,.68))-lakeTime*1.1;
    vec3 wave=vec3(sin(a)*.007+sin(b)*.003,cos(a)*.007*.73-cos(b)*.003*1.1,cos(a)*.007*.37+cos(b)*.003*.68);
    for(int i=0;i<8;i++){float age=lakeTime-lakeImpacts[i].z;if(age<0.||age>4.)continue;vec2 delta=p-lakeImpacts[i].xy;float r=length(delta),front=r-age*.85,envelope=exp(-front*front*7.-age*.8)*smoothstep(0.,.12,age);wave.x+=sin(front*24.)*.014*envelope;wave.yz+=normalize(delta+vec2(.0001))*cos(front*24.)*.26*envelope;}return wave;
  }
`;

/** A single small reflection pass shows the real trees and their sunlit bank. */
export function createAutumnLake(scene:THREE.Scene,sky:THREE.Texture,normals:THREE.Texture,reduced:boolean,mobile:boolean,shorePlantSource?:THREE.Object3D){
  const impacts=Array.from({length:8},()=>new THREE.Vector4(0,0,-100,0));let impactSlot=0,rippleCount=0,lastStep=0,lastX=0,lastZ=0;
  const ripple=(x:number,z:number,t:number)=>{if(autumnLakeDistance(x,z)>=1||groundHeight('autumn',x,z)>=AUTUMN_LAKE_LEVEL)return false;impacts[impactSlot].set(x,z,t,1);impactSlot=(impactSlot+1)%8;rippleCount++;return true;};
  const fish=createLakeFish(mobile,reduced,ripple);scene.add(fish.mesh);
  const uniforms={lakeFish:{value:fish.states},fishHeadings:{value:fish.headings},lakeImpacts:{value:impacts},lakeTime:{value:0},normalSampler:{value:normals},skySampler:{value:sky},reflectionEnabled:{value:mobile?0:1},lakeFog:{value:new THREE.Color(0xd7ad7d)}};
  const geometry=new THREE.PlaneGeometry(23,16,mobile?24:40,mobile?18:28);
  const mesh=new Reflector(geometry,{textureWidth:mobile?256:384,textureHeight:256,multisample:0,clipBias:.002,
    shader:{name:'AutumnLakesideReflection',uniforms:{...uniforms,tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},color:{value:new THREE.Color(0xffffff)}},
      vertexShader:`uniform mat4 textureMatrix;varying vec3 vLakeWorld;varying vec4 vLakeReflection;${lakeSurface}
        void main(){vec4 world=modelMatrix*vec4(position,1.);world.y+=lakeWave(world.xz).x;vLakeWorld=world.xyz;vLakeReflection=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*world;}`,
      fragmentShader:`uniform sampler2D tDiffuse,normalSampler,skySampler;uniform float reflectionEnabled;uniform vec3 lakeFog;uniform vec4 lakeFish[8];uniform vec2 fishHeadings[8];varying vec3 vLakeWorld;varying vec4 vLakeReflection;${lakeSurface}
        float lakeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float lakeNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(lakeHash(i),lakeHash(i+vec2(1.,0.)),f.x),mix(lakeHash(i+vec2(0.,1.)),lakeHash(i+vec2(1.,1.)),f.x),f.y);}
        vec3 lakeSky(vec3 ray){vec2 uv=vec2(atan(ray.z,ray.x)*.15915494+.5+2.4*.15915494,asin(clamp(ray.y,-1.,1.))*.31830989+.5);return texture2D(skySampler,uv).rgb;}
        void main(){vec2 pos=vLakeWorld.xz;float shore=autumnLakeAt(pos),depth=vLakeWorld.y-groundAt(pos,2);if(shore>1.025||depth<.002)discard;
          vec3 waves=lakeWave(pos);vec3 detail=texture2D(normalSampler,pos*.24+vec2(lakeTime*.004,lakeTime*.002)).xyz*2.-1.;
          vec3 detail2=texture2D(normalSampler,pos*.47+vec2(-lakeTime*.003,lakeTime*.004)).xyz*2.-1.;
          vec3 n=normalize(vec3(-waves.y+(detail.x+detail2.x)*.021,1.,-waves.z+(detail.y+detail2.y)*.021));
          vec3 view=normalize(cameraPosition-vLakeWorld),ray=reflect(-view,n);float fresnel=.025+.975*pow(1.-max(0.,dot(n,view)),5.);
          vec3 reflection=lakeSky(ray);vec2 ruv=vLakeReflection.xy/max(.0001,vLakeReflection.w)+n.xz*.025;
          if(reflectionEnabled>.5&&all(greaterThan(ruv,vec2(.002)))&&all(lessThan(ruv,vec2(.998))))reflection=texture2D(tDiffuse,ruv).rgb;
          vec3 mud=vec3(.17,.15,.075)*(.85+lakeNoise(pos*4.)*.25);vec3 deep=vec3(.019,.074,.065);
          vec3 body=mix(deep,mud,exp(-depth*2.7));
          // Small refracted silhouettes below the water; the matching 3D fish emerge on a leap.
          if(length(cameraPosition-vLakeWorld)<24.)for(int i=0;i<8;i++){
            float fishDepth=-.08-lakeFish[i].z;if(fishDepth<.015)continue;
            vec2 delta=pos+n.xz*fishDepth*.6-lakeFish[i].xy;if(dot(delta,delta)>.20)continue;
            vec2 heading=fishHeadings[i];vec2 q=vec2(dot(delta,vec2(heading.y,-heading.x)),dot(delta,heading))/lakeFish[i].w;
            q.x+=sin(lakeTime*12.+q.y*22.+float(i))*smoothstep(.02,.22,-q.y)*.024;
            float bodyMask=1.-smoothstep(.82,1.,length(q/vec2(.048,.17)));
            float tailMask=(1.-smoothstep(.012,.023,abs(q.x)-max(0.,-q.y-.12)*.65))*smoothstep(.12,.15,-q.y)*(1.-smoothstep(.21,.24,-q.y));
            float visibility=max(bodyMask,tailMask*.75)*exp(-fishDepth*2.0);
            body=mix(body,vec3(.18,.22,.13)*(1.+smoothstep(-.035,.035,q.x)*.6),visibility*.82);
          }
          vec3 colour=mix(body,reflection,clamp(.14+fresnel*.82,0.,1.));
          vec3 halfSun=normalize(view+normalize(vec3(-.5,.38,-1.)));colour+=vec3(1.,.76,.43)*pow(max(0.,dot(n,halfSun)),250.)*1.6;
          float edge=(1.-smoothstep(.006,.075,depth))*(.25+.75*lakeNoise(pos*12.+lakeTime*.025));colour=mix(colour,vec3(.52,.47,.30),edge*.18);
          float distanceToEye=length(cameraPosition-vLakeWorld);colour=mix(colour,lakeFog,1.-exp(-distanceToEye*.002));gl_FragColor=vec4(colour,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }});
  mesh.name='Autumn lake · reflected canopy and shallow banks';mesh.rotation.x=-Math.PI/2;mesh.position.set(AUTUMN_LAKE.x,AUTUMN_LAKE_LEVEL,AUTUMN_LAKE.z);mesh.frustumCulled=false;scene.add(mesh);
  Object.assign((mesh.material as THREE.ShaderMaterial).uniforms,uniforms);
  // This shares the water geometry and samples the already baked tree shadow map.
  const shadowMaterial=new THREE.ShadowMaterial({color:0x182822,opacity:.24,transparent:true,depthWrite:false});
  shadowMaterial.onBeforeCompile=shader=>{
    shader.uniforms.lakeTime=uniforms.lakeTime;shader.uniforms.lakeImpacts=uniforms.lakeImpacts;
    shader.vertexShader=`varying vec3 vLakeShadowWorld;${lakeSurface}\n`+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvec3 waterWorld=(modelMatrix*vec4(transformed,1.)).xyz;transformed.z+=lakeWave(waterWorld.xz).x+.002;vLakeShadowWorld=(modelMatrix*vec4(transformed,1.)).xyz;`);
    shader.fragmentShader=`varying vec3 vLakeShadowWorld;${groundGLSL}\n`+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(autumnLakeAt(vLakeShadowWorld.xz)>1.025||vLakeShadowWorld.y-groundAt(vLakeShadowWorld.xz,2)<.002)discard;');
  };
  const shadows=new THREE.Mesh(geometry,shadowMaterial);shadows.name='Lake canopy shadows';shadows.position.copy(mesh.position);shadows.quaternion.copy(mesh.quaternion);shadows.receiveShadow=true;shadows.frustumCulled=false;shadows.renderOrder=1;shadows.userData.skipLakeReflection=true;scene.add(shadows);
  const reflect=mesh.onBeforeRender.bind(mesh),capturedCamera=new THREE.Matrix4(),capturedProjection=new THREE.Matrix4();let reflection=mobile?0:1,lastCapture=-Infinity;
  mesh.onBeforeRender=(renderer,world,camera,g,m,group)=>{
    if(!reflection)return;const now=performance.now()/1000;
    const moving=!capturedCamera.equals(camera.matrixWorld)||!capturedProjection.equals(camera.projectionMatrix);
    if(!moving&&now-lastCapture<.1)return;
    // Capture the current camera on every walking/turning frame. The dedicated
    // reflection layer uses inexpensive, complete canopies, with no leaf litter.
    mesh.getReflectionCamera(camera).layers.set(1);
    reflect(renderer,world,camera,g,m,group);lastCapture=now;capturedCamera.copy(camera.matrixWorld);capturedProjection.copy(camera.projectionMatrix);
  };
  const shore=new THREE.Group();shore.name='Scanned lakeside grasses';scene.add(shore);
  const shoreGeometries:THREE.BufferGeometry[]=[],shoreMaterials:THREE.Material[]=[],shoreBatches:THREE.InstancedMesh[]=[];
  if(shorePlantSource){
    shorePlantSource.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(shorePlantSource),height=Math.max(.01,bounds.max.y-bounds.min.y),centre=bounds.getCenter(new THREE.Vector3()),placements:{x:number;z:number;scale:number;yaw:number}[]=[];
    for(let n=0;n<(mobile?28:52);n++){
      const seed=n+872,a=random(seed)*Math.PI*2;
      // Keep the near bank and path open; grass grows in loose side and far-bank patches.
      if(a>.18&&a<2.74)continue;
      const r=1.045+random(seed+1)*.09,x=AUTUMN_LAKE.x+Math.cos(a)*AUTUMN_LAKE.radiusX*r,z=AUTUMN_LAKE.z+Math.sin(a)*AUTUMN_LAKE.radiusZ*r;
      if(autumnLakeDistance(x,z)<1.025||autumnLakeDistance(x,z)>1.2)continue;
      placements.push({x,z,scale:(.48+random(seed+2)*.45)/height,yaw:random(seed+3)*Math.PI*2});
    }
    const transform=new THREE.Object3D();
    shorePlantSource.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;
      const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.translate(-centre.x,-bounds.min.y,-centre.z);shoreGeometries.push(g);
      const material=o.material.clone() as THREE.MeshStandardMaterial;material.color.multiply(new THREE.Color(0xbdb87b));material.roughness=.92;material.side=THREE.DoubleSide;material.transparent=false;material.alphaTest=Math.max(.36,material.alphaTest);shoreMaterials.push(material);
      const batch=new THREE.InstancedMesh(g,material,placements.length);batch.castShadow=batch.receiveShadow=true;
      placements.forEach((p,i)=>{transform.position.set(p.x,groundHeight('autumn',p.x,p.z)-.025,p.z);transform.rotation.set(0,p.yaw,0);transform.scale.setScalar(p.scale);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);});batch.computeBoundingSphere();shore.add(batch);shoreBatches.push(batch);
    });
  }
  return {mesh,shore,shadows,
    get fishJumps(){return fish.jumps;},
    get rippleCount(){return rippleCount;},
    setQuality(q:number){reflection=mobile?0:1;uniforms.reflectionEnabled.value=reflection;const target=mesh.getRenderTarget(),width=q<.7?256:384,height=q<.7?176:256;if(target.width!==width||target.height!==height){target.setSize(width,height);lastCapture=-Infinity;}},
    ripple,
    update(time:number,camera:THREE.Camera,moving=false){uniforms.lakeTime.value=reduced?0:time;fish.update(time);const x=camera.position.x,z=camera.position.z;if(!reduced&&moving&&groundHeight('autumn',x,z)<AUTUMN_LAKE_LEVEL&&time-lastStep>.35&&Math.hypot(x-lastX,z-lastZ)>.35){ripple(x,z,time);lastStep=time;lastX=x;lastZ=z;}},
    dispose(){fish.dispose();scene.remove(fish.mesh);mesh.dispose();geometry.dispose();shadowMaterial.dispose();shoreBatches.forEach(b=>b.dispose());shoreGeometries.forEach(g=>g.dispose());shoreMaterials.forEach(m=>m.dispose());scene.remove(mesh,shore,shadows);shore.clear();},
  };
}
