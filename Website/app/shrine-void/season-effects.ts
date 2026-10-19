import * as THREE from 'three';
import {random,groundGLSL} from './season-layout';
import {createLeafTexture} from './season-leaf';
import type {SeasonId} from './seasons';

export function createSeasonParticles(id:SeasonId,mobile:boolean,reduced:boolean){
  const max=id==='winter'?(mobile?350:900):id==='spring'?(mobile?2200:6000):(mobile?250:650);
  const geometry=new THREE.InstancedBufferGeometry(),quad=new THREE.PlaneGeometry(1,1,4,4);
  geometry.index=quad.index;geometry.attributes=quad.attributes;
  const seeds=new Float32Array(max*4);for(let i=0;i<seeds.length;i++)seeds[i]=random(i*13+41);
  geometry.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds,4));geometry.instanceCount=id==='summer'||reduced?0:max;
  const leafMap=createLeafTexture();
  const uniforms={leafMap:{value:leafMap},seasonTime:{value:0},anchor:{value:new THREE.Vector2()},winter:{value:id==='winter'?1:0},autumn:{value:id==='autumn'?1:0},fogColour:{value:new THREE.Color(id==='winter'?0xa5afcb:id==='spring'?0xc5d3ba:0xd7b78e)}};
  const material=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,transparent:true,depthWrite:false,
    vertexShader:`attribute vec4 seed;uniform float seasonTime,winter,autumn;uniform vec2 anchor;varying vec2 vUv;varying float vFade,vDistance,vShade;${groundGLSL}
      void main(){vUv=uv;float speed=mix(.038,.09,winter)+seed.w*.016;float life=fract(seed.x+seasonTime*speed),fall=min(life/mix(.86,.96,winter),1.);
        vec2 world=vec2(0.,-3.)+(seed.yz-.5)*vec2(29.,29.);world.x+=sin(fall*5.+seed.w*30.)*(1.-winter*.6)+sin(seasonTime*.23+seed.z*20.)*.36;world.y+=sin(fall*4.+seed.x*20.)*.8;
        float floorHeight=groundAt(world,${id==='winter'?3:id==='autumn'?2:0})+.026;float y=mix(floorHeight+5.5+seed.w*4.,floorHeight,fall);
        float angle=seed.w*6.283+seasonTime*(.65+seed.z*1.2)*(1.-winter);float size=mix(.027,.025,winter)+seed.z*mix(.035,.035,winter);
        if(autumn>.5)size*=3.1;vec3 p=position*size;p.z+=sin(uv.y*3.14159)*size*.18;vec2 spin=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p.xy;
        p=vec3(spin.x,spin.y*cos(angle*.7)-p.z*sin(angle*.7),spin.y*sin(angle*.7)+p.z*cos(angle*.7));if(fall>=1.)p=vec3(spin.x,0.,spin.y);if(winter>.5)p=mat3(cameraMatrixWorld)*position*size;
        vec3 centre=vec3(world.x,y,world.y);vec4 view=viewMatrix*vec4(centre+p,1.);vDistance=-view.z;
        vFade=smoothstep(0.,.07,life)*(1.-smoothstep(.94,1.,life))*(1.-smoothstep(17.,25.,distance(world,anchor)));vShade=.72+seed.w*.28;gl_Position=projectionMatrix*view;}`.replace('mat3(cameraMatrixWorld)','transpose(mat3(viewMatrix))'),
    fragmentShader:`uniform sampler2D leafMap;uniform float winter,autumn;uniform vec3 fogColour;varying vec2 vUv;varying float vFade,vDistance,vShade;
      void main(){vec2 p=(vUv-.5)*2.;float alpha;vec3 colour;
        if(winter>.5){alpha=1.-smoothstep(.15,1.,length(p));colour=vec3(.88,.93,1.);}
        else if(autumn>.5){vec4 leaf=texture2D(leafMap,vUv);alpha=leaf.a;colour=leaf.rgb*mix(vec3(.68,.15,.035),vec3(1.,.72,.20),smoothstep(.72,.99,vShade));}
        else{vec2 petal=p*vec2(1.08+.14*p.y,.79);alpha=1.-smoothstep(.65,.86,length(petal));float notch=smoothstep(.34,.65,p.y)*(1.-smoothstep(.055,.14,abs(p.x)));alpha*=1.-notch*.7;colour=mix(vec3(1.,.64,.79),vec3(1.,.90,.94),smoothstep(.72,1.,vShade));}
        if(alpha*vFade<.03)discard;colour=mix(colour*vShade,fogColour,smoothstep(12.,45.,vDistance));gl_FragColor=vec4(colour,alpha*vFade*.9);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.name='Seasonal airborne particles';
  return {mesh,update(time:number,camera:THREE.Camera,density:number){uniforms.seasonTime.value=reduced?0:time;uniforms.anchor.value.set(camera.position.x,camera.position.z);geometry.instanceCount=reduced||id==='summer'?0:Math.floor(max*density);},dispose(){geometry.dispose();material.dispose();leafMap.dispose();}};
}

