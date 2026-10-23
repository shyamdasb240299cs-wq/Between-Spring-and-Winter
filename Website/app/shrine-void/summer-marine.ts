import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SUMMER_REEF_PATCHES,SUMMER_ANEMONE_HOMES,reefPlantable} from './summer-habitat';
import {createSummerModelKit} from './summer-models';
import {summerClearance,summerGroundHeight,summerColliderIntersects,summerWorldColliders} from './summer-layout';

type SummerKit=ReturnType<typeof createSummerModelKit>;
const random=(seed:number)=>{const value=Math.sin(seed*127.1+311.7)*43758.5453;return value-Math.floor(value);};

export function createSummerMarine(kit:SummerKit,compact:boolean){
  const group=new THREE.Group();group.name='Seagrass meadow · turtles rays and sand crabs';
  const {mesh,own,material,beam}=kit;
  const green=material({color:0x737c50,roughness:.92}),skin=material({color:0x9ca17b,roughness:.88}),dark=material({color:0x1c3331,roughness:.48}),raySkin=material({color:0x788c84,roughness:.92}),crabSkin=material({color:0xb09372,roughness:.93});
  const sphere=own(new THREE.SphereGeometry(1,12,8));
  function oval(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){const object=mesh(parent,sphere,mat,x,y,z);object.scale.set(sx,sy,sz);object.castShadow=false;return object;}
  const turtles:{root:THREE.Group;flippers:THREE.Mesh[];index:number}[]=[];
  for(let index=0;index<(compact?1:2);index++){
    const root=new THREE.Group();root.name='Sea turtle browsing above the meadow';group.add(root);
    oval(root,green,0,0,0,.58,.22,.43);oval(root,skin,0,-.10,0,.49,.10,.37);
    oval(root,skin,.66,-.02,0,.21,.15,.16);
    for(const side of [-1,1]){oval(root,dark,.77,.04,side*.12,.025,.025,.018);oval(root,green,-.44,-.05,side*.33,.21,.035,.15);}
    const flippers=[-1,1].map(side=>{const fin=oval(root,skin,.12,-.05,side*.50,.34,.045,.20);fin.rotation.y=side*.52;return fin;});
    for(let scute=0;scute<7;scute++){const angle=scute*2.399;oval(root,skin,Math.cos(angle)*.27,.19,Math.sin(angle)*.20,.135,.025,.11);}
    kit.mergeStatic(root,new Set(flippers));
    turtles.push({root,flippers,index});
  }
  const ray=new THREE.Group();ray.name='Spotted ray cruising over open sand';group.add(ray);
  // Smooth stingray disc, with a rounded snout and narrow wing tips.
  const rayGeometry=own(new THREE.BufferGeometry()),rp:number[]=[],ri:number[]=[];
  const rings=12,segments=48;
  for(let r=0;r<=rings;r++)for(let j=0;j<=segments;j++){
    const a=j/segments*Math.PI*2,t=r/rings;
    const x=Math.cos(a)*(.52+.10*Math.cos(a))*t,z=Math.sin(a)*.91*t;
    const y=.13*(1-t*t)*Math.exp(-z*z*2)-.025*t;
    rp.push(x,y,z);
  }
  for(let r=0;r<rings;r++)for(let j=0;j<segments;j++){const a=r*(segments+1)+j,b=a+segments+1;ri.push(a,b,a+1,b,b+1,a+1);}
  rayGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));rayGeometry.setIndex(ri);rayGeometry.computeVertexNormals();
  raySkin.side=THREE.DoubleSide;const rayClock={value:0};
  raySkin.onBeforeCompile=shader=>{
    shader.uniforms.rayTime=rayClock;
    shader.vertexShader='uniform float rayTime; varying vec3 rayP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrayP=position;transformed.y+=sin(rayTime*2.1-position.x*4.)*pow(abs(position.z),1.8)*.16;');
    shader.fragmentShader='varying vec3 rayP;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec2 cell=fract(rayP.xz*27.)-.5;float spot=1.-smoothstep(.10,.18,length(cell));diffuseColor.rgb*=1.-spot*.27;');
  };
  const wings=mesh(ray,rayGeometry,raySkin);
  const tail=kit.tube(ray,[new THREE.Vector3(-.35,0,0),new THREE.Vector3(-1.1,.03,0),new THREE.Vector3(-1.65,.07,.12)],.018,raySkin,'Ray tail',12);
  for(const side of [-1,1])oval(ray,dark,.25,.12,side*.11,.035,.018,.025);
  const crabs:THREE.Group[]=[];
  for(let index=0;index<(compact?3:6);index++){
    const root=new THREE.Group();root.name='Sand crab beside grounded wreck debris';group.add(root);const x=119+index*10.3,z=-44+Math.sin(index*2.4)*3;
    root.position.set(x,summerGroundHeight(x,z)+.075,z);root.rotation.y=index*2.399;
    oval(root,crabSkin,0,.025,0,.13,.06,.10);
    for(const side of [-1,1])for(let leg=0;leg<4;leg++)beam(root,new THREE.Vector3(side*.08,0,(leg-1.5)*.045),new THREE.Vector3(side*.23,-.055,(leg-1.5)*.073),.009,crabSkin);
    for(const side of [-1,1]){oval(root,crabSkin,side*.18,.01,-.13,.055,.035,.065);oval(root,dark,side*.055,.09,-.065,.012,.014,.012);}
    kit.mergeStatic(root);
    crabs.push(root);
  }
  // Each instance is a rooted tuft, with tapered leaves, folded midribs and curved tips.
  // Low blades occur in meadows, while branching macroalgae grow on the patch margins.
  function leaves(broad:boolean){
    const vertices:number[]=[],uvs:number[]=[],indices:number[]=[],colours:number[]=[];
    const count=broad?13:6,segments=broad?7:6;
    for(let leaf=0;leaf<count;leaf++){
      const angle=leaf*2.399,height=broad?.28+random(leaf+22)*.48:.38+random(leaf+11)*.54;
      const base=broad?leaf/13*.78:0,spread=broad?.12:.045,width=broad?.085:.021,start=vertices.length/3;
      for(let row=0;row<=segments;row++){
        const t=row/segments,reach=broad?Math.sin(t*1.5)*.33:t*t*.28,y=base+height*t;
        const taper=Math.pow(Math.sin(Math.PI*Math.min(.999,.035+t*.965)),broad?.85:.35)*(1-t*.6);
        for(let column=0;column<3;column++){
          const edge=column-1,w=edge*width*taper;
          vertices.push(Math.cos(angle)*(spread+reach)+Math.sin(angle)*w,y-(column===1?0:width*.24),Math.sin(angle)*(spread+reach)-Math.cos(angle)*w);
          uvs.push(column/2,t);const shade=.63+t*.34;colours.push(shade*(broad?1:.86),shade,shade*.78);
        }
      }
      for(let row=0;row<segments;row++)for(let col=0;col<2;col++){const k=start+row*3+col;indices.push(k,k+3,k+1,k+1,k+3,k+4);}
    }
    const g=own(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const clock={value:0};
  function plantMaterial(color:number){
    const mat=material({color,roughness:.85,side:THREE.DoubleSide,vertexColors:true});
    mat.onBeforeCompile=shader=>{
      shader.uniforms.marineTime=clock;
      shader.vertexShader='uniform float marineTime; varying vec2 leafUv; varying float leafHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        leafUv=uv;leafHeight=position.y;
        float phase=instanceMatrix[3].x*.23+instanceMatrix[3].z*.18;
        float bend=position.y*position.y;
        transformed.x+=(sin(marineTime*.57+phase-position.y*.8)*.075+.035)*bend;
        transformed.z+=sin(marineTime*.43+phase+position.y)*bend*.055;`);
      shader.fragmentShader='varying vec2 leafUv; varying float leafHeight;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float rib=1.-smoothstep(.012,.047,abs(leafUv.x-.5));
        float vein=sin(leafUv.y*70.+abs(leafUv.x-.5)*38.);
        float fade=1.-smoothstep(.015,.06,length(fwidth(leafUv)));
        diffuseColor.rgb*=.91+rib*.10+vein*.035*fade;
        diffuseColor.rgb+=vec3(.025,.045,.008)*smoothstep(.2,1.,leafHeight);`);
    };mat.customProgramCacheKey=()=>`summer-rooted-leaves-${color}`;return mat;
  }
  const grassGeometry=leaves(false),frondGeometry=leaves(true);
  const grass=new THREE.InstancedMesh(grassGeometry,plantMaterial(0x739766),compact?1700:3200);
  const fronds=new THREE.InstancedMesh(frondGeometry,plantMaterial(0x88925b),compact?240:460);
  grass.name='Rooted seagrass meadow · curved ribbon leaves';fronds.name='Branching leafy macroalgae · folded blades';
  const dummy=new THREE.Object3D(),tint=new THREE.Color();
  function plant(mesh:THREE.InstancedMesh,broad:boolean){
    let placed=0;
    for(let attempt=0;attempt<mesh.instanceMatrix.count*12&&placed<mesh.instanceMatrix.count;attempt++){
      const patch=SUMMER_REEF_PATCHES[attempt%SUMMER_REEF_PATCHES.length],angle=random(attempt*5+1)*Math.PI*2;
      const radius=Math.sqrt(random(attempt*5+2))*patch[2]*(broad?.85:1.28),x=patch[0]+Math.cos(angle)*radius,z=patch[1]+Math.sin(angle)*radius;
      if(!reefPlantable(x,z,broad?.45:.12)||SUMMER_ANEMONE_HOMES.some(p=>Math.hypot(x-p.x,z-p.z)<.9))continue;
      // Gaps between meadows expose rippled sand and broken coral deposits.
      if(!broad&&Math.sin(x*.47+Math.sin(z*.31))*Math.cos(z*.52)<-.40)continue;
      dummy.position.set(x,summerGroundHeight(x,z)-.018,z);dummy.rotation.set(0,random(attempt+5)*Math.PI*2,0);
      const scale=.55+random(attempt+7)*.83;dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(placed,dummy.matrix);
      tint.setHSL(broad?.18+random(attempt+11)*.05:.21+random(attempt+11)*.08,.16+random(attempt+16)*.16,.64+random(attempt+19)*.25);mesh.setColorAt(placed++,tint);
    }
    mesh.count=placed;mesh.computeBoundingSphere();group.add(mesh);return placed;
  }
  const placed=plant(grass,false);plant(fronds,true);
  // Supple anemone tentacles form a continuous bed. A vertex wave bends their tips.
  const tentacles:THREE.BufferGeometry[]=[];
  for(let i=0;i<64;i++){
    const angle=i*2.399,r=Math.sqrt((i+.5)/64)*.53,height=.23+random(i+70)*.26;
    const path=new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(angle)*r*.7,0,Math.sin(angle)*r*.7),new THREE.Vector3(Math.cos(angle)*r*.9,height*.55,Math.sin(angle)*r*.9),new THREE.Vector3(Math.cos(angle)*r,height,Math.sin(angle)*r)]);
    const g=new THREE.TubeGeometry(path,5,.022,5,false),p=g.getAttribute('position');
    // Gradual narrowing keeps the tentacles organic rather than rigid pipes.
    for(let v=0;v<p.count;v++){const t=Math.min(1,p.getY(v)/height),centre=path.getPoint(Math.floor(v/6)/5);if(centre)p.setXYZ(v,centre.x+(p.getX(v)-centre.x)*(1-t*.65),p.getY(v),centre.z+(p.getZ(v)-centre.z)*(1-t*.65));}g.computeVertexNormals();tentacles.push(g);
  }
  const anemoneGeometry=own(mergeGeometries(tentacles)!);tentacles.forEach(g=>g.dispose());
  const anemoneMaterial=material({color:0xc6aaa2,roughness:.66});
  anemoneMaterial.onBeforeCompile=shader=>{shader.uniforms.marineTime=clock;shader.vertexShader='uniform float marineTime; varying float tentacleHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntentacleHeight=position.y;transformed.x+=sin(marineTime*.72+position.x*7.+position.z*5.)*position.y*position.y*.20;transformed.z+=cos(marineTime*.60+position.z*7.)*position.y*position.y*.14;');shader.fragmentShader='varying float tentacleHeight;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb*vec3(.65,.74,.62),diffuseColor.rgb*vec3(1.15,1.02,1.06),smoothstep(.05,.4,tentacleHeight));');};
  const anemones=new THREE.InstancedMesh(anemoneGeometry,anemoneMaterial,SUMMER_ANEMONE_HOMES.length);anemones.name='Host anemone gardens · resident clownfish homes';
  const baseGeometry=own(new THREE.SphereGeometry(1,14,8)),baseMaterial=material({color:0x929880,roughness:1});
  const bases=new THREE.InstancedMesh(baseGeometry,baseMaterial,anemones.count);bases.name='Anemone limestone holdfasts';
  SUMMER_ANEMONE_HOMES.forEach((home,index)=>{dummy.position.set(home.x,home.y-.39,home.z);dummy.rotation.set(0,index*2.399,0);dummy.scale.setScalar(1);dummy.updateMatrix();anemones.setMatrixAt(index,dummy.matrix);dummy.position.y=home.y-.49;dummy.scale.set(.62,.15,.58);dummy.updateMatrix();bases.setMatrixAt(index,dummy.matrix);});
  anemones.computeBoundingSphere();bases.computeBoundingSphere();group.add(anemones,bases);
  const pebbleGeometry=own(new THREE.IcosahedronGeometry(1,1)),pebbleMaterial=material({color:0xc5bda5,roughness:1});
  const pebbles=new THREE.InstancedMesh(pebbleGeometry,pebbleMaterial,compact?1200:2400);pebbles.name='Limestone rubble beds and broken coral fragments';
  for(let index=0;index<pebbles.count;index++){
    const patch=SUMMER_REEF_PATCHES[index%SUMMER_REEF_PATCHES.length],angle=random(index*7+2)*Math.PI*2,radius=Math.sqrt(random(index*7+3))*patch[2]*1.2;
    const x=patch[0]+Math.cos(angle)*radius,z=patch[1]+Math.sin(angle)*radius,height=.025+random(index+51)*.09;
    dummy.position.set(x,summerGroundHeight(x,z)+height*.45,z);dummy.rotation.set(random(index)*.2,random(index+2)*Math.PI*2,random(index+6)*.3);dummy.scale.set(.06+random(index+3)*.21,height,.04+random(index+5)*.13);dummy.updateMatrix();pebbles.setMatrixAt(index,dummy.matrix);tint.setHSL(.10+random(index+9)*.07,.12,.60+random(index+11)*.23);pebbles.setColorAt(index,tint);
  }
  pebbles.computeBoundingSphere();group.add(pebbles);
  // Compact visible instances only when the viewer crosses a cell or changes direction.
  const vegetation=[grass,fronds,pebbles],originals=vegetation.map(mesh=>Array.from({length:mesh.count},(_,i)=>{const matrix=new THREE.Matrix4(),color=new THREE.Color();mesh.getMatrixAt(i,matrix);mesh.getColorAt(i,color);return {matrix,color,position:new THREE.Vector3().setFromMatrixPosition(matrix)};}));
  const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),bounds=new THREE.Sphere();let lastView='';
  function cull(camera:THREE.Camera){
    const key=`${Math.floor(camera.position.x/2)}:${Math.floor(camera.position.y/2)}:${Math.floor(camera.position.z/2)}:${Math.round(camera.rotation.y*12)}:${Math.round(camera.rotation.x*12)}`;
    if(key===lastView)return;lastView=key;camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
    vegetation.forEach((mesh,k)=>{mesh.count=0;for(const item of originals[k]){bounds.center.copy(item.position);bounds.center.y+=.5;bounds.radius=k===2?.4:1.5;if(bounds.center.distanceToSquared(camera.position)>2025||!frustum.intersectsSphere(bounds))continue;mesh.setMatrixAt(mesh.count,item.matrix);mesh.setColorAt(mesh.count++,item.color);}mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.frustumCulled=false;});
  }
  const grassTotal=grass.count,frondTotal=fronds.count,rubbleTotal=pebbles.count;
  let animalTime=0,lastTime=0;
  function update(time:number,reduced:boolean,camera?:THREE.Camera){
    if(camera)cull(camera);
    const dt=Math.max(0,Math.min(.1,time-lastTime));lastTime=time;animalTime+=dt*(reduced?.25:1);clock.value=rayClock.value=animalTime;time=animalTime;
    turtles.forEach(({root,flippers,index})=>{const phase=time*.035+index*2.4,x=115+index*12+Math.cos(phase)*5,z=-46+Math.sin(phase)*4;root.position.set(x,summerGroundHeight(x,z)+2.2+Math.sin(time*.22)*.10,z);root.rotation.y=-phase-Math.PI/2;flippers.forEach((fin,side)=>fin.rotation.x=reduced?0:Math.sin(time*1.2+side*.3)*.22);});
    const phase=time*.045,x=138+Math.cos(phase)*7,z=-56+Math.sin(phase)*3.5;ray.position.set(x,summerGroundHeight(x,z)+.85,z);ray.rotation.y=-Math.atan2(Math.cos(phase)*3.5,-Math.sin(phase)*7);wings.scale.y=1;tail.rotation.y=reduced?0:Math.sin(time*.8)*.05;
  }
  update(0,false);
  return {group,update,stats:{turtles:turtles.length,rays:1,crabs:crabs.length,seagrass:grassTotal,macroalgae:frondTotal,anemones:anemones.count,rubble:rubbleTotal},dispose(){grass.dispose();fronds.dispose();pebbles.dispose();anemones.dispose();bases.dispose();group.clear();}};
}
