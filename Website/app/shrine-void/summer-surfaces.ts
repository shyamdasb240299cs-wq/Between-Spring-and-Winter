import * as THREE from 'three';
import type {GroundMaps} from './season-terrain';

export interface SummerSurfaces { timber:GroundMaps; gravel:GroundMaps; }
/** Owned by the scene texture cache. No network or texture allocations in a frame. */
export async function loadSummerSurfaces(load:(url:string,color:boolean)=>Promise<THREE.Texture>):Promise<SummerSurfaces>{
  async function set(id:string,sizeMetres:number):Promise<GroundMaps>{
    const [color,normal,roughness]=await Promise.all(['color','normal','roughness'].map((kind)=>load(`/seasons/kit/summer/realism/${id}-${kind}.webp`,kind==='color')));
    return {color,normal,roughness,sizeMetres};
  }
  const [timber,gravel]=await Promise.all([set('weathered_planks',2),set('coral_gravel',2.4)]);
  return {timber,gravel};
}

/** Fine surface relief instead of high-poly tread or glossy toy-like neoprene. */
export function detailSummerMaterial(material:THREE.MeshStandardMaterial,kind:'deck'|'neoprene'|'rubber'){
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);
    shader.vertexShader='varying vec3 finishP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfinishP=position;');
    shader.fragmentShader='varying vec3 finishP;\n'+shader.fragmentShader;
    const pattern=kind==='deck'?'sin((finishP.x+finishP.z)*420.)*sin((finishP.x-finishP.z)*420.)':'sin(finishP.x*1050.)*sin(finishP.y*1050.+finishP.z*930.)';
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat finishDetail=${pattern};float finishFade=1.-smoothstep(.004,.02,length(fwidth(finishP)));diffuseColor.rgb*=1.+finishDetail*finishFade*.035;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\nvec3 detailDx=dFdx(vViewPosition),detailDy=dFdy(vViewPosition);vec3 detailR1=cross(detailDy,normal),detailR2=cross(normal,detailDx);float detailDet=dot(detailDx,detailR1);vec3 detailGrad=sign(detailDet)*(dFdx(finishDetail)*detailR1+dFdy(finishDetail)*detailR2);normal=normalize(abs(detailDet)*normal-detailGrad*${kind==='deck'?'.00012':'.000025'}*finishFade);`);
  };
  material.customProgramCacheKey=()=>`summer-finish-${kind}-1`;
}
