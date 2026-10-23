import * as THREE from 'three';
/** The water boundary belongs to the same scene and camera as the shore. */
export function createSummerUnderwater(scene:THREE.Scene,camera:THREE.PerspectiveCamera,reduced:boolean,compact:boolean){
  const background=scene.background,fog=scene.fog,underSky=new THREE.Color(0x327d88),underFog=new THREE.FogExp2(underSky,.024);
  const geometry=new THREE.PlaneGeometry(600,340,1,1);geometry.rotateX(Math.PI/2);geometry.translate(80,0,0);
  const material=new THREE.ShaderMaterial({side:THREE.FrontSide,uniforms:{time:{value:0}},vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',fragmentShader:`uniform float time;varying vec3 world;void main(){
    vec3 view=normalize(cameraPosition-world);vec2 water=world.xz;
    float swell=sin(water.x*.31+water.y*.17+time*.23)+sin(water.y*.41-water.x*.13-time*.19)*.6;
    float ripple=sin(water.x*1.2+water.y*.73+swell*2.1)*sin(water.y*1.1-water.x*.62-swell);
    vec3 surfaceNormal=normalize(vec3(cos(water.x*.31+water.y*.17+time*.23)*.055,1.,sin(water.y*.41-water.x*.13-time*.19)*.045));float window=smoothstep(.64,.72,abs(dot(view,surfaceNormal)));float distanceFade=exp(-length(cameraPosition-world)*.018);
    vec3 colour=mix(vec3(.035,.17,.20),vec3(.28,.57,.55),window*distanceFade);
    colour+=pow(max(0.,1.-abs(ripple)),10.)*.018*distanceFade;
    gl_FragColor=vec4(colour,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`});
  const underside=new THREE.Mesh(geometry,material);underside.name='Sunlit underside of the sea';underside.visible=false;scene.add(underside);
  const light=new THREE.SpotLight(0xffefd0,7,13,.37,.65,1.2);light.castShadow=false;scene.add(light,light.target);
  const fill=new THREE.HemisphereLight(0xb6e3d9,0x44776d,.75);fill.visible=false;scene.add(fill);
  const waterClock={value:0};
  const volumeGeometry=new THREE.SphereGeometry(190,16,10),volumeMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:false,uniforms:{time:waterClock,waterColour:{value:underSky}},vertexShader:'varying vec3 waterRay;void main(){vec4 world=modelMatrix*vec4(position,1.);waterRay=world.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*world;}',fragmentShader:`uniform float time;uniform vec3 waterColour;varying vec3 waterRay;void main(){
    vec3 ray=normalize(waterRay);vec3 samplePoint=cameraPosition*.035+ray*9.;
    float haze=sin(samplePoint.x+sin(samplePoint.z*1.3+time*.035))*sin(samplePoint.y*1.7-samplePoint.z*.6-time*.023);
    float light=smoothstep(-.55,.80,ray.y);vec3 colour=waterColour*mix(.67,1.06,light)*(1.+haze*.035);
    gl_FragColor=vec4(colour,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`});
  const volume=new THREE.Mesh(volumeGeometry,volumeMaterial);volume.name='Depth tinted water with drifting suspended haze';volume.renderOrder=-100;volume.visible=false;volume.frustumCulled=false;scene.add(volume);
  const count=compact?400:850,p=new Float32Array(count*3);for(let index=0;index<count;index++){p[index*3]=Math.sin(index*127.7)*20;p[index*3+1]=Math.sin(index*31.2)*14;p[index*3+2]=Math.cos(index*73.4)*20;}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(p,3));
  const pm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:waterClock},vertexShader:`uniform float time;varying float opacity;void main(){vec3 drift=position+vec3(sin(time*.12+position.y)*.07,time*.018,cos(time*.09+position.x)*.06);vec3 offset=mod(drift-cameraPosition+vec3(20.,14.,20.),vec3(40.,28.,40.))-vec3(20.,14.,20.);vec3 world=cameraPosition+offset;vec4 view=viewMatrix*vec4(world,1.);float distance=length(offset);opacity=(1.-smoothstep(9.,18.,distance))*.16;gl_PointSize=clamp(28./max(1.,-view.z),.8,2.5);gl_Position=projectionMatrix*view;}`,fragmentShader:'varying float opacity;void main(){float radius=length(gl_PointCoord-.5)*2.;if(radius>1.)discard;gl_FragColor=vec4(.72,.87,.79,opacity*(1.-radius*radius));}'});
  const particles=new THREE.Points(pg,pm);particles.name='Fine drifting plankton and suspended reef particles';particles.frustumCulled=false;scene.add(particles);
  const shafts=new THREE.Group();shafts.name='Soft sun shafts through the water column';scene.add(shafts);
  const shaftGeometry=new THREE.CylinderGeometry(.55,1.8,22,20,1,true),shaftMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:waterClock},vertexShader:'varying vec2 shaftUv;varying vec3 shaftWorld;void main(){shaftUv=uv;shaftWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(shaftWorld,1.);}',fragmentShader:'uniform float time;varying vec2 shaftUv;varying vec3 shaftWorld;void main(){if(shaftWorld.y>-.25)discard;float edge=pow(sin(shaftUv.x*3.14159265),2.);float fade=sin(shaftUv.y*3.14159265);float distanceFade=1.-smoothstep(15.,45.,length(cameraPosition-shaftWorld));float drift=.8+.2*sin(time*.12+shaftWorld.x*.3);gl_FragColor=vec4(.38,.64,.58,edge*fade*distanceFade*drift*.012);}'});
  for(let index=0;index<(compact?3:5);index++){const shaft=new THREE.Mesh(shaftGeometry,shaftMaterial);shaft.position.set(110+index*16,-10,-28+Math.sin(index*2.4)*11);shaft.rotation.z=-.18;shafts.add(shaft);}
  const shallowColour=new THREE.Color(0x327d88),deepColour=new THREE.Color(0x123b50),torchOffset=new THREE.Vector3(),torchTarget=new THREE.Vector3();
  let underwater=false;
  return {get underwater(){return underwater;},update(time:number,torch:boolean){
    if(camera.position.y<-.22)underwater=true;else if(camera.position.y>.12)underwater=false;
    const depth=THREE.MathUtils.smoothstep(-camera.position.y,2,24);underSky.copy(shallowColour).lerp(deepColour,depth*.78);underFog.color.copy(underSky);underFog.density=.022+depth*.012;fill.intensity=.75-depth*.34;
    scene.background=underwater?underSky:background;scene.fog=underwater?underFog:fog;underside.visible=particles.visible=fill.visible=volume.visible=shafts.visible=underwater;light.visible=underwater&&torch;
    material.uniforms.time.value=waterClock.value=reduced?0:time;volume.position.copy(camera.position);
    light.position.copy(camera.position).add(torchOffset.set(.23,-.25,-.12).applyQuaternion(camera.quaternion));light.target.position.copy(camera.position).add(torchTarget.set(0,-.1,-7).applyQuaternion(camera.quaternion));
  },dispose(){scene.background=background;scene.fog=fog;geometry.dispose();material.dispose();pg.dispose();pm.dispose();volumeGeometry.dispose();volumeMaterial.dispose();shaftGeometry.dispose();shaftMaterial.dispose();scene.remove(underside,light,light.target,fill,particles,volume,shafts);}};
}
