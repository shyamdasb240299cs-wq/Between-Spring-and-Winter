import * as THREE from 'three';
import {SPRING_LAKE_BENCH} from './spring-treasure-layout';
import {springBridgeHeight} from './season-layout';
import {SPRING_JOURNEY_NOTE,type SpringSave} from './spring-treasure-state';

/** All five scraps share one sheet's UVs. The tears meet when it is reassembled. */
export const SPRING_PAPER_TEXT='You are my aiteall.';
export const SPRING_BRIDGE_NOTE={x:17.3,z:-11.05,y:(springBridgeHeight(17.3,-12)??.65)+.95};
export const SPRING_PAPER_HIDING_PLACES=[
  {x:15.6,z:-8,y:.085,yaw:.48,name:'Beneath the riverside stone'},
  {x:15,z:-23.6,y:.045,yaw:-.61,name:'In the roots by the river bend'},
  {x:15.5,z:-1.8,y:.11,yaw:1.24,name:'Under the downstream driftwood'},
  {x:28,z:-19.5,y:.065,yaw:-1.12,name:'Behind the fallen branch'},
  {x:28.3,z:-7,y:.10,yaw:.26,name:'Between the east-bank stones'},
] as const;
const tears=[[[0,0],[.21,0],[.18,.22],[.24,.43],[.16,.63],[.23,.82],[.20,1],[0,1]],[[.21,0],[.43,0],[.39,.18],[.45,.35],[.38,.58],[.44,.79],[.40,1],[.20,1],[.23,.82],[.16,.63],[.24,.43],[.18,.22]],[[.43,0],[.61,0],[.65,.20],[.58,.42],[.64,.60],[.57,.81],[.60,1],[.40,1],[.44,.79],[.38,.58],[.45,.35],[.39,.18]],[[.61,0],[.81,0],[.77,.23],[.84,.42],[.77,.65],[.83,.85],[.80,1],[.60,1],[.57,.81],[.64,.60],[.58,.42],[.65,.20]],[[.81,0],[1,0],[1,1],[.80,1],[.83,.85],[.77,.65],[.84,.42],[.77,.23]]];

