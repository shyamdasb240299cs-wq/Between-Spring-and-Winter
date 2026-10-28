import * as THREE from 'three';

/** A moving, physical point source scoped to keepsake surfaces. Its strength is
 * a uniform, so lighting the wick cannot recompile every outdoor PBR material. */
export function createSpringCandleLighting(){
  const source=new THREE.Object3D();source.name='Warm candlelight inside the keepsake chest';
  const position={value:new THREE.Vector3()},colour={value:new THREE.Color(0xffbd68)},intensity={value:0},range={value:2.2};
  const originals=new Map<THREE.MeshStandardMaterial,{compile:THREE.MeshStandardMaterial['onBeforeCompile'];key:THREE.MeshStandardMaterial['customProgramCacheKey']}>();
  source.userData.intensity=0;source.userData.range=range.value;source.visible=false;
  return {
    source,
    bind(material:THREE.MeshStandardMaterial){
      if(originals.has(material))return;
      const compile=material.onBeforeCompile,key=material.customProgramCacheKey,cacheKey=key.call(material);
      originals.set(material,{compile,key});
      material.onBeforeCompile=(shader,renderer)=>{
        compile.call(material,shader,renderer);
        Object.assign(shader.uniforms,{springCandlePosition:position,springCandleColour:colour,springCandleIntensity:intensity,springCandleRange:range});
        shader.fragmentShader='uniform vec3 springCandlePosition,springCandleColour;uniform float springCandleIntensity,springCandleRange;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',`#include <lights_fragment_begin>
          if(springCandleIntensity>0.){
            vec3 candleVector=(viewMatrix*vec4(springCandlePosition,1.)).xyz-geometryPosition;
            float candleDistance=length(candleVector);
            if(candleDistance<springCandleRange){
              IncidentLight candleLight;candleLight.direction=candleVector/max(candleDistance,.0001);
              candleLight.color=springCandleColour*springCandleIntensity*getDistanceAttenuation(candleDistance,springCandleRange,2.);
              candleLight.visible=true;
              RE_Direct(candleLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
            }
          }`);
      };
      material.customProgramCacheKey=()=>cacheKey+'-spring-scoped-candle-v1';
    },
    update(power:number){
      intensity.value=Math.max(0,power);source.userData.intensity=intensity.value;source.visible=intensity.value>0;
      if(!source.visible)return;
      // Transform at draw time so reflected views use their own camera matrix.
      source.getWorldPosition(position.value);
    },
    dispose(){
      intensity.value=0;source.userData.intensity=0;
      for(const [material,original]of originals){material.onBeforeCompile=original.compile;material.customProgramCacheKey=original.key;}
      originals.clear();source.removeFromParent();
    },
  };
}
