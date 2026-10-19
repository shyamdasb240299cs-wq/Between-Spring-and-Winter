import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {groundHeight,random,type SeasonLayout} from './season-layout';
import type {GroundMotion} from './season-ground-motion';

/** Small near-ground detail complements the scanned meadow without a large triangle budget. */
export function createMeadowDetail(layout:SeasonLayout,mobile:boolean,motion?:GroundMotion){
  const group=new THREE.Group(),clock={value:0},p:number[]=[],c:number[]=[],indices:number[]=[];
  group.name='Short meadow, clover and fallen cherry petals';
  const object=new THREE.Object3D(),colour=new THREE.Color();
  const clear=(x:number,z:number)=>{
    if(Math.abs(x-layout.prop.x)<1.83&&Math.abs(z-layout.prop.z)<1.48)return false;
    return !layout.obstacles.some(o=>(x-o.x)**2+(z-o.z)**2<(o.radius+.06)**2);
  };
  for(let blade=0;blade<5;blade++){
    const angle=random(blade+8)*Math.PI*2,bx=(random(blade+98)-.5)*.19,bz=(random(blade+18)-.5)*.19,h=.07+random(blade+86)*.085,w=.006+random(blade+5)*.006,off=p.length/3;
    for(let row=0;row<3;row++){
      const t=row/2,bend=t*t*(.025+random(blade)*.045),width=w*(1-t*.98);
      for(const side of [-1,1]){
        p.push(bx+Math.cos(angle)*width*side+Math.sin(angle)*bend,h*t,bz+Math.sin(angle)*width*side-Math.cos(angle)*bend);
        colour.setHSL(.225+random(blade)*.025,.43,.15+t*.13);c.push(colour.r,colour.g,colour.b);
      }
    }
    for(let row=0;row<2;row++){const a=off+row*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  material.onBeforeCompile=s=>{s.uniforms.meadowTime=clock;s.vertexShader='uniform float meadowTime;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(meadowTime*1.2+instanceMatrix[3].x*.6+instanceMatrix[3].z*.4)*pow(position.y/.2,2.)*.014;');};
  motion?.apply(material,'grass');
  const count=mobile?8500:26000,blades=new THREE.InstancedMesh(geometry,material,count);blades.receiveShadow=true;
  let placed=0;
  for(let n=0;n<count*3&&placed<count;n++){
    const a=random(n+903)*Math.PI*2,r=Math.sqrt(random(n+661))*23,x=Math.cos(a)*r,z=-3+Math.sin(a)*r;if(!clear(x,z))continue;
    object.position.set(x,groundHeight('spring',x,z)-.004,z);object.rotation.set(0,random(n)*6.28,0);object.scale.setScalar(.8+random(n+90)*.5);object.updateMatrix();blades.setMatrixAt(placed++,object.matrix);
  }
  blades.count=placed;blades.computeBoundingSphere();group.add(blades);

  const cloverParts:THREE.BufferGeometry[]=[];
  for(let leaf=0;leaf<3;leaf++){
    const angle=leaf/3*Math.PI*2,g=new THREE.CircleGeometry(.036,6);g.scale(.85,1.15,1);g.rotateX(-Math.PI/2);
    const positions=g.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,Math.abs(x)*.22+z*.08);}
    g.rotateY(angle);g.translate(Math.sin(angle)*.024,.045,Math.cos(angle)*.024);g.computeVertexNormals();cloverParts.push(g);
  }
  const cloverGeometry=mergeGeometries(cloverParts)!;cloverParts.forEach(g=>g.dispose());
  const cloverMaterial=new THREE.MeshStandardMaterial({color:0x527f23,roughness:.93,side:THREE.DoubleSide});
  const clover=new THREE.InstancedMesh(cloverGeometry,cloverMaterial,mobile?180:520);clover.receiveShadow=true;placed=0;
  for(let n=0;n<clover.instanceMatrix.count*4&&placed<clover.instanceMatrix.count;n++){
    const a=random(n+144)*6.28,r=Math.sqrt(random(n+285))*23,x=Math.cos(a)*r,z=-3+Math.sin(a)*r;if(!clear(x,z))continue;
    object.position.set(x,groundHeight('spring',x,z)+.015,z);object.rotation.set(0,random(n+11)*6.28,0);object.scale.setScalar(.8+random(n+88)*1.1);object.updateMatrix();clover.setMatrixAt(placed,object.matrix);colour.setHSL(.21+random(n)*.04,.4,.36+random(n+2)*.12);clover.setColorAt(placed++,colour);
  }
  clover.count=placed;clover.computeBoundingSphere();group.add(clover);

  const flowerParts:THREE.BufferGeometry[]=[];
  for(let petal=0;petal<8;petal++){
    const angle=petal/8*Math.PI*2,g=new THREE.CircleGeometry(.018,4);g.scale(.55,1.4,1);g.rotateX(-Math.PI/2);g.rotateY(angle);g.translate(Math.sin(angle)*.020,.14,Math.cos(angle)*.020);flowerParts.push(g);
  }
  const flowerGeometry=mergeGeometries(flowerParts)!;flowerParts.forEach(g=>g.dispose());
  const flowerMaterial=new THREE.MeshStandardMaterial({color:0xfff7de,roughness:.86,side:THREE.DoubleSide});
  const flowerCentreGeometry=new THREE.SphereGeometry(.012,6,3);flowerCentreGeometry.translate(0,.142,0);
  const flowerCentreMaterial=new THREE.MeshStandardMaterial({color:0xe2b73e,roughness:1});
  const flowerCount=mobile?35:100,flowers=new THREE.InstancedMesh(flowerGeometry,flowerMaterial,flowerCount),centres=new THREE.InstancedMesh(flowerCentreGeometry,flowerCentreMaterial,flowerCount);flowers.receiveShadow=centres.receiveShadow=true;placed=0;
  for(let n=0;n<flowerCount*4&&placed<flowerCount;n++){
    const a=random(n+562)*6.28,r=Math.sqrt(random(n+851))*23,x=Math.cos(a)*r,z=-3+Math.sin(a)*r;if(!clear(x,z))continue;
    object.position.set(x,groundHeight('spring',x,z),z);object.rotation.set((random(n+44)-.5)*.2,random(n+48)*6.28,0);object.scale.setScalar(.75+random(n+29)*.65);object.updateMatrix();flowers.setMatrixAt(placed,object.matrix);centres.setMatrixAt(placed++,object.matrix);
  }
  flowers.count=centres.count=placed;flowers.computeBoundingSphere();centres.computeBoundingSphere();group.add(flowers,centres);

  const petalGeometry=new THREE.CircleGeometry(1,8);petalGeometry.rotateX(-Math.PI/2);const pp=petalGeometry.attributes.position;
  for(let i=0;i<pp.count;i++)pp.setY(i,Math.abs(pp.getX(i))*.15);petalGeometry.computeVertexNormals();
  const petalMaterial=new THREE.MeshStandardMaterial({color:0xffd9e5,roughness:.92,side:THREE.DoubleSide});
  motion?.apply(petalMaterial,'petal');
  const petals=new THREE.InstancedMesh(petalGeometry,petalMaterial,mobile?17000:52000);petals.receiveShadow=true;placed=0;
  const nearbyTrees=layout.trees.filter(tree=>Math.hypot(tree.x,tree.z+3)<30);
  for(let n=0;n<petals.instanceMatrix.count*3&&placed<petals.instanceMatrix.count;n++){
    const a=random(n+503)*6.28,cluster=nearbyTrees.length>0&&random(n+41)<.48,tree=nearbyTrees[n%Math.max(1,nearbyTrees.length)];
    const r=Math.sqrt(random(n+811))*(cluster?4.6:23),x=(cluster?tree.x:0)+Math.cos(a)*r,z=(cluster?tree.z:-3)+Math.sin(a)*r;if(!clear(x,z))continue;
    object.position.set(x,groundHeight('spring',x,z)+.075+random(n+97)*.045,z);object.rotation.set(0,random(n+45)*6.28,0);const size=.023+random(n+6)*.024;object.scale.set(size,size*.7,size*.73);object.updateMatrix();petals.setMatrixAt(placed,object.matrix);colour.setHSL(.95+random(n)*.035,.24,.79+random(n+3)*.14);petals.setColorAt(placed++,colour);
  }
  petals.count=placed;petals.computeBoundingSphere();group.add(petals);
  const fullBlades=blades.count,fullPetals=petals.count;
  return {group,update(time:number,density=1){clock.value=time;blades.count=Math.floor(fullBlades*Math.max(.6,density));petals.count=Math.floor(fullPetals*Math.max(.55,density));}};
}
