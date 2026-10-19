import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {VoidAssets} from './assets';
import {SEASON_CRYSTALS,SEASON_CRYSTAL_MOUNT as mount,createSeasonCrystalJourney} from './season-crystal-journey';

type CrystalPose=ReturnType<ReturnType<typeof createSeasonCrystalJourney>['pose']>;
/** The supplied faceted crystal core, with new gemstone materials and recessed pillar sockets. */
export function createSeasonCrystals(assets:VoidAssets){
  const group=new THREE.Group(),reflection=new THREE.Group(),owned:THREE.Material[]=[],geometries:THREE.BufferGeometry[]=[];
  group.name='Season crystals embedded in the monuments';reflection.name='Season crystal reflections';
  const source=assets.crystal.find(p=>/^Crystal_/.test(p.name));
  if(!source)throw new Error('The seasonal crystal core could not be found.');
  const core=source.geometry.clone();core.computeBoundingBox();const bounds=core.boundingBox!,centre=bounds.getCenter(new THREE.Vector3()),scale=mount.height/(bounds.max.y-bounds.min.y);
  core.translate(-centre.x,-centre.y,-centre.z);core.scale(scale,scale,scale);core.computeVertexNormals();core.computeBoundingSphere();geometries.push(core);
  const metal=new THREE.MeshStandardMaterial({color:0x8c7160,metalness:.78,roughness:.36}),dark=new THREE.MeshStandardMaterial({color:0x130e18,metalness:.24,roughness:.74});owned.push(metal,dark);
  const ring=new THREE.TorusGeometry(.265,.022,6,8);ring.scale(.74,1,1);ring.translate(0,0,.16);geometries.push(ring);
  const recess=new THREE.CylinderGeometry(.25,.235,.025,8);recess.rotateX(Math.PI/2);recess.scale(.74,1,1);recess.translate(0,0,.018);geometries.push(recess);
  const sleeve=new THREE.CylinderGeometry(.25,.235,.13,8,1,true);sleeve.rotateX(Math.PI/2);sleeve.scale(.74,1,1);sleeve.translate(0,0,.09);geometries.push(sleeve);
  const clawParts:THREE.BufferGeometry[]=[];
  for(const side of [-1,1])for(const y of [-.12,.12]){const g=new THREE.ConeGeometry(.021,.08,5);g.rotateZ(side*Math.PI/2);g.translate(side*.15,y,.185);clawParts.push(g);}
  const claws=mergeGeometries(clawParts)!;clawParts.forEach(g=>g.dispose());geometries.push(claws);
  const sockets:THREE.Group[]=[],gems:THREE.Mesh[]=[],mirrors:THREE.Mesh[]=[],gemMaterials:THREE.MeshStandardMaterial[]=[],mirrorMaterials:THREE.MeshBasicMaterial[]=[];
  for(let i=0;i<9;i++){
    const socket=new THREE.Group();socket.name='Recessed crystal socket';socket.add(new THREE.Mesh(recess,dark),new THREE.Mesh(sleeve,metal),new THREE.Mesh(ring,metal),new THREE.Mesh(claws,metal));group.add(socket);sockets.push(socket);
    const material=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.4,metalness:.32,roughness:.18,flatShading:true,side:THREE.DoubleSide});
    // Darker edges and bright internal facets preserve the mineral shape during the charge.
    material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat facing=abs(dot(normal,normalize(vViewPosition)));totalEmissiveRadiance*=.3+.7*pow(facing,2.);');};
    const mirrorMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});owned.push(material,mirrorMaterial);gemMaterials.push(material);mirrorMaterials.push(mirrorMaterial);
    const gem=new THREE.Mesh(core,material),mirror=new THREE.Mesh(core,mirrorMaterial);gem.name='Embedded season crystal';group.add(gem);reflection.add(mirror);gems.push(gem);mirrors.push(mirror);
  }
  const light=new THREE.PointLight(0xff78ba,0,20,1.7);group.add(light);
  const haloMaterial=new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(0xff78ba)},strength:{value:.3}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 haloUv;void main(){haloUv=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 haloUv;uniform vec3 tint;uniform float strength;void main(){float r=length(haloUv);float a=exp(-r*r*7.)*(1.-smoothstep(.55,1.,r))*strength;gl_FragColor=vec4(tint*a,a);}',
  });owned.push(haloMaterial);const haloGeometry=new THREE.PlaneGeometry(2.5,2.5);geometries.push(haloGeometry);const halo=new THREE.Mesh(haloGeometry,haloMaterial);group.add(halo);halo.visible=false;
  const sparksGeometry=new THREE.BufferGeometry(),seeds=new Float32Array(72*3);for(let i=0;i<72;i++){seeds[i*3]=Math.sin(i*5.37);seeds[i*3+1]=i/72;seeds[i*3+2]=Math.cos(i*7.13);}sparksGeometry.setAttribute('position',new THREE.BufferAttribute(seeds,3));geometries.push(sparksGeometry);
  const sparkleTime={value:0},sparklePower={value:0};const sparksMaterial=new THREE.PointsMaterial({color:0xff78ba,size:.012,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending});
  sparksMaterial.onBeforeCompile=s=>{s.uniforms.gateTime=sparkleTime;s.uniforms.gatePower=sparklePower;s.vertexShader='uniform float gateTime,gatePower;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat a=position.y*38.+gateTime*(.35+position.x*.1),r=(.13+fract(position.x*11.)*.35)*gatePower;transformed=vec3(cos(a)*r,(fract(position.y+gateTime*.13)-.5)*gatePower,sin(a)*r);');s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(length(gl_PointCoord-.5)>.5)discard;');};owned.push(sparksMaterial);
  const sparks=new THREE.Points(sparksGeometry,sparksMaterial);sparks.frustumCulled=false;group.add(sparks);sparks.visible=false;
  const dock=new THREE.Vector3(),destination=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3(),colour=new THREE.Color();
  const indices:number[]=[];let lastFirst=-1,lastOrigin=Infinity,firstDistance=28;
  return {group,reflection,
    hit(raycaster:THREE.Raycaster,index:number){const slot=indices.indexOf(index);return slot>=0&&raycaster.intersectObject(gems[slot],false).some(hit=>hit.distance<3);},
    place(first:number,origin:number,firstMemory:number){if(first===lastFirst&&origin===lastOrigin)return;lastFirst=first;lastOrigin=origin;firstDistance=firstMemory;
      for(let i=0;i<9;i++){
        const index=first+i,season=assets.manifest.photos[index%assets.manifest.photos.length]?.season;indices[i]=index;
        sockets[i].visible=gems[i].visible=mirrors[i].visible=!!season;if(!season)continue;
        const z=origin-firstMemory-index*18;dock.set(0,mount.y,z+mount.z);sockets[i].position.set(0,mount.y,z);gems[i].position.copy(dock);mirrors[i].position.copy(dock);
        colour.set(SEASON_CRYSTALS[season].colour);gemMaterials[i].color.copy(colour).multiplyScalar(.68);gemMaterials[i].emissive.copy(colour);mirrorMaterials[i].color.copy(colour).multiplyScalar(1.4);
      }
    },
    update(time:number,camera:THREE.Camera,pose:CrystalPose,candidate:{index:number}|null,reveal:number){
      const active=pose.active&&pose.season,slot=indices.indexOf(active?pose.index:candidate?.index??-1);
      for(let i=0;i<9;i++){gemMaterials[i].emissiveIntensity=.42;gems[i].rotation.set(0,0,0);mirrors[i].rotation.set(0,0,0);gems[i].scale.setScalar(1);mirrors[i].scale.setScalar(1);gems[i].position.set(0,mount.y,lastOrigin-firstDistance-indices[i]*18+mount.z);mirrors[i].position.copy(gems[i].position);mirrorMaterials[i].color.copy(gemMaterials[i].emissive).multiplyScalar(1.4);}
      light.intensity=0;halo.visible=sparks.visible=false;if(slot<0||reveal<.01)return;
      const gem=gems[slot],mirror=mirrors[slot],material=gemMaterials[slot];
      colour.copy(material.emissive);light.color.copy(colour);haloMaterial.uniforms.tint.value.copy(colour);sparksMaterial.color.copy(colour);
      if(active){
        dock.set(0,mount.y,lastOrigin-firstDistance-pose.index*18+mount.z);
        forward.set(0,0,-1).applyQuaternion(camera.quaternion);right.set(1,0,0).applyQuaternion(camera.quaternion);
        destination.copy(camera.position).addScaledVector(forward,.94).addScaledVector(right,.20);destination.y-=.12;
        gem.position.copy(dock);gem.position.y+=pose.release*.25;gem.position.z+=pose.release*.45;gem.position.lerp(destination,pose.flight);
        if(!pose.reduced){gem.position.y+=Math.sin(time*2.1)*.035*pose.flight;gem.rotation.y=pose.release*.55+pose.flight*1.5;gem.rotation.z=Math.sin(time*.9)*.07*pose.flight;}
        gem.scale.setScalar(1-pose.flight*.22);material.emissiveIntensity=.42+pose.glow*3.4;
        light.position.copy(gem.position).addScaledVector(forward,-.25);light.intensity=4+pose.glow*48;light.distance=10+pose.glow*16;
        halo.scale.setScalar(.4+pose.glow*1.15);haloMaterial.uniforms.strength.value=.20+pose.glow*.55;
      }else{light.position.copy(gem.position).add(new THREE.Vector3(0,.15,.6));light.intensity=3;light.distance=5;halo.scale.setScalar(.35);haloMaterial.uniforms.strength.value=.15;}
      mirror.position.copy(gem.position);mirror.quaternion.copy(gem.quaternion);mirror.scale.copy(gem.scale);mirrorMaterials[slot].color.copy(colour).multiplyScalar(active?1.4+pose.glow*3:1.4);
      halo.position.copy(gem.position);halo.quaternion.copy(camera.quaternion);halo.visible=true;
      sparks.position.copy(gem.position);sparkleTime.value=time;sparklePower.value=active&&!pose.reduced?.4+pose.glow*.6:0;sparks.visible=!!active&&!pose.reduced;
    },
    dispose(){geometries.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());group.clear();reflection.clear();},
  };
}
