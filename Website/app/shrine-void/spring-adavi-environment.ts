import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import type {GroundMaps} from './season-terrain';
import {partitionInstances} from './spatial-instances';
import {createAdaviCascades,ADAVI_CASCADE_FALLS} from './spring-adavi-cascades';
import {ADAVI_SIGN} from './spring-treasure-layout';
const rand=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a:number,b:number,x:number)=>THREE.MathUtils.smoothstep(x,a,b);
export const ADAVI_ORIGIN=200;
export const ADAVI_WATER_LEVEL=.16;
export const riverCentre=(z:number)=>1.05*Math.sin(z*.075)+.33*Math.sin(z*.22);
export const riverWidth=(z:number)=>5.55+.48*Math.sin(z*.13)+.26*Math.cos(z*.31);
// The creek bends downstream before joining. Every drop faces the main river's +Z flow.
export const ADAVI_BRANCH=new THREE.CatmullRomCurve3([new THREE.Vector3(18,0,-36),new THREE.Vector3(16,0,-30),new THREE.Vector3(14,0,-25),new THREE.Vector3(11.5,0,-21),new THREE.Vector3(9,0,-16.5),new THREE.Vector3(7.2,0,-12),new THREE.Vector3(5.8,0,-7.5),new THREE.Vector3(4.9,0,-3.5),new THREE.Vector3(4.6,0,1)]);
export const branchLevel=(t:number)=>ADAVI_WATER_LEVEL+ADAVI_CASCADE_FALLS.reduce((height,fall)=>height+fall.height*(1-smooth(fall.start,fall.end,t)),0)+.42*(1-smooth(0,.85,t));
const branchSamples=Array.from({length:81},(_,i)=>({p:ADAVI_BRANCH.getPoint(i/80),t:i/80}));
export function branchDistance(x:number,z:number){let best=Infinity,t=0;for(let i=1;i<branchSamples.length;i++){const a=branchSamples[i-1],b=branchSamples[i],dx=b.p.x-a.p.x,dz=b.p.z-a.p.z,u=Math.max(0,Math.min(1,((x-a.p.x)*dx+(z-a.p.z)*dz)/(dx*dx+dz*dz))),d=Math.hypot(x-a.p.x-dx*u,z-a.p.z-dz*u);if(d<best){best=d;t=a.t+(b.t-a.t)*u;}}return {distance:best,t,width:1.00+Math.sin(t*2.1)*.42};}
function mainGround(x:number,z:number){const d=Math.abs(x-riverCentre(z))-riverWidth(z),inside=Math.max(0,-d/riverWidth(z)),relief=Math.sin(x*.72+z*.19)*.017+Math.sin(z*.55-x*.23)*.012;
  if(d<0)return ADAVI_WATER_LEVEL-.04-.56*Math.pow(inside,.6)+relief*inside;
  return ADAVI_WATER_LEVEL-.04+.11*d+.19*smooth(0,2.2,d)+Math.min(1.8,d*d*.006)+relief*smooth(0,1.2,d);}
export function adaviGround(x:number,z:number){const main=mainGround(x,z),hill=2.35*smooth(8,18,x)*(1-smooth(-9,0,z)),base=main+hill,branch=branchDistance(x,z),edge=branch.distance-branch.width;
  if(edge>3)return base;
  const bed=branchLevel(branch.t)-.06-.38*smooth(0,branch.width,-edge);
  const creek=THREE.MathUtils.lerp(bed,base,smooth(-.10,2.4,edge));
  // Erode the confluence into the existing riverbed; never raise a ridge across the river.
  const confluence=1-smooth(0,1.5,Math.abs(x-riverCentre(z))-riverWidth(z));
  return THREE.MathUtils.lerp(creek,Math.min(main,creek),confluence);}