export function createSpringLakeQuest(models:Record<string,THREE.Object3D>,wood:THREE.Texture,height:(x:number,z:number)=>number,reduced:boolean){
  const group=new THREE.Group();group.name='River letters and five torn keepsakes';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const geometry=<T extends THREE.BufferGeometry>(g:T)=>{geometries.add(g);return g;};
  const material=<T extends THREE.Material>(m:T)=>{materials.add(m);return m;};
  function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0){const o=new THREE.Mesh(geometry(g),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function paperTexture(note?:'search'|'return'|'journey'){
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;const c=canvas.getContext('2d');if(!c)return null;
    c.fillStyle='#cfb58a';c.fillRect(0,0,1536,1024);
    const grain=c.createImageData(384,256);let seed=7193;for(let n=0;n<grain.data.length;n+=4){seed=(seed*1664525+1013904223)>>>0;const v=185+(seed%63);grain.data[n]=v;grain.data[n+1]=v*.9;grain.data[n+2]=v*.73;grain.data[n+3]=80;}const gc=document.createElement('canvas');gc.width=384;gc.height=256;gc.getContext('2d')?.putImageData(grain,0,0);c.drawImage(gc,0,0,1536,1024);
    const edge=c.createRadialGradient(700,430,170,780,500,970);edge.addColorStop(0,'#fff3cf66');edge.addColorStop(1,'#65431d77');c.fillStyle=edge;c.fillRect(0,0,1536,1024);
    // Uneven old coffee ring and seep marks, not a uniformly yellow sheet.
    c.save();c.translate(1120,700);c.scale(1,.83);for(let n=0;n<9;n++){c.beginPath();c.strokeStyle=`rgba(107,62,26,${.015+n*.005})`;c.lineWidth=8+n*2;c.ellipse(0,0,217+n*2,217+n*2,.12,.2,Math.PI*1.94);c.stroke();}c.restore();
    for(let n=0;n<23;n++){const x=(n*353+91)%1536,y=(n*197+83)%1024;c.strokeStyle=n%2?'#6f502b20':'#fff9dd5c';c.lineWidth=n%3+1;c.beginPath();c.moveTo(x-300,y-90);c.bezierCurveTo(x-80,y+10,x+180,y-60,x+430,y+130);c.stroke();}
    c.fillStyle='#4b3827';c.textAlign='center';
    if(!note){c.font='110px "Spring Hand", Georgia, serif';c.translate(768,475);c.rotate(-.028);c.fillText(SPRING_PAPER_TEXT,0,0);c.font='32px "Spring Hand", Georgia, serif';c.fillText('— a little piece of forever',170,165);}
    else{c.textAlign='left';c.font='68px "Spring Hand", Georgia, serif';const lines=note==='journey'?['This journey was so short.','Next, you have to go through the','longest journey we ever had.','Follow the north rail,','and you may find it.']:note==='search'?['There are pieces of a paper hidden','near this river. Find those words','and keep them with you.','You may need them later.','Once you have all five parts,','come back here.']:['Okay, you almost have everything','you need, but something is still missing.','So I am giving you this pill.','Go near a bench, sit down,','and take it.','You shall see.'];lines.forEach((line,n)=>c.fillText(line,115,195+n*112));c.font='50px "Spring Hand", Georgia, serif';c.fillText('— Syamu',1120,925);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;textures.add(texture);return texture;
  }
  const sharedPaper=paperTexture(),paperMat=material(new THREE.MeshStandardMaterial({map:sharedPaper,color:0xffffff,roughness:.94,side:THREE.DoubleSide}));
  function scrapGeometry(index:number,scale=1){
    const shape=new THREE.Shape(),outline=tears[index];outline.forEach(([x,y],n)=>n?shape.lineTo((x-.5)*.70*scale,(y-.5)*.43*scale):shape.moveTo((x-.5)*.70*scale,(y-.5)*.43*scale));shape.closePath();
    // Straight ShapeGeometry outlines have no interior vertices. Subdivide the
    // triangles before wrinkling so creases cross the sheet instead of only its edge.
    const flat=new THREE.ShapeGeometry(shape),p=flat.getAttribute('position'),indexArray=flat.getIndex()!,vertices:number[]=[],uv:number[]=[];
    const divide=(a:THREE.Vector2,b:THREE.Vector2,c:THREE.Vector2,depth:number)=>{if(depth){const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);divide(a,ab,ca,depth-1);divide(ab,b,bc,depth-1);divide(ca,bc,c,depth-1);divide(ab,bc,ca,depth-1);return;}for(const v of [a,b,c]){const x=v.x,y=v.y;vertices.push(x,y,(Math.sin(x*57/scale+y*22/scale)*.0018+Math.sin(y*72/scale)*.0011)*scale);uv.push(x/(.70*scale)+.5,y/(.43*scale)+.5);}};
    for(let n=0;n<indexArray.count;n+=3){const point=(i:number)=>new THREE.Vector2(p.getX(indexArray.getX(i)),p.getY(indexArray.getX(i)));divide(point(n),point(n+1),point(n+2),2);}flat.dispose();
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
  }
  const scrapMeshes:THREE.Mesh[]=[];
  const scraps=SPRING_PAPER_HIDING_PLACES.map((p,n)=>{
    const base=height(p.x,p.z),holder=new THREE.Group();holder.name=`Hidden paper ${n+1} · ${p.name}`;holder.position.set(p.x,base,p.z);holder.rotation.y=p.yaw;group.add(holder);
    const scrap=mesh(holder,scrapGeometry(n),paperMat);scrap.name=`Grounded torn paper ${n+1}`;scrap.rotation.x=-Math.PI/2;const mid=(Math.min(...tears[n].map(p=>p[0]))+Math.max(...tears[n].map(p=>p[0])))/2;scrap.position.x=-(mid-.5)*.70;
    const vertices=scrap.geometry.getAttribute('position'),world=new THREE.Vector3();
    for(let i=0;i<vertices.count;i++){world.set(vertices.getX(i)+scrap.position.x,0,-vertices.getY(i)).applyAxisAngle(THREE.Object3D.DEFAULT_UP,p.yaw);vertices.setZ(i,height(p.x+world.x,p.z+world.z)-base+.007+vertices.getZ(i));}scrap.geometry.computeVertexNormals();scrapMeshes.push(scrap);
    // Local cover gives each hiding place an actual search silhouette, with an exposed paper edge.
    const groundLocal=(x:number,z:number)=>{world.set(x,0,z).applyAxisAngle(THREE.Object3D.DEFAULT_UP,p.yaw);return height(p.x+world.x,p.z+world.z)-base;};
    const source=models[n%2?'river-rock':'rock']??models.rock;if(source){const stone=source.clone(true),b=new THREE.Box3().setFromObject(stone),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());stone.position.sub(new THREE.Vector3(center.x,b.min.y,center.z));const root=new THREE.Group();root.add(stone);root.scale.setScalar((n%2?.45:.36)/Math.max(.001,size.x,size.z));root.position.set(.055,groundLocal(.055,-.11)-.012,-.11);root.rotation.y=n*1.7;holder.add(root);}
    const bark=material(new THREE.MeshStandardMaterial({map:wood,color:0x5d503b,roughness:1}));for(let j=0;j<(n===2||n===3?3:1);j++){const x=-.08+j*.08,z=.035-j*.055,twig=mesh(holder,new THREE.CylinderGeometry(.012,.019,.58,7),bark,x,groundLocal(x,z)+.018,z);twig.name='Fallen twig beside the paper';twig.rotation.set(Math.PI/2,0,1.1+j*.13);}
    holder.updateMatrixWorld(true);holder.userData.pickup=new THREE.Box3().setFromObject(scrap).getCenter(new THREE.Vector3());return holder;
  });
  const noteRoot=new THREE.Group();noteRoot.name='Letter pinned to the bridge handrail';noteRoot.position.set(SPRING_BRIDGE_NOTE.x,SPRING_BRIDGE_NOTE.y,SPRING_BRIDGE_NOTE.z);noteRoot.rotation.y=Math.PI;group.add(noteRoot);
  const searchMap=paperTexture('search'),returnMap=paperTexture('return');
  const noteMaterial=material(new THREE.MeshStandardMaterial({map:searchMap,side:THREE.DoubleSide,roughness:.96}));
  const note=mesh(noteRoot,new THREE.PlaneGeometry(.48,.37,12,12),noteMaterial,0,-.13,.02);note.rotation.z=-.055;const np=note.geometry.getAttribute('position');for(let n=0;n<np.count;n++)np.setZ(n,Math.sin(np.getX(n)*45)*.003);note.geometry.computeVertexNormals();
  mesh(noteRoot,new THREE.SphereGeometry(.012,12,8),material(new THREE.MeshStandardMaterial({color:0x867554,metalness:.8,roughness:.35})),0,.027,.034).scale.set(1,1,.4);
  const pillRoot=new THREE.Group();pillRoot.name='Single capsule in paper sachet';pillRoot.position.set(SPRING_BRIDGE_NOTE.x+.34,SPRING_BRIDGE_NOTE.y-.13,SPRING_BRIDGE_NOTE.z-.025);group.add(pillRoot);
  const capsuleWhite=material(new THREE.MeshPhysicalMaterial({color:0xf5efe2,roughness:.24,clearcoat:.7})),capsulePink=material(new THREE.MeshPhysicalMaterial({color:0x987f89,roughness:.22,clearcoat:.8}));
  const wrapper=mesh(pillRoot,new THREE.PlaneGeometry(.12,.15),material(new THREE.MeshStandardMaterial({color:0xe9e2c7,side:THREE.DoubleSide,roughness:.87})));wrapper.rotation.y=Math.PI;
  for(const sign of [-1,1]){const half=mesh(pillRoot,new THREE.CapsuleGeometry(.014,.018,6,12),sign<0?capsuleWhite:capsulePink,0,sign*.015,-.012);half.scale.y=.7;}
  const held=new THREE.Group();held.name='Held reconstructed river paper';group.add(held);const assembled=tears.map((_,i)=>mesh(held,scrapGeometry(i),paperMat));
  const journeyPaper=mesh(group,new THREE.PlaneGeometry(.38,.48,8,8),material(new THREE.MeshStandardMaterial({map:paperTexture('journey'),roughness:.94,side:THREE.DoubleSide})));journeyPaper.name='Held north rail letter';journeyPaper.userData.message=SPRING_JOURNEY_NOTE;
  let current:SpringSave|undefined;
  function nearNote(camera:THREE.Camera){return Math.hypot(camera.position.x-SPRING_BRIDGE_NOTE.x,camera.position.z-SPRING_BRIDGE_NOTE.z)<2.1;}
  function nearBench(camera:THREE.Camera){return Math.hypot(camera.position.x-SPRING_LAKE_BENCH.x,camera.position.z-SPRING_LAKE_BENCH.z)<2.25;}
  function canPick(index:unknown,camera:THREE.Camera){return typeof index==='number'&&Number.isInteger(index)&&index>=0&&index<5&&camera.position.distanceTo(scraps[index].userData.pickup)<2.15;}
  return {group,held,journeyPaper,nearNote,nearBench,canPick,
    benchPosition:{x:SPRING_LAKE_BENCH.x,z:SPRING_LAKE_BENCH.z,y:height(SPRING_LAKE_BENCH.x,SPRING_LAKE_BENCH.z)+1.15,yaw:-Math.PI/2,pitch:-.04},
    target(camera:THREE.Camera,ray:THREE.Raycaster,s:SpringSave){
      if(s.adaviActive||s.dreamPhase==='bus'||s.questNoteOpen||s.bagNoteOpen||s.dreamPhase!=='awake')return null;
      if(s.benchSeated)return {id:'stand-bench',label:'Stand up',action:'stand-up',payload:undefined};
      if(!s.bagNoteRead)return null;
      if(s.returnLetterRead&&!s.pillTaken&&nearNote(camera)&&ray.intersectObject(pillRoot,true).length)return {id:'river-pill',label:'Take the pill',action:'take-pill',payload:undefined};
      if(nearNote(camera)&&ray.intersectObject(note,false).length)return s.rainCleared&&s.dumplingNoteRead?{id:'bridge-note',label:s.paperHuntStarted?'Read the paper hunt letter':'Read the new bridge letter',action:'read-bridge-note',payload:undefined}:{id:'return-letter',label:s.returnLetterRead?'Read the pill letter':'Read the note on the handrail',action:'read-return-letter',payload:undefined};
      if(s.paperHuntStarted)for(let n=0;n<scraps.length;n++){if(s.paperPieces.includes(n)||!canPick(n,camera))continue;const hit=ray.intersectObject(scraps[n],true)[0];if(hit?.object===scrapMeshes[n])return {id:`paper-${n}`,label:`Pick up torn paper · ${s.paperPieces.length+1}/5`,action:'collect-paper',payload:n};}
      if(s.returnLetterRead&&nearBench(camera))return {id:'lake-bench',label:'Sit down',action:'sit-bench',payload:undefined};
      return null;
    },
    update(time:number,_dt:number,s:SpringSave,camera?:THREE.Camera){current=s;const active=!s.adaviActive&&s.dreamPhase!=='bus';group.visible=active;noteRoot.visible=active&&s.bagNoteRead;noteMaterial.map=s.rainCleared&&s.dumplingNoteRead?searchMap:returnMap;pillRoot.visible=noteRoot.visible&&s.returnLetterRead&&!s.pillTaken;scraps.forEach((scrap,n)=>scrap.visible=active&&s.paperHuntStarted&&!s.paperPieces.includes(n));
      journeyPaper.visible=s.hands?.includes('journey-note')===true&&!s.questNoteOpen;if(journeyPaper.visible&&camera){journeyPaper.position.copy(camera.position);journeyPaper.quaternion.copy(camera.quaternion);journeyPaper.translateZ(-.69);journeyPaper.translateX(s.hands[0]==='journey-note'?-.25:.25);journeyPaper.translateY(-.16);journeyPaper.rotateY(s.hands[0]==='journey-note'?.18:-.18);}
      held.visible=s.hands?.includes('paper-fragments')===true&&!s.questNoteOpen;assembled.forEach((scrap,n)=>{scrap.visible=s.paperPieces.includes(n);});if(held.visible&&camera){held.position.copy(camera.position);held.quaternion.copy(camera.quaternion);held.translateZ(-.65);held.translateX(s.hands[0]==='paper-fragments'?-.27:.27);held.translateY(-.14);held.scale.setScalar(.48);held.rotateX(-.12);if(!reduced)held.rotateZ(Math.sin(time*.8)*.006);}
    },
    stats:()=>({paperPieces:5,uncollected:current?5-current.paperPieces.length:5}),
    dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();group.clear();}
  };
}
