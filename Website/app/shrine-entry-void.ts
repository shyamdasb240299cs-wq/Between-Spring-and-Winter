import * as THREE from 'three';

/** Fly-through overlay: logarithmic spiral arms (galaxy geometry) plus a 1/r tunnel so the camera feels pulled into a bright core. Separate from the sanctuary world. */
export type VortexFrame={time:number;tunnel:number;pull:number;originX:number;originY:number;width:number;height:number};

const VORTEX_VERTEX=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const VORTEX_FRAGMENT=`precision highp float;
uniform vec2 uResolution;uniform vec2 uOrigin;uniform float uTime;uniform float uTunnel;uniform float uPull;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=0.,b=.5;for(int i=0;i<3;i++){a+=b*noise(p);p=p*2.07+vec2(11.3,5.7);b*=.54;}return a;}
float armNoise(float ang,float y){return fbm(vec2(cos(ang),sin(ang))*1.45+vec2(y,y*.41));}
float petalMark(vec2 q){q*=vec2(1.12,.74);float d=length(q);return smoothstep(.52,.06,d)*smoothstep(-.55,.2,-q.y);}
void main(){
  float tunnel=uTunnel,t=uTime,pull=uPull;
  vec2 p=vUv-uOrigin;p.x*=uResolution.x/max(uResolution.y,1.);
  float zoom=1.+pull*6.4+tunnel*1.15;p*=zoom;
  float r=length(p)+1e-5,a=atan(p.y,p.x),logR=log(r);
  float twist=2.9,as=a+twist*logR-t*.72-pull*2.15;
  float arms=pow(.5+.5*cos(as*4.),1.45);
  float y=logR*1.5-t*1.08-pull*1.3;
  float n=armNoise(as,y),n2=armNoise(as*2.+.7,y*1.8+4.);
  float clumps=smoothstep(.3,.78,n)*smoothstep(.24,.72,n2);
  float ridge=arms*(.5+.75*n)+clumps*arms*1.9;
  float depth=.24/r+t*.46+pull*1.65;
  float wall=armNoise(as,depth);
  vec2 dir=p/r;float streak=0.;
  for(int i=0;i<4;i++){
    float k=float(i)/3.;
    vec2 q=p-dir*k*(.1+.55*tunnel+.2*pull);
    float rr=length(q)+1e-5,aa=atan(q.y,q.x)+twist*log(rr)-t*.72-pull*2.15;
    streak+=pow(.5+.5*cos(aa*4.),2.15)*(1.-k);
  }
  streak/=4.;
  float petals=0.;
  for(int i=0;i<4;i++){
    float fi=float(i);
    float life=fract(fi*.618034+t*.18+pull*.24);
    float rad=mix(1.32,.03,pow(life,.8));
    float ang=fi*2.399963+twist*log(rad+.06)-t*.42;
    vec2 c=vec2(cos(ang),sin(ang))*rad,q=p-c;
    float ca=cos(ang+life*4.),sa=sin(ang+life*4.);
    q=vec2(ca*q.x+sa*q.y,-sa*q.x+ca*q.y);
    float sz=mix(.02,.13,life*life);
    petals+=petalMark(q/sz)*smoothstep(0.,.1,life)*smoothstep(1.,.76,life);
  }
  float core=exp(-r*mix(8.4,2.5,tunnel));
  float hot=exp(-r*17.);
  float swallow=pow(1.-tunnel,1.8)*smoothstep(.45,1.,pull);
  core=max(core,exp(-r*mix(8.4,.5,swallow))*swallow);
  vec3 deep=vec3(.045,0.,.065),magenta=vec3(.98,.1,.46),rose=vec3(1.,.42,.7),blush=vec3(1.,.82,.9),white=vec3(1.,.97,.94);
  vec3 col=deep;
  col+=magenta*ridge*1.6;
  col+=rose*clumps*1.1;
  col+=blush*pow(arms,4.)*.75;
  col+=rose*streak*(.5+tunnel);
  col+=magenta*wall*.16*tunnel;
  col+=blush*petals*1.2;
  col+=mix(rose,white,.62)*core*2.1;
  col+=white*hot*2.5;
  col+=white*swallow*core*1.4;
  vec2 cell=floor(vUv*vec2(90.,56.));
  float star=smoothstep(.97,.999,hash(cell+19.))*step(.82,hash(cell));
  col+=vec3(1.,.88,.95)*star*(1.-core)*.22;
  float vig=smoothstep(1.85,.1,r*(.3+.2*tunnel));
  col*=mix(.18,1.,vig);
  float alpha=max(smoothstep(0.,.14,tunnel),swallow*smoothstep(.0,.35,core));
  gl_FragColor=vec4(col,clamp(alpha,0.,1.));
}`;

