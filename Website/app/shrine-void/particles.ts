import * as THREE from 'three';

/** GPU lifecycle: a blossom drifts down, settles on the surface, then dissolves. */
export function createPetals(texture: THREE.Texture,reduced: boolean) {
  const geometry = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1,1);
  geometry.index=quad.index;geometry.attributes=quad.attributes;
  const count=reduced?110:300,seeds=new Float32Array(count*4);
  for(let i=0;i<count;i++){seeds[i*4]=(i*.61803398875)%1;seeds[i*4+1]=(i*.41421356)%1;seeds[i*4+2]=(i*.7320508)%1;seeds[i*4+3]=i<(reduced?30:170)?(i*.267949)%1:-1-(i*.267949)%1;}
  geometry.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds,4));geometry.instanceCount=count;
  const uniforms={time:{value:0},anchor:{value:new THREE.Vector3()},petal:{value:texture},reveal:{value:1}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute vec4 seed;uniform float time;uniform vec3 anchor;varying vec2 vUv;varying float vFade;
      void main(){vUv=uv;float surface=step(seed.w,0.);float variety=fract(abs(seed.w));float life=fract(seed.x+time*(.034+variety*.014));float landed=max(surface,step(.78,life));float falling=mix(min(1.,life/.78),1.,surface);
        float x=mix(-5.7,5.7,seed.y)+sin(life*4.+seed.w*6.)*.8+falling*1.2;
        float y=mix(7.5,.065,falling);float camGlobal=anchor.z-anchor.y;
        float span=mix(54.,32.,surface);float z=camGlobal+4.-mod(seed.z*span+camGlobal+4.+5400.,span)+anchor.y+sin(life*5.+seed.y*5.)*.8*(1.-surface);
        float angle=variety*6.28+time*.7*(1.-landed);float size=.05+variety*.04;
        vec3 p=position*size;vec2 spin=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p.xy;
        p=landed>.5?vec3(spin.x,0.,spin.y):vec3(spin.x,spin.y*cos(time*.9+seed.z*8.),spin.y*sin(time*.9+seed.z*8.));
        vFade=mix(smoothstep(0.,.08,life)*(1.-smoothstep(.9,1.,life)),1.,surface);gl_Position=projectionMatrix*viewMatrix*vec4(vec3(x,y,z)+p,1.);
      }`,
    fragmentShader:`uniform sampler2D petal;uniform float reveal;varying vec2 vUv;varying float vFade;void main(){vec4 c=texture2D(petal,vUv);if(c.a<.15)discard;gl_FragColor=vec4(c.rgb*vec3(2.65,1.4,1.85),c.a*vFade*.94*reveal);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }`
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  const glowMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:material.vertexShader.replace('position*size','position*size*1.8'),
    fragmentShader:`uniform float reveal;varying vec2 vUv;varying float vFade;void main(){float r=length(vUv-.5);float halo=exp(-r*r*26.)*(1.-smoothstep(.3,.49,r));gl_FragColor=vec4(vec3(1.,.38,.6),halo*.075*vFade*reveal);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }`});
  const glow=new THREE.Mesh(geometry,glowMaterial);glow.frustumCulled=false;mesh.add(glow);
  return{mesh,update(time:number,cameraZ:number,origin:number,reveal=1){uniforms.reveal.value=reveal;uniforms.time.value=reduced?8:time;uniforms.anchor.value.set(0,origin,cameraZ);},dispose(){geometry.dispose();material.dispose();glowMaterial.dispose();}};
}
