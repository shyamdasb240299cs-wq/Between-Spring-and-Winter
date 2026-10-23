import type {SummerSurfaces} from './summer-surfaces';
import * as THREE from 'three';
import {createSummerModelKit} from './summer-models';
import {createSummerCorals,createSummerWildlife} from './summer-wildlife';
import {createSummerShipwreck} from './summer-shipwreck';
import {createSummerMarine} from './summer-marine';
import {SUMMER_ANCHORS,SUMMER_ROUTE_POSTS,SUMMER_BEACH,SUMMER_LOOKOUT_TABLE,SUMMER_FUEL_BAY,SUMMER_SHELTER_FLOOR,SUMMER_DIVE_BUOY,SUMMER_DESCENT_LINE,summerDockHeight,summerGroundHeight,summerWorldColliders} from './summer-layout';
import {SUMMER_CHART,SUMMER_OBSERVATIONS,SUMMER_SHAPES,SUMMER_SILHOUETTES,SUMMER_CURRENT_GRAPH,SUMMER_CABLE_SOCKETS,SUMMER_PLATES} from './summer-puzzle-data';
import type {SummerState,SummerPanel,SummerAction} from './summer-state';
import type {SummerPose} from './summer-boat';

export interface SummerWorldTarget {id:string;label:string;panel?:SummerPanel;action?:SummerAction;payload?:unknown;point:THREE.Vector3;distance:number;}
export interface SummerWorldOptions {
  getState:()=>SummerState;boatPose:()=>SummerPose;camera:THREE.PerspectiveCamera;compact:boolean;
  surfaces?:SummerSurfaces;templates?:Record<string,THREE.Object3D>;woodMap?:THREE.Texture;clothMap?:THREE.Texture;
}
const random=(n:number)=>{const r=Math.sin(n*127.1+311.7)*43758.5453;return r-Math.floor(r);};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

/** Summer's authored, metre-scale installations. Terrain, sky and ocean stay in the
 * shared scene; this module owns the dimensional props and their physical states. */
