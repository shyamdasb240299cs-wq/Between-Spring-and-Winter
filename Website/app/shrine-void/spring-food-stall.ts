import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {SPRING_EAT_MS,SPRING_FOOD_NAMES,SPRING_FOOD_COUNTS,springHeldItem,springRemaining,type SpringItem,type SpringSave,type SpringTarget} from './spring-treasure-state';
import {SPRING_SPOTS} from './spring-treasure-layout';
const rand=(n:number)=>{const v=Math.sin(n*97.71)*43758.5453;return v-Math.floor(v);};
export function createSpringFoodStall({models,woodMap,clothMap,height,character}:{models:Record<string,THREE.Object3D>;woodMap:THREE.Texture;clothMap:THREE.Texture;height:(x:number,z:number)=>number;character?:THREE.Texture}){
  const group=new THREE.Group();group.name='Food Stall · a table for Aami';const p=SPRING_SPOTS.picnic;group.position.set(p.x,height(p.x,p.z),p.z);
  const handGroup=new THREE.Group();handGroup.name='Spring floating equipped item';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const keep=<T extends THREE.BufferGeometry>(g:T)=>{geometries.add(g);return g;};
  const mat=(options:THREE.MeshStandardMaterialParameters)=>{const m=new THREE.MeshStandardMaterial(options);materials.add(m);return m;};
  const wood=mat({map:woodMap,color:0x998568,roughness:.78}),darkWood=mat({map:woodMap,color:0x4c4f3c,roughness:.83}),ivory=mat({map:clothMap,color:0xe9ddbd,roughness:.96,side:THREE.DoubleSide}),green=mat({map:clothMap,color:0x45634b,roughness:.93,side:THREE.DoubleSide}),brass=mat({color:0xc39c45,roughness:.29,metalness:.78}),metal=mat({color:0x414b42,roughness:.57,metalness:.65});
  const mesh=(root:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{const o=new THREE.Mesh(keep(g),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
  const box=(root:THREE.Object3D,w:number,h:number,d:number,m:THREE.Material,x=0,y=0,z=0)=>mesh(root,new RoundedBoxGeometry(w,h,d,2,Math.min(.018,w*.15,h*.15,d*.15)),m,x,y,z);
  function tube(root:THREE.Object3D,points:THREE.Vector3[],radius:number,m:THREE.Material,segments=16){return mesh(root,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),segments,radius,6,false),m);}
  function model(key:string,root:THREE.Object3D,x:number,y:number,z:number,width:number){const source=models[key];if(!source)return null;const copy=source.clone(true),bounds=new THREE.Box3().setFromObject(copy),size=bounds.getSize(new THREE.Vector3()),c=bounds.getCenter(new THREE.Vector3());copy.position.sub(new THREE.Vector3(c.x,bounds.min.y,c.z));const holder=new THREE.Group();holder.add(copy);holder.scale.setScalar(width/Math.max(size.x,size.z));holder.position.set(x,y,z);holder.name=key;root.add(holder);holder.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});return holder;}
  function writing(title:string,lines:string[],paper=false){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=paper?1280:512;const c=canvas.getContext('2d')!;c.fillStyle=paper?'#ece3c9':'#263d32';c.fillRect(0,0,canvas.width,canvas.height);
    for(let i=0;i<2000;i++){c.fillStyle=i%2?'#ffffff0b':'#4b2c1b0b';c.fillRect(rand(i)*canvas.width,rand(i+330)*canvas.height,1+rand(i+22)*4,1);}
    if(paper){for(let i=0;i<10;i++){c.strokeStyle=i%2?'#ffffff35':'#6d59351a';c.lineWidth=2+rand(i)*3;c.beginPath();c.moveTo(rand(i+33)*1024,0);c.lineTo(rand(i+55)*1024,1280);c.stroke();}}
    c.fillStyle=paper?'#514a36':'#f5e8c9';c.textAlign=paper?'left':'center';c.font=paper?'94px "Spring Hand", cursive':lines.length?'68px Georgia':'98px Georgia';c.fillText(title,paper?90:512,paper?180:lines.length?150:300);c.font=paper?'78px "Spring Hand", cursive':'34px Georgia';lines.forEach((line,i)=>c.fillText(line,paper?90:512,(paper?360:270)+i*(paper?140:72)));
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;textures.add(texture);return mat({map:texture,roughness:.95,side:THREE.DoubleSide});}
  // Joinery, a worn timber counter and a woven cotton cloth with a softly draped edge.
  box(group,4.8,.10,1.42,wood,0,.94,0);
  for(const x of [-2.12,2.12])for(const z of [-.55,.55]){const floor=height(p.x+x,p.z+z)-group.position.y;box(group,.085,.92-floor,.085,wood,x,(floor+.92)*.5,z);box(group,.11,.09,.11,metal,x,.12,z);}
  for(const z of [-.55,.55])box(group,4.4,.07,.065,wood,0,.28,z);
  for(let n=0;n<20;n++)box(group,.214,.48,.024,wood,-2.21+n*.232,.64,.665);
  const cloth=new THREE.PlaneGeometry(4.68,2.02,70,32);cloth.rotateX(-Math.PI/2);const v=cloth.attributes.position;for(let i=0;i<v.count;i++){const x=v.getX(i),z=v.getZ(i),edge=Math.max(0,Math.abs(z)-.69);v.setXYZ(i,x,1.003-edge*.95+Math.sin(x*18+z*3)*(.002+edge*.04),Math.sign(z)*(Math.min(.69,Math.abs(z))+edge*.10));}cloth.computeVertexNormals();mesh(group,cloth,ivory);
  // A pitched fabric awning sags between the frame, with seams, tie cords and iron collars.
  for(const x of [-2.5,2.5])for(const z of [-.91,.91]){const floor=height(p.x+x,p.z+z)-group.position.y;box(group,.07,2.75-floor,.07,wood,x,(2.75+floor)*.5,z);box(group,.085,.10,.085,metal,x,2.55,z);}
  for(const z of [-.92,.92])box(group,5.16,.07,.075,wood,0,2.72,z);box(group,5.15,.065,.065,wood,0,3.10,0);
  const canopyGeo=new THREE.PlaneGeometry(5.43,2.30,70,28);canopyGeo.rotateX(-Math.PI/2);const cp=canopyGeo.attributes.position;for(let i=0;i<cp.count;i++){const x=cp.getX(i),z=cp.getZ(i);cp.setY(i,3.12-Math.abs(z)*.34-Math.sin((x+2.715)/5.43*Math.PI)*.055+Math.sin(x*8)*.008);}canopyGeo.computeVertexNormals();mesh(group,canopyGeo,green);
  for(let i=0;i<24;i++){const scallop=mesh(group,new THREE.CircleGeometry(.118,16,0,Math.PI),green,-2.59+i*.225,2.72,1.14);scallop.rotation.z=Math.PI;}
  for(const x of [-2.48,2.48]){tube(group,[new THREE.Vector3(x,2.70,.96),new THREE.Vector3(x+.08,2.3,1.03),new THREE.Vector3(x+.10,1.97,1.05)],.007,ivory);}
  // A physical suspended sign with the owner's illustrated shawarma pose.
  for(const x of [-1.54,1.54]){tube(group,[new THREE.Vector3(x,2.73,1.03),new THREE.Vector3(x,2.55,1.03)],.008,metal);}
  box(group,3.48,.73,.065,darkWood,0,2.20,1.04);const sign=writing('SYAMU’S FOOD STALL',['Freshly made · always with love']);mesh(group,new THREE.PlaneGeometry(2.47,.65),sign,.40,2.20,1.079);
  if(character){const portrait=character.clone();portrait.repeat.set(1/3,1);portrait.offset.set(1/3,0);portrait.wrapS=portrait.wrapT=THREE.ClampToEdgeWrapping;portrait.needsUpdate=true;textures.add(portrait);const pm=new THREE.MeshBasicMaterial({map:portrait,transparent:true,depthWrite:false,side:THREE.DoubleSide});materials.add(pm);const pic=mesh(group,new THREE.PlaneGeometry(.73,.73),pm,-1.25,2.22,1.084);pic.name='Syamu eating shawarma · sign portrait';pic.castShadow=false;}
  for(const x of [-1.65,1.65])for(const y of [1.91,2.49])mesh(group,new THREE.SphereGeometry(.013,8,5),brass,x,y,1.084);
  const menu=writing('FROM MALABAR',['Shawarma · Parotta & curry','Pazham pori · Samosa']);mesh(group,new THREE.PlaneGeometry(1.02,.54),menu,-1.75,1.63,-.59);box(group,1.09,.60,.033,wood,-1.75,1.63,-.61);
  function nameCard(text:string,x:number,z:number){const card=mesh(group,new THREE.PlaneGeometry(.36,.16),writing(text,[]),x,1.042,z);card.rotation.x=-.88;}
  function speckled(base:string,spot:string){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d')!;ctx.fillStyle=base;ctx.fillRect(0,0,512,512);for(let i=0;i<6000;i++){ctx.globalAlpha=.09+rand(i+4)*.45;ctx.fillStyle=spot;ctx.beginPath();ctx.ellipse(rand(i)*512,rand(i+100)*512,.3+rand(i+200)*5,.3+rand(i+500)*3,rand(i)*6,0,6.28);ctx.fill();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);return t;}
  const bread=mat({map:speckled('#dfb97b','#80542e'),roughness:.89}),fried=mat({map:speckled('#c58a33','#765322'),roughness:.76}),cream=mat({color:0xf8ebc8,roughness:.78}),red=mat({color:0xb5472a,roughness:.60}),lettuce=mat({color:0x508638,roughness:.73}),meat=mat({map:speckled('#a97444','#52311e'),roughness:.78}),curry=mat({color:0xa55c27,roughness:.28}),leaf=mat({color:0x426d35,roughness:.5,side:THREE.DoubleSide}),stems=mat({color:0x687642,roughness:.8});
  type Entity={root:THREE.Group;parts:THREE.Object3D[];rest:THREE.Vector3;rotation:THREE.Euler;basket:boolean};
  const entities={} as Record<SpringItem,Entity>;
  const entity=(id:SpringItem,x:number,z:number,basket=false)=>{const root=new THREE.Group();root.name=`Spring item · ${id}`;root.position.set(x,1.008,z);group.add(root);return entities[id]={root,parts:[] as THREE.Object3D[],rest:root.position.clone(),rotation:new THREE.Euler(),basket};};
  // Every serving is its own physical object; no food meshes are baked into the table.
  const sh=entity('shawarma',-1.52,-.12);model('plate',sh.root,0,0,0,.66);
  for(let i=0;i<3;i++){const roll=new THREE.Group();roll.name=`Shawarma ${i+1}`;roll.position.set(-.22+i*.22,.14,0);roll.rotation.set(.85,0,-.10+i*.09);sh.root.add(roll);sh.parts.push(roll);mesh(roll,new THREE.CylinderGeometry(.072,.058,.28,32,4,true),bread,0,.10);mesh(roll,new THREE.CylinderGeometry(.063,.05,.16,28,1,true),ivory,0,.015);mesh(roll,new THREE.CircleGeometry(.068,28),cream,0,.244).rotation.x=-Math.PI/2;for(let n=0;n<25;n++){const a=n*2.4,r=Math.sqrt(rand(n+i*40))*.059;const filling=mesh(roll,new THREE.SphereGeometry(.012+rand(n)*.009,8,5),[meat,lettuce,red,cream][n%4],Math.sin(a)*r,.25+rand(n+4)*.016,Math.cos(a)*r);filling.scale.y=.65;}}
  const pa=entity('parotta',-.67,-.23);model('plate',pa.root,0,0,0,.50);
  for(let i=0;i<3;i++){const parotta=new THREE.Group();parotta.position.set(0,.036+i*.026,0);pa.root.add(parotta);pa.parts.push(parotta);mesh(parotta,new THREE.CylinderGeometry(.17,.174,.021,48,2),bread);for(let n=0;n<9;n++){const ring=mesh(parotta,new THREE.TorusGeometry(.018+n*.018,.0035,5,56),bread,0,.012);ring.rotation.x=Math.PI/2;ring.scale.y=.94+rand(n)*.09;}}
  const bowl=mesh(group,new THREE.SphereGeometry(.13,24,16,0,6.28,0,Math.PI*.53),ivory,-.25,1.145,-.23);bowl.rotation.x=Math.PI;mesh(group,new THREE.CircleGeometry(.125,24),curry,-.25,1.146,-.23).rotation.x=-Math.PI/2;for(let i=0;i<7;i++)mesh(group,new THREE.SphereGeometry(.024,10,6),meat,-.25+(rand(i)-.5)*.15,1.15,-.23+(rand(i+30)-.5)*.15);
  const pp=entity('pazham-pori',-1.17,.42);const banana=mesh(pp.root,new THREE.PlaneGeometry(.72,.34,12,8),leaf,0,.012);banana.rotation.x=-Math.PI/2;
  for(let i=0;i<4;i++){const fritter=mesh(pp.root,new THREE.CapsuleGeometry(.035,.17,6,14),fried,-.23+i*.15,.053,0);fritter.rotation.z=1.40+(i%2)*.13;pp.parts.push(fritter);}
  const sa=entity('samosa',-.16,.42);model('plate',sa.root,0,0,0,.36);for(let i=0;i<3;i++){const samosa=mesh(sa.root,new THREE.ConeGeometry(.067,.10,3,4),fried,-.075+i*.074,.078,0);samosa.rotation.y=i*.9;sa.parts.push(samosa);}
  const mangoMat=mat({map:speckled('#e9b442','#68923e'),roughness:.47}),grapeMat=mat({map:speckled('#694671','#b6a1b3'),roughness:.38}),rambutanMat=mat({map:speckled('#ba3932','#e8834e'),roughness:.61}),hairMat=mat({color:0xb58c50,roughness:.85});
  const mg=entity('mangoes',.49,-.32,true);model('basket',mg.root,0,0,0,.53);
  for(let i=0;i<5;i++){const mango=new THREE.Group();mango.position.set((i%3-1)*.12,.14+(i>2?.075:0),(i%2-.5)*.10);mango.rotation.set((rand(i)-.5)*.5,rand(i+4)*6,-.4+i*.2);mg.root.add(mango);mg.parts.push(mango);const g=new THREE.SphereGeometry(.074,28,20),v=g.attributes.position;for(let n=0;n<v.count;n++){const y=v.getY(n)/.074;v.setX(n,v.getX(n)*(.88-.12*y)+.012*(1-y*y));v.setY(n,v.getY(n)*1.27);v.setZ(n,v.getZ(n)*.77);}g.computeVertexNormals();mesh(mango,g,mangoMat);tube(mango,[new THREE.Vector3(0,.086,0),new THREE.Vector3(.009,.107,.003),new THREE.Vector3(.022,.111,.009)],.003,stems);}
  const gr=entity('grapes',1.18,-.32,true);model('basket',gr.root,0,0,0,.54);
  for(let i=0;i<3;i++){const bunch=new THREE.Group();bunch.position.set((i-1)*.13,.15+(i===1?.035:0),(i%2-.5)*.10);bunch.rotation.set(.5,rand(i+5)*6,.9+(i%2)*.3);gr.root.add(bunch);tube(bunch,[new THREE.Vector3(0,.10,0),new THREE.Vector3(.005,.04,0),new THREE.Vector3(-.005,-.045,.002)],.003,stems,10);for(let n=0;n<14;n++){const tier=Math.floor(n/4),a=n*2.4,r=.029*(1-tier*.18),berry=mesh(bunch,new THREE.SphereGeometry(.025-rand(n+30)*.003,16,12),grapeMat,Math.cos(a)*r,.06-tier*.031,Math.sin(a)*r);berry.scale.y=1.09;berry.name='Grape '+(i*14+n+1);gr.parts.push(berry);}}
  const rb=entity('basket',1.94,.15,true);rb.root.name='Rambutan basket · held physical object';model('basket',rb.root,0,0,0,.61);
  const fruitPositions=[[-.12,.145,-.065],[.015,.145,-.075],[.14,.145,-.04],[-.08,.145,.07],[.07,.145,.065],[-.10,.237,-.025],[.03,.237,-.015],[.11,.229,.075]];
  // Curved tapered hairs bend at their tips instead of rigid straight cones.
  const hairGeometries=Array.from({length:3},(_,i)=>{
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.00135,.0081,0),new THREE.Vector3(.0054+i*.00135,.0162,.00135),new THREE.Vector3(.0135+i*.0027,.02025,.0054)]);
    const g=keep(new THREE.TubeGeometry(curve,6,.0014,4,false)),v=g.attributes.position;
    for(let n=0;n<v.count;n++){const t=Math.floor(n/5)/6,center=curve.getPointAt(t),factor=1-t*.82;v.setXYZ(n,center.x+(v.getX(n)-center.x)*factor,center.y+(v.getY(n)-center.y)*factor,center.z+(v.getZ(n)-center.z)*factor);}
    g.computeVertexNormals();return g;
  });
  for(let i=0;i<8;i++){const fruit=new THREE.Group();fruit.name=`Rambutan ${i+1}`;fruit.position.set(...fruitPositions[i] as [number,number,number]);rb.root.add(fruit);rb.parts.push(fruit);const body=mesh(fruit,new THREE.SphereGeometry(.056,26,18),rambutanMat);body.scale.y=1.12;
    for(let k=0;k<3;k++){const count=64,hairs=new THREE.InstancedMesh(hairGeometries[k],hairMat,count),dummy=new THREE.Object3D();for(let n=0;n<count;n++){const index=n*3+k,y=1-2*(index+.5)/192,a=index*2.39996,r=Math.sqrt(1-y*y),normal=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);dummy.position.copy(normal).multiplyScalar(.055);dummy.position.y*=1.12;dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);dummy.rotateY(rand(index+i*80)*6.28);dummy.scale.setScalar(.65+rand(index+i*30)*.5);dummy.updateMatrix();hairs.setMatrixAt(n,dummy.matrix);}hairs.name='Soft curved rambutan hairs';fruit.add(hairs);}}
  const key=new THREE.Group();key.name='Brass secret-door key';key.position.set(-.045,.048,.008);key.rotation.set(-Math.PI/2,0,.68);rb.root.add(key);
  mesh(key,new THREE.TorusGeometry(.028,.005,10,32),brass);box(key,.009,.115,.009,brass,0,-.078);box(key,.035,.012,.009,brass,.012,-.117);box(key,.025,.010,.009,brass,.008,-.096);
  const equippedKey=key.clone(true);equippedKey.name='Equipped brass key';equippedKey.position.set(.25,-.19,-.53);equippedKey.rotation.set(.12,-.25,-.6);equippedKey.scale.setScalar(1.55);handGroup.add(equippedKey);
  const folded=mesh(rb.root,new THREE.PlaneGeometry(.15,.10,5,3),writing('Aami,',['Find the door.','Follow the water.','— Syamu'],true),.08,.049,-.025);folded.rotation.set(-Math.PI/2,0,-.2);folded.name='Folded note beneath the rambutans';
  const paperGeo=new THREE.PlaneGeometry(.30,.40,24,30),pv=paperGeo.attributes.position;for(let i=0;i<pv.count;i++){const x=pv.getX(i),y=pv.getY(i);pv.setZ(i,Math.sin(x*65+y*24)*.0014+Math.sin(y*43)*.0012+Math.abs(x*y)*.02);}paperGeo.computeVertexNormals();
  const letter=mesh(group,paperGeo,writing('Aami,',['Look near your','favourite fruit.','','— Syamu'],true),.56,1.026,.43);letter.rotation.set(-Math.PI/2,0,-.15);letter.name='Wrinkled handwritten letter';
  const heldPaper=letter.clone();heldPaper.name='Held handwritten paper';heldPaper.position.set(0,-.04,-.51);heldPaper.rotation.set(0,0,-.04);heldPaper.scale.setScalar(1.12);handGroup.add(heldPaper);
  nameCard('Shawarma',-1.55,.64);nameCard('Parotta',-.65,.08);nameCard('Mangoes',.49,.03);nameCard('Grapes',1.18,.03);nameCard('Rambutan',1.94,.58);
  const eatingRoot=new THREE.Group();eatingRoot.name='Food-to-mouth eating animation';handGroup.add(eatingRoot);const peeled=mesh(eatingRoot,new THREE.SphereGeometry(.038,22,16),mat({color:0xf2ead8,roughness:.29,transparent:true,opacity:.96}));peeled.scale.y=1.15;peeled.visible=false;
  const crumbs=new THREE.Group();handGroup.add(crumbs);for(let i=0;i<9;i++){const bit=mesh(crumbs,new THREE.IcosahedronGeometry(.004+rand(i)*.004,0),bread);bit.position.set((rand(i)-.5)*.16,-.03-rand(i+4)*.1,-.22-rand(i+50)*.14);}crumbs.visible=false;
  const targets:{id:SpringTarget;label:string;object:THREE.Object3D}[]=[{id:'letter',label:'Read letter',object:letter},...Object.entries(entities).map(([id,e])=>({id:id as SpringItem,label:`Pick up ${['basket','mangoes','grapes'].includes(id)?SPRING_FOOD_NAMES[id as SpringItem]+' basket':SPRING_FOOD_NAMES[id as SpringItem]},`,object:e.root}))];
  targets.forEach(t=>t.label=t.label.replace(/,$/,''));
  // Merge only the detail inside each edible portion. Portion visibility and all
  // authored vertices/textures remain intact, with fewer draws for fillings/layers.
  for(const e of Object.values(entities))for(const part of e.parts){
    if(!(part instanceof THREE.Group))continue;part.updateWorldMatrix(true,true);
    const inverse=part.matrixWorld.clone().invert(),batches=new Map<THREE.Material,THREE.Mesh[]>();
    part.traverse(o=>{if(!(o instanceof THREE.Mesh)||o instanceof THREE.InstancedMesh||Array.isArray(o.material))return;const list=batches.get(o.material)??[];list.push(o);batches.set(o.material,list);});
    for(const [material,list]of batches){if(list.length<2)continue;const pieces=list.map(o=>(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld))),merged=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());if(merged){mesh(part,merged,material);list.forEach(o=>o.removeFromParent());}}
  }
  // Static joinery, cookware and canopy are batched. Interactive objects stay independent.
  group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),batches=new Map<THREE.Material,THREE.Mesh[]>(),protectedRoots=new Set<THREE.Object3D>(targets.map(t=>t.object));
  group.traverse(object=>{if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||Array.isArray(object.material))return;let ancestor:THREE.Object3D|null=object;while(ancestor&&ancestor!==group){if(protectedRoots.has(ancestor))return;ancestor=ancestor.parent;}const list=batches.get(object.material)??[];list.push(object);batches.set(object.material,list);});
  for(const [material,list] of batches){if(list.length<2)continue;const pieces=list.map(object=>{const g=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));});const merged=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());if(merged){mesh(group,merged,material).name='Food stall static detail';list.forEach(object=>object.removeFromParent());}}
  // Cache simple interaction volumes. Raycasting thousands of fruit hairs is unnecessary.
  group.updateMatrixWorld(true);
  const targetBounds=new Map(targets.map(t=>[t,new THREE.Box3().setFromObject(t.object)]));
  const localBounds=new Map<THREE.Object3D,THREE.Box3>();
  for(const root of [...Object.values(entities).map(e=>e.root),heldPaper,equippedKey]){root.updateWorldMatrix(true,true);localBounds.set(root,new THREE.Box3().setFromObject(root).applyMatrix4(root.matrixWorld.clone().invert()));}
  const cartSolids:THREE.Box3[]=[];
  function solid(x0:number,y0:number,z0:number,x1:number,y1:number,z1:number){cartSolids.push(new THREE.Box3(new THREE.Vector3(x0,y0,z0).add(group.position),new THREE.Vector3(x1,y1,z1).add(group.position)));}
  solid(-2.42,0,-.75,2.42,1.04,.75);
  for(const x of [-2.5,2.5])for(const z of [-.91,.91])solid(x-.05,0,z-.05,x+.05,2.77,z+.05);
  solid(-1.75,1.83,1.005,1.75,2.58,1.087);
  const worldPosition=new THREE.Vector3(),direction=new THREE.Vector3(),towards=new THREE.Vector3(),hitPoint=new THREE.Vector3(),heldBox=new THREE.Box3(),correction=new THREE.Vector3(),inverseView=new THREE.Quaternion();
  let previousDoor:boolean|undefined,turnStarted=-100,previousRevision=0,eatingCopy:THREE.Object3D|null=null,lastSave:SpringSave|undefined;
  function clearCart(root:THREE.Object3D){
    const bounds=localBounds.get(root);if(!bounds)return;
    inverseView.copy(handGroup.quaternion).invert();
    for(let iteration=0;iteration<5;iteration++){
      root.updateWorldMatrix(true,false);heldBox.copy(bounds).applyMatrix4(root.matrixWorld);let collided=false;
      for(const box of cartSolids){if(!heldBox.intersectsBox(box))continue;collided=true;
        const moves=[box.min.x-heldBox.max.x-.012,box.max.x-heldBox.min.x+.012,box.min.y-heldBox.max.y-.012,box.max.y-heldBox.min.y+.012,box.min.z-heldBox.max.z-.012,box.max.z-heldBox.min.z+.012];
        let axis=0;for(let i=1;i<6;i++)if(Math.abs(moves[i])<Math.abs(moves[axis]))axis=i;
        correction.set(0,0,0).setComponent(Math.floor(axis/2),moves[axis]).applyQuaternion(inverseView);root.position.add(correction);break;
      }
      if(!collided)break;
    }
  }
  function target(camera:THREE.Camera,ray:THREE.Raycaster,state:SpringSave){if(springHeldItem(state)||state.paperHeld)return null;camera.getWorldDirection(direction);let best:typeof targets[number]|undefined,score=.91;for(const t of targets){if(state.inventory.includes(t.id as SpringItem)||t.id!=='letter'&&springRemaining(state,t.id as SpringItem)===0&&t.id!=='basket')continue;const bounds=targetBounds.get(t)!;bounds.getCenter(worldPosition);towards.subVectors(worldPosition,camera.position);const distance=towards.length();if(distance>2.55)continue;const alignment=direction.dot(towards.normalize());const hit=ray.ray.intersectBox(bounds,hitPoint);if(hit&&camera.position.distanceToSquared(hit)<2.7**2)return {id:t.id,label:t.label};if(alignment>score){best=t;score=alignment;}}return best?{id:best.id,label:best.label}:null;}
  function update(time:number,_dt:number,state:SpringSave,camera:THREE.Camera){
    if(previousDoor===false&&state.doorUnlocked)turnStarted=Date.now();previousDoor=state.doorUnlocked;
    const held=springHeldItem(state),eatAge=state.eatRevision?(Date.now()-state.eatStarted)/SPRING_EAT_MS:10,isEating=eatAge>=0&&eatAge<1;
    handGroup.position.copy(camera.position);handGroup.quaternion.copy(camera.quaternion);
    if(state!==lastSave){
      lastSave=state;
      for(const [id,e] of Object.entries(entities) as [SpringItem,Entity][]){e.parts.forEach((part,i)=>part.visible=i<springRemaining(state,id));const equipped=id===held;
        if(e.root.parent!==(equipped?handGroup:group))(equipped?handGroup:group).add(e.root);
        e.root.position.copy(e.rest);e.root.rotation.copy(e.rotation);e.root.scale.setScalar(1);e.root.visible=equipped||!state.inventory.includes(id);
        e.root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=!equipped&&e.root.visible;o.receiveShadow=!equipped;}});
      }
      for(const object of [equippedKey,eatingRoot,heldPaper,crumbs])object.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=false;o.receiveShadow=false;}});
      key.visible=!state.keyTaken&&state.foodEaten.basket===8;folded.visible=state.foodEaten.basket===8&&state.paperHeld!=='door-note';equippedKey.visible=state.hands.includes('key');
      letter.visible=state.paperHeld!=='letter';heldPaper.visible=!!state.paperHeld;heldPaper.material=state.paperHeld==='door-note'?folded.material:letter.material;
    }
    if(state.eatRevision!==previousRevision){previousRevision=state.eatRevision;eatingCopy?.removeFromParent();eatingCopy=null;const item=state.lastEaten;if(item&&item!=='key'&&item!=='basket'){const e=entities[item],part=e.parts[Math.max(0,SPRING_FOOD_COUNTS[item]-state.foodEaten[item])];if(part){eatingCopy=part.clone(true);eatingCopy.visible=true;eatingCopy.position.set(0,0,0);eatingCopy.rotation.set(0,0,item==='pazham-pori'?Math.PI/2:0);eatingCopy.scale.setScalar(1);eatingCopy.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=false;});eatingRoot.add(eatingCopy);}}}
    if(held&&held!=='key'){const e=entities[held];e.root.position.set(e.basket?-.02:.05,e.basket?-.19:-.30,e.basket?-.94:-.80);e.root.rotation.set(e.basket?.24:.22,0,e.basket?-.025:0);e.root.scale.setScalar(e.basket?1:.91);e.root.position.y+=isEating?-Math.sin(Math.PI*eatAge)*.06:Math.sin(time*1.15)*.002;clearCart(e.root);}
    const keySide=state.hands.indexOf('key')===0?-1:1;
    equippedKey.position.set(keySide*.25,-.19,-.53);equippedKey.rotation.set(.12,-.25*keySide,-.6*keySide);const turnAge=(Date.now()-turnStarted)/850;if(held==='key'&&turnAge>=0&&turnAge<1){const reach=Math.sin(turnAge*Math.PI);equippedKey.position.x-=keySide*.10*reach;equippedKey.position.y+=.08*reach;equippedKey.position.z-=.19*reach;equippedKey.rotation.z-=reach*1.3;}if(equippedKey.visible)clearCart(equippedKey);
    if(state.paperHeld){heldPaper.position.set(state.hands[0]===state.paperHeld?-.25:.25,-.14,-.65);heldPaper.scale.setScalar(.92);clearCart(heldPaper);}
    eatingRoot.visible=isEating;peeled.visible=isEating&&state.lastEaten==='basket';crumbs.visible=isEating&&eatAge>.45&&eatAge<.85;
    if(isEating){const lift=Math.sin(Math.min(1,eatAge/.55)*Math.PI*.5),chew=Math.sin(eatAge*32)*.007;eatingRoot.position.set(.12*(1-lift),-.25+lift*.28+chew,-.68+lift*.46);eatingRoot.rotation.set(eatAge*.4,0,-.15);eatingRoot.scale.setScalar(eatAge>.75?Math.max(0,1-(eatAge-.75)*4):1);crumbs.position.y=-(eatAge-.45)*.4;}
    else {eatingCopy?.removeFromParent();eatingCopy=null;}
    // The renderer updates child matrices once; collision checks above only update
    // the equipped root, rather than traversing every food mesh twice per frame.
  }
  return {group,handGroup,basket:rb.root,targets,target,update,
    cartSolids,
    nearTable(camera:THREE.Camera){return Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<4;},
    blocked(x:number,z:number){for(let i=0;i<5;i++){const box=cartSolids[i];if(x>box.min.x-.28&&x<box.max.x+.28&&z>box.min.z-.28&&z<box.max.z+.28)return true;}return false;},
    dispose(){for(const root of [group,handGroup])root.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.clear();handGroup.clear();},
    stats:()=>({fruitCount:rb.parts.length,interactiveFoods:Object.keys(entities).length})};
}