const PETAL_VERTEX=`attribute vec4 seed;uniform float uTime;uniform float uTunnel;uniform float uPull;uniform vec2 uOrigin;uniform vec2 uAspect;varying vec2 vUv;varying float vFade;
void main(){vUv=uv;
  float life=fract(seed.x-uTime*(.16+.11*seed.z)-uPull*.38);
  float depth=pow(life,.72);
  float rad=mix(1.55,.02,depth);
  float ang=seed.y*6.283185+2.72*log(rad+.08)-uTime*.55-uPull*1.8;
  vec2 center=vec2(cos(ang),sin(ang))*rad;
  center.x/=uAspect.x;center+= (uOrigin-vec2(.5))*2.;
  float size=mix(.01,.11,depth*depth)*(.7+seed.z*.6)*(.4+uTunnel);
  float spin=seed.w*6.283185+uTime*(1.4+seed.z);
  vec2 local=position.xy*size;
  float c=cos(spin),s=sin(spin);
  vec2 q=vec2(c*local.x-s*local.y,s*local.x+c*local.y);
  q.y*=.78;
  vFade=smoothstep(0.,.08,life)*smoothstep(1.,.78,life)*uTunnel;
  gl_Position=vec4(center+q,0.,1.);
}`;
const PETAL_FRAGMENT=`varying vec2 vUv;varying float vFade;
void main(){if(vFade<.004)discard;
  vec2 p=(vUv-vec2(.5,.38))*vec2(2.05,1.65);
  float d=length(p);
  float body=smoothstep(.98,.4,d)*smoothstep(-.7,.18,-p.y);
  if(body<.03)discard;
  vec3 col=mix(vec3(.9,.22,.52),vec3(1.,.88,.92),smoothstep(.95,.18,d));
  gl_FragColor=vec4(col,body*vFade);
}`;

export function createEntryVortex(canvas:HTMLCanvasElement){
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.autoClear=true;renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,-1,1);
  const uniforms={uTime:{value:0},uTunnel:{value:0},uPull:{value:0},uOrigin:{value:new THREE.Vector2(.5,.5)},uResolution:{value:new THREE.Vector2(1,1)}};
  const vortex=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:VORTEX_VERTEX,fragmentShader:VORTEX_FRAGMENT}));
  vortex.frustumCulled=false;scene.add(vortex);
  const count=matchMedia('(pointer:coarse), (max-width:700px)').matches?90:160;
  const quad=new THREE.PlaneGeometry(1,1);
  const petalGeom=new THREE.InstancedBufferGeometry();
  petalGeom.index=quad.index;petalGeom.setAttribute('position',quad.getAttribute('position'));petalGeom.setAttribute('uv',quad.getAttribute('uv'));
  const seeds=new Float32Array(count*4);
  for(let i=0;i<count;i++){seeds[i*4]=(i*.61803398875)%1;seeds[i*4+1]=(i*.415973)%1;seeds[i*4+2]=(i*.754877)%1;seeds[i*4+3]=(i*.267949)%1;}
  petalGeom.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds,4));petalGeom.instanceCount=count;
  const petalUniforms={uTime:{value:0},uTunnel:{value:0},uPull:{value:0},uOrigin:{value:new THREE.Vector2(.5,.5)},uAspect:{value:new THREE.Vector2(1,1)}};
  const petals=new THREE.Mesh(petalGeom,new THREE.ShaderMaterial({uniforms:petalUniforms,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,vertexShader:PETAL_VERTEX,fragmentShader:PETAL_FRAGMENT}));
  petals.frustumCulled=false;scene.add(petals);
  return{
    prepare(){return renderer.compileAsync(scene,camera);},
    resize(width:number,height:number,dpr:number){
      renderer.setPixelRatio(Math.min(dpr,1,Math.sqrt(420000/Math.max(1,width*height))));renderer.setSize(width,height,false);
      uniforms.uResolution.value.set(width,height);petalUniforms.uAspect.value.set(width/Math.max(height,1),1);
    },
    render(frame:VortexFrame){
      if(frame.tunnel<.001){renderer.clear();return;}
      uniforms.uTime.value=frame.time;uniforms.uTunnel.value=frame.tunnel;uniforms.uPull.value=frame.pull;
      uniforms.uOrigin.value.set(frame.originX/Math.max(frame.width,1),1-frame.originY/Math.max(frame.height,1));
      petalUniforms.uTime.value=frame.time;petalUniforms.uTunnel.value=frame.tunnel;petalUniforms.uPull.value=frame.pull;
      petalUniforms.uOrigin.value.copy(uniforms.uOrigin.value);
      renderer.render(scene,camera);
    },
    dispose(){
      vortex.geometry.dispose();(vortex.material as THREE.Material).dispose();
      petalGeom.dispose();(petals.material as THREE.Material).dispose();
      renderer.dispose();renderer.forceContextLoss();
    }
  };
}
export type EntryVortex=ReturnType<typeof createEntryVortex>;
