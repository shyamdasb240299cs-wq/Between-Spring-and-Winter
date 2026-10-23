import {detailSummerMaterial,type SummerSurfaces} from './summer-surfaces';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {adoptImportedSummerScuba} from './summer-imported-scuba';

/** Original metre-scale mesh sources. These same sources are exported by prepare-summer-assets.mjs. */
export function createSummerModelKit(woodMap?:THREE.Texture,clothMap?:THREE.Texture,templates?:Record<string,THREE.Object3D>,surfaces?:SummerSurfaces){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  const cache=new Map<string,THREE.BufferGeometry>();
  const own=<T extends THREE.BufferGeometry>(g:T)=>{geometries.add(g);return g;};
  const material=(p:THREE.MeshStandardMaterialParameters)=>{const clean=Object.fromEntries(Object.entries(p).filter(([,value])=>value!==undefined));const m=new THREE.MeshStandardMaterial(clean);materials.add(m);return m;};
  const m={wood:material({color:surfaces?0xd8d0bd:0xa18c69,map:surfaces?.timber.color??woodMap,normalMap:surfaces?.timber.normal,normalScale:new THREE.Vector2(.55,.55),roughnessMap:surfaces?.timber.roughness,roughness:.92}),pale:material({color:0xe3dfca,roughness:.66}),rubber:material({color:0x303d40,roughness:.78}),black:material({color:0x17252b,roughness:.65}),blue:material({color:0x477e97,map:clothMap,roughness:.94}),metal:material({color:0xa0aeb0,metalness:.78,roughness:.38}),brass:material({color:0xb9a269,metalness:.72,roughness:.44}),red:material({color:0xb34534,roughness:.48}),rope:material({color:0xc8ba8d,roughness:.99}),paper:material({color:0xf6edd4,roughness:.96}),lens:material({color:0xb9d8d5,metalness:.15,roughness:.12,transparent:true,opacity:.37,depthWrite:false}),orange:material({color:0xcb9958,roughness:.78})};
  const deckMaterial=material({color:0xc2c5ba,roughness:.91});detailSummerMaterial(deckMaterial,'deck');
  detailSummerMaterial(m.rubber,'rubber');detailSummerMaterial(m.black,'neoprene');
  Object.entries(m).forEach(([name,mat])=>mat.name='Summer original / '+name);
  function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0,name=''){
    // Authored lofts and fin wedges share the same batching contract as stock primitives.
    if(!g.getAttribute('uv')&&g.getAttribute('position'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));
    const o=new THREE.Mesh(g,mat);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function box(parent:THREE.Object3D,w:number,h:number,d:number,mat:THREE.Material,x=0,y=0,z=0,r=.025,name=''){
    const timber=mat instanceof THREE.MeshStandardMaterial&&!!m.wood.map&&mat.map===m.wood.map;
    const key=`b:${w}:${h}:${d}:${r}:${timber}`;let g=cache.get(key);if(!g){
      g=own(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d,r*2)*.48));
      // Metre-scale grain follows each board's longest axis, including thin edges.
      // UVs are baked before static batching so one material still draws many boards.
      if(timber){const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv'),lengthAxis=w>=h&&w>=d?0:h>=d?1:2;
        for(let i=0;i<p.count;i++){const normal=[Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i))],face=normal.indexOf(Math.max(...normal)),axes=[0,1,2].filter(a=>a!==face),long=axes.includes(lengthAxis)?lengthAxis:axes[0],short=axes.find(a=>a!==long)!;uv.setXY(i,p.getComponent(i,short)/.42+.5,p.getComponent(i,long)/2+.5);}
      }
      cache.set(key,g);
    }return mesh(parent,g,mat,x,y,z,name);
  }
  function cylinder(parent:THREE.Object3D,rt:number,rb:number,h:number,mat:THREE.Material,x=0,y=0,z=0,name='',segments=16){
    const key=`c:${rt}:${rb}:${h}:${segments}`;let g=cache.get(key);if(!g){g=own(new THREE.CylinderGeometry(rt,rb,h,segments));cache.set(key,g);}return mesh(parent,g,mat,x,y,z,name);
  }
  function beam(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number,mat:THREE.Material,name=''){
    const o=cylinder(parent,r,r,a.distanceTo(b),mat,0,0,0,name,8);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return o;
  }
  function tube(parent:THREE.Object3D,points:THREE.Vector3[],radius:number,mat:THREE.Material,name='',segments=24){return mesh(parent,own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),segments,radius,6,false)),mat,0,0,0,name);}
  function ring(parent:THREE.Object3D,r:number,t:number,mat:THREE.Material,x:number,y:number,z:number){return mesh(parent,own(new THREE.TorusGeometry(r,t,6,20)),mat,x,y,z);}
  function mergeStatic(root:THREE.Group,exclude=new Set<THREE.Object3D>()){
    root.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.Mesh[]>();
    root.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material)||o.material.transparent)return;for(let p:THREE.Object3D|null=o;p&&p!==root;p=p.parent)if(exclude.has(p))return;const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);});
    const inverse=root.matrixWorld.clone().invert();
    for(const [mat,all]of batches){if(all.length<2)continue;const gs=all.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));return g;});const merged=mergeGeometries(gs);gs.forEach(g=>g.dispose());if(!merged)continue;mesh(root,own(merged),mat,0,0,0,'Merged '+mat.name);all.forEach(o=>o.removeFromParent());}
  }
  function fuelCan(){const root=new THREE.Group();root.name='fuel-can';box(root,.34,.40,.21,m.red,0,.23,0,.045);box(root,.30,.035,.19,m.red,0,.445,0,.018);for(const x of [-.09,.09])beam(root,new THREE.Vector3(x,.44,-.02),new THREE.Vector3(x,.55,-.02),.025,m.red);beam(root,new THREE.Vector3(-.09,.55,-.02),new THREE.Vector3(.09,.55,-.02),.025,m.red);cylinder(root,.045,.045,.042,m.black,-.09,.47,.045);for(const a of [-1,1]){const rib=box(root,.23,.012,.012,m.red,0,.25,.113,.005);rib.rotation.z=a*.7;}return root;}
  function createBoat(){
    const root=new THREE.Group();root.name='Summer original 5.89m RIB';
    // Lofted V-bottom hull: real cross-sections, flared gunwale and upswept bow.
    const sections=[[-2.90,.08,.28],[-2.50,.66,.12],[-1.85,.87,.02],[-.8,.92,-.02],[.5,.91,-.04],[1.65,.86,-.03],[2.55,.79,.02]];
    const p:number[]=[],ix:number[]=[];
    sections.forEach(([z,w,rise])=>{for(const [s,y]of [[-1,.28],[-.78,-.12],[0,-.46],[.78,-.12],[1,.28]])p.push(w*s,y+rise,z);});
    for(let n=0;n<sections.length-1;n++)for(let j=0;j<4;j++){const a=n*5+j,b=a+5;ix.push(a,a+1,b,a+1,b+1,b);}ix.push(0,4,2,30,32,34);
    const hull=own(new THREE.BufferGeometry());hull.setAttribute('position',new THREE.Float32BufferAttribute(p,3));hull.setIndex(ix);hull.computeVertexNormals();mesh(root,hull,m.pale,0,0,0,'V hull');
    // Inflatable tube follows a swept rounded bow, retaining credible rubber seams and handles.
    const collarPts=[new THREE.Vector3(-.89,.33,2.48),new THREE.Vector3(-.97,.33,.4),new THREE.Vector3(-.94,.37,-1.6),new THREE.Vector3(-.66,.45,-2.4),new THREE.Vector3(0,.52,-2.76),new THREE.Vector3(.66,.45,-2.4),new THREE.Vector3(.94,.37,-1.6),new THREE.Vector3(.97,.33,.4),new THREE.Vector3(.89,.33,2.48)];
    tube(root,collarPts,.27,m.rubber,'Inflatable collar',64);
    tube(root,collarPts.map(v=>v.clone().add(new THREE.Vector3(0,-.10,0))),.018,m.black,'Rub rail',64);
    box(root,1.49,.10,4.65,deckMaterial,0,.12,.18,.04,'Non-slip deck');
    // Flush inspection hatches, gasket reveals, drain channels and stainless catches.
    for(const z of [-1.78,1.65]){
      box(root,.98,.012,.65,m.rubber,0,.177,z,.035,'Hatch gasket');
      box(root,.955,.014,.625,deckMaterial,0,.186,z,.03,'Flush deck inspection hatch');
      for(const x of [-.36,.36]){box(root,.10,.009,.037,m.metal,x,.198,z-.22,.006,'Recessed hatch hinge');}
      const latch=ring(root,.035,.006,m.metal,.28,.199,z+.18);latch.rotation.x=-Math.PI/2;
    }
    for(const x of [-.69,.69])box(root,.016,.003,4.25,m.rubber,x,.173,.20,.003,'Deck drainage channel');
    for(const x of [-.57,.57]){cylinder(root,.048,.048,.006,m.metal,x,.177,2.28,'Stern scupper');for(let n=-2;n<=2;n++)box(root,.065,.003,.005,m.black,x,.182,2.28+n*.014,.001);}
    box(root,1.65,.46,.15,m.pale,0,.13,2.55,.02,'Transom');
    for(const x of [-.90,.90])for(const z of [-1.50,.05,1.75]){const seam=ring(root,.272,.008,m.black,x,.33,z);seam.rotation.y=Math.PI/2;beam(root,new THREE.Vector3(x,.61,z-.12),new THREE.Vector3(x,.61,z+.12),.017,m.black);}
    const console=new THREE.Group();console.name='Console';console.position.set(.05,.16,-.48);root.add(console);
    // An open aft cubby gives the dry bag real space beneath the dashboard.
    box(console,.71,.24,.70,m.pale,0,.61,0,.05);
    for(const x of [-.325,.325])box(console,.06,.49,.70,m.pale,x,.245,0,.018);
    box(console,.59,.49,.055,m.pale,0,.245,-.322,.012);
    box(console,.60,.035,.60,m.rubber,0,.025,0,.012,'Dry bag cubby floor');
    const face=box(console,.62,.33,.045,m.black,0,.73,.25,.025);face.rotation.x=-.30;
    for(const x of [-.29,.29])beam(console,new THREE.Vector3(x,.69,-.17),new THREE.Vector3(x,1.28,-.25),.015,m.metal);
    beam(console,new THREE.Vector3(-.29,1.28,-.25),new THREE.Vector3(.29,1.28,-.25),.015,m.metal);
    box(console,.55,.48,.018,m.lens,0,1.00,-.235,.035);
    const steering=new THREE.Group();steering.name='Steering wheel pivot';steering.position.set(-.08,.79,.32);steering.rotation.x=-.25;console.add(steering);ring(steering,.17,.014,m.black,0,0,0);for(let n=0;n<3;n++)beam(steering,new THREE.Vector3(),new THREE.Vector3(Math.cos(n*2.094)*.16,Math.sin(n*2.094)*.16,0),.009,m.metal);cylinder(steering,.032,.032,.028,m.metal).rotation.x=Math.PI/2;
    const gauge=ring(console,.052,.008,m.metal,.20,.81,.286);const gaugeFace=cylinder(console,.047,.047,.008,m.paper,.20,.81,.29);gaugeFace.rotation.x=Math.PI/2;
    const needle=box(console,.004,.039,.006,m.black,.20,.827,.30,.001,'Fuel needle');
    const seats:THREE.Group[]=[];
    for(const x of [-.43,.43]){const seat=new THREE.Group();seat.name=x<0?'Pilot seat':'Second seat / room for two';seat.position.set(x,.20,.67);root.add(seat);cylinder(seat,.043,.058,.35,m.metal,0,.16,0);box(seat,.45,.13,.66,m.pale,0,.41,0,.07);box(seat,.42,.10,.59,m.blue,0,.49,0,.05);const back=box(seat,.44,.60,.10,m.blue,0,.75,.28,.055);back.rotation.x=.12;for(const dx of [-.18,.18])beam(seat,new THREE.Vector3(dx,.44,.26),new THREE.Vector3(dx,.97,.33),.019,m.metal);seats.push(seat);}
    const bag=new THREE.Group();bag.name='Dry bag';bag.position.set(.43,.81,.64);root.add(bag);box(bag,.41,.44,.30,m.blue,0,0,0,.065);box(bag,.43,.055,.31,m.black,0,.23,0,.02);tube(bag,[new THREE.Vector3(-.1,.25,0),new THREE.Vector3(0,.37,0),new THREE.Vector3(.1,.25,0)],.014,m.black,'Strap',10);
    box(root,.71,.06,.61,m.rubber,0,.20,-1.67,.025,'Fitted equipment tray');for(const x of [-.40,.40])box(root,.035,.14,.68,m.pale,x,.26,-1.67);for(const z of [-2.02,-1.33])box(root,.80,.14,.035,m.pale,0,.26,z);
    const tank=new THREE.Group();tank.name='Fuel tank';tank.position.set(-.43,.20,1.75);root.add(tank);box(tank,.63,.33,.51,m.pale,0,.165,0,.05);for(const z of [-.18,.18])box(tank,.65,.025,.045,m.black,0,.25,z);const capPivot=new THREE.Group();capPivot.name='Tank cap pivot';capPivot.position.set(0,.35,0);tank.add(capPivot);cylinder(capPivot,.07,.07,.025,m.metal);for(let n=0;n<6;n++)cylinder(capPivot,.008,.008,.029,m.black,Math.cos(n*1.047)*.054,0,Math.sin(n*1.047)*.054);
    const hose=tube(root,[new THREE.Vector3(-.33,.48,1.80),new THREE.Vector3(-.06,.26,1.7),new THREE.Vector3(.36,.21,2.18),new THREE.Vector3(.14,.48,2.63)],.018,m.black,'Engine supply hose');cylinder(root,.03,.03,.09,m.metal,.14,.48,2.63);
    const engine=new THREE.Group();engine.name='Outboard steer pivot';engine.position.set(0,.05,2.64);root.add(engine);box(engine,.51,.66,.53,m.black,0,.45,.16,.11,'Outboard cowling');box(engine,.22,.55,.18,m.metal,0,-.12,.22,.055);const propeller=new THREE.Group();propeller.name='Propeller pivot';propeller.position.set(0,-.43,.30);engine.add(propeller);cylinder(propeller,.055,.08,.19,m.metal).rotation.x=Math.PI/2;for(let n=0;n<3;n++){const blade=box(propeller,.10,.25,.025,m.metal,Math.sin(n*2.094)*.13,Math.cos(n*2.094)*.13,0,.04);blade.rotation.z=-n*2.094+.35;}
    const ladder=new THREE.Group();ladder.name='Stern ladder hinge';ladder.position.set(.73,.34,2.52);root.add(ladder);for(const x of [-.20,.20])tube(ladder,[new THREE.Vector3(x,.28,-.1),new THREE.Vector3(x,.35,.16),new THREE.Vector3(x,-.2,.27),new THREE.Vector3(x,-1.4,.28)],.021,m.metal,'Ladder rail',16);for(let n=0;n<5;n++)beam(ladder,new THREE.Vector3(-.20,-.10-n*.29,.28),new THREE.Vector3(.20,-.10-n*.29,.28),.019,m.metal,'Ladder rung');
    for(const z of [-2.25,2.23]){cylinder(root,.027,.027,.06,m.metal,0,.68,z);box(root,.22,.026,.045,m.metal,0,.72,z,.012,'Mooring cleat');}
    mergeStatic(root,new Set([steering,bag,needle,capPivot,hose,engine,ladder]));
    return {root,steering,seats,bag,tank,cap:capPivot,hose,engine,propeller,ladder,needle};
  }
  function scuba(){
    const root=new THREE.Group();root.name='Complete original scuba set';
    // Anatomically shaped, continuous wetsuit torso via elliptical lathe; limbs are tapered, articulated segments.
    const shape=[new THREE.Vector2(.15,-.52),new THREE.Vector2(.23,-.38),new THREE.Vector2(.22,-.17),new THREE.Vector2(.25,.03),new THREE.Vector2(.26,.26),new THREE.Vector2(.18,.39),new THREE.Vector2(.08,.44)];
    const torso=mesh(root,own(new THREE.LatheGeometry(shape,24)),m.black,0,1.13,0,'Wetsuit torso');torso.scale.z=.58;
    const arms:THREE.Group[]=[],legs:THREE.Group[]=[],fins:THREE.Group[]=[];
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.name=side<0?'Left sleeve and glove':'Right sleeve and glove';arm.position.set(side*.24,1.40,0);root.add(arm);arm.rotation.z=side*.14;arms.push(arm);
      const sleeve=cylinder(arm,.087,.067,.51,m.black,0,-.22,0,'Sleeve');const panel=box(arm,.032,.44,.083,m.blue,side*.075,-.22,.013,.015);sleeve.rotation.z=side*.05;panel.rotation.z=side*.05;
      cylinder(arm,.065,.049,.38,m.black,side*.015,-.64,.045,'Forearm');box(arm,.11,.18,.07,m.black,side*.025,-.90,.07,.03,'Glove palm');for(let i=0;i<4;i++)box(arm,.019,.105,.039,m.black,side*.025+(i-1.5)*.024,-1.00,.075,.009,'Gloved finger');const thumb=box(arm,.031,.10,.04,m.black,side*.096,-.91,.06,.013);thumb.rotation.z=side*.45;
      const leg=new THREE.Group();leg.name='Wetsuit leg';leg.position.set(side*.115,.68,0);root.add(leg);legs.push(leg);cylinder(leg,.107,.079,.45,m.black,0,-.16,0);cylinder(leg,.075,.044,.42,m.black,0,-.56,0);box(leg,.025,.55,.10,m.blue,side*.077,-.26,.018,.018);box(leg,.092,.11,.20,m.black,0,-.80,-.058,.04,'Dive boot');
      const fin=new THREE.Group();fin.name='Fitted fin';fin.position.set(0,-.82,-.05);leg.add(fin);const verts=[-.07,0,.08,.07,0,.08,-.13,-.02,-.46,.13,-.02,-.46,-.14,.015,-.70,.14,.015,-.70];const g=own(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex([0,1,2,1,3,2,2,3,4,3,5,4]);g.computeVertexNormals();const blade=mesh(fin,g,m.blue);blade.material=m.blue;for(const dx of [-.11,0,.11])beam(fin,new THREE.Vector3(dx*.5,.012,-.04),new THREE.Vector3(dx,.027,-.65),.009,m.rubber);box(fin,.11,.06,.20,m.black,0,.018,-.01,.035);fins.push(fin);
    }
    const bcd=new THREE.Group();bcd.name='BCD cylinder regulator connected';root.add(bcd);box(bcd,.46,.51,.13,m.black,0,1.15,.17,.07);for(const x of [-.22,.22]){box(bcd,.10,.47,.17,m.rubber,x,1.23,-.06,.04);box(bcd,.15,.19,.11,m.black,x,1.00,-.14,.035);box(bcd,.045,.055,.03,m.metal,x,1.25,-.16,.008);}box(bcd,.46,.06,.045,m.black,0,1.04,-.16,.01);box(bcd,.07,.08,.02,m.metal,0,1.04,-.192,.007);
    cylinder(bcd,.092,.092,.58,m.metal,0,1.22,.30,'Air cylinder',24);const shoulder=mesh(bcd,own(new THREE.SphereGeometry(.092,20,10,0,Math.PI*2,0,Math.PI/2)),m.metal,0,1.51,.30);shoulder.scale.y=.60;cylinder(bcd,.096,.096,.07,m.black,0,.94,.30);cylinder(bcd,.023,.023,.10,m.brass,0,1.59,.30,'Tank valve');box(bcd,.10,.035,.04,m.black,0,1.64,.30,.012);
    tube(bcd,[new THREE.Vector3(0,1.61,.31),new THREE.Vector3(.29,1.59,.17),new THREE.Vector3(.34,1.40,-.20),new THREE.Vector3(.10,1.58,-.16)],.017,m.black,'Primary regulator hose');tube(bcd,[new THREE.Vector3(-.02,1.60,.30),new THREE.Vector3(-.26,1.44,.15),new THREE.Vector3(-.30,1.11,-.13)],.015,m.black,'Inflator hose');cylinder(bcd,.045,.045,.025,m.black,.10,1.58,-.18).rotation.x=Math.PI/2;
    const mask=new THREE.Group();mask.name='Mask and adjustable strap';mask.position.set(0,1.70,-.09);root.add(mask);for(const x of [-.055,.055]){box(mask,.099,.085,.027,m.rubber,x,0,0,.02);box(mask,.083,.067,.008,m.lens,x,0,-.018,.019);}tube(mask,[new THREE.Vector3(-.12,0,0),new THREE.Vector3(-.14,0,.16),new THREE.Vector3(0,0,.21),new THREE.Vector3(.14,0,.16),new THREE.Vector3(.12,0,0)],.011,m.black,'Mask strap',16);
    const torch=new THREE.Group();torch.name='Dive torch';torch.position.set(.30,.81,-.08);root.add(torch);cylinder(torch,.026,.032,.20,m.black);cylinder(torch,.040,.030,.045,m.metal,0,.12,0);cylinder(torch,.034,.034,.005,m.lens,0,.145,0);
    const compass=new THREE.Group();compass.name='Wrist compass';compass.position.set(-.29,.87,-.02);root.add(compass);cylinder(compass,.035,.035,.023,m.black).rotation.x=Math.PI/2;cylinder(compass,.029,.029,.024,m.paper).rotation.x=Math.PI/2;const north=box(compass,.006,.034,.008,m.red,0,.008,-.016,.001);
    const slate=new THREE.Group();slate.name='Dive slate';slate.position.set(-.23,.83,-.15);slate.rotation.z=-.15;root.add(slate);box(slate,.17,.23,.014,m.paper,0,0,0,.02);for(let n=0;n<4;n++)box(slate,.13,.002,.002,m.rubber,0,.07-n*.04,-.009,.001);
    return adoptImportedSummerScuba({root,torso,arms,legs,fins,bcd,mask,torch,compass,slate,north},templates);
  }
  function keepsake(){const root=new THREE.Group();root.name='Sealed keepsake case';box(root,.74,.24,.49,m.black,0,.12,0,.06);box(root,.71,.025,.46,m.rubber,0,.25,0,.04,'Rubber gasket');for(const x of [-.28,.28])for(const z of [-.17,.17])box(root,.10,.26,.06,m.metal,x,.13,z,.018);const lid=new THREE.Group();lid.name='Case lid hinge';lid.position.set(0,.25,-.22);root.add(lid);box(lid,.74,.065,.49,m.black,0,.033,.22,.055);box(lid,.62,.015,.37,m.rubber,0,-.008,.22,.035,'Lid padding');for(const x of [-.25,.25])box(lid,.08,.025,.10,m.metal,x,0,0,.009);const latches:THREE.Group[]=[];for(const x of [-.23,.23]){const latch=new THREE.Group();latch.position.set(x,.21,.25);root.add(latch);box(latch,.08,.10,.028,m.metal,0,-.025,0,.012);latches.push(latch);}tube(root,[new THREE.Vector3(-.12,.13,.26),new THREE.Vector3(-.12,.10,.32),new THREE.Vector3(.12,.10,.32),new THREE.Vector3(.12,.13,.26)],.018,m.black,'Carry handle',12);box(root,.63,.05,.37,m.rubber,0,.18,0,.025,'Shaped padding');const contents=new THREE.Group();root.add(contents);box(contents,.25,.028,.32,m.blue,.16,.22,0,.008,'Blue Summer book');box(contents,.26,.005,.18,m.paper,-.15,.22,0,.003,'Dry letter');return{root,lid,latches,contents};}
  return{m,own,material,mesh,box,cylinder,beam,tube,ring,mergeStatic,fuelCan,createBoat,scuba,keepsake,dispose(){geometries.forEach(g=>g.dispose());materials.forEach(mat=>mat.dispose());},stats(){let triangles=0;geometries.forEach(g=>triangles+=(g.index?.count??g.getAttribute('position').count)/3);return{uniqueGeometry:geometries.size,sourceTriangles:triangles,materials:materials.size};}};
}
