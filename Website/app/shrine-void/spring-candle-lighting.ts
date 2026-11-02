import * as THREE from 'three';

/** A physical wick source used only by private locker-interior materials.
 * Exterior light is removed after Three's PBR accumulation; the wick then adds
 * its own direct light. Uniform changes never alter outdoor shader programs. */
export function createSpringCandleLighting(){
  const source=new THREE.Object3D();source.name='Warm candlelight inside the keepsake chest';
  const position={value:new THREE.Vector3()},colour={value:new THREE.Color(0xffbd68)},intensity={value:0},range={value:1.25};
  const worldToLocker={value:new THREE.Matrix4()},volumeMin={value:new THREE.Vector3(-.42,.075,-.27)},volumeMax={value:new THREE.Vector3(.42,.60,.30)},volumeEnabled={value:0};
  let volumeRoot:THREE.Object3D|null=null;
  const originals=new Map<THREE.MeshStandardMaterial,{compile:THREE.MeshStandardMaterial['onBeforeCompile'];key:THREE.MeshStandardMaterial['customProgramCacheKey']}>();
  source.userData.intensity=0;source.userData.range=range.value;source.visible=false;
  return {
    source,
    /** Bounds use the supplied root's local coordinates. Bind only cavity and
     * book materials; the extra volume guard also clips anything crossing out. */
    setVolume(root:THREE.Object3D,min:THREE.Vector3,max:THREE.Vector3){
      volumeRoot=root;volumeMin.value.copy(min);volumeMax.value.copy(max);volumeEnabled.value=1;
      root.updateWorldMatrix(true,false);worldToLocker.value.copy(root.matrixWorld).invert();
    },
    bind(material:THREE.MeshStandardMaterial){
      if(originals.has(material))return;
      const compile=material.onBeforeCompile,key=material.customProgramCacheKey,cacheKey=key.call(material);
      originals.set(material,{compile,key});
      material.onBeforeCompile=(shader,renderer)=>{
        compile.call(material,shader,renderer);
        Object.assign(shader.uniforms,{springCandlePosition:position,springCandleColour:colour,springCandleIntensity:intensity,springCandleRange:range,springLockerWorldToLocal:worldToLocker,springLockerMin:volumeMin,springLockerMax:volumeMax,springLockerVolumeEnabled:volumeEnabled});
        shader.vertexShader='uniform mat4 springLockerWorldToLocal;varying vec3 springLockerPosition;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec4 springLockerVertex=vec4(transformed,1.);
          #ifdef USE_BATCHING
            springLockerVertex=batchingMatrix*springLockerVertex;
          #endif
          #ifdef USE_INSTANCING
            springLockerVertex=instanceMatrix*springLockerVertex;
          #endif
          springLockerPosition=(springLockerWorldToLocal*modelMatrix*springLockerVertex).xyz;`);
        shader.fragmentShader='uniform vec3 springCandlePosition,springCandleColour,springLockerMin,springLockerMax;uniform float springCandleIntensity,springCandleRange,springLockerVolumeEnabled;varying vec3 springLockerPosition;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
          // Keep the recess genuinely dark under sun, sky and environment maps.
          reflectedLight.directDiffuse=vec3(0.);reflectedLight.directSpecular=vec3(0.);
          reflectedLight.indirectDiffuse=vec3(0.);reflectedLight.indirectSpecular=vec3(0.);
          totalEmissiveRadiance=vec3(0.);
          #ifdef USE_CLEARCOAT
            clearcoatSpecularDirect=vec3(0.);clearcoatSpecularIndirect=vec3(0.);
          #endif
          #ifdef USE_SHEEN
            sheenSpecularDirect=vec3(0.);sheenSpecularIndirect=vec3(0.);
          #endif
          bool insideLocker=springLockerVolumeEnabled<.5||(all(greaterThanEqual(springLockerPosition,springLockerMin))&&all(lessThanEqual(springLockerPosition,springLockerMax)));
          if(springCandleIntensity>0.&&insideLocker){
            vec3 candleVector=(viewMatrix*vec4(springCandlePosition,1.)).xyz-geometryPosition;
            float candleDistance=length(candleVector);
            if(candleDistance<springCandleRange){
              IncidentLight candleLight;candleLight.direction=candleVector/max(candleDistance,.0001);
              candleLight.color=springCandleColour*springCandleIntensity*getDistanceAttenuation(candleDistance,springCandleRange,2.);
              candleLight.visible=true;
              RE_Direct(candleLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
            }
          }`);
        // Outdoor distance fog would otherwise wash black cavity surfaces with
        // the sky colour, even when every physical light contribution is zero.
        shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','');
      };
      material.customProgramCacheKey=()=>cacheKey+'-spring-scoped-candle-v2-locker';
    },
    update(power:number){
      intensity.value=Number.isFinite(power)?Math.max(0,power):0;source.userData.intensity=intensity.value;source.visible=intensity.value>0;
      if(volumeRoot){volumeRoot.updateWorldMatrix(true,false);worldToLocker.value.copy(volumeRoot.matrixWorld).invert();}
      if(!source.visible)return;
      // Transform at draw time so reflected views use their own camera matrix.
      source.getWorldPosition(position.value);
    },
    dispose(){
      intensity.value=0;source.userData.intensity=0;
      for(const [material,original]of originals){material.onBeforeCompile=original.compile;material.customProgramCacheKey=original.key;}
      originals.clear();volumeRoot=null;source.visible=false;source.removeFromParent();
    },
  };
}
