import * as THREE from 'three';
import {SUMMER_PONDS,SUMMER_GROUND_GLSL,summerGroundHeight,summerForestBlend,summerForestPathDistance,summerPondDistance,summerClearance,summerDockHeight,summerLandBlocked} from './summer-layout';
import {random,type SeasonLayout} from './season-layout';

/** Reuses the photographed, attributed grass/shrub meshes. Tile culling keeps the
 * forest floor affordable while the same authored paths remain clear to walk. */
export function createSummerForest(layout:SeasonLayout,grass:THREE.Object3D,shrub:THREE.Object3D,waterNormals:THREE.Texture,compact:boolean){
  const group=new THREE.Group();group.name='Summer · damp forest floor and freshwater pools';
  const geometry:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[],tiles:{root:THREE.Group;x:number;z:number}[]=[];
  const clock={value:0};
  function patch(source:THREE.Object3D,points:{x:number;z:number;height:number;seed:number}[],name:string){
    source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),centre=bounds.getCenter(new THREE.Vector3()),height=Math.max(.01,bounds.max.y-bounds.min.y);
    const transform=new THREE.Object3D();
    source.traverse(o=>{
      if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;
      const g=o.geometry.clone().applyMatrix4(o.matrixWorld).translate(-centre.x,-bounds.min.y,-centre.z);geometry.push(g);
      const m=(o.material as THREE.MeshStandardMaterial).clone();m.side=THREE.DoubleSide;m.transparent=false;m.depthWrite=true;m.alphaTest=Math.max(.4,m.alphaTest);m.color.multiply(new THREE.Color(name==='grass'?0xa7c88a:0x98bb80));m.roughness=.94;m.envMapIntensity=.5;materials.push(m);
      const original=m.onBeforeCompile;m.onBeforeCompile=(s,r)=>{original.call(m,s,r);s.uniforms.forestTime=clock;s.vertexShader='uniform float forestTime;\n'+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat tip=clamp(position.y/${height.toFixed(4)},0.,1.);transformed.x+=sin(forestTime*1.1+instanceMatrix[3].x*.6+position.y)*tip*tip*.035;`);};
      const batch=new THREE.InstancedMesh(g,m,points.length);batch.name='Photographed forest '+name;batch.receiveShadow=true;batch.castShadow=name!=='grass';
      points.forEach((p,i)=>{transform.position.set(p.x,summerGroundHeight(p.x,p.z)-.02,p.z);transform.scale.setScalar(p.height/height);transform.rotation.set(0,random(p.seed+3)*Math.PI*2,0);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);});
      batch.computeBoundingSphere();return group.add(batch);
    });
  }
  // Independent local batches keep only nearby understory visible; trees are
  // handled by the shared near/mid/far tree renderer.
  for(let tz=-44;tz<40;tz+=12)for(let tx=-38;tx<38;tx+=12){
    const root=new THREE.Group(),before=group.children.length,points:{x:number;z:number;height:number;seed:number}[]=[],bushes:typeof points=[];
    for(let n=0;n<(compact?42:95);n++){
      const seed=(tx+50)*911+(tz+55)*131+n*17,x=tx+random(seed)*12,z=tz+random(seed+1)*12;
      if(summerForestBlend(x,z)<.5||summerPondDistance(x,z)<1.05||summerForestPathDistance(x,z)<1.25||summerGroundHeight(x,z)<.45||summerDockHeight(x,z)!==null||summerLandBlocked(x,z,.25))continue;
      const patchDensity=.55+.28*Math.sin(x*.46+Math.sin(z*.31))+.17*Math.sin(z*.81-x*.27);
      if(random(seed+45)>patchDensity)continue;
      points.push({x,z,height:.10+random(seed+2)*.25,seed});
      if(n%16===0&&!summerClearance(x,z)&&!layout.obstacles.some(t=>Math.hypot(t.x-x,t.z-z)<t.radius+.7))bushes.push({x,z,height:.5+random(seed+2)*.5,seed});
    }
    if(points.length)patch(grass,points,'grass');if(bushes.length)patch(shrub,bushes,'understory');
    const children=group.children.slice(before);children.forEach(child=>root.add(child));root.name='Forest floor tile';group.add(root);tiles.push({root,x:tx+6,z:tz+6});
  }
  const pondMaterial=new THREE.MeshPhysicalMaterial({color:0x417e70,roughness:.18,metalness:.08,transparent:true,opacity:.83,clearcoat:1,clearcoatRoughness:.12,normalMap:waterNormals,normalScale:new THREE.Vector2(.12,.12),side:THREE.DoubleSide,depthWrite:false,envMapIntensity:.8});
  materials.push(pondMaterial);
  pondMaterial.onBeforeCompile=s=>{
    s.uniforms.forestTime=clock;
    s.vertexShader='varying vec3 forestWaterP;uniform float forestTime;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=sin(position.x*3.+forestTime*.8)*sin(position.z*2.1+forestTime*.6)*.006;forestWaterP=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader='varying vec3 forestWaterP;\n'+SUMMER_GROUND_GLSL+s.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat depth=.95-summerGroundAt(forestWaterP.xz);if(depth<.006)discard;diffuseColor.a*=smoothstep(.006,.12,depth);');
  };
  for(const pond of SUMMER_PONDS){const g=new THREE.PlaneGeometry(pond.radiusX*2.5,pond.radiusZ*2.5,24,20);g.rotateX(-Math.PI/2);geometry.push(g);const mesh=new THREE.Mesh(g,pondMaterial);mesh.name='Shallow freshwater forest pool';mesh.position.set(pond.x,pond.level,pond.z);mesh.renderOrder=1;group.add(mesh);}
  return{group,update(time:number,camera:THREE.Camera){clock.value=time;tiles.forEach(t=>t.root.visible=camera.position.y>-.2&&Math.hypot(camera.position.x-t.x,camera.position.z-t.z)<(compact?32:47));},dispose(){geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});group.clear();}};
}
