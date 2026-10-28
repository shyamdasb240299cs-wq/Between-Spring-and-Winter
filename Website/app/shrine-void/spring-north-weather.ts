import * as THREE from 'three';

const smooth=(a:number,b:number,x:number)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
/** Spatial, reversible weather: walking south always restores the rainy lake. */
export function springNorthWeather(_x:number,z:number){
  const north=smooth(29,67,-z);
  // The route is north of the entire lake; east/west movement cannot toggle it.
  return {night:north,rain:1-smooth(31,60,-z),cloud:1-smooth(35,73,-z)};
}
export function springWeatherClear(state:{rainCleared:boolean;weatherClearStarted:number},now=Date.now()){
  if(!state.rainCleared)return 0;if(!state.weatherClearStarted)return 1;
  return smooth(0,14000,now-state.weatherClearStarted);
}

/** Camera-centred sky keeps every point inside the far plane at every position. */
export function createSpringJourneySky(){
  const uniforms={night:{value:0},clock:{value:0},clearing:{value:0}};
  const geometry=new THREE.SphereGeometry(1,48,24);
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:true,fog:false,uniforms,
    vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 direction;uniform float night,clock,clearing;
      float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float n=0.,a=.52;for(int i=0;i<5;i++){n+=noise(p)*a;p=p*2.03+vec3(5,8,3);a*=.49;}return n;}
      void main(){vec3 d=normalize(direction);float h=smoothstep(-.12,.85,d.y);vec3 sky=mix(vec3(.42,.49,.49),vec3(.20,.27,.30),h);vec3 p=d*4.2+vec3(clock*.003,0.,clock*.001);float cloud=fbm(p);float detail=fbm(p*3.7);float mass=smoothstep(.26,.69,cloud+.12*detail);sky=mix(sky,mix(vec3(.21,.26,.27),vec3(.57,.61,.60),pow(cloud,1.7)),mass*.85);vec3 sunny=mix(vec3(.73,.79,.72),vec3(.22,.49,.72),h);sunny=mix(sunny,vec3(.96,.94,.87),smoothstep(.63,.79,cloud+detail*.12)*.75);float sun=pow(max(0.,dot(d,normalize(vec3(-.34,.84,-.4)))),1800.);sunny+=vec3(1.,.78,.43)*sun;sky=mix(sky,sunny,clearing);vec3 dusk=mix(vec3(.038,.050,.070),vec3(.006,.012,.028),h);dusk+=vec3(.016,.019,.026)*cloud;vec3 col=mix(sky,dusk,night);gl_FragColor=vec4(col,1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include'),
  });
  material.fragmentShader=material.fragmentShader.replace('<colorspace_fragment>}', '<colorspace_fragment>\n}');
  // Draw after opaque geometry. Early depth rejection avoids evaluating ten
  // cloud-noise octaves behind every wall, berth, leaf and patch of ground.
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Continuous raincloud and night sky';mesh.frustumCulled=false;mesh.renderOrder=1000;mesh.visible=false;mesh.userData.skipOceanReflection=true;
  return {mesh,update(camera:THREE.PerspectiveCamera,time:number,night:number,active:boolean,clearing=0){mesh.visible=active;if(!active)return;mesh.position.copy(camera.position);mesh.scale.setScalar(camera.far*.85);uniforms.night.value=night;uniforms.clock.value=time;uniforms.clearing.value=clearing;},dispose(){geometry.dispose();material.dispose();mesh.removeFromParent();}};
}