export function createSummerWorld(options:SummerWorldOptions){
  const group=new THREE.Group();group.name='Summer · a whole day with nowhere to rush';
  const fixed=new THREE.Group(),water=new THREE.Group(),moving=new THREE.Group();group.add(fixed,water,moving);
  const kit=createSummerModelKit(options.woodMap,options.clothMap,options.templates,options.surfaces),{m,box,cylinder,beam,tube,mesh,ring}=kit;
  const textures=new Set<THREE.Texture>(),instances:THREE.InstancedMesh[]=[],proxies:THREE.Mesh[]=[],rockRoots:THREE.Object3D[]=[];
  const proxyMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,transparent:true,opacity:0});
  const targets:{data:Omit<SummerWorldTarget,'point'|'distance'>;proxy:THREE.Mesh;available:(s:SummerState)=>boolean;range:number}[]=[];
  const rock=kit.material({color:0x858d7d,roughness:.98}),sandStone=kit.material({color:0xb3ac91,roughness:.98}),patina=kit.material({color:0x647f76,metalness:.45,roughness:.66});
  function site(parent:THREE.Object3D,x:number,z:number,y=summerGroundHeight(x,z)){const root=new THREE.Group();root.position.set(x,y,z);parent.add(root);return root;}
  function imported(key:string,parent:THREE.Object3D,x:number,y:number,z:number,width:number,yaw=0){
    const source=options.templates?.[key];if(!source)return null;
    const clone=source.clone(true),bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(V()),centre=bounds.getCenter(V());
    clone.position.sub(V(centre.x,bounds.min.y,centre.z));const holder=new THREE.Group();holder.add(clone);holder.position.set(x,y,z);holder.scale.setScalar(width/Math.max(size.x,size.z));holder.rotation.y=yaw;parent.add(holder);
    if(key==='beach-chair'){
      holder.updateWorldMatrix(true,true);const bottom=new THREE.Box3().setFromObject(holder).min.y,point=V();
      holder.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const g=kit.own(o.geometry.clone()),p=g.attributes.position,inverse=o.matrixWorld.clone().invert();
        for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);const height=point.y-bottom;if(height<.18){point.y+=(summerGroundHeight(point.x,point.z)-bottom-.009)*(1-THREE.MathUtils.smoothstep(height,.025,.18));point.applyMatrix4(inverse);p.setXYZ(i,point.x,point.y,point.z);}}
        g.computeVertexNormals();g.computeBoundingSphere();o.geometry=g;
      });
    }
    return holder;
  }
  function target(data:Omit<SummerWorldTarget,'point'|'distance'>,parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,available:(s:SummerState)=>boolean=()=>true,range=3.6){
    const proxy=new THREE.Mesh(kit.own(new THREE.BoxGeometry(w,h,d)),proxyMaterial);proxy.position.set(x,y,z);proxy.name='Interact · '+data.id;parent.add(proxy);proxies.push(proxy);targets.push({data,proxy,available,range});return proxy;
  }
  function printed(w:number,h:number,paint:(c:CanvasRenderingContext2D)=>void,base='#e9e2cb'){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d')!;
    c.fillStyle=base;c.fillRect(0,0,w,h);c.strokeStyle='#82765f';c.lineWidth=2;c.strokeRect(10,10,w-20,h-20);c.fillStyle='#253e40';c.strokeStyle='#253e40';paint(c);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.add(t);return kit.material({map:t,roughness:.87,metalness:.05,side:THREE.DoubleSide});
  }
  function label(text:string,small='',w=512,h=192){return printed(w,h,c=>{c.textAlign='center';c.font=`600 ${h<150?36:40}px Georgia`;c.fillText(text,w/2,h*.45,w-44);if(small){c.font='24px Arial';c.fillText(small,w/2,h*.74,w-44);}});}
  function plaque(parent:THREE.Object3D,text:string,small:string,x:number,y:number,z:number,w=1.1,h=.34){box(parent,w+.04,h+.04,.035,m.brass,x,y,z);return mesh(parent,kit.own(new THREE.PlaneGeometry(w,h)),label(text,small),x,y,z+.022);}
  function sheet(parent:THREE.Object3D,w:number,h:number,mat:THREE.Material,x:number,y:number,z:number,yaw=0){const p=mesh(parent,kit.own(new THREE.PlaneGeometry(w,h)),mat,x,y,z);p.rotation.set(-Math.PI/2,0,yaw);return p;}
  const contacts:{name:string;x:number;z:number;bottom:number;surface:number}[]=[];
  function supportHeight(parent:THREE.Object3D,x:number,z:number){
    parent.updateWorldMatrix(true,false);const p=parent.localToWorld(V(x,0,z));
    return (summerDockHeight(p.x,p.z)??summerGroundHeight(p.x,p.z))-parent.getWorldPosition(V()).y;
  }
  function table(parent:THREE.Object3D,w:number,d:number,h:number,x=0,z=0){
    box(parent,w,.085,d,m.wood,x,h-.04,z,.012);
    for(const dx of [-w*.43,w*.43])for(const dz of [-d*.40,d*.40]){
      const bottom=supportHeight(parent,x+dx,z+dz)-.008,top=h-.08;
      const leg=box(parent,.065,top-bottom,.065,m.wood,x+dx,(top+bottom)*.5,z+dz,.008,'Ground-contact table leg');
      parent.updateWorldMatrix(true,true);const p=leg.getWorldPosition(V());
      contacts.push({name:'table leg',x:p.x,z:p.z,bottom:p.y-(top-bottom)/2,surface:parent.getWorldPosition(V()).y+bottom+.008});
    }
    for(const dz of [-d*.4,d*.4])box(parent,w*.86,.08,.035,m.wood,x,h*.35,z+dz,.005);
  }
  function tableSign(parent:THREE.Object3D,text:string,small:string,x:number,y:number,z:number,w:number,h:number,tableTop:number){
    for(const dx of [-w*.35,w*.35])beam(parent,V(x+dx,tableTop,z),V(x+dx,y,z),.018,m.wood,'Table sign support');
    plaque(parent,text,small,x,y,z,w,h);
  }
  function accessoryTray(parent:THREE.Object3D,x:number,y:number,z:number,scale=1){
    const source=kit.scuba(),tray=new THREE.Group();parent.add(tray);tray.position.set(x,y,z);tray.scale.setScalar(scale);
    const parts=[source.mask,source.torch,source.compass,source.slate,...source.fins];
    parts.forEach(part=>{part.removeFromParent();tray.add(part);});
    source.mask.position.set(.06,.045,-.18);source.mask.rotation.x=-Math.PI/2;
    source.torch.position.set(.33,.035,0);source.torch.rotation.z=Math.PI/2;
    source.compass.position.set(.33,.035,.18);source.compass.rotation.x=-Math.PI/2;
    source.slate.position.set(.06,.02,.15);source.slate.rotation.x=-Math.PI/2;
    source.fins.forEach((fin,i)=>{fin.position.set(i?-.22:-.40,.02,.30);fin.rotation.set(0,0,0);fin.scale.setScalar(.55);});
    return tray;
  }
  function sign(x:number,z:number,text:string,small:string,yaw=0){const root=site(fixed,x,z);root.rotation.y=yaw;cylinder(root,.035,.047,1.50,m.wood,0,.74,0);plaque(root,text,small,0,1.35,.025,1.25,.36);return root;}
  function paper(title:string,lines:string[]){return printed(512,640,c=>{c.font='italic 32px Georgia';c.fillText(title,42,75);c.font='24px Georgia';lines.forEach((line,i)=>c.fillText(line,42,135+i*43));});}
  function chartMaterial(half?:number){return printed(512,320,c=>{
    c.save();c.translate(32,32);c.scale(1.12,1.05);c.strokeStyle='#657f77';c.lineWidth=4;c.stroke(new Path2D(SUMMER_CHART.coast));c.strokeStyle='#877552';c.stroke(new Path2D(SUMMER_CHART.jetty));c.strokeStyle='#b77643';c.lineWidth=3;c.setLineDash([8,5]);c.beginPath();SUMMER_CHART.route.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.setLineDash([]);c.font='12px Arial';SUMMER_CHART.route.forEach(p=>{c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();c.fillText(p.label,p.x-27,p.y-12);});
    for(const p of SUMMER_CHART.registration){c.beginPath();c.moveTo(p.x-7,p.y);c.lineTo(p.x+7,p.y);c.moveTo(p.x,p.y-7);c.lineTo(p.x,p.y+7);c.stroke();c.fillText(p.id,p.x+10,p.y+5);}c.font='20px Georgia';c.fillText('N',360,22);c.beginPath();c.moveTo(360,28);c.lineTo(360,52);c.stroke();
    if(half!==undefined){c.fillStyle='#ede6d2';c.fillRect(half===0?220:-25,-20,half===0?200:200,280);}c.restore();
  });}

  // The two chairs are intentionally aimed at the western water, with a free seat each.
  const beach=site(fixed,SUMMER_BEACH.x,SUMMER_BEACH.z),beachDynamic=site(moving,SUMMER_BEACH.x,SUMMER_BEACH.z);
  for(const z of [-1.7,1.7]){
    const chair=imported('beach-chair',beach,-.9,0,z,1.08,Math.PI/2);
    if(!chair){const r=site(beach,-.9,z,0);r.rotation.y=Math.PI/2;for(const x of [-.34,.34]){beam(r,V(x,.1,.45),V(x,.85,-.1),.027,m.wood);beam(r,V(x,.1,-.45),V(x,.5,.48),.027,m.wood);}const seat=box(r,.63,.045,.62,m.blue,0,.43,.06,.025);seat.rotation.x=.05;const back=box(r,.63,.75,.045,m.blue,0,.80,-.28,.025);back.rotation.x=-.26;}
  }
  table(beach,1.30,1.40,.68,.95,0);
  const towel=box(beach,.60,.021,.86,m.blue,.81,.693,.03,.012);towel.rotation.y=0;
  for(let n=0;n<4;n++)box(beach,.58,.004,.012,m.pale,.81,.706,.35-n*.035,.002);
  cylinder(beach,.14,.14,.15,m.orange,1.40,.758,-.40);cylinder(beach,.147,.147,.022,m.brass,1.40,.844,-.40);
  const note=sheet(beach,.31,.40,paper('Aami,',['A whole day for us.','','The boat is in the bay.','The other chart sheet','is at the lookout.','','We’ll come back here.','— Shyamu']),.85,.709,.19,-.16);
  const chart0=sheet(beach,.39,.25,chartMaterial(0),.77,.709,-.29,.12);
  target({id:'opening-note',label:'Read Shyamu’s note',panel:'note'},beach,.85,.84,.12,.8,.35,.8,s=>s.caseLocation!=='table');
  target({id:'chart-shore',label:'Take the shoreline chart sheet',action:'take-chart',payload:0},beach,.77,.79,-.29,.58,.18,.43,s=>!s.chartPieces[0]);
  const finalCase=kit.keepsake();beachDynamic.add(finalCase.root);finalCase.root.position.set(.81,.709,.03);finalCase.root.rotation.y=Math.PI/2;
  target({id:'beach-case',label:'Settle in and open the keepsake case',panel:'case'},beach,.81,.92,0,1.15,.5,1.1,s=>s.returnedToShore&&!s.caseOpened);
  target({id:'beach-letter',label:'Read the letter',panel:'letter'},beach,.81,.94,0,1.2,.5,1.2,s=>s.caseOpened);
  const beachUmbrella=imported('umbrella',beach,.9,0,-2.8,3.3);if(beachUmbrella)beachUmbrella.rotation.y=.45;
  sign(-32,4,'THE BAY','Forest path · equipment & jetty →',Math.PI*.1);sign(2,-4,'LOOKOUT','The second chart sheet ↑',Math.PI*.15);
  sign(-3,8,'TWO CHAIRS','← Beach · bay & boat →',Math.PI*.1);
  const lookout=site(fixed,SUMMER_LOOKOUT_TABLE.x,SUMMER_LOOKOUT_TABLE.z);table(lookout,1.15,.68,.77);box(lookout,.70,.13,.45,m.wood,0,.8375,0,.03);const lookSheet=sheet(lookout,.44,.27,chartMaterial(1),0,.905,0,-.09);
  tableSign(lookout,'THE LOOKOUT','A good day takes a little room.',0,1.32,-.25,1.15,.32,.77);
  target({id:'chart-lookout',label:'Take the mooring chart sheet',action:'take-chart',payload:1},lookout,0,.96,0,1.1,.6,.7,s=>!s.chartPieces[1]);

  // Real dock supports enter the authored seabed. The deck exactly follows the walking surface.
  const scannedPlanks=options.templates?.['scanned-pier']?.getObjectByName('modular_wooden_pier_planks');
  if(scannedPlanks){
    scannedPlanks.updateWorldMatrix(true,true);
    scannedPlanks.traverse(part=>{
      if(!(part instanceof THREE.Mesh))return;
      const source=part.geometry.clone().applyMatrix4(part.matrixWorld);source.rotateY(Math.PI/2);source.computeBoundingBox();
      const bounds=source.boundingBox!,size=bounds.getSize(V()),centre=bounds.getCenter(V());
      source.translate(-centre.x,-bounds.max.y,-centre.z);source.scale(2.22/size.x,1,2.10/size.z);
      for(let tile=0;tile<5;tile++){
        const g=kit.own(source.clone()),p=g.getAttribute('position');
        for(let i=0;i<p.count;i++){const x=36+tile*2.22+1.11+p.getX(i),z=-8+p.getZ(i);p.setXYZ(i,x,p.getY(i)+(summerDockHeight(x,z)??.8),z);}
        g.computeVertexNormals();g.computeBoundingSphere();mesh(fixed,g,part.material,0,0,0,'Scanned weathered pier decking');
      }
      source.dispose();
    });
  }
  for(let n=0;n<(scannedPlanks?0:55);n++){
    const x=36.1+n*.20,y=summerDockHeight(x,-8)!;
    box(fixed,.191,.12,2.1,m.wood,x,y-.06,-8,.006);
    for(const z of [-8.84,-7.16]){const nail=cylinder(fixed,.008,.008,.005,m.metal,x,y+.002,z,'Deck screw',6);nail.rotation.y=.3;}
  }
  for(const x of [38,42,46])for(const z of [-9.25,-6.75]){
    const bottom=summerGroundHeight(x,z)-.2;cylinder(fixed,.13,.16,1.1-bottom,m.wood,x,(bottom+1.1)*.5,z,'Grounded dock piling');cylinder(fixed,.145,.145,.045,m.pale,x,1.10,z);
  }
  for(const z of [-8.8,-7.2])box(fixed,10.9,.18,.14,m.wood,41.55,.49,z,.008);
  // The fuel landing is joined edge-to-edge to the jetty and supported all the way to the bed.
  const fuelBay=new THREE.Group();fuelBay.name='Supported fuel landing';fixed.add(fuelBay);
  for(let n=0;n<12;n++)box(fuelBay,.196,.12,SUMMER_FUEL_BAY.depth,m.wood,42.9+n*.2,.74,SUMMER_FUEL_BAY.z,.006);
  for(const x of [43,45]){
    box(fuelBay,.14,.18,2.5,m.wood,x,.59,SUMMER_FUEL_BAY.z,.008);
    for(const z of [-11.35,-9.25]){const bottom=summerGroundHeight(x,z)-.2;cylinder(fuelBay,.13,.16,.68-bottom,m.wood,x,(bottom+.68)/2,z,'Grounded fuel landing piling');}
  }
  for(const z of [-11.48,-9.12])box(fuelBay,2.4,.18,.14,m.wood,44,.49,z,.008);
  for(const x of [40,46]){cylinder(fixed,.035,.045,.10,m.metal,x,.85,-8.80);box(fixed,.28,.04,.065,m.metal,x,.93,-8.80,.013);}
  // The ramp is visibly continuous from the 1m shelter floor to the .8m jetty.
  const shelter=site(fixed,32,-8,SUMMER_SHELTER_FLOOR.level),shelterMoving=site(moving,32,-8,SUMMER_SHELTER_FLOOR.level);
  for(let n=0;n<42;n++)box(shelter,.195,.12,SUMMER_SHELTER_FLOOR.depth,m.wood,-4.1+n*.2,-.06,0,.004,'Shelter floor board');
  for(const x of [-4,4])for(const z of [-3,3]){
    box(shelter,.20,2.8,.20,m.wood,x,1.4,z,.015);box(shelter,.26,.12,.26,m.metal,x,.05,z,.013);
    beam(shelter,V(x,2.54,z),V(x+(x<0?.65:-.65),1.97,z),.052,m.wood);
  }
  for(const z of [-3,3])box(shelter,8.35,.18,.16,m.wood,0,2.65,z,.01);
  for(const y of [1.60,2.17])box(shelter,8,.10,.10,m.wood,0,y,-2.75,.008,'Sign mounting rail');
  for(let n=0;n<29;n++){const x=-4.25+n*.30,roof=box(shelter,.292,.065,6.65,m.wood,x,2.80-Math.abs(x)*.10,0,.005);roof.rotation.z=x<0?.10:-.10;}
  for(const x of [-3,0,3]){beam(shelter,V(x,2.55,-3),V(x,2.55,3),.048,m.wood);}
  table(shelter,2.45,1.05,.83,0,-1.7);sheet(shelter,1.28,.75,chartMaterial(),0,.837,-1.7);
  plaque(shelter,'A DAY WITH TIME FOR US','Prepare here · follow the marked bay',0,1.68,-2.65,2.4,.54);
  target({id:'chart-table',label:'Join the two chart sheets',panel:'chart'},shelter,0,.97,-1.7,2.3,.6,1.1);
  // A labelled mannequin has the complete suit and the connected equipment assembly.
  const mannequin=kit.scuba();shelterMoving.add(mannequin.root);mannequin.fins.forEach(f=>f.visible=false);mannequin.root.rotation.y=.20;
  mannequin.root.updateWorldMatrix(true,true);const suitBottom=new THREE.Box3().setFromObject(mannequin.root).min.y;
  mannequin.root.position.set(-2.2,.0675-suitBottom,-1.5);
  cylinder(shelter,.28,.32,.065,m.black,-2.2,.035,-1.5);cylinder(shelter,.024,.024,1.55,m.metal,-2.2,.81,-1.2);
  plaque(shelter,'WETSUIT + SCUBA','Suit · BCD · cylinder · regulator',-2.2,2.17,-2.65,1.80,.37);
  target({id:'gear-rack',label:'Wear and inspect the scuba equipment',panel:'gear'},shelter,-2.2,1.0,-1.5,1.45,2.1,1.25);
  table(shelter,1.55,.90,.73,2.2,-1.65);plaque(shelter,'BOAT CHECKLIST','Two seats. Everything in its place.',2.2,1.60,-2.65,1.68,.4);
  const shelfGear=accessoryTray(shelterMoving,2.2,.735,-1.65,1.2);
  target({id:'prep-shelter',label:'Check the boat preparation',panel:'preparation'},shelter,2.2,.95,-1.65,1.65,.8,1.05);
  sign(34,-4.1,'JETTY →','Fuel shelf · boat · mooring',-.10);
  const fuelShelf=site(fixed,SUMMER_FUEL_BAY.x,SUMMER_FUEL_BAY.tableZ,.8),fuelMoving=site(moving,SUMMER_FUEL_BAY.x,SUMMER_FUEL_BAY.tableZ,.8);table(fuelShelf,1.15,.65,.70);tableSign(fuelShelf,'FUEL CAN','Return here after filling',0,1.12,-.27,1.05,.30,.70);
  box(fuelShelf,.47,.035,.35,m.black,0,.720,0,.012);
  const fuelCan=kit.fuelCan();fuelMoving.add(fuelCan);fuelCan.position.y=.708;
  target({id:'fuel-shelf',label:'Prepare the boat’s fuel assembly',panel:'preparation'},fuelShelf,0,.95,0,1.15,.75,.8);

  const boat=kit.createBoat();moving.add(boat.root);
  const refillTank=new THREE.Group();refillTank.name='Secured deck air refill tank';refillTank.position.set(-.57,.18,-1.08);boat.root.add(refillTank);
  cylinder(refillTank,.145,.145,.66,m.metal,0,.36,0);mesh(refillTank,kit.own(new THREE.SphereGeometry(.145,12,8)),m.metal,0,.69,0).scale.y=.55;
  cylinder(refillTank,.035,.035,.12,m.brass,0,.80,0);ring(refillTank,.07,.012,m.blue,0,.88,0).rotation.x=Math.PI/2;
  box(refillTank,.34,.045,.34,m.black,0,.025,0,.012);box(refillTank,.05,.68,.10,m.metal,-.18,.34,0,.008);
  for(const height of [.22,.56])ring(refillTank,.15,.018,m.black,0,height,0).rotation.x=Math.PI/2;
  tube(refillTank,[V(.08,.78,0),V(.25,.65,.04),V(.24,.30,.14),V(.16,.11,.17),V(.03,.20,.17)],.014,m.black,'Coiled air transfer hose',20);
  cylinder(refillTank,.065,.065,.025,m.brass,.10,.72,.10).rotation.x=Math.PI/2;
  plaque(refillTank,'AIR','REFILL',0,.48,.16,.20,.16);
  target({id:'air-refill',label:'Refill air at the secured deck tank',action:'refill-air'},refillTank,0,.45,0,.46,.95,.46,s=>['boarding','mooring','gearing','climbing','docking'].includes(s.mode)&&!s.engineRunning,2.5);
  const boatGear=accessoryTray(boat.root,0,.30,-1.66,.85);
  const boatCan=kit.fuelCan();boat.root.add(boatCan);boatCan.position.set(-.43,.57,1.73);
  const spout=tube(boat.root,[V(-.52,.88,1.75),V(-.48,.76,1.75),V(-.43,.57,1.75)],.019,m.black,'Fitted fuel spout',16);
  const stream=cylinder(boat.root,.011,.011,.24,m.orange,-.43,.58,1.75,'Brief fuel stream',8);
  const looseHose=tube(boat.root,[V(-.50,.48,1.75),V(-.74,.21,2.15),V(-.36,.20,2.28)],.018,m.black,'Unconnected labelled supply hose');
  plaque(boat.root,'FUEL → ENGINE','Matching socket',-.40,.48,2.02,.55,.17);
  target({id:'boat-console',label:'Board or inspect the boat',panel:'boat'},boat.root,0,.70,.15,2.8,1.5,5.6,()=>true,5.8);
  target({id:'boat-ladder',label:'Climb the stern ladder',action:'climb-ladder'},boat.root,.73,-.35,2.90,1.0,2.1,1.4,s=>s.mode==='swimming',3.1);
  const boatCase=kit.keepsake();boat.root.add(boatCase.root);boatCase.root.position.set(0,.232,-1.67);boatCase.root.scale.setScalar(.85);
  const boatLine=tube(moving,[V(49,.68,-10.25),V(47.2,.40,-10),V(46,.93,-8.8)],.018,m.rope,'Boat shore line',24);
  const descent=SUMMER_DESCENT_LINE,anchorY=summerGroundHeight(descent.x,descent.z);
  const diveLine=tube(water,[V(descent.x,.04,descent.z),V(descent.x,-3,descent.z),V(descent.x,anchorY+.24,descent.z)],.024,m.rope,'Descent line',30);
  cylinder(water,.42,.55,.15,m.metal,descent.x,anchorY+.08,descent.z);ring(water,.13,.018,m.brass,descent.x,anchorY+.24,descent.z).rotation.x=Math.PI/2;
  const mooringLine=tube(moving,[V(103.77,.72,-24),V(102.8,.18,-22.1),V(SUMMER_DIVE_BUOY.x,.05,SUMMER_DIVE_BUOY.z)],.018,m.rope,'Attached dive mooring line',20);
  const buoys:THREE.Group[]=[];
  for(const [x,z,text,stripes]of [[72,-15,'OUTER BUOY',2],[SUMMER_DIVE_BUOY.x,SUMMER_DIVE_BUOY.z,'DIVE MOORING',3]] as const){
    const buoy=site(moving,x,z,0);buoys.push(buoy);cylinder(buoy,.30,.37,.68,m.pale,0,.16,0);cylinder(buoy,.20,.30,.20,m.orange,0,.60,0);cylinder(buoy,.025,.025,1.4,m.metal,0,1.0,0);for(let i=0;i<stripes;i++)cylinder(buoy,.307,.307,.045,m.blue,0,.10+i*.14,0);plaque(buoy,text,stripes+' stripes',0,1.37,0,1.3,.38);
    const bottom=summerGroundHeight(x,z);tube(water,[V(x,0,z),V(x+.12,bottom*.5,z),V(x,bottom,z)],.014,m.rope,'Buoy anchor line');
  }
  target({id:'dive-mooring',label:'Moor at the dive buoy',panel:'mooring'},buoys[1],0,.5,0,3,2.0,3,()=>true,8.5);

  const wreck=createSummerShipwreck(kit,water);
  const corals=createSummerCorals({compact:options.compact,templates:options.templates,surfaces:options.surfaces});water.add(corals.group);
  // Canonical close silhouettes: these exact three authored forms answer the numbered frames.
  SUMMER_OBSERVATIONS.forEach((clue,i)=>{
    const {x,z}=clue.position,bed=summerGroundHeight(x,z),coralRoot=site(water,x,z,bed-.02),sourceIndex=clue.shape==='FAN'?1:clue.shape==='BRANCH'?0:2;
    const coral=mesh(coralRoot,corals.sources[sourceIndex],corals.materials[sourceIndex]);coral.scale.setScalar(clue.shape==='MOUND'?1.55:1.4);coralRoot.rotation.y=i===0?-.3:i===1?.4:0;
    const frame=site(water,x,z);const frameHeight=clue.shape==='MOUND'?.55:1.0;
    const foundation=imported('boulder',coralRoot,0,-.18,0,1.5);if(foundation){foundation.scale.y*=.35;rockRoots.push(foundation);}
    target({id:'frame-'+clue.number,label:'Observe the '+clue.shape.toLowerCase()+' coral · reef stop '+clue.number,panel:('frame-'+clue.number) as SummerPanel},frame,0,frameHeight,0,1.1,1.3,1.1,()=>true,3.3);
  });

  function station(x:number,z:number,title:string,subtitle:string,w=1.7,h=.7){
    const root=site(water,x,z);root.name=title;
    for(const side of [-1,1])box(root,.12,.14,.9,m.wood,side*.44,.07,0,.014);
    void subtitle;void w;void h;return root;
  }
  // All machinery stands in sand; none is attached to living coral.
  const observation=station(126,-36.3,'Recovered ship’s specimen chest','',1.9,.64);
  box(observation,1.22,.08,.54,m.metal,0,.075,0,.012,'Locker support shelf');
  const obsMoving=site(moving,126,-36.3),discs:THREE.Group[]=[];
  for(let i=0;i<3;i++){
    const pivot=new THREE.Group();pivot.position.set((i-1)*.48,.32,.365);obsMoving.add(pivot);discs.push(pivot);
    cylinder(pivot,.19,.19,.055,m.brass).rotation.x=Math.PI/2;const mat=printed(256,256,c=>{c.font='25px Arial';c.textAlign='center';SUMMER_SHAPES.forEach((shape,j)=>{c.save();c.translate(128,128);c.rotate(j*Math.PI/2);c.strokeStyle='#3a4b45';c.lineWidth=3;c.translate(-40,-115);c.scale(.75,.75);c.stroke(new Path2D(SUMMER_SILHOUETTES[shape]));c.restore();});});const face=mesh(pivot,kit.own(new THREE.CircleGeometry(.18,32)),mat,0,0,.032);face.rotation.z=0;box(obsMoving,.025,.07,.04,m.black,(i-1)*.48,.55,.38,.004);
  }
  const obsLid=new THREE.Group();obsMoving.add(obsLid);obsLid.position.set(0,.60,-.28);box(obsMoving,1.50,.50,.66,patina,0,.32,0,.035);box(obsLid,1.50,.055,.66,m.brass,0,0,.28,.025);const firstPlate=box(obsMoving,.25,.018,.25,m.brass,-.23,.45,0,.012);const handle=box(obsMoving,.23,.04,.04,m.metal,.27,.44,.03,.013);
  target({id:'observation',label:'Set the observation locker discs',panel:'observation'},observation,0,.88,0,2,1.3,1.3);

  function bottle(parent:THREE.Object3D,x:number,y:number,z:number){
    const root=new THREE.Group();root.name='Corked glass bottle with a dry rolled note';root.position.set(x,y,z);root.rotation.z=.28;parent.add(root);
    const glass=kit.material({color:0x86c1b2,roughness:.12,metalness:.12,transparent:true,opacity:.30,depthWrite:false,side:THREE.DoubleSide});
    cylinder(root,.105,.105,.38,glass,0,.22,0);mesh(root,kit.own(new THREE.SphereGeometry(.105,12,8)),glass,0,.41,0).scale.y=.65;cylinder(root,.04,.06,.15,glass,0,.51,0);cylinder(root,.038,.038,.055,m.wood,0,.59,0);
    const roll=cylinder(root,.052,.052,.29,m.paper,0,.23,0);roll.rotation.z=.07;ring(root,.108,.009,m.rope,0,.25,0).rotation.x=Math.PI/2;
    return root;
  }
  const firstBottle=site(water,107,-24);box(firstBottle,.55,.17,1.1,m.wood,0,.06,0,.02);bottle(firstBottle,0,.13,0);
  tube(firstBottle,[V(0,.38,0),V(.28,.13,.15),V(.24,.12,.40)],.009,m.rope,'Bottle tether on grounded timber',12);
  target({id:'training-1',label:'Inspect the message inside the sealed bottle',panel:'bottle'},firstBottle,0,.50,0,.85,1.1,.85,()=>true,3.5);
  for(let i=1;i<3;i++){
    const root=site(water,107+i*3.5,-24-i*1.2);const shell=imported('shell',root,0,.02,0,.32,i);
    if(!shell)mesh(root,kit.own(new THREE.SphereGeometry(.15,10,6)),m.pale,0,.09,0).scale.y=.6;
    target({id:'training-'+(i+1),label:i===1?'Practice ascent beside the sand channel':'Follow the reef garden towards the wreck',action:'training-post',payload:i+1},root,0,.50,0,.9,1.2,.9,()=>true,3.4);
  }
  const routeBoard=station(150,-16,'Captain’s watertight chart tube','',2.1,.86);
  cylinder(routeBoard,.13,.13,.75,patina,0,.24,0).rotation.z=Math.PI/2;
  for(const side of [-1,1])cylinder(routeBoard,.15,.15,.06,m.brass,side*.39,.24,0).rotation.z=Math.PI/2;
  const routeMoving=site(moving,150,-16),boardHinge=new THREE.Group();routeMoving.add(boardHinge);boardHinge.position.set(.39,.24,0);cylinder(boardHinge,.15,.15,.065,m.brass).rotation.z=Math.PI/2;
  target({id:'current',label:'Inspect the captain’s sealed chart tube',panel:'current'},routeBoard,0,.55,0,1.2,1.1,1.0);
  const ribbons:THREE.Group[]=[];
  const rest=station(157,-17,'Anchor-side salvaged chest','',1.9,.58),restMoving=site(moving,157,-17);
  bottle(rest,.65,.04,-.20);
  box(rest,1.03,.08,.50,m.metal,0,.015,0,.012,'Locker support shelf');
  const restLid=new THREE.Group();restMoving.add(restLid);restLid.position.set(0,.45,-.20);box(restMoving,.95,.35,.45,m.black,0,.23,0,.03);box(restLid,.95,.04,.45,m.brass,0,0,.20,.015);const secondPlate=box(restMoving,.25,.018,.25,m.brass,0,.43,0,.012);
  target({id:'rest',label:'Open the sheltered rest locker',panel:'rest'},rest,0,.7,0,1.9,1.4,1.3);

  const winch=site(water,173,-28),winchMoving=site(moving,173,-28);
  box(winch,2.45,.13,1.45,m.metal,0,.065,0,.02);for(const x of [-.98,.98])for(const z of [-.54,.54])cylinder(winch,.10,.13,.18,m.brass,x,.03,z);
  for(const x of [-.95,.95]){box(winch,.12,2.4,.14,m.metal,x,1.27,0,.015);beam(winch,V(x,.2,.53),V(x,1.6,0),.048,m.metal);}box(winch,2.1,.13,.14,m.metal,0,2.45,0,.018);
  const carriage=new THREE.Group();winchMoving.add(carriage);box(carriage,1.0,.13,.70,m.pale,0,.23,0,.025);for(const x of [-.43,.43])box(carriage,.04,.40,.06,m.metal,x,.45,0,.012);
  const pulleys:THREE.Group[]=[];
  for(const [x,y]of [[-.95,2.3],[0,.65],[.95,2.3]]){const p=new THREE.Group();p.position.set(x,y,.10);winchMoving.add(p);cylinder(p,.14,.14,.06,m.brass).rotation.x=Math.PI/2;ring(p,.12,.012,m.black,0,0,.045);for(let n=0;n<4;n++){const spoke=box(p,.20,.014,.02,m.metal,0,0,.05,.003);spoke.rotation.z=n*Math.PI/4;}pulleys.push(p);}
  const drum=new THREE.Group();drum.position.set(.79,.55,.30);winchMoving.add(drum);cylinder(drum,.24,.24,.32,m.metal).rotation.x=Math.PI/2;for(const z of [-.18,.18])cylinder(drum,.29,.29,.035,m.brass,0,0,z).rotation.x=Math.PI/2;for(let n=0;n<10;n++)ring(drum,.245,.012,m.rope,0,0,-.14+n*.03);
  const crank=new THREE.Group();crank.position.set(.79,.55,.61);winchMoving.add(crank);beam(crank,V(),V(.28,0,0),.021,m.metal);cylinder(crank,.035,.035,.15,m.black,.28,0,.06).rotation.x=Math.PI/2;
  const cable=tube(winchMoving,[V(-.95,2.3,.1),V(-.12,.5,.1),V(.12,.5,.1),V(.95,2.3,.1),V(.79,.55,.3)],.016,m.rope,'Routed working cable',36);
  const cablePreview=tube(winch,[V(-.95,2.3,.1),V(-.80,.3,.2),V(-.25,.25,.3)],.016,m.rope,'Loose cable for routing',20);
  const catchLever=new THREE.Group();catchLever.position.set(-.8,.40,.55);winchMoving.add(catchLever);beam(catchLever,V(),V(0,.29,0),.026,m.brass);box(catchLever,.11,.05,.04,m.black,0,.30,0,.018);
  const lockPin=cylinder(winchMoving,.024,.024,.34,m.brass,-.97,1.45,.20);lockPin.rotation.z=Math.PI/2;
  const gauge=site(winchMoving,-1.38,.20,.95);cylinder(gauge,.18,.18,.045,m.brass).rotation.x=Math.PI/2;mesh(gauge,kit.own(new THREE.CircleGeometry(.16,32)),label('LOAD','SUPPORTED',256,256),0,0,.029);const tensionNeedle=box(gauge,.015,.13,.015,m.red,0,.055,.05,.003);
  for(const side of [-1,1])beam(winch,V(side*1.10,0,-.60),V(side*1.10,.30,.60),.07,m.wood,'Windlass bolted to remaining cargo floor');
  const thirdPlate=box(carriage,.25,.018,.25,m.brass,0,.315,0,.012);
  target({id:'cable',label:'Route and operate the load-transfer winch',panel:'cable'},winch,0,1.2,.20,3.4,2.8,2.4,()=>true,4.0);

  const keeper=station(181,-28,'Keepsake strapped into the ship’s cargo cradle','',2.1,.55),keeperMoving=site(moving,181,-28);
  box(keeper,1.36,.13,.80,m.metal,0,.065,0,.015,'Grounded case plinth');
  box(keeper,1.28,.24,.72,m.black,0,.25,0,.04);for(const x of [-.55,.55])box(keeper,.055,.52,.05,m.metal,x,.45,.28,.008);
  const keeperBar=box(keeperMoving,1.20,.045,.06,m.brass,0,.62,.25,.013);
  const cassette=site(keeperMoving,0,.25,.90),cassetteTiles:THREE.Group[]=[];
  for(let i=0;i<3;i++){
    box(cassette,.48,.49,.07,m.black,(i-1)*.52,0,0,.02);const tile=new THREE.Group();tile.position.set((i-1)*.52,0,.053);cassette.add(tile);cassetteTiles.push(tile);box(tile,.42,.42,.025,m.brass,0,0,0,.015);
    const id=(['P1','P2','P3'] as const)[i],data=SUMMER_PLATES[id];const mat=printed(256,256,c=>{c.font='22px Arial';c.textAlign='center';c.fillText(data.name,128,38);c.fillText('N ↑',128,225);c.lineWidth=8;c.beginPath();data.path.forEach(([x,y],j)=>j?c.lineTo(20+x*216,58+y*110):c.moveTo(20+x*216,58+y*110));c.stroke();});mesh(tile,kit.own(new THREE.PlaneGeometry(.39,.39)),mat,0,0,.016);
  }
  const keeperCase=kit.keepsake();keeperMoving.add(keeperCase.root);keeperCase.root.position.set(0,.39,0);
  target({id:'cassette',label:'Assemble the three route plates',panel:'cassette'},keeper,0,1.0,.18,2.5,1.7,1.5,()=>true,3.7);
  target({id:'recover-case',label:'Secure the sealed keepsake case',action:'recover-case'},keeper,0,.57,0,1.2,.7,1.1,s=>s.cassetteReleased&&!s.caseRecovered,3.3);

  // Canyon walls are the same separated solids used by navigation, with clear open tops.
  for(const collider of summerWorldColliders.filter(c=>c.id.startsWith('canyon-'))){
    const r=site(water,collider.x,collider.z,collider.minY);const sx=(collider.halfX??1)*2,sz=(collider.halfZ??1)*2,height=collider.maxY-collider.minY;
    rockRoots.push(r);
    const stone=imported('boulder',r,0,-.10,0,Math.max(sx,sz));if(stone){const bounds=new THREE.Box3().setFromObject(stone),size=bounds.getSize(V());stone.scale.multiply(V(sx/Math.max(.1,size.x),height/Math.max(.1,size.y),sz/Math.max(.1,size.z)));}else{const g=kit.own(new THREE.IcosahedronGeometry(1,2));const wall=mesh(r,g,rock,0,height*.43,0);wall.scale.set(sx*.50,height*.57,sz*.50);}
  }
  for(const collider of summerWorldColliders.filter(c=>c.id.startsWith('reef-'))){
    const r=site(water,collider.x,collider.z,collider.minY),height=collider.maxY-collider.minY,radius=collider.radius??1;
    rockRoots.push(r);
    const stone=imported('boulder',r,0,-.10,0,radius*2.0,random(collider.x)*Math.PI*2);if(stone){const bounds=new THREE.Box3().setFromObject(stone),h=bounds.max.y-bounds.min.y;stone.scale.y*=height/Math.max(.1,h);}else{const b=mesh(r,kit.own(new THREE.IcosahedronGeometry(1,2)),sandStone,0,height*.4,0);b.scale.set(radius,height*.55,radius);}
    const coral=mesh(r,corals.sources[Math.floor(random(collider.x+7)*8)],corals.materials[Math.floor(random(collider.x+7)*8)],0,height*.88,0);coral.scale.setScalar(.8);
  }
  // Small shell deposits follow the seabed; rooted vegetation belongs to the habitat batches.
  for(let i=0;i<(options.compact?28:52);i++){
    const x=100+random(i*9+3)*102,z=-58+random(i*9+4)*50;
    imported('shell',water,x,summerGroundHeight(x,z)+.015,z,.09+random(i+4)*.12,random(i)*6.28);
  }
  // A soft finite caustic projection is anchored to the seabed, rather than an all-world alpha sheet.
  const causticTime={value:0};
  for(const material of [rock,sandStone,patina,...corals.materials]){
    const previous=material.onBeforeCompile;material.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);shader.uniforms.summerCausticTime=causticTime;shader.vertexShader='varying vec3 summerCausticP;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 reefWorld=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nreefWorld=instanceMatrix*reefWorld;\n#endif\nsummerCausticP=(modelMatrix*reefWorld).xyz;');shader.fragmentShader='varying vec3 summerCausticP; uniform float summerCausticTime;\n'+shader.fragmentShader.replace('#include <dithering_fragment>',`float softLight=.5+.5*sin(summerCausticP.x*.42+sin(summerCausticP.z*.36+summerCausticTime*.12));gl_FragColor.rgb+=softLight*.009*step(summerCausticP.y,-.35);\n#include <dithering_fragment>`);};
  }
  const wildlife=createSummerWildlife({compact:options.compact,camera:options.camera,boatPose:options.boatPose,templates:options.templates});water.add(wildlife.group);
  const marine=createSummerMarine(kit,options.compact);water.add(marine.group);

  // A real suit follows the player; looking down shows sleeves, gloves, legs and fitted fins.
  const player=kit.scuba();moving.add(player.root);player.root.name='Aami · equipped first-person body';
  const harnessCase=kit.keepsake();player.root.add(harnessCase.root);harnessCase.root.position.set(.31,.62,.14);harnessCase.root.scale.setScalar(.57);harnessCase.root.rotation.z=-.1;
  let underwater=false,lastTime=0,pourStart=-100,lastFuel=false,lastCrank=0,lastHullYaw=options.boatPose().yaw;
  let lastAnchor=options.getState().boatAnchor,alignment:{from:SummerPose;elapsed:number}|null=null;
  const ray=new THREE.Raycaster(),screen=new THREE.Vector2(),centre=V(),direction=V(),worldPosition=V();
  // Keep click proxies separate while merging thousands of static timber/metal parts by material.
  kit.mergeStatic(fixed,new Set([...proxies,note,chart0,lookSheet]));
  // Water contains instanced coral and borrowed rock geometry. Preserve those batches and wildlife.
  kit.mergeStatic(water,new Set([corals.group,wildlife.group,marine.group,...rockRoots,...proxies]));

  function update(time:number,dt:number){
    lastTime=time;const s=options.getState(),blend=1-Math.exp(-Math.min(.1,Math.max(0,dt))*7),pose=options.boatPose(),reduced=s.preferences.reducedMotion;
    if(s.boatAnchor!==lastAnchor){alignment={from:{x:boat.root.position.x,y:pose.y,z:boat.root.position.z,yaw:boat.root.rotation.y},elapsed:0};lastAnchor=s.boatAnchor;}
    let displayPose=pose;
    if(alignment){alignment.elapsed+=dt;const u=Math.min(1,alignment.elapsed/(reduced?.3:1.2)),t=u*u*(3-2*u),from=alignment.from,angle=Math.atan2(Math.sin(pose.yaw-from.yaw),Math.cos(pose.yaw-from.yaw));displayPose={x:THREE.MathUtils.lerp(from.x,pose.x,t),y:pose.y,z:THREE.MathUtils.lerp(from.z,pose.z,t),yaw:from.yaw+angle*t};if(u===1)alignment=null;}
    boat.root.position.set(displayPose.x,displayPose.y+(reduced?0:Math.sin(time*1.2)*.022),displayPose.z);boat.root.rotation.set(reduced?0:Math.sin(time*.8)*.008,displayPose.yaw,reduced?0:Math.sin(time*.95)*.014);
    boat.bag.position.lerp(s.bagStowed?V(0,.355,-.48):V(.43,.81,.64),blend);boat.bag.rotation.x+=((s.bagStowed?Math.PI/2:0)-boat.bag.rotation.x)*blend;
    boat.cap.position.y+=((s.capOpen&&!s.capReplaced?.49:.35)-boat.cap.position.y)*blend;boat.cap.rotation.y+=((s.capOpen&&!s.capReplaced?2.6:0)-boat.cap.rotation.y)*blend;
    boat.hose.visible=s.hoseConnected;looseHose.visible=!s.hoseConnected;boat.needle.rotation.z+=((s.fuelPoured?-1.0:1.05)-boat.needle.rotation.z)*blend;
    boat.ladder.rotation.x+=((s.ladderDown?0:-Math.PI*.77)-boat.ladder.rotation.x)*blend;
    const steer=dt>0&&!alignment?THREE.MathUtils.clamp(Math.atan2(Math.sin(pose.yaw-lastHullYaw),Math.cos(pose.yaw-lastHullYaw))/(dt*.58),-1,1):0;lastHullYaw=pose.yaw;
    boat.steering.rotation.z+=(-steer*.85-boat.steering.rotation.z)*blend;boat.engine.rotation.y+=(-steer*.36-boat.engine.rotation.y)*blend;
    boat.propeller.rotation.z+=s.engineRunning&&!reduced?dt*19:0;
    if(s.fuelPoured&&!lastFuel)pourStart=time;lastFuel=s.fuelPoured;const pouring=time-pourStart<1.35;
    fuelCan.visible=!s.fuelCanTaken||s.fuelCanReturned;boatCan.visible=s.fuelCanTaken&&!s.fuelCanReturned;boatCan.rotation.z=pouring?-.95:0;boatCan.position.set(pouring?-.43:.43,pouring?.57:.144,pouring?1.73:1.80);spout.visible=s.spoutFitted&&!s.capReplaced;stream.visible=pouring;
    boatGear.visible=s.gearOnboard&&!s.maskFitted;boatCase.root.visible=s.caseRecovered&&s.caseLocation==='boat';
    boatLine.visible=s.boatAnchor==='berth'&&!s.engineRunning&&Math.hypot(pose.x-49,pose.z+8)<1;mooringLine.visible=s.boatAnchor==='mooring'&&!s.engineRunning&&Math.hypot(pose.x-106,pose.z+24)<1;
    buoys.forEach((b,i)=>{b.position.y=reduced?0:Math.sin(time*1.1+i)*.045;b.rotation.z=reduced?0:Math.sin(time*.7+i)*.025;});
    mannequin.root.visible=!s.wetsuitWorn||s.gearRemoved;mannequin.bcd.visible=!s.bcdEquipped||s.gearRemoved;shelfGear.visible=!s.gearOnboard;
    note.visible=s.caseLocation!=='table';chart0.visible=!s.chartPieces[0];lookSheet.visible=!s.chartPieces[1];
    discs.forEach((d,i)=>{const angle=-SUMMER_SHAPES.indexOf(s.observationDiscs[i])*Math.PI/2;d.rotation.z+=(angle-d.rotation.z)*blend;});
    obsLid.rotation.x+=((s.observationSolved?-1.60:0)-obsLid.rotation.x)*blend;firstPlate.visible=!s.plates.includes('P1');handle.visible=!s.handleTaken;
    boardHinge.rotation.y+=((s.routeBoardOpen?-Math.PI*.93:0)-boardHinge.rotation.y)*blend;
    restLid.rotation.x+=((s.restReached?-1.6:0)-restLid.rotation.x)*blend;secondPlate.visible=!s.plates.includes('P2');
    const lift=s.carriageRaised?1.10:s.cableSupported?.22:0;carriage.position.y+=(lift-carriage.position.y)*blend;pulleys[1].position.y=.65+carriage.position.y;
    const turning=s.crankSeconds>lastCrank+.001;if(turning){crank.rotation.z-=dt*4;drum.rotation.z-=dt*3;pulleys.forEach(p=>p.rotation.z-=dt*3);}lastCrank=s.crankSeconds;
    cable.visible=s.cableRouted;cablePreview.visible=!s.cableRouted;catchLever.rotation.z+=((s.catchReleased?-1.3:0)-catchLever.rotation.z)*blend;lockPin.position.x+=((s.carriagePinned?-.80:-1.07)-lockPin.position.x)*blend;tensionNeedle.rotation.z+=((-s.tension*1.65+.8)-tensionNeedle.rotation.z)*blend;thirdPlate.visible=!s.plates.includes('P3');
    keeperBar.position.y+=((s.cassetteReleased?.88:.62)-keeperBar.position.y)*blend;keeperCase.root.visible=!s.caseRecovered;
    cassetteTiles.forEach((tile,i)=>{const placement=s.cassetteTiles[i];tile.visible=!!placement;tile.rotation.z=-(placement?.turn??0)*Math.PI/2;});
    finalCase.root.visible=s.caseLocation==='table';finalCase.lid.rotation.x+=((s.caseOpened?-1.72:0)-finalCase.lid.rotation.x)*blend;finalCase.contents.visible=s.caseOpened;finalCase.latches.forEach((l,i)=>l.rotation.x+=((s.caseLatches[i]?-1.1:0)-l.rotation.x)*blend);
    keeperCase.contents.visible=false;boatCase.contents.visible=false;harnessCase.contents.visible=false;harnessCase.root.visible=s.caseLocation==='harness';
    player.root.visible=s.wetsuitWorn&&!s.gearRemoved;player.root.position.copy(options.camera.position).add(V(0,-1.68,0));player.root.rotation.y=options.camera.rotation.y;player.bcd.visible=s.bcdEquipped;player.mask.visible=s.maskFitted;player.fins.forEach((f,i)=>{f.visible=s.finsFitted;f.rotation.x=underwater&&!reduced?Math.sin(time*2.8+i*Math.PI)*.20:0;});player.legs.forEach((l,i)=>l.rotation.x=underwater&&!reduced?Math.sin(time*2.8+i*Math.PI)*.10:0);player.arms.forEach((a,i)=>{a.rotation.x=.42;a.rotation.z=(i===0?1:-1)*.12;});player.updatePose(time,underwater,reduced,true);
    water.visible=underwater;fixed.visible=!underwater;
    ribbons.forEach((r,i)=>r.rotation.y=reduced?0:Math.sin(time*.9+i)*.07);causticTime.value=reduced?0:time;
    if(underwater){wildlife.update(time,dt,reduced);marine.update(time,reduced,options.camera);corals.update(options.camera);}
  }
  function pick(camera:THREE.Camera=options.camera,raycaster?:THREE.Raycaster):SummerWorldTarget|null{
    const state=options.getState();group.updateMatrixWorld(true);camera.updateMatrixWorld();const caster=raycaster??ray;if(!raycaster)caster.setFromCamera(screen,camera);camera.getWorldDirection(direction);
    let best:{entry:typeof targets[number];distance:number;score:number;point:THREE.Vector3}|null=null;
    for(const entry of targets){
      if(!entry.available(state))continue;entry.proxy.getWorldPosition(centre);const distance=centre.distanceTo(camera.position);if(distance>entry.range)continue;
      worldPosition.copy(centre).sub(camera.position).normalize();const facing=worldPosition.dot(direction),hit=caster.intersectObject(entry.proxy,false)[0];if(!hit&&facing<.85)continue;
      const score=(hit?2:0)+facing-distance*.06;if(!best||score>best.score)best={entry,distance,score,point:centre.clone()};
    }
    if(!best)return null;return {...best.entry.data,point:best.point,distance:best.distance};
  }
  update(0,.016);
  return {group,contacts,target:pick,update,setUnderwater(value:boolean){underwater=value;},stats(){return {...kit.stats(),...wildlife.stats,...corals.stats,...marine.stats,wreck:!!wreck.parent,interactions:targets.length,time:lastTime};},dispose(){wildlife.dispose();corals.dispose();marine.dispose();instances.forEach(i=>i.dispose());textures.forEach(t=>t.dispose());proxyMaterial.dispose();kit.dispose();group.clear();}};
}
export type SummerWorld=ReturnType<typeof createSummerWorld>;
