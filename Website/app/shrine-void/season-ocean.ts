import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {groundHeight,groundGLSL,ISLAND_SCALE,random} from './season-layout';

/** Analytic world-space swells, shallow surf, and bounded foot-contact waves. */
const surface=`
  uniform float oceanTime;uniform vec4 impacts[6];
  ${groundGLSL}
  float beach(vec2 p){return groundAt(p,1);}
  vec3 seaWave(vec2 p,vec2 k,float speed,float amplitude){float phase=dot(p,k)-oceanTime*speed;return vec3(sin(phase)*amplitude,cos(phase)*amplitude*k);}
  vec3 ocean(vec2 p){float t=oceanTime;float d=islandDistance(p);float shore=7.95;
    vec3 s=seaWave(p,vec2(.43,.18),1.05,.16)+seaWave(p,vec2(-.18,.37),.88,.065)+seaWave(p,vec2(.85,-.44),1.50,.028)+seaWave(p,vec2(1.73,.68),1.85,.008);
    s*=mix(.06,1.,smoothstep(8.5,23.,d));
    float u=d-shore;float phase=u*1.65+t*1.30+sin(p.y*.37+p.x*.21)*.65;float env=exp(-pow((u+.1)*.46,2.));
    vec2 radial=normalize(vec2(p.x,(p.y+3.)*.83*.83)+.0001);
    float depth=-beach(p);float shoal=smoothstep(-.07,.16,depth)*(1.-smoothstep(.65,1.55,depth));
    s.x+=(sin(phase)+.38*sin(phase*2.))*.22*shoal;s.yz+=(cos(phase)+.76*cos(phase*2.))*.363*shoal*radial;
    for(int i=0;i<6;i++){float age=t-impacts[i].z;if(age<0.||age>3.)continue;vec2 delta=p-impacts[i].xy;float r=length(delta),front=r-age*1.25;
      float e=exp(-front*front*9.-age*1.4)*smoothstep(0.,.04,age);s+=vec3(sin(front*22.)*.015*e,normalize(delta+vec2(.0001))*cos(front*22.)*.27*e);}
    return s;
  }
`;

