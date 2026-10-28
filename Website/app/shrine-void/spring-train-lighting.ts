import * as THREE from 'three';

type CoachLamp={position:THREE.Vector3;color:THREE.Color;range:number;power:number};

/** The same physical point-light response, scoped to vehicle surfaces. Adding
 * global lights makes every leaf in the entire forest evaluate every cabin bulb. */
export function createSpringTrainLighting(lamps:CoachLamp[]){
  const strength={value:1};
  const positions={value:lamps.map(()=>new THREE.Vector3())};
  const colours={value:lamps.map(l=>l.color.clone().multiplyScalar(l.power))};
  const ranges={value:lamps.map(l=>l.range)};
  function bind(material:THREE.MeshStandardMaterial){
    const compile=material.onBeforeCompile,key=material.customProgramCacheKey(),count=lamps.length;
    material.onBeforeCompile=(shader,renderer)=>{
      compile.call(material,shader,renderer);
      Object.assign(shader.uniforms,{coachLampStrength:strength,coachLampPosition:positions,coachLampColour:colours,coachLampRange:ranges});
      shader.fragmentShader=`uniform float coachLampStrength;
        uniform vec3 coachLampPosition[${count}];uniform vec3 coachLampColour[${count}];uniform float coachLampRange[${count}];\n`+shader.fragmentShader;
      const lighting=lamps.map((_,i)=>`{
        vec3 coachVector=coachLampPosition[${i}]-geometryPosition;
        float coachDistance=length(coachVector);
        if(coachDistance<coachLampRange[${i}]){
          IncidentLight coachLight;coachLight.direction=normalize(coachVector);
          coachLight.color=coachLampColour[${i}]*coachLampStrength*getDistanceAttenuation(coachDistance,coachLampRange[${i}],2.);
          coachLight.visible=true;
          RE_Direct(coachLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
        }
      }`).join('\n');
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>','#include <lights_fragment_begin>\n'+lighting);
    };
    material.customProgramCacheKey=()=>key+'-coach-local-lighting-'+count;
  }
  return {bind,update(night:number,active:boolean,camera:THREE.Camera){strength.value=active?.6+.4*night:0;if(active){camera.updateMatrixWorld();for(let i=0;i<lamps.length;i++)positions.value[i].copy(lamps[i].position).applyMatrix4(camera.matrixWorldInverse);}}};
}

/** Use neighbouring, unstained upholstery from the same atlas. The mask only
 * touches saturated red pixels; blue grain, stitching and normal maps survive. */
export function cleanSpringTrainUpholstery(material:THREE.MeshStandardMaterial){
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    compile.call(material,shader,renderer);
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      #ifdef USE_MAP
        vec3 seatSource=texture2D(map,vMapUv).rgb;
        float seatRed=seatSource.r-max(seatSource.g,seatSource.b);
        float stainMask=smoothstep(.003,.018,seatRed)*smoothstep(1.05,1.5,seatSource.r/max(.002,max(seatSource.g,seatSource.b)));
        // Padded bounds of all three painted marks in the original 1536px atlas.
        // Full replacement across the mark and its compression/mipmap fringe;
        // feathering occurs only on clean blue fabric beyond the stain.
        vec2 stainUV=fract(vMapUv);
        float patchA=smoothstep(.018,.028,stainUV.x)*(1.-smoothstep(.110,.120,stainUV.x))*smoothstep(.614,.624,stainUV.y)*(1.-smoothstep(.693,.703,stainUV.y));
        float patchB=smoothstep(.474,.484,stainUV.x)*(1.-smoothstep(.515,.525,stainUV.x))*smoothstep(.570,.580,stainUV.y)*(1.-smoothstep(.627,.637,stainUV.y));
        float patchC=smoothstep(.056,.066,stainUV.x)*(1.-smoothstep(.123,.133,stainUV.x))*smoothstep(.827,.837,stainUV.y)*(1.-smoothstep(.881,.891,stainUV.y));
        stainMask=max(stainMask,max(patchA,max(patchB,patchC)));
        vec3 cleanSeat=texture2D(map,vMapUv+vec2(.12,0.)).rgb;
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuse*cleanSeat,stainMask);
      #endif`);
  };
  material.customProgramCacheKey=()=>key+'-clean-blue-upholstery-v1';
}
