import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SPRING_SPOTS,SPRING_LANDMARKS,SPRING_POND,SPRING_LAKE_BENCH,springPondDistance} from './spring-treasure-layout';
import type {SpringSave,SpringTarget} from './spring-treasure-state';
import {createClassroomSurfaces} from './spring-classroom-surfaces';
import {SPRING_CLUE_STROKES,type SpringClueSymbol} from './spring-symbols';

interface Options{models:Record<string,THREE.Object3D>;materials:{wood:THREE.Texture;cloth:THREE.Texture;paper:THREE.Texture};height:(x:number,z:number)=>number;mobile:boolean;reduced:boolean;}
/** Static, metre-scale memory installations. Imported scans retain their PBR materials. */
export function createSpringTreasureWorld({models,materials,height,mobile,reduced}:Options){
  const group=new THREE.Group();group.name='Spring · the little things I kept';
  const ownGeometry=new Set<THREE.BufferGeometry>(),ownMaterials=new Set<THREE.Material>(),ownTextures=new Set<THREE.Texture>();
  const batches=new Map<THREE.Material,THREE.Mesh[]>(),shapeCache=new Map<string,THREE.BufferGeometry>();
  const targets:{id:SpringTarget;label:string;result:{id:SpringTarget;label:string};proxy:THREE.Mesh;point:THREE.Vector3;available:(s:SpringSave)=>boolean}[]=[];
  const standard=(options:THREE.MeshStandardMaterialParameters)=>{const m=new THREE.MeshStandardMaterial(options);ownMaterials.add(m);return m;};
  const wood=standard({map:materials.wood,color:0x97836a,roughness:.82}),paleWood=standard({map:materials.wood,color:0xc0aa84,roughness:.82}),darkWood=standard({map:materials.wood,color:0x554938,roughness:.83});
  const iron=standard({color:0x353e3d,roughness:.59,metalness:.72}),brass=standard({color:0xb99a59,roughness:.46,metalness:.77}),tinMetal=standard({color:0x9da5a0,roughness:.38,metalness:.8});
  const blueCloth=standard({map:materials.cloth,color:0x759eaf,roughness:.94}),seatCloth=standard({map:materials.cloth,color:0x637776,roughness:.92}),pouchMat=standard({map:materials.cloth,color:0x947957,roughness:.98});
  const paperBase=standard({map:materials.paper,color:0xf1e7ce,roughness:.95,side:THREE.DoubleSide}),wax=standard({color:0xe2d8bd,roughness:.73}),rubber=standard({color:0x1f2423,roughness:.85});
  const glass=new THREE.MeshPhysicalMaterial({color:0xd4e4df,roughness:.06,metalness:.12,transparent:true,opacity:.23,depthWrite:false,clearcoat:1});ownMaterials.add(glass);
  const frameGlass=new THREE.MeshPhysicalMaterial({color:0xc5cfc9,roughness:.13,metalness:.08,transparent:true,opacity:.72,clearcoat:1});ownMaterials.add(frameGlass);
  const keep=(g:THREE.BufferGeometry)=>{ownGeometry.add(g);return g;};
  function boxGeometry(w:number,h:number,d:number,r=Math.min(w,h,d)*.08){const key=[w,h,d,r].join(':');let g=shapeCache.get(key);if(!g){g=keep(new RoundedBoxGeometry(w,h,d,2,Math.min(r,Math.min(w,h,d)*.45)));shapeCache.set(key,g);}return g;}
  function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,material:THREE.Material,x=0,y=0,z=0,batch=true){const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);if(batch&&!material.transparent){if(!batches.has(material))batches.set(material,[]);batches.get(material)!.push(m);}return m;}
  function box(parent:THREE.Object3D,w:number,h:number,d:number,mat:THREE.Material,x=0,y=0,z=0,r?:number,batch=true){return mesh(parent,boxGeometry(w,h,d,r),mat,x,y,z,batch);}
  function cylinder(parent:THREE.Object3D,rt:number,rb:number,h:number,mat:THREE.Material,x:number,y:number,z:number,batch=true){return mesh(parent,keep(new THREE.CylinderGeometry(rt,rb,h,16)),mat,x,y,z,batch);}
  function site(x:number,z:number){const root=new THREE.Group();root.position.set(x,height(x,z),z);group.add(root);return root;}
  function imported(key:string,parent:THREE.Object3D,x:number,y:number,z:number,size?:number,axis:'height'|'width'='width',yaw=0){
    if(!models[key])return null;const source=models[key].clone(true),bounds=new THREE.Box3().setFromObject(source),dims=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
    const root=new THREE.Group();const scale=size?size/(axis==='height'?dims.y:Math.max(dims.x,dims.z)):1;
    source.position.sub(new THREE.Vector3(centre.x,bounds.min.y,centre.z));root.add(source);root.scale.setScalar(scale);root.position.set(x,y,z);root.rotation.y=yaw;root.name=`Spring ${key}`;
    root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=o.receiveShadow=true;}});parent.add(root);return root;
  }
  function drawing(title:string,lines:string[],colour='#f4eddb',kind='letter'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=640;const c=canvas.getContext('2d')!;
    c.fillStyle=colour;c.fillRect(0,0,512,640);for(let n=0;n<650;n++){const px=(Math.sin(n*73.1)*.5+.5)*512,pz=(Math.cos(n*39.4)*.5+.5)*640;c.fillStyle=n%2?'#69482a06':'#ffffff22';c.fillRect(px,pz,1+(n%4),1);}
    c.strokeStyle='#79684e33';c.lineWidth=1;c.strokeRect(23,23,466,594);c.fillStyle='#574d3d';c.font='italic 25px Georgia';c.fillText(title,48,76);c.font='22px Georgia';lines.forEach((line,n)=>c.fillText(line,48,130+n*39));
    if(kind==='map'){
      c.strokeStyle='#78866b';c.lineWidth=9;c.beginPath();c.ellipse(315,285,84,110,-.25,0,Math.PI*2);c.stroke();c.fillStyle='#adc5bb66';c.fill();
      c.strokeStyle='#8e7858';c.lineWidth=3;c.setLineDash([7,8]);c.beginPath();c.moveTo(95,220);c.bezierCurveTo(50,370,400,490,410,210);c.stroke();c.setLineDash([]);
      c.fillStyle='#776747';for(const [x,y]of [[170,445],[414,445],[302,170],[302,540]]){c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.fill();}c.font='17px Georgia';c.fillText('tree',138,475);c.fillText('stone',385,475);c.fillText('bridge',280,150);c.fillText('rocks',281,577);
    }
    if(kind==='ticket'){c.strokeStyle='#5d756f';c.lineWidth=5;c.strokeRect(96,264,245,185);c.strokeRect(122,292,195,112);c.beginPath();c.moveTo(122,404);c.lineTo(318,404);c.stroke();c.fillStyle='#d59a59';c.beginPath();c.arc(374,425,30,0,Math.PI*2);c.fill();}
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;ownTextures.add(t);return standard({map:t,roughness:.93,side:THREE.DoubleSide});
  }
  function paintSymbol(c:CanvasRenderingContext2D,symbol:SpringClueSymbol,x:number,y:number,size:number){
    c.save();c.translate(x,y);c.scale(size/80,size/80);c.lineWidth=2.6;c.lineCap=c.lineJoin='round';
    for(const d of SPRING_CLUE_STROKES[symbol].flat())if(typeof Path2D!=='undefined')c.stroke(new Path2D(d));c.restore();
  }
  function symbolCard(symbols:SpringClueSymbol[],metal=false){
    const canvas=document.createElement('canvas');canvas.width=symbols.length===1?128:512;canvas.height=symbols.length===1?128:256;const c=canvas.getContext('2d')!;
    c.fillStyle=metal?'#c9b87b':'#f2e6c8';c.fillRect(0,0,canvas.width,canvas.height);c.strokeStyle=metal?'#463c28':'#586445';
    if(symbols.length===1)paintSymbol(c,symbols[0],9,9,110);
    else{c.strokeStyle='#a79a7855';c.lineWidth=2;c.strokeRect(17,17,478,222);c.strokeStyle='#586445';symbols.forEach((symbol,i)=>paintSymbol(c,symbol,45+i*151,64,118));c.lineWidth=3;c.beginPath();c.moveTo(29,40);c.lineTo(29,29);c.lineTo(40,29);c.stroke();c.strokeRect(466,205,11,11);}
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;ownTextures.add(t);return standard({map:t,roughness:metal?.56:.93,metalness:metal?.35:0,side:THREE.DoubleSide});
  }
  function sheet(parent:THREE.Object3D,w:number,h:number,mat:THREE.Material,x:number,y:number,z:number,angle=0,batch=true){const m=mesh(parent,keep(new THREE.PlaneGeometry(w,h,2,3)),mat,x,y,z,batch);m.rotation.set(-Math.PI/2,0,angle);return m;}
  function target(id:SpringTarget,label:string,parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,available:(s:SpringSave)=>boolean=()=>true){
    const invisible=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});ownMaterials.add(invisible);
    const proxy=new THREE.Mesh(keep(new THREE.BoxGeometry(w,h,d)),invisible);proxy.position.set(x,y,z);parent.add(proxy);proxy.name=`Interact: ${id}`;
    targets.push({id,label,result:{id,label},proxy,point:new THREE.Vector3(),available});return proxy;
  }
  function beam(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,width:number,mat:THREE.Material){const delta=b.clone().sub(a),m=box(parent,width,delta.length(),width,mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
  function table(parent:THREE.Object3D,x:number,z:number,w:number,d:number,h:number){box(parent,w,.055,d,paleWood,x,h-.0275,z);for(const dx of [-w*.42,w*.42])for(const dz of [-d*.39,d*.39]){const base=parent===memoryDesk?0:height(parent.position.x+x+dx,parent.position.z+z+dz)-parent.position.y;box(parent,.055,h-.055-base,.055,wood,x+dx,(h-.055+base)*.5,z+dz);}box(parent,w*.84,.06,.04,wood,x,h*.36,z-d*.39);}
  function shelter(root:THREE.Group,width:number,depth:number,roofHeight:number){
    const ox=root.position.x,oz=root.position.z;for(const x of [-width*.5+.12,width*.5-.12])for(const z of [-depth*.5+.12,depth*.5-.12]){
      const ground=height(ox+x,oz+z)-root.position.y;box(root,.095,roofHeight-ground,.095,wood,x,(roofHeight+ground)*.5,z);cylinder(root,.072,.08,.045,iron,x,ground+.02,z);
      beam(root,new THREE.Vector3(x,roofHeight-.15,z),new THREE.Vector3(x+(x>0?-.38:.38),roofHeight-.65,z),.045,wood);
    }
    for(const z of [-depth*.5,depth*.5])box(root,width+.1,.13,.095,wood,0,roofHeight-.10,z);
    const count=Math.ceil(width/.17);for(let n=0;n<count;n++){const x=-width*.5+(n+.5)*width/count,plank=box(root,width/count-.009,.025,depth+.28,paleWood,x,roofHeight+.07,zRoof(x),.005);plank.rotation.z=-.045;}
    function zRoof(x:number){return x*.005;}
  }

  // The first paper sits on the existing carpet, clear of the plates and hamper.
  const p=SPRING_SPOTS.picnic,note=site(p.x-.65,p.z+.45);
  const noteMat=drawing('Aami,',['I still remember that evening.','Your blue dress. The light','on your glasses.','','I left a few things for you here.','Start in the garden classroom.','','— Shyamu']);
  sheet(note,.245,.305,noteMat,0,.067,0,-.16);
  imported('rock',note,.085,.073,-.105,.055);
  target('note','Read the note',note,0,.10,0,.46,.18,.48);

  // A full interior lives away from the grove and is activated through the door.
  const school=new THREE.Group();school.position.set(200,0,0);school.name='Classroom interior';group.add(school);
  const surfaces=createClassroomSurfaces(t=>ownTextures.add(t));
  const plaster=standard({map:surfaces.plaster,bumpMap:surfaces.plasterBump,bumpScale:.018,color:0xfff5dc,roughness:.94});plaster.name='Limewashed classroom plaster';
  const lowerWall=standard({map:surfaces.plaster,bumpMap:surfaces.plasterBump,bumpScale:.012,color:0x899b86,roughness:.87});
  const floor=standard({map:surfaces.floor,bumpMap:surfaces.floorBump,bumpScale:.012,roughness:.72});floor.name='Jointed terrazzo floor';
  const boardMat=standard({map:surfaces.blackboard,roughness:.98});
  const trim=standard({map:materials.wood,color:0x7b7058,roughness:.87}),skirting=standard({map:surfaces.plaster,bumpMap:surfaces.plasterBump,bumpScale:.009,color:0x58685a,roughness:.83});
  box(school,10,.12,13,floor,0,-.06,0);
  box(school,10,.15,13,plaster,0,3.65,0);
  box(school,10,3.6,.16,plaster,0,1.8,-6.5);
  box(school,9.8,1.05,.035,lowerWall,0,.525,-6.395);
  for(const x of [-3,3]){box(school,4,3.6,.16,plaster,x,1.8,6.5);box(school,4,1.05,.035,lowerWall,x,.525,6.395);}
  box(school,2,1.1,.16,plaster,0,3.05,6.5);
  for(const x of [-5,5]){
    box(school,.16,1.05,13,lowerWall,x,.525,0);box(school,.16,.65,13,plaster,x,3.275,0);
    box(school,.045,.15,12.85,skirting,x-Math.sign(x)*.10,.075,0);
    box(school,.045,.055,12.85,trim,x-Math.sign(x)*.10,1.04,0);
    box(school,.14,.10,12.9,trim,x-Math.sign(x)*.12,3.48,0);
    for(const z of [-6.25,-3,0,3,6.25])box(school,.23,1.9,z===-6.25||z===6.25?.52:.28,plaster,x,2,z);
    for(const z of [-4.5,-1.5,1.5,4.5]){
      // A recessed timber opening, real clear glazing and a shaded veranda beyond it.
      const window=new THREE.Group();window.name='Timber casement window';window.position.set(x,0,z);school.add(window);
      box(window,.43,.10,2.82,trim,0,1.08,0);box(window,.22,.10,2.73,darkWood,0,2.94,0);
      for(const dz of [-1.32,0,1.32])box(window,.14,1.85,.065,darkWood,0,2,dz);
      box(window,.11,.055,2.65,darkWood,0,2.13,0);
      for(const dz of [-.66,.66]){const pane=box(window,.012,1.71,1.24,glass,0,2.01,dz,.001,false);pane.castShadow=false;}
      for(const dz of [-1.35,1.35]){
        const shutter=new THREE.Group();shutter.position.set(Math.sign(x)*.16,0,dz);shutter.rotation.y=Math.sign(x)*Math.sign(dz)*.9;window.add(shutter);
        box(shutter,.045,1.73,.49,trim,0,2,Math.sign(dz)*.24);
        for(const y of [1.25,1.55,1.85,2.15,2.45,2.75])box(shutter,.055,.025,.43,darkWood,-Math.sign(x)*.029,y,Math.sign(dz)*.24);
      }
      box(window,.025,.085,.035,brass,-Math.sign(x)*.09,1.99,.04);
    }
    // A glimpse of depth, plants and balustrades replaces the old opaque blue rectangles.
    box(school,2.25,.13,13.5,floor,x+Math.sign(x)*1.1,-.09,0);
    box(school,2.45,.10,13.8,trim,x+Math.sign(x)*1.1,3.13,0);
    for(const z of [-6,-3,0,3,6]){box(school,.12,3.08,.12,plaster,x+Math.sign(x)*2.1,1.5,z);box(school,.17,.10,.17,skirting,x+Math.sign(x)*2.1,.10,z);}
    for(const y of [.28,.93])box(school,.07,.07,12.2,trim,x+Math.sign(x)*2.12,y,0);
    for(let z=-5.75;z<6;z+=.55)box(school,.045,.63,.045,trim,x+Math.sign(x)*2.12,.60,z);
    for(const z of [-4.7,-.5,3.9])imported('plant',school,x+Math.sign(x)*1.62,-.02,z,.85,'height',z*.3);
  }
  for(const z of [-6.39,6.39]){
    // The rear skirting and chair rail stop at the return doorway's jambs.
    for(const x of z>0?[-3,3]:[0]){const width=z>0?4:9.8;box(school,width,.15,.045,skirting,x,.075,z);box(school,width,.055,.045,trim,x,1.04,z);}
    box(school,9.8,.10,.14,trim,0,3.48,z);
  }
  for(const z of [-4.3,0,4.3])box(school,9.8,.16,.12,trim,0,3.5,z);
  box(school,4.5,1.75,.10,darkWood,-1.4,2.12,-6.36);box(school,4.3,1.55,.025,boardMat,-1.4,2.12,-6.29);
  box(school,4.5,.065,.19,wood,-1.4,1.23,-6.22);
  for(const x of [-2.5,-2.39,-2.23])box(school,.075,.012,.014,paperBase,x,1.269,-6.17,.003);
  box(school,.18,.055,.09,darkWood,.18,1.285,-6.18,.009);
  const screenMat=standard({color:0xf0eee4,roughness:.9});
  box(school,2.4,1.55,.04,screenMat,2.65,2.12,-6.30);box(school,2.55,.10,.12,iron,2.65,2.94,-6.3);
  box(school,2.43,.045,.055,darkWood,2.65,1.335,-6.27);beam(school,new THREE.Vector3(2.65,1.335,-6.23),new THREE.Vector3(2.65,1.14,-6.23),.009,iron);
  const projector=new THREE.Group();projector.name='Ceiling projector';school.add(projector);
  box(projector,.48,.16,.34,plaster,0,3.13,-1.8);cylinder(projector,.035,.035,.34,iron,0,3.38,-1.8);
  cylinder(projector,.057,.057,.07,iron,0,3.13,-2).rotation.x=Math.PI/2;
  for(let n=0;n<5;n++)box(projector,.008,.055,.13,iron,-.14+n*.023,3.13,-1.626);
  const posterMat=standard({map:surfaces.poster,roughness:.95});
  for(const x of [-3.6,3.6]){box(school,1.05,1.38,.035,trim,x,2.02,6.38);box(school,.96,1.28,.012,posterMat,x,2.02,6.35).rotation.y=Math.PI;}
  // Local sunlight covers the remote room's own shadow field; ceiling fixtures add a warm fill.
  const roomSun=new THREE.DirectionalLight(0xffe3b0,2.2);roomSun.name='Classroom window sunlight';roomSun.position.set(-9,4.3,3.8);roomSun.target.position.set(0,.25,-1.5);school.add(roomSun,roomSun.target);roomSun.castShadow=true;
  roomSun.shadow.mapSize.setScalar(mobile?1024:2048);Object.assign(roomSun.shadow.camera,{left:-11,right:11,top:9,bottom:-9,near:.1,far:30});roomSun.shadow.camera.updateProjectionMatrix();roomSun.shadow.normalBias=.025;roomSun.shadow.bias=-.0001;roomSun.shadow.autoUpdate=false;roomSun.shadow.needsUpdate=true;
  const lampMat=standard({color:0xfff3ce,emissive:0xffe4b1,emissiveIntensity:.65,roughness:.45});
  for(const z of [-3.6,1.8]){
    box(school,1.43,.055,.28,iron,0,3.44,z);box(school,1.34,.035,.23,lampMat,0,3.397,z,.01);
    const lamp=new THREE.PointLight(0xffe6be,13,8,2);lamp.position.set(0,3.22,z);school.add(lamp);
  }
  for(const z of [-2.2,3.15]){
    const fan=new THREE.Group();fan.position.set(0,3.27,z);fan.name='Three blade ceiling fan';school.add(fan);
    cylinder(fan,.022,.022,.48,iron,0,.1,0);cylinder(fan,.11,.12,.085,skirting,0,-.16,0);
    for(let n=0;n<3;n++){const blade=box(fan,.16,.018,.72,skirting,0,-.177,.42,.045);blade.rotation.y=n*Math.PI*2/3;blade.position.set(Math.sin(n*Math.PI*2/3)*.42,-.177,Math.cos(n*Math.PI*2/3)*.42);}
  }
  const roomSolids:{x:number;z:number;w:number;d:number}[]=[];
  function furniture(x:number,z:number,w:number,d:number,h:number){
    const bench=h<.5,boards=bench?2:3;
    for(let n=0;n<boards;n++)box(school,w,.055,d/boards-.006,paleWood,x,h-.0275,z-d*.5+(n+.5)*d/boards,.008);
    for(const dx of [-w*.43,w*.43]){
      for(const dz of [-d*.36,d*.36]){
        box(school,.047,h-.055,.047,iron,x+dx,(h-.055)/2,z+dz);box(school,.07,.022,.08,rubber,x+dx,.011,z+dz,.007);
        cylinder(school,.009,.009,.003,iron,x+dx,h+.001,z+dz);
      }
      box(school,.045,.055,d*.83,iron,x+dx,h-.12,z);
    }
    box(school,w*.88,.045,.045,iron,x,h*.40,z);
    if(!bench){box(school,w*.86,.025,d*.63,darkWood,x,h-.22,z-.04);box(school,w*.88,.13,.025,wood,x,h-.13,z-d*.39);}
    roomSolids.push({x,z,w,d});
  }
  // Two blocks of long Kerala-style shared desks and backless wooden benches.
  for(const x of [-2.65,2.65])for(const z of [-2.6,-.35,1.9,4.15]){furniture(x,z,3.15,.64,.77);furniture(x,z+.78,3.15,.34,.45);}
  // Keep the imported desk's PBR wear, with collision matching its retained geometry.
  const teacherDesk=imported('desk',school,-1.6,0,-4.8,.79,'height');
  if(teacherDesk){teacherDesk.updateWorldMatrix(true,true);const size=new THREE.Box3().setFromObject(teacherDesk).getSize(new THREE.Vector3());roomSolids.push({x:-1.6,z:-4.8,w:size.x,d:size.z});}else furniture(-1.6,-4.8,1.05,.65,.79);
  furniture(-1.6,-5.65,.55,.45,.46);
  for(let n=0;n<3;n++)box(school,.26,.035,.20,n%2?blueCloth:pouchMat,-1.53,.80+n*.037,-4.82,.005);
  // Keepsakes share a full-length front desk, with an open shelf for the pouch.
  const memoryDesk=new THREE.Group();memoryDesk.position.set(2.65,0,-4.7);school.add(memoryDesk);
  box(memoryDesk,3.15,.055,.82,paleWood,0,.7325,0);box(memoryDesk,3,.035,.66,wood,0,.61,0);
  for(const x of [-1.4,1.4])for(const z of [-.3,.3])box(memoryDesk,.055,.71,.055,iron,x,.355,z);
  for(const x of [-1.4,1.4]){box(memoryDesk,.07,.025,.68,iron,x,.08,0);for(const z of [-.3,.3])cylinder(memoryDesk,.008,.008,.003,iron,x,.762,z);}
  box(memoryDesk,3.03,.055,.045,darkWood,0,.69,-.39);box(memoryDesk,2.84,.04,.04,iron,0,.23,-.3);
  roomSolids.push({x:2.65,z:-4.7,w:3.15,d:.82});
  const top=.76;
  // A folded blue cloth catches the light; glasses and phone remain true to scale.
  for(let n=0;n<3;n++)box(memoryDesk,.155,.009,.135,blueCloth,-.30,top+.006+n*.008,.27+n*.005,.012);
  const glasses=new THREE.Group();glasses.position.set(-.42,top+.019,.07);glasses.rotation.y=-.16;memoryDesk.add(glasses);
  function spectacleLoop(cx:number){const points:THREE.Vector3[]=[];const w=.060,h=.042,r=.008;for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;const x=Math.sign(Math.cos(a))*(w*.5-r)+Math.cos(a)*r,z=Math.sign(Math.sin(a))*(h*.5-r)+Math.sin(a)*r;points.push(new THREE.Vector3(cx+x,0,z));}return new THREE.CatmullRomCurve3(points,true);}
  for(const x of [-.034,.034]){mesh(glasses,keep(new THREE.TubeGeometry(spectacleLoop(x),48,.0021,5,true)),frameGlass);const lens=sheet(glasses,.052,.035,glass,x,.0005,0);lens.rotation.x=-Math.PI/2;}
  box(glasses,.014,.0025,.003,frameGlass,0,0,0,.001);for(const x of [-.066,.066])beam(glasses,new THREE.Vector3(x,0,-.012),new THREE.Vector3(x,.007,-.105),.0025,frameGlass);
  const phone=new THREE.Group();phone.position.set(-.60,top+.011,.27);phone.rotation.y=.14;memoryDesk.add(phone);
  box(phone,.071,.011,.14,rubber,0,0,0,.006);const screen=drawing('Aami',['I kept your ticket.','The other piece is','by the shared seat.','','Pachai Nirame']);sheet(phone,.062,.124,screen,0,.006,0);
  target('phone','Check the phone',memoryDesk,-.60,top+.055,.27,.19,.12,.22);
  // Beside the desk: a plant table, its original little saucer and a translucent frame.

  const plant=imported('plant',memoryDesk,-1.20,.774,-.16);
  cylinder(memoryDesk,.112,.104,.016,paperBase,-1.20,.767,-.16);
  const plantEnvelope=sheet(memoryDesk,.115,.085,drawing('For you',['Keep this ticket.']),-1.10,.773,-.12,.12,false);
  target('plant','Look under the plant',memoryDesk,-1.20,.92,-.16,.45,.47,.45);
  const lightbox=new THREE.Group();lightbox.position.set(.65,.76,-.05);memoryDesk.add(lightbox);
  box(lightbox,.49,.026,.315,darkWood,0,.013,0);const lightPaper=standard({color:0xf3ebc9,roughness:.7,emissive:0xf0dcb4,emissiveIntensity:.08});box(lightbox,.447,.004,.273,lightPaper,0,.029,0,.004);
  for(const x of [-.232,.232])box(lightbox,.018,.016,.31,brass,x,.032,0,.002);for(const z of [-.146,.146])box(lightbox,.447,.016,.018,brass,0,.032,z,.002);
  const drawnLayers=new THREE.Group();lightbox.add(drawnLayers);sheet(drawnLayers,.40,.24,symbolCard(['sun','leaf','ripple']),0,.046,0,0,false);
  target('lightbox','Compare the drawings',memoryDesk,.65,.84,-.05,.55,.23,.38);
  const pouch=new THREE.Group();pouch.position.set(-.45,top-.109,.245);memoryDesk.add(pouch);
  box(pouch,.20,.045,.11,pouchMat,0,0,0,.018,false);box(pouch,.17,.003,.006,brass,0,.024,0,.002,false);cylinder(pouch,.009,.009,.003,brass,.077,.027,.005,false);
  target('pouch','Take the small pouch',memoryDesk,-.45,top-.08,.245,.34,.14,.27,s=>!s.pouchTaken);
  // Cabinet is a real local lock with hinges and a catch, beside the smaller desk.
  const cabinet=new THREE.Group();cabinet.position.set(4.4,0,-5.8);school.add(cabinet);roomSolids.push({x:4.4,z:-5.8,w:.73,d:.58});
  for(const x of [-.29,.29])for(const z of [-.22,.22])box(cabinet,.055,.20,.055,darkWood,x,.10,z);
  box(cabinet,.73,.045,.58,wood,0,.22,0);box(cabinet,.73,.045,.58,wood,0,1.08,0);
  for(const x of [-.342,.342])box(cabinet,.045,.85,.58,wood,x,.65,0);box(cabinet,.68,.85,.035,darkWood,0,.65,-.273);
  box(cabinet,.65,.028,.50,paleWood,0,.64,0);const door=new THREE.Group();door.position.set(-.337,.65,.292);cabinet.add(door);
  box(door,.67,.825,.038,wood,.337,0,0,.01,false);box(door,.56,.69,.012,darkWood,.337,0,.026,.005,false);
  for(const y of [-.29,.29])box(door,.026,.09,.018,brass,.011,y,.027,.004,false);
  cylinder(door,.017,.017,.026,brass,.59,-.17,.041,false).rotation.x=Math.PI/2;
  const wheelMaterial=symbolCard(['sun'],true);
  for(let i=0;i<3;i++){cylinder(door,.034,.034,.018,brass,.245+i*.092,.08,.042,false).rotation.x=Math.PI/2;mesh(door,keep(new THREE.PlaneGeometry(.047,.047)),wheelMaterial,.245+i*.092,.08,.053,false);}
  box(door,.27,.022,.027,brass,.337,-.024,.049,.006,false);
  target('cabinet','Inspect the keepsake cabinet',school,4.4,.89,-5.43,.89,.42,.35);
  const yellowNote=sheet(cabinet,.15,.15,drawing('A little letter',['Safe with me.'],'#eee29a'),-.16,.669,-.02,-.1);
  const hairBlue=standard({color:0x8fbed3,roughness:.77,map:materials.cloth});mesh(cabinet,keep(new THREE.TorusGeometry(.047,.009,8,40)),hairBlue,.17,.687,.02).rotation.x=Math.PI/2;
  const goldThread=mesh(cabinet,keep(new THREE.TorusKnotGeometry(.045,.0015,70,4,2,7)),brass,.17,.687,.02);goldThread.scale.y=.16;goldThread.rotation.x=Math.PI/2;
  const mapObject=sheet(cabinet,.24,.25,drawing('The grove',[],undefined,'map'),0,.264,.035,-.12,false);
  const parcelKey=new THREE.Group();parcelKey.position.set(.22,.272,.04);parcelKey.rotation.y=-.3;cabinet.add(parcelKey);
  mesh(parcelKey,keep(new THREE.TorusGeometry(.014,.003,6,24)),brass,0,.003,0).rotation.x=Math.PI/2;box(parcelKey,.005,.005,.057,brass,0,.003,.037,.002);for(const z of [.053,.065])box(parcelKey,.013,.005,.005,brass,.005,.003,z,.001);
  target('map','Unfold the map',school,4.4,.39,-5.74,.56,.31,.52,s=>s.cabinetOpen);
  cylinder(cabinet,.048,.054,.012,brass,.18,1.111,-.02);cylinder(cabinet,.025,.027,.11,wax,.18,1.168,-.02);
  const wick=cylinder(cabinet,.0015,.0015,.014,rubber,.18,1.23,-.02);
  const flameMaterial=new THREE.MeshBasicMaterial({color:0xffce83,transparent:true,opacity:.85,depthWrite:false});ownMaterials.add(flameMaterial);
  const flame=mesh(cabinet,keep(new THREE.SphereGeometry(.008,8,8)),flameMaterial,.18,1.247,-.02,false);flame.scale.set(.6,1.8,.6);flame.castShadow=false;

  // Train: one upholstered bay, a window and a document pocket, all in the grove.
  const t=SPRING_SPOTS.train,train=site(t.x,t.z);shelter(train,2.8,1.75,2.45);
  for(const x of [-.58,.58]){box(train,.045,.45,.53,iron,x,.23,-.33);box(train,.075,.028,.61,iron,x,.027,-.30);}
  box(train,1.52,.13,.57,seatCloth,0,.48,-.25,.055);box(train,1.52,.64,.13,seatCloth,0,.86,-.57,.05);
  for(const x of [-.81,.81]){box(train,.035,.43,.035,iron,x,.64,-.34);box(train,.08,.045,.48,darkWood,x,.84,-.28,.02);}
  for(const x of [-1.0,1.0])box(train,.065,1.48,.065,iron,x,1.43,-.72);for(const y of [.71,2.15])box(train,2.05,.065,.065,iron,0,y,-.72);
  box(train,.04,1.40,.045,iron,0,1.43,-.72);const trainGlass=box(train,1.95,1.35,.008,glass,0,1.43,-.73,.001,false);trainGlass.castShadow=false;
  box(train,2.6,.52,.085,wood,0,.29,-.80);
  const travelPlaque=drawing('One seat, two people',['A little shelter for','our train memory.']);
  mesh(train,keep(new THREE.PlaneGeometry(.52,.62)),travelPlaque,1.05,1.55,-.68);
  const trainLabel=sheet(train,.16,.20,drawing('Pachai Nirame',['One seat, two of us.']),.59,.554,-.11,-.07);
  const pocketMat=standard({map:materials.cloth,color:0x675d48,roughness:1});box(train,.25,.19,.025,pocketMat,-.42,.92,-.488,.014);
  const ticketObject=sheet(train,.12,.18,drawing('Second ticket',[],undefined,'ticket'),-.42,.995,-.45,.03,false);ticketObject.rotation.x=-.24;
  target('ticket','Search the seat pocket',train,-.42,.97,-.41,.42,.38,.32,s=>!s.ticketSolved);

  // Bus stop: scanned timber bench, a reachable tin and a removable sweet tray.
  const b=SPRING_SPOTS.bus,bus=site(b.x,b.z);shelter(bus,3.7,2.1,2.45);
  imported('bench',bus,0,0,-.40,2.1);
  box(bus,3.5,.65,.09,wood,0,.45,-.95);
  const busPlaque=drawing('The orange sweet',['A place to remember','that journey with you.']);
  mesh(bus,keep(new THREE.PlaneGeometry(.58,.65)),busPlaque,-1.25,1.55,-.91);
  table(bus,1.5,-.1,.61,.64,.72);
  const tin=new THREE.Group();tin.position.set(1.5,.75,-.1);bus.add(tin);
  cylinder(tin,.12,.113,.075,tinMetal,0,.037,0);cylinder(tin,.116,.114,.003,darkWood,0,.078,0);
  const tinLid=new THREE.Group();tinLid.position.set(0,.08,-.12);tin.add(tinLid);
  cylinder(tinLid,.123,.123,.014,tinMetal,0,0,.12,false);cylinder(tinLid,.112,.112,.002,blueCloth,0,.008,.12,false);
  const sweets=new THREE.Group();tin.add(sweets);const sweetMat=standard({color:0xc77620,roughness:.94});
  const sweetGeo=keep(new THREE.IcosahedronGeometry(.032,3));const a=sweetGeo.getAttribute('position');for(let i=0;i<a.count;i++){const f=1+Math.sin(a.getX(i)*437+a.getY(i)*721+a.getZ(i)*239)*.055;a.setXYZ(i,a.getX(i)*f,a.getY(i)*f,a.getZ(i)*f);}sweetGeo.computeVertexNormals();
  for(let n=0;n<6;n++){const angle=n*Math.PI/3;mesh(sweets,sweetGeo,sweetMat,Math.cos(angle)*.066,.109,Math.sin(angle)*.066,false);} // individual sweets remain with the movable tray
  const tray=cylinder(sweets,.107,.104,.008,tinMetal,0,.080,0,false);
  const tracingPaper=sheet(tin,.19,.18,drawing('A lakeside view',['Tree · bridge · stones']),0,.086,0,0,false);
  const tracingClip=box(tin,.055,.006,.014,brass,.064,.091,-.091,.004,false);
  target('tin','Open the laddoo tin',bus,1.5,.89,-.1,.50,.43,.50);

  // The lakeside has a clear sitting place and landmarks that exist before discovery.
  const lakeBench=site(SPRING_LAKE_BENCH.x,SPRING_LAKE_BENCH.z);imported('bench',lakeBench,0,0,0,2.15,'width',SPRING_LAKE_BENCH.yaw);
  box(lakeBench,.035,.16,.15,blueCloth,.28,.66,.1,.012);
  target('bench','Sit beside the water',lakeBench,0,.75,0,1.15,1.1,1.75);
  const tree=SPRING_LANDMARKS.tree,pocket=site(tree.x+.48,tree.z+.30);
  const letterPocket=new THREE.Group();letterPocket.position.set(0,.77,0);letterPocket.rotation.y=.45;pocket.add(letterPocket);
  box(letterPocket,.27,.30,.045,darkWood,0,0,0,.015);const pocketFlap=box(letterPocket,.29,.14,.028,pouchMat,0,.098,.037,.018,false);pocketFlap.rotation.x=.1;
  cylinder(letterPocket,.008,.008,.008,brass,0,.06,.058).rotation.x=Math.PI/2;
  const treeLetter=sheet(letterPocket,.16,.21,drawing('Last drawing',['Back to the desk.']),0,.015,.052,0,false);treeLetter.rotation.x=0;
  target('pocket','Open the letter pocket',pocket,0,.80,.08,.52,.48,.43);

  // Actual water is a cheap PBR surface, with a single small moving bump texture.
  const waterCanvas=document.createElement('canvas');waterCanvas.width=waterCanvas.height=128;const wc=waterCanvas.getContext('2d')!;wc.fillStyle='#808080';wc.fillRect(0,0,128,128);
  for(let n=0;n<45;n++){wc.strokeStyle=n%2?'#999999':'#6e6e6e';wc.lineWidth=1;wc.beginPath();wc.ellipse((n*47)%128,(n*71)%128,12+n%16,2+n%4,.1,0,Math.PI*2);wc.stroke();}
  const waterBump=new THREE.CanvasTexture(waterCanvas);waterBump.wrapS=waterBump.wrapT=THREE.RepeatWrapping;waterBump.repeat.set(5,5);ownTextures.add(waterBump);
  const waterMat=standard({color:0x749c91,roughness:.18,metalness:.12,bumpMap:waterBump,bumpScale:.006,transparent:true,opacity:.86,depthWrite:false,envMapIntensity:1.15});
  const wp:number[]=[],uv:number[]=[];const step=.18;
  const shore=(x:number,z:number)=>springPondDistance(x,z)-1;
  function waterTriangle(points:number[][]){
    const clipped:number[][]=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],inside=shore(a[0],a[1])<=0,next=shore(b[0],b[1])<=0;
      if(inside)clipped.push(a);
      if(inside!==next){let lo=0,hi=1;for(let n=0;n<12;n++){const t=(lo+hi)/2;if((shore(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)<=0)===inside)lo=t;else hi=t;}const t=(lo+hi)/2;clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    }
    for(let n=1;n<clipped.length-1;n++)for(const p of [clipped[0],clipped[n],clipped[n+1]]){wp.push(p[0],SPRING_POND.level,p[1]);uv.push((p[0]-15)/9,(p[1]+22)/12);}
  }
  for(let x=14.8;x<24;x+=step)for(let z=-21.6;z<-7.3;z+=step){waterTriangle([[x,z],[x+step,z+step],[x+step,z]]);waterTriangle([[x,z],[x,z+step],[x+step,z+step]]);}
  const wg=keep(new THREE.BufferGeometry());wg.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));wg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));wg.computeVertexNormals();const water=mesh(group,wg,waterMat,0,0,0,false);water.castShadow=false;water.renderOrder=1;
  for(let n=0;n<13;n++){const angle=n/13*Math.PI*2,x=SPRING_POND.x+Math.cos(angle)*SPRING_POND.radiusX*1.025,z=SPRING_POND.z+Math.sin(angle)*SPRING_POND.radiusZ*1.025;if(Math.abs(x-22)<1&&z>-15)continue;const rock=site(x,z);imported('rock',rock,0,-.035,0,.22+(n%4)*.085,'width',n*2.1);}
  // Low plank bridge across the inlet: deck and supports are physically separate from water.
  const bridge=new THREE.Group();bridge.position.set(22,0,-12);group.add(bridge);
  for(const z of [-.49,.49])box(bridge,3.0,.12,.10,darkWood,0,.40,z);
  for(let n=0;n<15;n++)box(bridge,.184,.055,1.32,paleWood,-1.4+n*.2,.4925,0,.008);
  for(const x of [-1.3,1.3])for(const z of [-.59,.59]){box(bridge,.065,.76,.065,wood,x,.83,z);cylinder(bridge,.04,.04,.027,brass,x,1.22,z);}
  for(const z of [-.59,.59]){box(bridge,2.7,.05,.055,wood,0,1.17,z);box(bridge,2.7,.035,.035,wood,0,.91,z);}
  for(const sign of [-1,1]){const outerX=22+sign*2.2,ground=height(outerX,-12),rise=.52-ground,run=.8,ramp=box(bridge,Math.hypot(run,rise),.05,1.32,paleWood,sign*1.8,(ground+.52)*.5-.025,0,.008);ramp.rotation.z=Math.atan2(-sign*rise,run);}
  const marker=site(SPRING_LANDMARKS.stone.x,SPRING_LANDMARKS.stone.z);imported('boulder',marker,0,-.08,0,1.20,'width',.42);const mark=sheet(marker,.18,.18,drawing('○',[]),0,.38,.02);mark.rotation.x=-.5;
  const rocks=site(SPRING_LANDMARKS.rocks.x,SPRING_LANDMARKS.rocks.z);imported('boulder',rocks,-.5,-.06,0,1.43,'width',.35);imported('boulder',rocks,.58,-.07,-.29,1.05,'width',-.75);

  // Garden rack: the original wooden/metal spade has a plausible support and goes away when taken.
  const garden=site(SPRING_SPOTS.garden.x,SPRING_SPOTS.garden.z);table(garden,0,-.65,1.6,.61,.77);
  for(const x of [-.68,.68])box(garden,.06,1.55,.06,wood,x,.78,-.86);box(garden,1.43,.09,.045,wood,0,1.28,-.86);
  for(const x of [-.45,0,.45]){cylinder(garden,.009,.009,.09,iron,x,1.23,-.79).rotation.x=Math.PI/2;}
  const spadeObject=imported('spade',garden,.29,0,-.42);if(spadeObject)spadeObject.rotation.z=-.10;
  const sparePot=cylinder(garden,.12,.083,.17,standard({color:0x9d7053,roughness:.95}),-.42,.87,-.64);cylinder(garden,.111,.111,.008,darkWood,-.42,.96,-.64);
  sheet(garden,.22,.25,drawing('Garden tools',['Please put them back','when you are done.']),-.30,.804,-.31,-.1);
  target('spade','Take the garden spade',garden,.29,.65,-.42,.52,1.28,.45,s=>!s.spadeTaken);

  // Soil stages expose the chest owned by the existing relic system; no duplicate chest.
  const dig=site(SPRING_SPOTS.dig.x,SPRING_SPOTS.dig.z),earth=standard({color:0x463b2a,roughness:.98}),looseEarth=standard({color:0x60503a,roughness:.96});
  const patch=mesh(dig,keep(new THREE.CircleGeometry(.66,40)),earth,0,.022,0,false);patch.rotation.x=-Math.PI/2;patch.scale.y=.79;
  const hole=box(dig,.79,.025,.58,darkWood,0,-.01,0,.08,false);const soilMounds=new THREE.Group();dig.add(soilMounds);
  for(let n=0;n<9;n++){const mound=mesh(soilMounds,keep(new THREE.SphereGeometry(.11+(n%3)*.022,10,6)),looseEarth,Math.cos(n*.7)*.83,.028,Math.sin(n*.7)*.62,false);mound.scale.y=.32;}
  target('dig','Dig in the soft soil',dig,0,.19,0,1.2,.48,1.03,s=>s.digStage<3);
  target('box','Open the black box',dig,0,.30,0,1.2,.80,1.10,s=>s.digStage===3);

  const portal=site(SPRING_SPOTS.school.x,SPRING_SPOTS.school.z),rose=standard({color:0xa76872,map:materials.wood,roughness:.78});
  // The entrance faces the blanket, so the first instruction matches the visible approach.
  const portalYaw=Math.atan2(SPRING_SPOTS.picnic.x-SPRING_SPOTS.school.x,SPRING_SPOTS.picnic.z-SPRING_SPOTS.school.z),normalX=Math.sin(portalYaw),normalZ=Math.cos(portalYaw);
  portal.rotation.y=portalYaw;
  portal.name='The door to that evening';
  const entryStone=standard({map:surfaces.floor,bumpMap:surfaces.floorBump,bumpScale:.012,color:0xb7a58c,roughness:.87});
  box(portal,4.9,.10,2.1,entryStone,0,.005,.35,.025,false);
  for(const x of [-1.67,1.67]){box(portal,1.55,2.95,.22,plaster,x,1.475,-.025,.02,false);box(portal,1.56,.92,.24,lowerWall,x,.46,-.005,.015,false);box(portal,1.58,.08,.27,trim,x,.96,.012,.008,false);}
  for(const x of [-.82,.82]){box(portal,.18,2.66,.28,darkWood,x,1.33,0,.013,false);box(portal,.045,2.70,.035,rose,x+Math.sign(x)*.115,1.35,.155,.003,false);}
  box(portal,1.83,.18,.28,darkWood,0,2.65,0,.012,false);box(portal,1.93,.065,.035,rose,0,2.77,.155,.006,false);
  box(portal,1.46,.035,.25,brass,0,.068,0,.005,false);
  // Portico, rafter ends and a sign give the doorway a grounded architectural setting.
  box(portal,4.97,.13,1.85,darkWood,0,3.10,.40,.013,false);
  for(let n=0;n<18;n++){const tile=box(portal,.29,.075,1.91,rose,-2.47+n*.29,3.19,.40,.025,false);tile.rotation.x=-.045;}
  for(const x of [-2.24,2.24]){box(portal,.12,3.09,.12,trim,x,1.55,1.08,.012,false);box(portal,.19,.13,.19,entryStone,x,.115,1.08,.01,false);}
  for(const x of [-1.8,-.9,0,.9,1.8])box(portal,.065,.15,2.02,trim,x,3.025,.4,.006,false);
  const entrySignMat=standard({map:surfaces.sign,roughness:.9});box(portal,2.18,.55,.045,darkWood,0,2.76,.14,.012,false);box(portal,2.09,.47,.014,entrySignMat,0,2.76,.173,.003,false);
  imported('plant',portal,-1.9,.065,.48,.65,'height',.25);imported('plant',portal,1.9,.065,.48,.65,'height',-.3);
  const doorLeaf=new THREE.Group();doorLeaf.position.set(-.72,0,0);portal.add(doorLeaf);
  box(doorLeaf,1.44,2.48,.085,rose,.72,1.30,0,.012,false);
  for(const y of [.66,1.83]){box(doorLeaf,1.16,.88,.032,darkWood,.72,y,.054,.012,false);box(doorLeaf,1.05,.77,.025,rose,.72,y,.076,.009,false);}
  for(const y of [.38,1.26,2.15]){box(doorLeaf,.04,.12,.025,brass,.035,y,.058,.005,false);cylinder(doorLeaf,.012,.012,.15,brass,.005,y,.054,false);}
  box(doorLeaf,.08,.22,.018,brass,1.25,1.14,.067,.014,false);cylinder(doorLeaf,.036,.036,.08,brass,1.25,1.13,.1,false).rotation.x=Math.PI/2;
  const threshold=standard({color:0xf2d3a0,emissive:0xe8b867,emissiveIntensity:.65});
  const doorway=box(portal,1.43,2.48,.015,threshold,0,1.30,-.055,.001,false);doorway.visible=false;
  const returnDoor=new THREE.Group();returnDoor.name='Door back to the garden';returnDoor.position.set(0,0,6.35);school.add(returnDoor);
  box(returnDoor,1.6,2.5,.08,rose,0,1.25,.09,.012,false);
  for(const x of [-.9,.9])box(returnDoor,.14,2.7,.18,darkWood,x,1.35,0,.009,false);box(returnDoor,1.94,.14,.18,darkWood,0,2.68,0,.009,false);
  for(const y of [.65,1.79]){box(returnDoor,1.28,.84,.023,darkWood,0,y,.037,.01,false);box(returnDoor,1.15,.71,.025,rose,0,y,.02,.008,false);}
  box(returnDoor,.08,.22,.018,brass,.61,1.12,.018,.01,false);cylinder(returnDoor,.036,.036,.07,brass,.61,1.12,-.018,false).rotation.x=Math.PI/2;
  const returnSignMat=standard({map:surfaces.exit,roughness:.9});const returnSign=box(returnDoor,1.55,.33,.015,returnSignMat,0,2.98,0,.006,false);returnSign.rotation.y=Math.PI;
  let inside=false,doorOpen=false;
  function portalLocal(x:number,z:number){const dx=x-portal.position.x,dz=z-portal.position.z;return {x:dx*normalZ-dz*normalX,z:dx*normalX+dz*normalZ};}
  const exitPosition={x:portal.position.x+normalX*1.35,z:portal.position.z+normalZ*1.35,yaw:portalYaw+Math.PI};
  function portalCrossed(previousX:number,previousZ:number,x:number,z:number){const before=portalLocal(previousX,previousZ),now=portalLocal(x,z);return !inside&&doorOpen&&doorLeaf.rotation.y<-.9&&Math.abs(now.x)<.65&&before.z>=.35&&now.z<.35&&now.z>-.35;}
  function portalHint(camera:THREE.Camera){
    if(inside){const facing=new THREE.Vector3();camera.getWorldDirection(facing);return facing.z>.4&&camera.position.distanceTo(new THREE.Vector3(200,1.63,6.4))<2.4?'Return through the door':null;}
    const p=portal.position,local=portalLocal(camera.position.x,camera.position.z);
    if(local.z<=.12||Math.abs(local.x)>1.65||camera.position.distanceTo(new THREE.Vector3(p.x,p.y+1.3,p.z))>2.8)return null;
    const facing=new THREE.Vector3();camera.getWorldDirection(facing);if(facing.x*normalX+facing.z*normalZ>-.25)return null;
    return doorOpen?'Walk through the open door':'Open the door to that evening';
  }
  function doorwayBlocked(x:number,z:number){if(inside)return false;const local=portalLocal(x,z);return Math.abs(local.z)<.29&&Math.abs(local.x)<2.52&&(Math.abs(local.x)>.67||!doorOpen);}
  function usePortal(){if(inside)return 'exit';doorOpen=true;doorway.visible=true;return 'open';}
  const hiddenStates=new Map<THREE.Object3D,boolean>();
  function setInterior(value:boolean){inside=value;school.visible=value;if(value)roomSun.shadow.needsUpdate=true;for(const child of group.children){if(child===school)continue;if(value){hiddenStates.set(child,child.visible);child.visible=false;}else child.visible=hiddenStates.get(child)??child.visible;}if(!value)hiddenStates.clear();}
  function interiorHeight(x:number,z:number){x-=200;if(Math.abs(x)>4.85||Math.abs(z)>6.35)return null;if(roomSolids.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2))return null;return 0;}
  // Merge static authored pieces by material to keep this trail economical on mobile.
  group.updateMatrixWorld(true);
  for(const [material,allPieces]of batches){
    const cells=new Map<string,THREE.Mesh[]>();
    for(const piece of allPieces){const e=piece.matrixWorld.elements,key=`${Math.floor(e[12]/8)}:${Math.floor(e[14]/8)}`;const cell=cells.get(key)||[];cell.push(piece);cells.set(key,cell);}
    for(const list of cells.values()){
    if(list.length<2)continue;const converted=list.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return g.applyMatrix4(o.matrixWorld);});const merged=mergeGeometries(converted);converted.forEach(g=>g.dispose());
    if(!merged)continue;keep(merged);const combined=new THREE.Mesh(merged,material);combined.name='Spring static '+(material.name||material.uuid);combined.castShadow=combined.receiveShadow=true;if(list[0].matrixWorld.elements[12]>150){combined.position.x=-200;school.add(combined);}else group.add(combined);for(const original of list)original.removeFromParent();
    }
  }
  group.updateMatrixWorld(true);for(const t of targets)t.proxy.getWorldPosition(t.point);
  const eye=new THREE.Vector3(),direction=new THREE.Vector3(),toTarget=new THREE.Vector3(),hits:THREE.Intersection[]=[];
  let lastState:SpringSave|undefined,state:SpringSave|undefined;
  function update(time:number,dt:number,save:SpringSave){
    state=save;
    doorLeaf.rotation.y=THREE.MathUtils.damp(doorLeaf.rotation.y,doorOpen?-Math.PI*.52:0,8,dt);
    if(save!==lastState){lastState=save;roomSun.shadow.needsUpdate=true;plantEnvelope.visible=!save.plantFound;pouch.visible=!save.pouchTaken;ticketObject.visible=!save.ticketFound;
      tinLid.rotation.x=save.paperPlaced||save.rubbingDone?-2.18:0;sweets.visible=!save.paperPlaced;tracingPaper.visible=save.paperPlaced;tracingClip.visible=save.paperClipped;
      pocketFlap.rotation.x=save.pocketFound?-.85:.1;treeLetter.visible=!save.pocketFound;door.rotation.y=save.cabinetOpen?-1.8:0;mapObject.visible=save.cabinetOpen;drawnLayers.visible=save.ticketSolved&&save.rubbingDone&&save.pocketFound;
      if(spadeObject)spadeObject.visible=!save.spadeTaken;patch.visible=save.digStage<3;patch.scale.set(1-save.digStage*.22,.79-save.digStage*.16,1);soilMounds.visible=save.digStage>0;hole.visible=save.digStage>1;
      for(const t of targets)t.proxy.visible=t.available(save);group.updateMatrixWorld(true);
    }
    if(!reduced){waterBump.offset.x=time*.004;waterBump.offset.y=time*.002;flame.scale.y=1.7+Math.sin(time*8)*.12;}
  }
  function pick(camera:THREE.PerspectiveCamera,ray:THREE.Raycaster){
    if(!state)return null;camera.getWorldPosition(eye);camera.getWorldDirection(direction);let selected:typeof targets[number]|undefined,best=Infinity;
    const current=state;
    const canReach=(t:typeof targets[number])=>t.available(current)&&(t.point.x>150)===inside&&(!(t.id==='cabinet'||t.id==='map')||eye.z>-5.50);
    for(const t of targets){if(!canReach(t))continue;const distance=eye.distanceTo(t.point);if(distance>3.1)continue;
      hits.length=0;ray.intersectObject(t.proxy,false,hits);const hit=hits[0];if(hit&&hit.distance<best){selected=t;best=hit.distance;}
    }
    if(!selected){let score=.93;for(const t of targets){if(!canReach(t))continue;toTarget.subVectors(t.point,eye);const d=toTarget.length();if(d>2.7)continue;const alignment=direction.dot(toTarget.multiplyScalar(1/Math.max(.001,d)));if(alignment>score){selected=t;score=alignment;}}}
    return selected?.result??null;
  }
  function dispose(){roomSun.shadow.dispose();ownGeometry.forEach(g=>g.dispose());ownMaterials.forEach(m=>m.dispose());ownTextures.forEach(t=>t.dispose());group.removeFromParent();group.clear();}
  setInterior(false);
  return {group,update,target:pick,dispose,portalHint,usePortal,portalLocal,portalCrossed,exitPosition,doorwayBlocked,setInterior,interiorHeight,get inside(){return inside;},get canEnter(){return doorOpen&&doorLeaf.rotation.y<-.9;},stats:()=>({targets:targets.length,staticBatches:batches.size,ownedGeometry:ownGeometry.size,pondTriangles:wp.length/9})};
}