export function createCoastalOcean(scene:THREE.Scene,sky:THREE.Texture,normals:THREE.Texture,sand:THREE.Texture,reduced:boolean,mobile:boolean){
  const impacts=Array.from({length:6},()=>new THREE.Vector4(0,0,-100,1));
  const uniforms={oceanTime:{value:0},impacts:{value:impacts},normalSampler:{value:normals},skySampler:{value:sky},sandSampler:{value:sand},reflectionEnabled:{value:mobile?0:1},sunDirection:{value:new THREE.Vector3(-.42,.16,-1).normalize()},seaFog:{value:new THREE.Color(0xc6b3a8)}};
  const geometry=new THREE.PlaneGeometry(1200,1200,mobile?112:176,mobile?112:176),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i)/600,y=p.getY(i)/600;p.setXY(i,Math.sign(x)*Math.abs(x)**2.4*600,Math.sign(y)*Math.abs(y)**2.4*600);}geometry.computeBoundingSphere();
  const mesh=new Reflector(geometry,{textureWidth:640,textureHeight:384,multisample:0,clipBias:.004,
    shader:{name:'CoastalSurf',uniforms:{...uniforms,tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},color:{value:new THREE.Color(0xffffff)}},
      vertexShader:`uniform mat4 textureMatrix;varying vec3 vWorld;varying vec4 vReflection;${surface}
        void main(){vec4 w=modelMatrix*vec4(position,1.);w.y+=ocean(w.xz).x;vWorld=w.xyz;vReflection=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`uniform sampler2D tDiffuse,normalSampler,skySampler,sandSampler;uniform vec3 sunDirection,seaFog;uniform float reflectionEnabled;varying vec3 vWorld;varying vec4 vReflection;${surface}
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
        vec3 skyAt(vec3 ray){vec2 uv=vec2(atan(ray.z,ray.x)*.15915494+.5+2.6*.15915494,asin(clamp(ray.y,-1.,1.))*.31830989+.5);return texture2D(skySampler,uv).rgb;}
        void main(){vec2 pos=vWorld.xz;float t=oceanTime;float floorY=beach(pos),depth=vWorld.y-floorY;if(depth<.006||floorY>.085)discard;
          float shore=7.95;float d=islandDistance(pos);float u=d-shore;
          vec3 waves=ocean(pos);vec2 uv1=pos*.13+vec2(t*.014,t*.008),uv2=pos*.31+vec2(-t*.012,t*.011);
          vec3 detail=texture2D(normalSampler,uv1).xyz*2.-1.;vec3 detail2=texture2D(normalSampler,uv2).xyz*2.-1.;
          float distanceToEye=length(cameraPosition-vWorld);float micro=mix(.045,.018,smoothstep(10.,100.,distanceToEye));
          vec3 n=normalize(vec3(-waves.y+(detail.x+detail2.x)*micro,1.,-waves.z+(detail.y+detail2.y)*micro));vec3 view=normalize(cameraPosition-vWorld);
          float fresnel=.0204+.9796*pow(1.-max(0.,dot(n,view)),5.);vec3 ray=reflect(-view,n);vec3 reflected=skyAt(ray);
          vec2 ruv=vReflection.xy/max(.0001,vReflection.w)+n.xz*.035/max(1.,sqrt(distanceToEye)*.25);
          if(reflectionEnabled>.5&&all(greaterThan(ruv,vec2(.003)))&&all(lessThan(ruv,vec2(.997))))reflected=texture2D(tDiffuse,ruv).rgb;
          vec3 tint=vec3(.012,.10,.14);vec3 extinction=exp(-max(0.,depth)*vec3(1.25,.32,.20));
          vec3 seabed=texture2D(sandSampler,pos*.5+n.xz*.035).rgb*vec3(.88,.93,.82);
          float caustic=pow(1.-abs(sin(pos.x*9.+sin(pos.y*6.+t))*.6+cos(pos.y*8.-t*.6)*.4),9.);seabed+=caustic*.018*exp(-depth*.7);
          vec3 body=mix(tint,seabed,extinction)*vec3(.9,1.,1.);vec3 colour=mix(body,reflected,clamp(fresnel*.9+.06,0.,1.));float crestLight=pow(max(0.,dot(view,-sunDirection)),3.)*max(0.,waves.x)*.12;colour+=vec3(.07,.32,.27)*crestLight;
          vec3 halfway=normalize(view+sunDirection);float sun=pow(max(0.,dot(n,halfway)),140.);colour+=vec3(1.,.65,.30)*sun*3.5;
          float phase=u*1.65+t*1.30+sin(pos.y*.37+pos.x*.21)*.65;float lace=noise(pos*8.+vec2(t*.09,-t*.04));
          float bubbles=smoothstep(.43,.70,lace*.45+noise(pos*38.+vec2(t*.15,-t*.09))*.55);
          float breaking=pow(max(0.,sin(phase)),3.)*exp(-pow((max(0.,-floorY)-.27)*3.8,2.));
          float remnant=pow(max(0.,sin(phase-.8)),2.)*exp(-pow((max(0.,-floorY)-.16)*4.5,2.))*.28;
          float wash=(1.-smoothstep(.018,.12+noise(pos*1.5)*.045,depth))*(.22+.78*bubbles);
          float foam=clamp(wash*.78+breaking*(.35+bubbles*.65)*.92+remnant*bubbles,0.,.92);foam*=smoothstep(.006,.035,depth);
          colour=mix(colour,vec3(.93,.98,.94),foam);colour=mix(colour,seaFog,1.-exp(-distanceToEye*.00065));gl_FragColor=vec4(colour,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }});
  mesh.rotation.x=-Math.PI/2;mesh.frustumCulled=false;mesh.name='Coastal ocean · shallow refraction and surf';scene.add(mesh);
  const mat=mesh.material as THREE.ShaderMaterial;Object.assign(mat.uniforms,uniforms);
  const reflect=mesh.onBeforeRender.bind(mesh),captureMatrix=new THREE.Matrix4(),captureProjection=new THREE.Matrix4();let lastCapture=-1,reflection=mobile?0:1;
  mesh.onBeforeRender=(renderer,world,camera,g,m,group)=>{
    if(reflection===0)return;const now=performance.now()/1000;
    const moving=!captureMatrix.equals(camera.matrixWorld)||!captureProjection.equals(camera.projectionMatrix);
    if(!moving&&now-lastCapture<.075)return;
    const hidden:THREE.Object3D[]=[];scene.traverse(o=>{if(o.visible&&o.userData.skipOceanReflection){o.visible=false;hidden.push(o);}});
    try{reflect(renderer,world,camera,g,m,group);lastCapture=now;captureMatrix.copy(camera.matrixWorld);captureProjection.copy(camera.projectionMatrix);}finally{hidden.forEach(o=>o.visible=true);}
  };
  const dropSource=new THREE.IcosahedronGeometry(.012,0),dropGeometry=new THREE.InstancedBufferGeometry();dropGeometry.index=dropSource.index;dropGeometry.attributes=dropSource.attributes;
  const count=mobile?144:384;dropGeometry.setAttribute('spraySeed',new THREE.InstancedBufferAttribute(Float32Array.from({length:count*2},(_,i)=>random(i+31)),2));dropGeometry.instanceCount=reduced?0:count;
  const dropMaterial=new THREE.MeshStandardMaterial({color:0xc4f5ef,roughness:.18,transparent:true,opacity:.64,depthWrite:false});
  dropMaterial.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader=`attribute vec2 spraySeed;${surface}\n`+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 hit=impacts[int(floor(spraySeed.x*6.))];float age=oceanTime-hit.z;vec2 centre=hit.xy;float power=1.+spraySeed.y*.6;
    if(spraySeed.x<.65){float angle=spraySeed.y*6.2831853;float edge=1.+sin(angle*3.+.6)*.045+sin(angle*5.-1.2)*.025;float radius=9.65+(spraySeed.x-.325)*1.7;centre=vec2(cos(angle)*radius*edge*${ISLAND_SCALE.toFixed(2)},-3.+sin(angle)*radius*edge*${ISLAND_SCALE.toFixed(2)}/.83);float phase=(radius-7.95)*1.65+oceanTime*1.30+sin(centre.y*.37+centre.x*.21)*.65;age=fract(oceanTime*.8+spraySeed.x*41.)*1.25;power=sin(phase)>.45?2.25:0.;}
    float t=clamp(age,0.,.6),h=power*t-4.9*t*t;float alive=step(0.,age)*step(.001,h);transformed*=alive;transformed+=vec3(centre.x+cos(spraySeed.y*40.)*t*.5,.06+max(0.,h),centre.y+sin(spraySeed.y*40.)*t*.5);`);};
  const spray=new THREE.Mesh(dropGeometry,dropMaterial);spray.frustumCulled=false;spray.userData.skipOceanReflection=true;scene.add(spray);
  let slot=0,lastStep=0,lastX=0,lastZ=0;
  return {mesh,setQuality(q:number){reflection=!mobile&&q>.8?1:0;uniforms.reflectionEnabled.value=reflection;},
    ripple(x:number,z:number,time:number){if(groundHeight('summer',x,z)>=0)return false;impacts[slot].set(x,z,time,1);slot=(slot+1)%6;return true;},
    update(time:number,camera:THREE.Camera,moving:boolean){uniforms.oceanTime.value=reduced?0:time;
      // Keep the dense near-shore tessellation anchored to the island.
      const x=camera.position.x,z=camera.position.z;if(!reduced&&moving&&groundHeight('summer',x,z)<.025&&time-lastStep>.3&&Math.hypot(x-lastX,z-lastZ)>.45){impacts[slot].set(x+Math.cos(camera.rotation.y)*.16*(slot%2?1:-1),z,time,1);slot=(slot+1)%6;lastStep=time;lastX=x;lastZ=z;}
    },dispose(){mesh.dispose();geometry.dispose();dropGeometry.dispose();dropMaterial.dispose();}};
}
