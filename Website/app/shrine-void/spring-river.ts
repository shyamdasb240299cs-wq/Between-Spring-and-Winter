import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SPRING_POND,SPRING_BRIDGE,SPRING_LAKE_BENCH,SPRING_RIVER_REACH,springRiverCentre,springRiverWidth,springPathDistance} from './spring-treasure-layout';
import {SPRING_WATER_IMPACT_GLSL} from './spring-water-ripples';
import {springBridgeHeight,groundGLSL} from './season-layout';
import type {GroundMaps} from './season-terrain';

interface Options {models:Record<string,THREE.Object3D>;wood:THREE.Texture;maps:{rock:GroundMaps;water:THREE.Texture};height:(x:number,z:number)=>number;mobile:boolean;reduced:boolean;}
/** A continuous planted river, a gently arched timber crossing and a bank-side resting bench. */
export function createSpringRiver({models,wood,maps,height,mobile,reduced}:Options){
  const group=new THREE.Group();group.name='Spring · long river and timber bridge';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const keep=<T extends THREE.BufferGeometry>(g:T)=>{geometries.add(g);return g;};
  const material=<T extends THREE.Material>(m:T)=>{materials.add(m);return m;};
  const standard=(p:THREE.MeshStandardMaterialParameters)=>material(new THREE.MeshStandardMaterial(p));
  const normal=maps.water.clone();normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.needsUpdate=true;textures.add(normal);
  const timber=standard({map:wood,color:0x807059,roughness:.79,normalScale:new THREE.Vector2(.25,.25)});
  const endGrain=standard({map:wood,color:0x62533e,roughness:.9});
  const grain=Array.from({length:5},(_,i)=>standard({map:wood,color:new THREE.Color(0xa08a68).multiplyScalar(.87+i*.045),roughness:.78+i*.025}));
  const bolt=standard({color:0x4c524d,metalness:.78,roughness:.52});
  function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function box(parent:THREE.Object3D,w:number,h:number,d:number,m:THREE.Material,x=0,y=0,z=0){return mesh(parent,keep(new RoundedBoxGeometry(w,h,d,2,Math.min(.012,w*.2,h*.2,d*.2))),m,x,y,z);}
  function beam(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,w:number,d:number,m:THREE.Material){const o=box(parent,a.distanceTo(b),w,d,m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),b.clone().sub(a).normalize());return o;}
  function imported(key:string,x:number,z:number,size:number,yaw:number){const source=models[key];if(!source)return null;source.updateMatrixWorld(true);const root=new THREE.Group(),copy=source.clone(true),bounds=new THREE.Box3().setFromObject(copy),s=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());copy.position.sub(new THREE.Vector3(centre.x,bounds.min.y,centre.z));root.add(copy);root.scale.setScalar(size/Math.max(.001,s.x,s.z));root.position.set(x,height(x,z)-.025,z);root.rotation.y=yaw;root.name='River bank · '+key;copy.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=o.receiveShadow=true;const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.every(m=>!m.transparent))o.renderOrder=-20;}});group.add(root);return root;}

  // Vertices follow the real sinuous banks. No large water rectangle can protrude through land.
  const positions:number[]=[],uv:number[]=[],rows=mobile?400:640,columns=mobile?8:12;
  const point=(row:number,column:number)=>{const z=SPRING_RIVER_REACH.minZ+row/rows*(SPRING_RIVER_REACH.maxZ-SPRING_RIVER_REACH.minZ),x=springRiverCentre(z)+(column/columns*2-1)*springRiverWidth(z)*1.025;return [x,-z,0];};
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++)for(const p of [point(row,col),point(row+1,col),point(row,col+1),point(row,col+1),point(row+1,col),point(row+1,col+1)]){positions.push(...p);uv.push(p[0]*.25,-p[1]*.25);}
  const waterGeometry=keep(new THREE.BufferGeometry());waterGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));waterGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));waterGeometry.computeVertexNormals();
  const nightFog=new THREE.Color(0x101927);
  const uniforms={time:{value:0},impactTime:{value:0},normalSampler:{value:normal},bedMap:{value:maps.rock.color},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},color:{value:new THREE.Color(0xffffff)},riverFog:{value:new THREE.Color(0xc0c9c1)},rain:{value:0},night:{value:0}};
  const water=new Reflector(waterGeometry,{textureWidth:mobile?384:768,textureHeight:mobile?256:512,multisample:0,clipBias:.003,shader:{name:'SpringMeanderingRiver',uniforms,
    vertexShader:`uniform mat4 textureMatrix;uniform float time;varying vec3 riverWorld;varying vec4 riverReflection;
      void main(){vec4 world=modelMatrix*vec4(position,1.);world.y+=sin(world.z*1.24-world.x*.31-time*.27)*.003+sin(world.x*2.3+world.z*.6-time*.18)*.0015;riverWorld=world.xyz;riverReflection=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform sampler2D tDiffuse,normalSampler,bedMap;uniform float time,impactTime,rain,night;uniform vec3 riverFog;varying vec3 riverWorld;varying vec4 riverReflection;
      ${groundGLSL}
      ${SPRING_WATER_IMPACT_GLSL}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      // Inside the channel groundAt is exactly the carved basin. Avoid computing
      // unrelated forest hills and classroom/railway terrain at every water pixel.
      void main(){vec2 p=riverWorld.xz;float shore=springPondAt(p),depth=clamp((1.-shore)*1.8,-.42,.7);if(shore>1.02||depth<.002)discard;
        float along=p.y,across=p.x-springRiverCentreAt(along);
        vec2 current=vec2(across,along),flow=vec2(.0018,.025)*time;vec3 a=texture2D(normalSampler,current*.21-flow).xyz*2.-1.;vec3 b=texture2D(normalSampler,current*.57-flow*1.47+vec2(.27,.13)).xyz*2.-1.;
        float tangent=(springRiverCentreAt(along+.1)-springRiverCentreAt(along-.1))/.2;
        vec2 grade=vec2((a.x+b.x)*.018,(a.y+b.y)*.018);grade.y-=grade.x*tangent;
        vec3 n=normalize(vec3(grade.x,1.,grade.y));
        // World-anchored drops share their positions and ages with the 3D splash pool.
        // Neighbouring cells contribute expanding, damped rings without tile seams.
        n=normalize(n+vec3(springRainRippleGrade(p,impactTime,rain),0.).xzy);
        vec3 view=normalize(cameraPosition-riverWorld);float fresnel=.025+.975*pow(1.-max(0.,dot(n,view)),5.);vec2 reflectedUV=riverReflection.xy/max(.0001,riverReflection.w)+n.xz*.014;
        vec3 reflection=texture2D(tDiffuse,clamp(reflectedUV,vec2(.001),vec2(.999))).rgb;
        vec2 refracted=p*.73+n.xz*depth*.85;vec3 bed=texture2D(bedMap,refracted).rgb*vec3(.40,.45,.33);float caustic=pow(max(0.,sin(p.x*7.+a.x*.6-time*.2))*max(0.,cos(p.y*6.+b.y*.8-time*.17)),8.);bed+=vec3(.08,.10,.06)*caustic*exp(-depth*1.8)*(1.-rain*.7);
        vec3 transmission=exp(-depth*vec3(2.8,1.65,1.25));vec3 body=(bed*transmission+vec3(.024,.066,.057)*(1.-transmission))*mix(1.,.08,night);vec3 colour=mix(body,reflection,clamp(.08+fresnel*.92,.08,.985));
        vec3 halfLight=normalize(view+normalize(vec3(-.34,.77,.38)));colour+=vec3(1.,.94,.80)*pow(max(0.,dot(n,halfLight)),420.)*.30*(1.-rain*.7)*(1.-night);
        float edge=(1.-smoothstep(.008,.06,depth))*(.18+.82*noise(p*13.-flow*2.));float foam=edge*smoothstep(.42,.76,noise(p*7.-vec2(0.,time*.06)))*.16;colour=mix(colour,vec3(.64,.71,.65),foam);
        float fogDensity=mix(mix(.0055,.012,rain),.014,night);float fogDistance=length(cameraPosition-riverWorld);colour=mix(colour,riverFog,1.-exp(-fogDistance*fogDistance*fogDensity*fogDensity));gl_FragColor=vec4(colour,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`}});
  const waterMaterial=water.material as THREE.ShaderMaterial;waterMaterial.uniforms.normalSampler.value=normal;waterMaterial.uniforms.bedMap.value=maps.rock.color;waterMaterial.side=THREE.DoubleSide;materials.add(waterMaterial);water.name='Slow flowing reflective Spring river';water.rotation.x=-Math.PI/2;water.position.y=SPRING_POND.level;
  // Off-screen river geometry must not trigger a second render of the entire
  // world while the visitor is looking along the railway or inside the coach.
  water.geometry.computeBoundingSphere();water.geometry.boundingSphere!.radius+=.01;water.frustumCulled=true;
  // This shader already supplies the submerged bed. Write its opaque depth before
  // the terrain's expensive grass/PBR shader, so hidden riverbed pixels are rejected.
  water.renderOrder=-10;group.add(water);
  const shadows=mesh(group,waterGeometry,material(new THREE.ShadowMaterial({color:0x23362e,opacity:.16,transparent:true,depthWrite:false,side:THREE.DoubleSide})));shadows.rotation.copy(water.rotation);shadows.position.y=SPRING_POND.level+.005;shadows.castShadow=false;shadows.renderOrder=1;shadows.userData.skipRiverReflection=true;
  const capture=water.onBeforeRender,cameraMatrix=new THREE.Matrix4(),projection=new THREE.Matrix4(),frustum=new THREE.Frustum(),viewProjection=new THREE.Matrix4(),reachBounds:THREE.Box3[]=[];
  for(let z=SPRING_RIVER_REACH.minZ;z<SPRING_RIVER_REACH.maxZ;z+=8){const xs=[z,z+4,z+8].map(p=>springRiverCentre(p)),width=5.3;reachBounds.push(new THREE.Box3(new THREE.Vector3(Math.min(...xs)-width,SPRING_POND.level-.02,z),new THREE.Vector3(Math.max(...xs)+width,SPRING_POND.level+.02,z+8)));}
  let reflectionCaptures=0,capturedRain=-1,capturedNight=-1;
  water.onBeforeRender=(renderer,scene,camera,g,m,renderGroup)=>{
    // A stationary view reuses its capture; every movement or resize updates at once.
    frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    if(!reachBounds.some(bounds=>frustum.intersectsBox(bounds)))return;
    const rain=waterMaterial.uniforms.rain.value,night=waterMaterial.uniforms.night.value;
    if(cameraMatrix.equals(camera.matrixWorld)&&projection.equals(camera.projectionMatrix)&&Math.abs(rain-capturedRain)<.025&&Math.abs(night-capturedNight)<.025)return;
    const hidden:THREE.Object3D[]=[];scene.traverse(o=>{if(o.visible&&(o.userData.skipRiverReflection||o.userData.skipOceanReflection&&o.name!=='Continuous raincloud and night sky'||/held |floating equipped|food-to-mouth/i.test(o.name))){hidden.push(o);o.visible=false;}});
    try{capture.call(water,renderer,scene,camera,g,m,renderGroup);cameraMatrix.copy(camera.matrixWorld);projection.copy(camera.projectionMatrix);capturedRain=rain;capturedNight=night;reflectionCaptures++;}finally{hidden.forEach(o=>{o.visible=true;});}
  };

  // An eroded gravel margin follows the terrain, darkening at its wet inner edge.
  const bankPositions:number[]=[],bankUV:number[]=[],bankColours:number[]=[],bankAlpha:number[]=[],bankRows=mobile?400:640,bankColumns=4;
  for(const sign of [-1,1])for(let row=0;row<bankRows;row++)for(let col=0;col<bankColumns;col++){
    const point=(r:number,c:number)=>{const z=SPRING_RIVER_REACH.minZ+r/bankRows*(SPRING_RIVER_REACH.maxZ-SPRING_RIVER_REACH.minZ),t=c/bankColumns,w=springRiverWidth(z),edge=1.004+t*(.21+Math.sin(z*.9)*.014),x=springRiverCentre(z)+sign*w*edge;return {x,z,t,y:height(x,z)+.013};};
    for(const p of [point(row,col),point(row+1,col),point(row,col+1),point(row,col+1),point(row+1,col),point(row+1,col+1)]){bankPositions.push(p.x,p.y,p.z);bankUV.push(p.x*.68,p.z*.68);const wet=.62+p.t*.28;bankColours.push(wet*.89,wet*.94,wet*.80);bankAlpha.push((1-p.t*p.t)*.88);}
  }
  const bankGeometry=keep(new THREE.BufferGeometry());bankGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bankPositions,3));bankGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(bankUV,2));bankGeometry.setAttribute('color',new THREE.Float32BufferAttribute(bankColours,3));bankGeometry.setAttribute('bankFade',new THREE.Float32BufferAttribute(bankAlpha,1));bankGeometry.computeVertexNormals();
  const bankMaterial=standard({map:maps.rock.color,normalMap:maps.rock.normal,roughnessMap:maps.rock.roughness,normalScale:new THREE.Vector2(.36,.36),vertexColors:true,color:0xc6c2a5,roughness:.81,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  bankMaterial.onBeforeCompile=s=>{s.vertexShader='attribute float bankFade;varying float vBankFade;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBankFade=bankFade;');s.fragmentShader='varying float vBankFade;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vBankFade;').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.44,vBankFade*.55);');};
  const banks=mesh(group,bankGeometry,bankMaterial);banks.name='Wet gravel and moss at the eroded river banks';banks.castShadow=false;banks.renderOrder=1;

  const bridge=new THREE.Group();bridge.name='Fourteen metre arched timber footbridge';bridge.position.set(SPRING_BRIDGE.x,0,SPRING_BRIDGE.z);group.add(bridge);
  const deck=(x:number)=>springBridgeHeight(SPRING_BRIDGE.x+x,SPRING_BRIDGE.z)??height(SPRING_BRIDGE.x+x,SPRING_BRIDGE.z),length=SPRING_BRIDGE.halfLength*2,planks=68;
  for(let n=0;n<planks;n++){const x=-SPRING_BRIDGE.halfLength+(n+.5)*length/planks,y=deck(x),slope=(deck(x+.04)-deck(x-.04))/.08;
    const plank=box(bridge,length/planks-.008,.055,SPRING_BRIDGE.halfWidth*2,grain[n%grain.length],x,y-.0275);plank.rotation.z=Math.atan(slope);
    for(const z of [-.74,.74]){const nail=mesh(bridge,keep(new THREE.CylinderGeometry(.008,.008,.003,6)),bolt,x,y+.001,z);nail.castShadow=false;}
  }
  // Four curved stringers, paired low rails and a continuous graspable top rail.
  for(const z of [-.76,.76])for(let n=0;n<34;n++){const x=-SPRING_BRIDGE.halfLength+n*length/34,next=x+length/34;beam(bridge,new THREE.Vector3(x,deck(x)-.15,z),new THREE.Vector3(next,deck(next)-.15,z),.18,.13,endGrain);}
  const posts=10;
  for(let n=0;n<=posts;n++){const x=-SPRING_BRIDGE.halfLength+.16+n*(length-.32)/posts,y=deck(x);
    for(const z of [-1.01,1.01]){box(bridge,.105,1.04,.105,timber,x,y+.48,z);box(bridge,.14,.045,.14,endGrain,x,y+1.02,z);
      for(const lift of [.30,.69]){const screw=mesh(bridge,keep(new THREE.CylinderGeometry(.014,.014,.012,8)),bolt,x,y+lift,z+Math.sign(z)*.058);screw.rotation.x=Math.PI/2;}
      if(n<posts){const next=x+(length-.32)/posts;for(const lift of [.48,.98])beam(bridge,new THREE.Vector3(x,deck(x)+lift,z),new THREE.Vector3(next,deck(next)+lift,z),lift>.5?.073:.05,.067,timber);}
    }
  }
  for(const x of [-3.45,3.45])for(const z of [-.72,.72]){const worldX=SPRING_BRIDGE.x+x,bank=height(worldX,SPRING_BRIDGE.z),top=deck(x)-.18;box(bridge,.17,top-bank+.65,.17,endGrain,x,(top+bank-.65)*.5,z);}

  // These timbers never move independently. Preserve their exact vertices,
  // materials and shadows while submitting one batch per material/shadow mode.
  const bridgeBatches=new Map<string,{material:THREE.Material;shadow:boolean;parts:THREE.BufferGeometry[]}>();
  for(const child of [...bridge.children]){
    if(!(child instanceof THREE.Mesh)||Array.isArray(child.material))continue;
    child.updateMatrix();const part=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();part.applyMatrix4(child.matrix);
    const key=child.material.uuid+':'+child.castShadow;let batch=bridgeBatches.get(key);
    if(!batch){batch={material:child.material,shadow:child.castShadow,parts:[]};bridgeBatches.set(key,batch);}batch.parts.push(part);
    geometries.delete(child.geometry);child.geometry.dispose();child.removeFromParent();
  }
  for(const batch of bridgeBatches.values()){
    const geometry=mergeGeometries(batch.parts,false)!;batch.parts.forEach(p=>p.dispose());
    const timber=mesh(bridge,keep(geometry),batch.material);timber.name='Batched bridge · '+batch.material.name;timber.castShadow=batch.shadow;timber.renderOrder=-20;
  }

  // Real scanned stones and irregular short grass leave a generous walking margin.
  for(let n=0;n<(mobile?40:66);n++){
    const z=-39+n*58/(mobile?39:65),sign=n%2?1:-1,x=springRiverCentre(z)+sign*springRiverWidth(z)*(1.015+(n%5)*.018);
    if(Math.abs(z-SPRING_BRIDGE.z)<1.8||springPathDistance(x,z)<.95)continue;
    imported(n%4===0?'river-rock':'river-pebble',x,z,.18+(n%6)*.072,n*2.39996);
  }
  const grass=models.grass;
  if(grass){
    grass.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(grass),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3()),poses:{x:number;z:number;scale:number;yaw:number}[]=[];
    for(let n=0;n<(mobile?55:92);n++){const z=-34+(n*.61803398875%1)*51,sign=n%2?1:-1,x=springRiverCentre(z)+sign*springRiverWidth(z)*(1.10+(n%4)*.027);if(springPathDistance(x,z)<1.1||Math.abs(z+12)<2||Math.hypot(x-SPRING_LAKE_BENCH.x,z-SPRING_LAKE_BENCH.z)<2)continue;poses.push({x,z,scale:(.28+(n%5)*.055)/Math.max(.01,size.y),yaw:n*2.39996});}
    grass.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;const g=keep(o.geometry.clone().applyMatrix4(o.matrixWorld));g.translate(-centre.x,-bounds.min.y,-centre.z);const m=material(o.material.clone()) as THREE.MeshStandardMaterial;m.color.multiplyScalar(.88);m.side=THREE.DoubleSide;m.transparent=false;m.alphaTest=Math.max(.4,m.alphaTest);m.roughness=.91;const batch=new THREE.InstancedMesh(g,m,poses.length),transform=new THREE.Object3D();batch.name='Natural riverside grass tufts';poses.forEach((p,i)=>{transform.position.set(p.x,height(p.x,p.z)-.02,p.z);transform.rotation.set(0,p.yaw,0);transform.scale.setScalar(p.scale);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);});batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();group.add(batch);});
  }
  const b=SPRING_LAKE_BENCH,bench=imported('bench',b.x,b.z,2.25,b.yaw);
  if(bench){bench.name='Resting bench beside the Spring river';bench.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(bench);let highest=-Infinity;for(const x of [bounds.min.x,bounds.max.x])for(const z of [bounds.min.z,bounds.max.z])highest=Math.max(highest,height(x,z));bench.position.y=highest-.035;}
  return {group,water,bench,bridge,
    update(time:number,rain=0,night=0){waterMaterial.uniforms.time.value=reduced?0:time;waterMaterial.uniforms.impactTime.value=time;waterMaterial.uniforms.rain.value=THREE.MathUtils.clamp(rain,0,1);waterMaterial.uniforms.night.value=THREE.MathUtils.clamp(night,0,1);waterMaterial.uniforms.riverFog.value.set(rain>.01?0x7b8c8b:0xc0c9c1).lerp(nightFog,night);},
    stats:()=>({riverLength:SPRING_RIVER_REACH.maxZ-SPRING_RIVER_REACH.minZ,riverWidth:springRiverWidth(-12)*2,bridgeLength:length,reflectionCaptures}),
    dispose(){water.getRenderTarget().dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();group.clear();},
  };
}
