import * as THREE from 'three';

/** A small local flame volume. Fixed steps keep its GPU cost bounded. */
export function createCampfireFlames(origin:THREE.Vector3,mobile:boolean){
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.BackSide,
    uniforms:{fireTime:{value:0},fireOrigin:{value:origin.clone()}},
    vertexShader:`varying vec3 firePoint;void main(){firePoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      uniform float fireTime;uniform vec3 fireOrigin;varying vec3 firePoint;
      float hash(vec3 p){p=fract(p*.3183099+vec3(.17,.43,.71));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float turbulence(vec3 p){return noise3(p)*.58+noise3(p*2.03+7.1)*.28+noise3(p*4.1)*.14;}
      void main(){
        vec3 ro=(cameraPosition-fireOrigin)/vec3(1.1,1.05,1.1),rd=normalize(firePoint-ro);
        vec3 inv=1./rd,t0=(-.5-ro)*inv,t1=(.5-ro)*inv;
        vec3 lo=min(t0,t1),hi=max(t0,t1);float start=max(max(lo.x,lo.y),lo.z),end=min(min(hi.x,hi.y),hi.z);
        start=max(start,0.);float stepSize=(end-start)/float(${mobile?20:32});vec4 sum=vec4(0.);
        for(int i=0;i<${mobile?20:32};i++){
          vec3 p=ro+rd*(start+(float(i)+.5)*stepSize);float h=p.y+.5;
          vec3 flow=vec3(p.x*8.,h*6.-fireTime*2.3,p.z*8.);
          float n=turbulence(flow),curl=noise3(flow*.7+3.7);
          vec2 bend=vec2(sin(h*5.-fireTime*2.1),cos(h*6.+fireTime*1.3))*.055*h;
          float radius=length(p.xz-bend),envelope=.36*pow(1.-h,1.3);
          float field=(envelope-radius)*3.8+(n-.5)*1.85;
          float density=smoothstep(.04,.31,field)*smoothstep(0.,.06,h)*(1.-smoothstep(.58+curl*.35,.98,h));
          float hot=clamp(field*.65+(1.-h)*.40,0.,1.);
          vec3 colour=mix(vec3(1.8,.095,.008),vec3(3.4,1.05,.045),smoothstep(.1,.65,hot));
          colour=mix(colour,vec3(4.5,3.1,1.1),smoothstep(.70,.98,hot));
          float a=1.-exp(-density*stepSize*9.);sum.rgb+=(1.-sum.a)*colour*a;sum.a+=(1.-sum.a)*a;
        }
        if(sum.a<.008)discard;gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);mesh.scale.set(1.1,1.05,1.1);mesh.position.copy(origin);mesh.renderOrder=3;
  return {mesh,update(time:number){material.uniforms.fireTime.value=time;}};
}