/** Wide Kallar shallows, a joining side cascade, and continuous eroded banks. */
export function createSpringAdaviEnvironment({models,maps,mobile,reduced}:{models:Record<string,THREE.Object3D>;maps:{mud:GroundMaps;rock:GroundMaps;water:THREE.Texture};mobile:boolean;reduced:boolean}){
  const group=new THREE.Group();group.position.x=ADAVI_ORIGIN;group.name='Adavi · forest river';const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures:THREE.Texture[]=[];
  const reflectionScene=new THREE.Scene(),reflectionRoot=new THREE.Group();reflectionRoot.position.x=ADAVI_ORIGIN;reflectionRoot.name='Static forest reflection geometry';reflectionScene.add(reflectionRoot);
  const keep=<T extends THREE.BufferGeometry>(g:T)=>{geometries.add(g);return g;};const material=<T extends THREE.Material>(m:T)=>{materials.add(m);return m;};
  const tiled=(t:THREE.Texture,repeat:number)=>{const clone=t.clone();clone.wrapS=clone.wrapT=THREE.RepeatWrapping;clone.repeat.setScalar(repeat);clone.needsUpdate=true;textures.push(clone);return clone;};
  const mud=material(new THREE.MeshStandardMaterial({map:tiled(maps.mud.color,19),normalMap:tiled(maps.mud.normal,19),roughnessMap:tiled(maps.mud.roughness,19),color:0xb9b19a,roughness:.88,normalScale:new THREE.Vector2(.65,.65),vertexColors:true}));
  const ground=keep(new THREE.PlaneGeometry(76,94,mobile?150:220,mobile?170:270));ground.rotateX(-Math.PI/2);ground.translate(0,0,-11);const positions=ground.attributes.position,colors=new Float32Array(positions.count*3),wet=new Float32Array(positions.count);
  for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),main=Math.abs(x-riverCentre(z))-riverWidth(z),b=branchDistance(x,z),edge=Math.min(Math.abs(main),Math.abs(b.distance-b.width));positions.setY(i,adaviGround(x,z));const stone=1-smooth(.35,2.3,edge),shade=.84+Math.sin(x*.73+z*.3)*.035;colors[i*3]=shade*(1-stone*.13);colors[i*3+1]=shade*(1-stone*.06);colors[i*3+2]=shade*(1-stone*.02);wet[i]=stone;}
  ground.setAttribute('color',new THREE.BufferAttribute(colors,3));ground.setAttribute('riverWet',new THREE.BufferAttribute(wet,1));ground.computeVertexNormals();
  mud.onBeforeCompile=s=>{s.uniforms.riverRock={value:maps.rock.color};s.vertexShader='attribute float riverWet; varying float vRiverWet; varying vec2 vBankPoint;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRiverWet=riverWet;vBankPoint=position.xz;');s.fragmentShader='uniform sampler2D riverRock;varying float vRiverWet;varying vec2 vBankPoint;\n'+s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nvec3 erodedRock=texture2D(riverRock,vBankPoint*.46).rgb;diffuseColor.rgb=mix(diffuseColor.rgb,erodedRock*vec3(.73,.76,.68),vRiverWet*.78);').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.48,vRiverWet*.7);');};
  const terrain=new THREE.Mesh(ground,mud);terrain.receiveShadow=true;terrain.name='Continuous eroded soil, shallow riverbed and wet banks';group.add(terrain);
  reflectionRoot.add(new THREE.Mesh(ground,material(new THREE.MeshBasicMaterial({map:mud.map,color:0x7d8870,vertexColors:true}))));
  // One bounded reflection capture. The low-amplitude normals advect in the river's direction.
  const normal=tiled(maps.water,1),mainP:number[]=[],mainUV:number[]=[];
  for(let row=0;row<172;row++)for(let n=0;n<24;n++){const point=(r:number,k:number)=>{const z=-58+r*94/172;return [riverCentre(z)+(k/24*2-1)*(riverWidth(z)+.23),-z,0];};const a=point(row,n),b=point(row,n+1),c=point(row+1,n),d=point(row+1,n+1);for(const p of [a,b,c,b,d,c]){mainP.push(...p);mainUV.push(p[0]*.3,-p[1]*.3);}}
  const wg=keep(new THREE.BufferGeometry());wg.setAttribute('position',new THREE.Float32BufferAttribute(mainP,3));wg.setAttribute('uv',new THREE.Float32BufferAttribute(mainUV,2));wg.computeVertexNormals();
  const uniforms={time:{value:0},normalSampler:{value:normal},bedMap:{value:maps.rock.color},fogColor:{value:new THREE.Color(0x9aa99a)},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},color:{value:new THREE.Color(0xffffff)}};
  const water=new Reflector(wg,{textureWidth:mobile?384:1024,textureHeight:mobile?256:768,multisample:0,clipBias:.003,shader:{name:'AdaviSlowRiverReflection',uniforms,
    vertexShader:`uniform mat4 textureMatrix;uniform float time;varying vec3 vRiverWorld;varying vec4 vReflection;void main(){vec4 world=modelMatrix*vec4(position,1.);vec2 p=world.xz-vec2(200.,0.);world.y+=sin(p.y*1.7-time*.22+p.x*.4)*.004+sin(p.x*2.1+time*.17)*.002;vRiverWorld=world.xyz;vReflection=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform sampler2D tDiffuse,normalSampler,bedMap;uniform float time;uniform vec3 fogColor;varying vec3 vRiverWorld;varying vec4 vReflection;
    float centre(float z){return 1.05*sin(z*.075)+.33*sin(z*.22);}float widthAt(float z){return 5.55+.48*sin(z*.13)+.26*cos(z*.31);}float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){vec2 p=vRiverWorld.xz-vec2(200.,0.);float d=abs(p.x-centre(p.y))-widthAt(p.y);float interior=max(0.,-d/widthAt(p.y));float ground=.12-.56*pow(interior,.6);if(d>=0.)ground=.12+.11*d+.19*smoothstep(0.,2.2,d);float depth=.16-ground;if(depth<.003)discard;
      vec2 flow=vec2(.006,.013)*time;vec3 a=texture2D(normalSampler,p*.19-flow).xyz*2.-1.;vec3 b=texture2D(normalSampler,p*.43+vec2(-flow.x*.5,-flow.y*.7)).xyz*2.-1.;vec3 n=normalize(vec3((a.x+b.x)*.034,1.,(a.y+b.y)*.034));vec3 view=normalize(cameraPosition-vRiverWorld);float facing=max(0.,dot(n,view));float fresnel=.035+.965*pow(1.-facing,5.);
      vec2 reflectUV=vReflection.xy/vReflection.w+n.xz*.012;vec3 reflected=texture2D(tDiffuse,reflectUV).rgb;vec2 refracted=p*.61+n.xz*.8;vec3 stones=texture2D(bedMap,refracted).rgb;vec3 bed=stones*vec3(.38,.42,.29)+vec3(.015,.027,.018);float caustic=pow(max(0.,sin(p.x*6.+a.x*.7-time*.15))*max(0.,cos(p.y*5.3+b.y*.7+time*.12)),9.);bed+=caustic*.045*smoothstep(.0,.15,depth);
      vec3 body=mix(bed,vec3(.032,.105,.075),smoothstep(.08,.7,depth)*.62);float reflectionWeight=clamp(.18+fresnel*.82,.18,.97);vec3 colour=mix(body,reflected,reflectionWeight);vec3 halfLight=normalize(view+normalize(vec3(-.3,.8,.4)));colour+=vec3(1.,.94,.74)*pow(max(0.,dot(n,halfLight)),480.)*.18;
      float edge=1.-smoothstep(.005,.08,depth);colour=mix(colour,bed,edge*.65);float dist=length(cameraPosition-vRiverWorld);colour=mix(colour,fogColor,1.-exp(-dist*.012));gl_FragColor=vec4(colour,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}});
  const waterMaterial=water.material as THREE.ShaderMaterial;
  water.name='Adavi slow-flow reflective river';water.rotation.x=-Math.PI/2;water.position.y=ADAVI_WATER_LEVEL;waterMaterial.uniforms.normalSampler.value=normal;waterMaterial.uniforms.bedMap.value=maps.rock.color;waterMaterial.side=THREE.DoubleSide;materials.add(waterMaterial);group.add(water);
  const waterShadowMaterial=material(new THREE.ShadowMaterial({color:0x20372c,opacity:.20,transparent:true,depthWrite:false,side:THREE.DoubleSide}));const waterShadow=new THREE.Mesh(wg,waterShadowMaterial);waterShadow.rotation.copy(water.rotation);waterShadow.position.y=ADAVI_WATER_LEVEL+.005;waterShadow.receiveShadow=true;waterShadow.renderOrder=1;waterShadow.name='Canopy shadows on the river';group.add(waterShadow);
  const reflectedPosition=new THREE.Vector3(Infinity,0,0),reflectedRotation=new THREE.Quaternion(),reflectedProjection=new THREE.Matrix4();let reflectionCaptures=0;
  const renderReflection=water.onBeforeRender;water.onBeforeRender=(renderer,scene,camera,geometry,material,renderGroup)=>{
    // No timer: follow every camera movement. Still views reuse the static capture while
    // normal maps and caustics continue at display frame rate. The pass contains no PBR
    // forest, shadows, particles, held objects or other season geometry.
    if(camera.position.distanceToSquared(reflectedPosition)<1e-12&&1-Math.abs(camera.quaternion.dot(reflectedRotation))<1e-12&&reflectedProjection.equals(camera.projectionMatrix))return;
    reflectionScene.background=scene.background;reflectionScene.backgroundRotation.copy(scene.backgroundRotation);reflectionScene.backgroundIntensity=scene.backgroundIntensity;reflectionScene.fog=scene.fog;reflectionScene.updateMatrixWorld(true);
    renderReflection.call(water,renderer,reflectionScene,camera,geometry,material,renderGroup);
    reflectedPosition.copy(camera.position);reflectedRotation.copy(camera.quaternion);reflectedProjection.copy(camera.projectionMatrix);reflectionCaptures++;
  };
  // The tributary cuts diagonally through a planted hillside, then opens into the main channel.
  const bp:number[]=[],buv:number[]=[],bflow:number[]=[];const branchPoint=(t:number,cross:number)=>{const p=ADAVI_BRANCH.getPoint(t),tangent=ADAVI_BRANCH.getTangent(t),width=.98+Math.sin(t*2.1)*.42;return [p.x+tangent.z*cross*width,branchLevel(t),p.z-tangent.x*cross*width];};
  for(let n=0;n<240;n++)for(let k=0;k<10;k++){const a=n/240,b=(n+1)/240;if(ADAVI_CASCADE_FALLS.some(fall=>a>=fall.start-.022&&b<=fall.end+.033))continue;const u=k/10*2-1,v=(k+1)/10*2-1;for(const [t,c] of [[a,u],[b,u],[a,v],[a,v],[b,u],[b,v]]){bp.push(...branchPoint(t,c));buv.push(c*.5+.5,t*24);const before=ADAVI_BRANCH.getPoint(Math.max(0,t-.0005)),after=ADAVI_BRANCH.getPoint(Math.min(1,t+.0005)),direction=new THREE.Vector3(after.x-before.x,branchLevel(Math.min(1,t+.0005))-branchLevel(Math.max(0,t-.0005)),after.z-before.z).normalize();bflow.push(direction.x,direction.y,direction.z);}}
  const bg=keep(new THREE.BufferGeometry());bg.setAttribute('position',new THREE.Float32BufferAttribute(bp,3));bg.setAttribute('uv',new THREE.Float32BufferAttribute(buv,2));bg.setAttribute('flowDirection',new THREE.Float32BufferAttribute(bflow,3));bg.computeVertexNormals();bg.computeBoundingBox();bg.boundingBox!.expandByScalar(.045);bg.boundingSphere=bg.boundingBox!.getBoundingSphere(new THREE.Sphere());
  // The cascades share the river's reflection and water shading: no second capture.
  // Tangents of the same channel curve define the mesh, flow, shelves and spray.
  const branchMat=material(new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:waterMaterial.uniforms,
    vertexShader:`uniform mat4 textureMatrix;uniform float time;attribute vec3 flowDirection;varying vec3 vRiverWorld;varying vec4 vReflection;varying vec2 vCreek;varying vec3 vCreekNormal,vFlowDirection;
      void main(){vec3 flowing=position;float t=uv.y/24.;float fall=exp(-pow((t-.191)*45.,2.))+exp(-pow((t-.486)*48.,2.))+exp(-pow((t-.715)*45.,2.));float settled=smoothstep(.77,.88,t);float wave=(sin(uv.x*35.+uv.y*9.-time*5.7)+sin(uv.x*17.-uv.y*16.+time*7.9)*.43)*(.003+fall*.011);float riverWave=sin(position.z*1.7-time*.22+position.x*.4)*.004+sin(position.x*2.1+time*.17)*.002;flowing+=normal*wave*(1.-settled);flowing.y+=riverWave*settled;vec4 world=modelMatrix*vec4(flowing,1.);vRiverWorld=world.xyz;vCreek=uv;vCreekNormal=normalize(mat3(modelMatrix)*normal);vFlowDirection=normalize(mat3(modelMatrix)*flowDirection);
      vReflection=textureMatrix*vec4(position.x,-position.z,0.,1.);gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform sampler2D tDiffuse,normalSampler,bedMap;uniform float time;uniform vec3 fogColor;varying vec3 vRiverWorld;varying vec4 vReflection;varying vec2 vCreek;varying vec3 vCreekNormal,vFlowDirection;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      void main(){vec2 p=vRiverWorld.xz-vec2(200.,0.);float t=vCreek.y/24.;float mainEdge=abs(p.x-1.05*sin(p.y*.075)-.33*sin(p.y*.22))-(5.55+.48*sin(p.y*.13)+.26*cos(p.y*.31));
        if(mainEdge<.23&&t>.83)discard;
        float drop=exp(-pow((t-.191)*45.,2.))+exp(-pow((t-.486)*48.,2.))+exp(-pow((t-.715)*45.,2.));float slope=max(0.,-normalize(vFlowDirection).y);float speed=.25+sqrt(slope)*1.45;
        vec2 uv=vec2(vCreek.x*2.7,vCreek.y);
        // Bounded two-phase flow, as used in Valve's L4D2/Portal 2 water.
        // Noise shifts the local phase; each layer resets only at zero weight.
        // This avoids indefinitely stretched UVs from speed(t) * elapsedTime.
        float phase=fract(time*.23+noise(uv*.85)*.27),otherPhase=fract(phase+.5),phaseWeight=1.-abs(phase*2.-1.);
        vec2 velocity=vec2((noise(uv*.7)-.5)*.12,speed);
        vec2 flowA=uv*vec2(.9,.43)-velocity*phase,flowB=uv*vec2(.9,.43)-velocity*otherPhase+vec2(.37,.53);
        vec3 a=mix(texture2D(normalSampler,flowB).xyz,texture2D(normalSampler,flowA).xyz,phaseWeight)*2.-1.;
        vec3 b=texture2D(normalSampler,uv*vec2(2.2,1.35)-vec2(0.,time*.61)+vec2(.13,.0)).xyz*2.-1.;
        float settled=smoothstep(.77,.88,t);vec2 riverFlow=vec2(.006,.013)*time;vec3 riverA=texture2D(normalSampler,p*.19-riverFlow).xyz*2.-1.,riverB=texture2D(normalSampler,p*.43+vec2(-riverFlow.x*.5,-riverFlow.y*.7)).xyz*2.-1.;
        vec3 surfaceNormal=normalize(gl_FrontFacing?vCreekNormal:-vCreekNormal);vec3 across=cross(vFlowDirection,surfaceNormal);if(dot(across,across)<.00001)across=cross(vec3(0.,1.,0.),surfaceNormal);across=normalize(across);vec3 downhill=normalize(cross(surfaceNormal,across));vec3 movingNormal=normalize(surfaceNormal+(across*(a.x+b.x)+downhill*(a.y+b.y))*(.034+drop*.10));vec3 calmNormal=normalize(vec3((riverA.x+riverB.x)*.034,1.,(riverA.y+riverB.y)*.034));vec3 n=normalize(mix(movingNormal,calmNormal,settled));vec3 view=normalize(cameraPosition-vRiverWorld);float fresnel=.035+.965*pow(1.-max(0.,dot(n,view)),5.);
        // Use the river's stone tint, absorption and Fresnel response. At the
        // confluence the normal sampling and body colour become identical.
        vec3 reflected=texture2D(tDiffuse,vReflection.xy/vReflection.w+n.xz*.012).rgb;vec3 stones=texture2D(bedMap,p*.61+n.xz*.8).rgb;vec3 bed=stones*vec3(.38,.42,.29)+vec3(.015,.027,.018);float thickness=1.-abs(surfaceNormal.y);float interior=max(0.,-mainEdge/(5.55+.48*sin(p.y*.13)+.26*cos(p.y*.31)));float mainDepth=.04+.56*pow(interior,.6);float creekDepth=.06+.38*pow(max(0.,1.-abs(vCreek.x*2.-1.)),.6);float depth=mix(creekDepth,mainDepth,settled);float caustic=pow(max(0.,sin(p.x*6.+riverA.x*.7-time*.15))*max(0.,cos(p.y*5.3+riverB.y*.7+time*.12)),9.);bed+=caustic*.045*smoothstep(.0,.15,depth);
        vec3 body=mix(bed,vec3(.032,.105,.075),smoothstep(.08,.7,depth)*.62);body=mix(body,vec3(.065,.16,.12),thickness*.38);
        // A horizontal reflection capture cannot describe a vertical curtain.
        // Keep it for the pools; falling facets scatter the canopy/sky lighting.
        reflected=mix(reflected,vec3(.28,.39,.32),slope*.72);vec3 colour=mix(body,reflected,clamp(.18+fresnel*.82,.18,.97));
        float strands=mix(noise(vec2(flowB.x*14.,flowB.y*3.8)),noise(vec2(flowA.x*14.,flowA.y*3.8)),phaseWeight);float fine=noise(vec2(vCreek.x*71.,vCreek.y*12.-time*3.7));float impact=exp(-pow((t-.211)*80.,2.))+exp(-pow((t-.505)*80.,2.))+exp(-pow((t-.735)*80.,2.));
        float aeration=smoothstep(.40,.72,strands)*(.55+fine*.45);float foam=clamp(drop*(.04+aeration*.72)+impact*noise(uv*11.-vec2(0.,time*.9))*.32,0.,.79);colour=mix(colour,vec3(.85,.94,.89),foam*(1.-settled));
        vec3 halfLight=normalize(view+normalize(vec3(-.3,.8,.4)));colour+=vec3(1.,.94,.74)*pow(max(0.,dot(n,halfLight)),mix(180.,480.,settled))*.18;
        colour=mix(colour,fogColor,1.-exp(-length(cameraPosition-vRiverWorld)*.012));gl_FragColor=vec4(colour,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`}));
  const branchWater=new THREE.Mesh(bg,branchMat);branchWater.name='Joining forest tributary and three low cascades';branchWater.renderOrder=2;group.add(branchWater);
  const cascades=createAdaviCascades({branch:ADAVI_BRANCH,levelAt:branchLevel,mobile,waterMaterial:branchMat,normal,keep,material});group.add(cascades);
  // Looking upstream can cull the main river while a waterfall stays visible.
  // Every water surface may request the same cached capture; the camera guard
  // still permits at most one reflection render per changed viewpoint.
  branchWater.onBeforeRender=(renderer,scene,camera,_geometry,_material,renderGroup)=>water.onBeforeRender(renderer,scene,camera,water.geometry,waterMaterial,renderGroup);
  const cascadeBody=cascades.children.find(object=>object instanceof THREE.Mesh&&object.material===branchMat)!;
  cascadeBody.onBeforeRender=branchWater.onBeforeRender;
  const solids:{x:number;z:number;r:number}[]=[{x:ADAVI_SIGN.x,z:ADAVI_SIGN.z,r:.36}];type Pose={x:number;y:number;z:number;size:number;yaw:number;sx?:number;sy?:number;sz?:number;pitch?:number;roll?:number};
  type Prepared={geometry:THREE.BufferGeometry;material:THREE.Material|THREE.Material[];foliage:boolean}[];
  const prepared=new Map<string,{parts:Prepared;size:THREE.Vector3}>();let reflectionTriangles=ground.index!.count/3,mainTriangles=0;
  const greenLeaves=(target:THREE.MeshStandardMaterial|THREE.MeshBasicMaterial,reflection:boolean)=>{
    // Red maple albedo cannot become green by multiplying its colour. Preserve its
    // textured light/dark detail and alpha, then remap the RGB into a spring palette.
    target.color.set(0xffffff);target.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\nfloat springLeafLight=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(${reflection?'.12,.25,.040':'.14,.30,.045'})*(.72+springLeafLight*1.75);`);};target.customProgramCacheKey=()=>reflection?'adavi-reflection-green-foliage-v1':'adavi-green-foliage-v1';
  };
  function prepare(key:string,green:boolean,reflection:boolean){
    const cacheKey=key+':'+reflection;let cached=prepared.get(cacheKey);if(cached)return cached;const source=models[key];if(!source)return null;
    source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3()),normalize=new THREE.Matrix4().makeTranslation(-centre.x,-bounds.min.y,-centre.z),parts:Prepared=[];
    source.traverse(object=>{if(!(object instanceof THREE.Mesh))return;const geometry=keep(object.geometry.clone().applyMatrix4(object.matrixWorld).applyMatrix4(normalize));
      let foliagePart=green;const mats=(Array.isArray(object.material)?object.material:[object.material]).map((m:THREE.MeshStandardMaterial)=>{
        const foliage=green&&(/leaf|leaves|foliage|frond|twig/i.test(m.name)||m.alphaTest>0||m.transparent);
        foliagePart=foliagePart&&foliage;
        if(reflection){const reflected=material(new THREE.MeshBasicMaterial({map:m.map,color:green?0x68513b:0x888d7a,side:foliage?THREE.DoubleSide:m.side,alphaTest:foliage?.40:m.alphaTest}));if(foliage)greenLeaves(reflected,true);return reflected;}
        const n=material(m.clone());n.envMapIntensity=.6;if(foliage){greenLeaves(n,false);n.side=THREE.DoubleSide;n.alphaTest=key.endsWith('-near')?.36:.39;n.transparent=false;n.roughness=.85;n.normalScale.multiplyScalar(1.08);n.emissive.set(0x18310e);n.emissiveIntensity=.04;}else if(green){n.color.set(0x755b43);n.roughness=.90;n.normalScale.multiplyScalar(1.18);}else{n.color.set(0x9c9e89);n.roughness=.74;}return n;
      });parts.push({geometry,material:Array.isArray(object.material)?mats:mats[0],foliage:foliagePart});
    });cached={parts,size};prepared.set(cacheKey,cached);return cached;
  }
  function bake(key:string,poses:Pose[],green:boolean,parent:THREE.Object3D,reflection=false,offsetX=0,offsetZ=0,richCrowns=false){
    const source=prepare(key,green,reflection);if(!source||!poses.length)return;const dummy=new THREE.Object3D(),crown=new THREE.Object3D(),crownMatrix=new THREE.Matrix4();
    for(const part of source.parts){const fill=richCrowns&&part.foliage,batch=new THREE.InstancedMesh(part.geometry,part.material,poses.length*(fill?2:1));batch.name=`Adavi ${reflection?'reflection ':''}${key}`;batch.castShadow=batch.receiveShadow=!reflection;
      poses.forEach((p,i)=>{const scale=p.size/(green?source.size.y:Math.max(source.size.x,source.size.z));dummy.position.set(p.x-offsetX,p.y,p.z-offsetZ);dummy.rotation.set(p.pitch??0,p.yaw,p.roll??0);dummy.scale.set(scale*(p.sx??1),scale*(p.sy??1),scale*(p.sz??1));dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
        // Closest crowns gain overlapping, smaller real leaf clusters. No extra
        // trunks or opaque canopy blobs: both layers share one instanced draw.
        if(fill){const seed=p.x*7+p.z*13;crown.position.set((rand(seed+91)-.5)*source.size.x*.045,source.size.y*.050,(rand(seed+92)-.5)*source.size.z*.045);crown.rotation.set(.012,.07+rand(seed+93)*.08,-.01);crown.scale.set(.92,.94,.92);crown.updateMatrix();crownMatrix.multiplyMatrices(dummy.matrix,crown.matrix);batch.setMatrixAt(i+poses.length,crownMatrix);}
      });batch.computeBoundingSphere();parent.add(batch);
      const triangles=(part.geometry.index?.count??part.geometry.attributes.position.count)/3*batch.count;if(reflection)reflectionTriangles+=triangles;else mainTriangles+=triangles;
    }
  }
  function instances(key:string,poses:Pose[],green=false){
    const farKey=models[key+'-far']?key+'-far':key,nearKey=models[key+'-near']?key+'-near':key;
    if(green&&key!=='grass'&&farKey!==key){
      const cells=new Map<string,Pose[]>();for(const p of poses){const key=Math.floor(p.x/14)+':'+Math.floor(p.z/14),cell=cells.get(key)??[];cell.push(p);cells.set(key,cell);}
      for(const [cellKey,cell]of cells){const [cx,cz]=cellKey.split(':').map(Number),x=cx*14+7,z=cz*14+7,lod=new THREE.LOD(),near=new THREE.Group(),far=new THREE.Group();lod.position.set(x,0,z);bake(nearKey,cell,green,near,false,x,z,nearKey!==key&&!mobile);bake(farKey,cell,green,far,false,x,z);lod.addLevel(near,0);if(nearKey!==key){const middle=new THREE.Group();bake(key,cell,green,middle,false,x,z);lod.addLevel(middle,mobile?10:14,.12);}lod.addLevel(far,34,.13);lod.name='Forest detail cell';group.add(lod);}
    }else{
      const parent=new THREE.Group();bake(key,poses,green,parent);for(const child of [...parent.children])if(child instanceof THREE.InstancedMesh)group.add(...partitionInstances(child,14));
    }
    // Existing far asset variants keep the reflected silhouettes without a second PBR forest.
    if(key!=='grass'){const reflected=new THREE.Group();bake(farKey,poses,green,reflected,true);for(const child of [...reflected.children])if(child instanceof THREE.InstancedMesh)reflectionRoot.add(...partitionInstances(child,18));}
  }
  const rocks:Pose[]=[],pebbles:Pose[]=[],trees:Pose[][]=[[],[],[]],grass:Pose[]=[];
  const clear=(x:number,z:number)=>Math.hypot(x+7,z-11)<4.2||Math.hypot(x-ADAVI_SIGN.x,z-ADAVI_SIGN.z)<1.7||Math.abs(x+7)<1.15&&z>-26&&z<13;
  // Sparse outer-bend groups. Rocks are buried into soil and separated by their actual footprints.
  for(let n=0;n<(mobile?72:110);n++){const z=-33+rand(n+10)*59,side=rand(n+2710)>.5?1:-1,offset=.15+rand(n+20)*2.6,x=riverCentre(z)+side*(riverWidth(z)+offset),size=.40+Math.pow(rand(n+30),2)*1.45;if(clear(x,z))continue;if(rocks.some(r=>Math.hypot(x-r.x,z-r.z)<(size+r.size)*.50))continue;const r={x,z,y:adaviGround(x,z)-size*.25,size,yaw:rand(n+40)*6.28,sy:.55+rand(n+50)*.20,sx:.92+rand(n+60)*.22};rocks.push(r);if(size>1.0)solids.push({x,z,r:size*.28});}
  // Wider slabs sit at the edges of the tributary, rather than forming a wall across it.
  for(let n=0;n<17;n++){const t=.12+rand(n+400)*.71,p=ADAVI_BRANCH.getPoint(t),tangent=ADAVI_BRANCH.getTangent(t),side=rand(n+2710)>.5?1:-1,x=p.x+tangent.z*side*(1.3+rand(n+420)*.7),z=p.z-tangent.x*side*(1.3+rand(n+420)*.7),size=.65+rand(n+430)*.8;if(rocks.some(r=>Math.hypot(x-r.x,z-r.z)<(size+r.size)*.48))continue;rocks.push({x,z,y:adaviGround(x,z)-size*.12,size,yaw:rand(n+440)*6.28,sy:.46});}
  for(let n=0;n<(mobile?90:160);n++){const z=-34+rand(n+600)*64,side=rand(n+2710)>.5?1:-1,x=riverCentre(z)+side*(riverWidth(z)-.8+rand(n+610)*1.8);if(clear(x,z))continue;pebbles.push({x,z,y:adaviGround(x,z)-.025,size:.07+rand(n+620)*.17,yaw:rand(n+630)*6.28,sy:.45});}
  for(let n=0;n<(mobile?260:420);n++){const x=(rand(n+800)*2-1)*35,z=-52+rand(n+810)*84,bank=Math.abs(x-riverCentre(z))-riverWidth(z),branch=branchDistance(x,z);if(bank<2.3||branch.distance<branch.width+1.8||clear(x,z))continue;const size=8.5+rand(n+820)*11;trees[Math.floor(rand(n+2700)*3)].push({x,z,y:adaviGround(x,z)-.07,size,yaw:rand(n+830)*6.28,sx:.83+rand(n+840)*.39,sz:.82+rand(n+850)*.38,pitch:(rand(n+860)-.5)*.042,roll:(rand(n+870)-.5)*.042});solids.push({x,z,r:.35});}
  for(let n=0;n<(mobile?240:460);n++){const x=(rand(n+1100)*2-1)*26,z=-38+rand(n+1200)*65,bank=Math.abs(x-riverCentre(z))-riverWidth(z),branch=branchDistance(x,z);if(bank<.65||branch.distance<branch.width+.65||clear(x,z))continue;grass.push({x,z,y:adaviGround(x,z)-.015,size:.24+rand(n+1400)*.66,yaw:rand(n+1500)*6.28});}
  instances(models['river-rock']?'river-rock':'boulder',rocks);instances(models['river-pebble']?'river-pebble':'rock',pebbles);instances('forest-tree',trees[0].concat(trees[2].filter((_,i)=>i%6!==0)),true);instances('forest-tree-2',trees[1],true);instances('palm',trees[2].filter((_,i)=>i%6===0),true);instances('grass',grass,true);
  const sun=new THREE.DirectionalLight(0xffedcd,2.25);sun.position.set(-11,25,8);sun.target.position.set(1,0,-9);sun.castShadow=true;sun.shadow.mapSize.setScalar(mobile?1536:3072);Object.assign(sun.shadow.camera,{left:-26,right:26,top:36,bottom:-34,near:1,far:80});sun.shadow.normalBias=.035;sun.shadow.bias=-.00012;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;group.add(sun,sun.target,new THREE.HemisphereLight(0xc4d9d0,0x3d4a26,1.5));
  // Navigation samples the exact rendered terrain and checks only nearby solids.
  const solidCells=new Map<string,typeof solids>();for(const p of solids)for(let x=Math.floor((p.x-p.r-.16)/4);x<=Math.floor((p.x+p.r+.16)/4);x++)for(let z=Math.floor((p.z-p.r-.16)/4);z<=Math.floor((p.z+p.r+.16)/4);z++){const key=x+':'+z,list=solidCells.get(key)??[];list.push(p);solidCells.set(key,list);}
  const cols=ground.parameters.widthSegments,rows=ground.parameters.heightSegments;
  const height=(worldX:number,z:number)=>{const x=worldX-ADAVI_ORIGIN;if(Math.abs(x)>23||z>26||z< -31)return null;
    for(const p of solidCells.get(Math.floor(x/4)+':'+Math.floor(z/4))??[])if((x-p.x)**2+(z-p.z)**2<(p.r+.16)**2)return null;
    const u=(x+38)/76*cols,v=(z+58)/94*rows,ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz,index=iz*(cols+1)+ix;
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(positions.getY(index),positions.getY(index+1),fx),THREE.MathUtils.lerp(positions.getY(index+cols+1),positions.getY(index+cols+2),fx),fz);
  };
  group.updateMatrixWorld(true);group.traverse(o=>{o.matrixAutoUpdate=false;});
  return {group,height,water,reflectionScene,spawn:{x:193,z:10,yaw:-.48,pitch:-.10},
    addReflectionObject(object:THREE.Object3D){const copy=object.clone(true);copy.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const convert=(m:THREE.MeshStandardMaterial)=>material(new THREE.MeshBasicMaterial({map:m.map,color:m.color,side:m.side,alphaTest:m.alphaTest}));o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);o.castShadow=o.receiveShadow=false;});reflectionRoot.add(copy);reflectedPosition.set(Infinity,0,0);},
    update(time:number){const t=reduced?0:time;waterMaterial.uniforms.time.value=t;},
    dispose(){sun.shadow.dispose();water.getRenderTarget().dispose();for(const root of [group,reflectionRoot])root.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});reflectionScene.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.clear();},
    stats:()=>({trees:trees.reduce((sum,t)=>sum+t.length,0),rocks:rocks.length,riverWidth:riverWidth(0)*2,riverTriangles:mainP.length/9,tributaryTriangles:bp.length/9,cascadeDraws:cascades.children.length,cascadeTriangles:cascades.children.reduce((sum,object)=>sum+(object instanceof THREE.Mesh?(object.geometry.index?.count??object.geometry.attributes.position.count)/3:0),0),cascadeParticles:(cascades.children.find(object=>object instanceof THREE.Points) as THREE.Points).geometry.attributes.position.count,reflectionTriangles,mainTriangles,reflectionCaptures})};
}
