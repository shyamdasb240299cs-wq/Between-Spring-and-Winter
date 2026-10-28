import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createSpringTrainLighting as createCabinLighting} from './spring-train-lighting';
import {createSpringKeralaRoadside} from './spring-kerala-roadside';

/**
 * A metre-scale, front-engine Kerala Super Fast. The reference is the classic
 * non-AC red/cream body, not the 2+2 Super Fast Premium coach. Forward is -Z.
 * All owned resources live under x=400, separate from the spring landscape.
 *
 * Visual references: behance.net/gallery/220731499 (Yadav Suku), the user's
 * four retained cabin photographs, aanavandi.com/blog/inside-ksrtc-buses-part-2/ and
 * aanavandi.com/blog/double-horns-ksrtc-buses/. Construction details informed by
 * KSRTC's 2024 fully-built non-AC body specification (keralartctender.com).
 */
export const SPRING_BUS_WIDTH_SCALE=1.12;
export function createSpringKsrtcBus(models:Record<string,THREE.Object3D>={},surfaces?:{sky:THREE.Texture;asphalt:THREE.Texture;asphaltNormal:THREE.Texture;asphaltRoughness:THREE.Texture;ground?:{color:THREE.Texture;normal:THREE.Texture;roughness:THREE.Texture};details?:Record<string,THREE.Texture>}) {
  const group=new THREE.Group();group.name='KSRTC · Super Fast · a sunny Kerala journey';group.position.set(400,0,0);group.visible=false;
  const cabin=new THREE.Group();cabin.name='53 blue seats · left two / right three · old metal shutters';cabin.scale.x=SPRING_BUS_WIDTH_SCALE;group.add(cabin);
  const exterior=new THREE.Group();exterior.name='Moving Kerala road · left-hand traffic';group.add(exterior);
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const cabinLamps:{anchor:THREE.Object3D;position:THREE.Vector3;color:THREE.Color;range:number;power:number}[]=[];
  const staticParts=new Map<THREE.Material,THREE.BufferGeometry[]>();
  const clamp=THREE.MathUtils.clamp;
  const random=(i:number)=>{const n=Math.sin(i*127.13+44.7)*43758.5453;return n-Math.floor(n);};
  const material=(p:THREE.MeshStandardMaterialParameters)=>{const m=new THREE.MeshStandardMaterial(p);m.envMapIntensity=.65;materials.add(m);return m;};
  function canvasTexture(width:number,height:number,paint:(c:CanvasRenderingContext2D)=>void,repeatX=1,repeatY=1){
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;paint(canvas.getContext('2d')!);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=8;textures.add(t);return t;
  }
  const vinylMap=canvasTexture(1024,1024,c=>{
    c.fillStyle='#183954';c.fillRect(0,0,1024,1024);
    for(let i=0;i<34000;i++){const x=random(i)*1024,y=random(i+4)*1024;c.fillStyle=i%3?'rgba(6,21,48,.12)':'rgba(139,187,230,.11)';c.fillRect(x,y,.5+random(i+1)*2,.5+random(i+3)*2);}
    for(let i=0;i<110;i++){const x=random(i+81)*1024,y=random(i+111)*1024;c.strokeStyle='rgba(129,180,224,.09)';c.lineWidth=.7;c.beginPath();c.moveTo(x,y);for(let n=1;n<7;n++)c.lineTo(x+n*3,y+(random(i+n)-.5)*9);c.stroke();}
    const g=c.createRadialGradient(510,550,40,510,550,590);g.addColorStop(0,'rgba(133,187,234,.13)');g.addColorStop(1,'rgba(5,17,38,.14)');c.fillStyle=g;c.fillRect(0,0,1024,1024);
  });
  const floorMap=canvasTexture(512,512,c=>{
    c.fillStyle='#4b5150';c.fillRect(0,0,512,512);
    for(let i=0;i<14000;i++){c.fillStyle=i%2?'rgba(200,210,199,.08)':'rgba(0,0,0,.08)';c.fillRect(random(i)*512,random(i+19)*512,random(i+2)*3+.4,.7);}
    for(let y=-24;y<560;y+=48)for(let x=-24;x<560;x+=48){c.save();c.translate(x+(y/48%2?24:0),y);c.rotate(Math.PI/4);c.fillStyle='#78807a';c.fillRect(-2,-13,4,26);c.fillStyle='#292f2e';c.fillRect(2,-12,1.4,24);c.restore();}
  },3,12);
  const rubberMap=canvasTexture(128,128,c=>{c.fillStyle='#242927';c.fillRect(0,0,128,128);for(let x=0;x<128;x+=8){c.fillStyle='#373c38';c.fillRect(x,0,3,128);c.fillStyle='#131917';c.fillRect(x+3,0,1,128);}},4,7);
  const creamMap=canvasTexture(512,512,c=>{c.fillStyle='#e1e2cf';c.fillRect(0,0,512,512);for(let i=0;i<10000;i++){c.fillStyle=i%2?'rgba(85,82,55,.036)':'rgba(255,255,240,.05)';c.fillRect(random(i)*512,random(i+8)*512,2,1);}});
  const asphaltMap=canvasTexture(1024,1024,c=>{
    c.fillStyle='#36413e';c.fillRect(0,0,1024,1024);for(let i=0;i<95000;i++){const l=90+Math.floor(random(i+2)*80);c.fillStyle=`rgba(${l},${l+5},${l+3},${.05+random(i+9)*.12})`;c.fillRect(random(i)*1024,random(i+3)*1024,random(i+5)*2+1,random(i+7)*2+1);}
    for(let i=0;i<8;i++){const g=c.createRadialGradient(random(i)*1024,random(i+8)*1024,0,random(i)*1024,random(i+8)*1024,150);g.addColorStop(0,'rgba(158,176,172,.12)');g.addColorStop(1,'rgba(158,176,172,0)');c.fillStyle=g;c.fillRect(0,0,1024,1024);}
  },2,30);
  const redVinyl=material({map:vinylMap,bumpMap:vinylMap,bumpScale:.0018,color:0x92b5d4,roughness:.84,metalness:.025});
  const seatEdge=material({color:0x173d68,roughness:.55}),stitch=material({color:0x7196bb,roughness:.83});
  const cream=material({map:creamMap,color:0xd7d9cf,roughness:.51,metalness:.32}),creamEdge=material({color:0x8b9696,roughness:.40,metalness:.62});
  const roofMetal=material({map:creamMap,bumpMap:creamMap,bumpScale:.006,color:0x9eaeb2,metalness:.72,roughness:.32});
  const yellowRail=material({color:0xc9a13b,roughness:.51,metalness:.25}),blueSeatBack=material({map:creamMap,color:0x678491,metalness:.42,roughness:.52});
  const redPaint=material({color:0x79312e,roughness:.43,metalness:.38}),lowerRed=material({color:0x526b68,roughness:.58,metalness:.22});
  const aluminum=material({color:0x939b93,roughness:.35,metalness:.78}),chrome=material({color:0xb3b9ae,roughness:.24,metalness:.88});
  const darkMetal=material({color:0x303b36,roughness:.51,metalness:.6}),black=material({color:0x151c1a,roughness:.8});
  const rubber=material({map:rubberMap,color:0xb0b5a9,roughness:.85}),floor=material({map:floorMap,bumpMap:floorMap,bumpScale:.009,roughness:.37,metalness:.55});
  const greenDash=material({color:0x43594d,roughness:.65,metalness:.24}),darkGreen=material({color:0x223d32,roughness:.66});
  const glass=new THREE.MeshPhysicalMaterial({color:0xf5fbff,metalness:.05,roughness:.12,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false,envMapIntensity:.45,clearcoat:1,clearcoatRoughness:.08});materials.add(glass);
  const lit=material({color:0xe2e6d2,emissive:0xcbd8b0,emissiveIntensity:1.15,roughness:.25});
  const darkGlass=material({color:0x10251f,roughness:.14,metalness:.5});
  const wood=material({color:0x4b3525,roughness:.84});
  const orange=material({color:0xac6f2c,roughness:.52});
  function scannedSurface(m:THREE.MeshStandardMaterial,prefix:string,rx:number,ry:number){if(!surfaces?.details)return;const maps=['color','normal','roughness'].map(kind=>{const source=surfaces.details![prefix+'-'+kind],copy=source.clone();copy.wrapS=copy.wrapT=THREE.RepeatWrapping;copy.repeat.set(rx,ry);copy.needsUpdate=true;textures.add(copy);return copy;});m.map=maps[0];m.normalMap=maps[1];m.roughnessMap=maps[2];m.normalScale.set(.5,.5);m.bumpMap=null;}
  scannedSurface(floor,'metal',3.7,15.7);floor.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat plateValue=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(.43,.48,.47)*(.8+plateValue*1.7);');};
  const shutterPaint=material({color:0x253c3c,roughness:.46,metalness:.62});
  const wearMap=canvasTexture(1024,1024,c=>{
    c.fillStyle='#c2c6c4';c.fillRect(0,0,1024,1024);
    for(let i=0;i<22000;i++){const v=110+Math.floor(random(i+9)*100);c.fillStyle=`rgba(${v},${v},${v},.18)`;c.fillRect(random(i)*1024,random(i+31)*1024,1+random(i+3)*4,.6+random(i+7)*2);}
    for(let i=0;i<95;i++){c.strokeStyle='rgba(45,51,50,.18)';c.lineWidth=.5+random(i)*1.5;c.beginPath();const x=random(i+41)*1024,y=random(i+78)*1024;c.moveTo(x,y);c.lineTo(x+8+random(i+12)*45,y+random(i+17)*4);c.stroke();}
  });
  for(const m of [roofMetal,blueSeatBack,yellowRail,shutterPaint,lowerRed]){m.map=wearMap;m.bumpMap=wearMap;m.bumpScale=.00065;}
  const exteriorCream=material({map:creamMap,color:0xe4d7b8,roughness:.64,metalness:.22});
  const exteriorRed=material({map:wearMap,bumpMap:wearMap,bumpScale:.00045,color:0xb1332c,roughness:.55,metalness:.29});
  roofMetal.color.set(0xaeb9bc);roofMetal.roughness=.43;roofMetal.envMapIntensity=.95;
  const closedShutters=new Set(['-1:3','-1:8','1:1','1:7']);
  let shutterCount=0;
  function mesh(root:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0){geometries.add(g);const obj=new THREE.Mesh(g,m);obj.position.set(x,y,z);obj.castShadow=obj.receiveShadow=true;root.add(obj);return obj;}
  function box(root:THREE.Object3D,w:number,h:number,d:number,m:THREE.Material,x=0,y=0,z=0,r=0){return mesh(root,r?new RoundedBoxGeometry(w,h,d,3,r):new THREE.BoxGeometry(w,h,d),m,x,y,z);}
  function pipe(root:THREE.Object3D,points:number[][],radius:number,m:THREE.Material,segments=18){return mesh(root,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2]))),segments,radius,7,false),m);}
  function rod(root:THREE.Object3D,a:number[],b:number[],radius:number,m:THREE.Material){const from=new THREE.Vector3(...a as [number,number,number]),to=new THREE.Vector3(...b as [number,number,number]);const o=mesh(root,new THREE.CylinderGeometry(radius,radius,from.distanceTo(to),8),m);o.position.copy(from.add(to).multiplyScalar(.5));
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize());return o;}
  function rivet(root:THREE.Object3D,x:number,y:number,z:number,side=0){const o=mesh(root,new THREE.SphereGeometry(.008,6,4),aluminum,x,y,z);o.scale.set(side? .35:1,1,side?1:.35);return o;}
  function sign(text:string,width:number,height:number,{background='#d8d3b9',color='#37433a',font=50,sub=''}:{background?:string;color?:string;font?:number;sub?:string}={}){
    const map=canvasTexture(1024,256,c=>{c.fillStyle=background;c.fillRect(0,0,1024,256);c.fillStyle=color;c.textAlign='center';c.font=`600 ${font}px "Noto Sans Malayalam", "Nirmala UI", Arial, sans-serif`;c.fillText(text,512,sub?112:150,970);if(sub){c.font='27px Arial';c.fillText(sub,512,185,960);}c.strokeStyle=color+'55';c.lineWidth=3;c.strokeRect(12,12,1000,232);});
    return mesh(cabin,new THREE.PlaneGeometry(width,height),material({map,roughness:.8,side:THREE.DoubleSide}));
  }
  // The body has actual apertures: exterior scenery remains visible through every window.
  // Rotation maps shape Y to negative world Z. Negate the outline's Z values
  // so the cutouts remain underneath the actual passenger doors.
  const floorShape=new THREE.Shape();floorShape.moveTo(-1.265,5.475);floorShape.lineTo(1.265,5.475);floorShape.lineTo(1.265,-5.475);floorShape.lineTo(-1.265,-5.475);
  for(const [outer,inner] of [[2.76,2.04],[-3.58,-4.50]]){floorShape.lineTo(-1.265,-outer);floorShape.lineTo(-.83,-outer);floorShape.lineTo(-.83,-inner);floorShape.lineTo(-1.265,-inner);}floorShape.closePath();
  const floorBody=new THREE.ExtrudeGeometry(floorShape,{depth:.14,bevelEnabled:false});floorBody.rotateX(-Math.PI/2);mesh(cabin,floorBody,floor).name='Floor with actual front and rear stairwell cutouts';box(cabin,.43,.012,8.58,rubber,-.235,.15,.55);
  for(const s of [-1,1]){
    const x=s*1.245;
    // Leave real openings through the lower body at both left-side doors.
    for(const [a,b] of s<0?[[-5.5,-4.50],[-3.58,2.04],[2.76,5.5]]:[[-5.5,5.5]]){
      box(cabin,.05,.92,b-a,lowerRed,x,.61,(a+b)*.5);box(cabin,.055,.035,b-a,aluminum,x,1.075,(a+b)*.5);
      // Keep the worn green inner lining and the reference's red/cream outer
      // skin as separate surfaces, with enough thickness to avoid z-fighting.
      box(cabin,.018,.78,b-a,exteriorRed,s*1.283,.54,(a+b)*.5);
      box(cabin,.018,.13,b-a,exteriorCream,s*1.283,.995,(a+b)*.5);
      box(cabin,.019,.037,b-a,exteriorRed,s*1.285,1.045,(a+b)*.5);
    }
    box(cabin,.075,.30,11.0,roofMetal,x,2.145,0);box(cabin,.025,.030,11,aluminum,x-s*.045,1.995,0);
    box(cabin,.018,.25,11.0,exteriorCream,s*1.293,2.16,0);
    box(cabin,.019,.045,11.0,exteriorRed,s*1.295,2.012,0);
    for(let i=0;i<12;i++){const z=-4.86+i*.87;
      // Both original folding passenger doors are on the left.
      if(s<0&&(z< -3.52&&z> -4.5||z>2.00&&z<2.80))continue;
      box(cabin,.066,.94,.065,yellowRail,x,1.54,z);box(cabin,.019,.87,.018,black,x-s*.043,1.53,z);
      for(const y of [1.14,1.96])rivet(cabin,x-s*.044,y,z,1);
    }
    for(let i=0;i<11;i++){const z=-4.425+i*.87;
      if(s<0&&(z< -3.48&&z> -4.63||z>2.04&&z<2.99))continue;
      // Old non-AC bodies have open apertures and vertically raised metal
      // shutters. The raised panels sit in the header, leaving no glass tint.
      const shut=closedShutters.has(`${s}:${i}`),window=new THREE.Group();window.name=shut?'Closed metal shutter':'Raised metal shutter · open window';cabin.add(window);shutterCount++;
      const panelHeight=shut?.88:.16,panelY=shut?1.55:2.10;
      box(window,.025,panelHeight,.795,shutterPaint,x-s*.034,panelY,z);
      for(let n=0;n<(shut?12:3);n++){const slat=box(window,.023,.023,.77,shutterPaint,x-s*.057,panelY-panelHeight*.5+.025+n*(panelHeight-.05)/(shut?11:2),z);slat.rotation.z=s*.32;}
      for(const edge of [-1,1])box(window,.045,.92,.021,aluminum,x-s*.043,1.55,z+edge*.405);
      box(window,.039,.027,.81,aluminum,x-s*.034,1.10,z);
      box(window,.025,.029,.10,darkMetal,x-s*.068,shut?1.17:2.015,z,.006);
      for(const y of [1.31,1.49])rod(window,[x-s*.077,y,z-.405],[x-s*.077,y,z+.405],.009,aluminum);
    }
    for(let n=0;n<25;n++){const z=-5.15+n*.43;rivet(cabin,x-s*.029,.21,z,1);rivet(cabin,x-s*.029,1.01,z,1);}
  }
  // Narrow infill beside the rear door, then two complete paired-seat window bays.
  box(cabin,.055,.94,.23,roofMetal,-1.245,1.54,2.885);
  box(cabin,.055,.94,.77,roofMetal,-1.245,1.54,5.105);
  // Curved pressed-metal ceiling, with a separate rib at every window pillar.
  const roofGeo=new THREE.PlaneGeometry(2.53,10.98,34,22);roofGeo.rotateX(-Math.PI/2);const rv=roofGeo.attributes.position;
  for(let i=0;i<rv.count;i++){const x=rv.getX(i);rv.setY(i,2.085+.265*Math.sqrt(Math.max(0,1-(x/1.265)**2)));}roofGeo.computeVertexNormals();mesh(cabin,roofGeo,roofMetal).material.side=THREE.DoubleSide;
  const endCap=new THREE.Shape();endCap.moveTo(-1.265,1.99);endCap.lineTo(1.265,1.99);for(let n=0;n<=40;n++){const x=1.265-n*2.53/40;endCap.lineTo(x,2.085+.265*Math.sqrt(Math.max(0,1-(x/1.265)**2)));}endCap.closePath();
  for(const z of [-5.33,5.41]){const cap=mesh(cabin,new THREE.ShapeGeometry(endCap,20),roofMetal,0,0,z);cap.name='Sealed curved roof corner and end cap';cap.material.side=THREE.DoubleSide;}
  for(let i=0;i<12;i++){const z=-4.87+i*.87;pipe(cabin,[[-1.253,2.10,z],[-1.12,2.21,z],[-.76,2.30,z],[0,2.35,z],[.76,2.30,z],[1.12,2.21,z],[1.253,2.10,z]],.008,creamEdge,24);}
  for(const x of [-.43,.43])box(cabin,.014,.010,10.75,creamEdge,x,2.332,0);
  for(const z of [-3.58,-.12,3.37]){
    box(cabin,.15,.048,.62,creamEdge,.30,2.29,z,.012);box(cabin,.09,.014,.49,lit,.30,2.259,z,.007);
    const anchor=new THREE.Object3D();anchor.position.set(0,2.17,z);cabin.add(anchor);cabinLamps.push({anchor,position:new THREE.Vector3(),color:new THREE.Color(0xe4e9df),range:3.5,power:.18});
  }
  // Open tubular luggage racks, as fitted to these non-AC buses.
  for(const s of [-1,1]){
    for(const x of [s*1.17,s*.85])rod(cabin,[x,2.05,-3.25],[x,2.05,4.85],.014,chrome);
    for(let n=0;n<34;n++){const z=-3.22+n*.24;rod(cabin,[s*1.17,2.05,z],[s*.85,2.05,z],.006,aluminum);}
    for(let n=0;n<9;n++){const z=-3.17+n*.94;pipe(cabin,[[s*1.2,2.19,z],[s*.92,2.24,z],[s*.84,2.10,z],[s*.84,2.045,z]],.014,chrome,10);}
    rod(cabin,[s*.83,2.145,-3.2],[s*.83,2.145,4.80],.015,chrome);
  }
  // A real narrow aisle offset by the unequal two- and three-seat benches.
  const seatXs=[-1.00,-.575,.16,.585,1.01],rows:number[]=[];
  const seatSolids:{minX:number;maxX:number;minZ:number;maxZ:number}[]=[];
  function passengerSeat(x:number,z:number,index:number){
    const seat=new THREE.Group();seat.name=`Rexine seat ${index} · worn edge and stitched cover`;seat.position.set(x,0,z);cabin.add(seat);
    box(seat,.407,.104,.435,seatEdge,0,.556,0,.035);box(seat,.396,.091,.429,redVinyl,0,.586,-.008,.035);
    const back=box(seat,.404,.55,.088,redVinyl,0,.93,.226,.032);back.rotation.x=.075;
    box(seat,.404,.15,.11,redVinyl,0,1.18,.238,.035);
    box(seat,.40,.042,.036,seatEdge,0,.651,.28,.012);
    // Perimeter welt and the horizontal upholstery join are physical surfaces.
    pipe(seat,[[-.171,.605,-.191],[-.19,.606,-.15],[-.19,.606,.15],[-.166,.606,.191],[.166,.606,.191],[.19,.606,.15],[.19,.606,-.15],[.165,.606,-.191],[-.171,.605,-.191]],.0022,stitch,40);
    pipe(seat,[[-.17,.665,.171],[-.181,1.17,.198],[-.15,1.235,.202],[.15,1.235,.202],[.181,1.17,.198],[.17,.665,.171]],.002,stitch,26);
    rod(seat,[-.165,.20,.12],[-.165,.57,.12],.014,darkMetal);rod(seat,[.165,.20,.12],[.165,.57,.12],.014,darkMetal);
    box(seat,.035,.012,.18,darkMetal,-.165,.163,.12);box(seat,.035,.012,.18,darkMetal,.165,.163,.12);
    for(const sx of [-.154,.154])rivet(seat,sx,.75,.289);
    seatSolids.push({minX:x-.209,maxX:x+.209,minZ:z-.23,maxZ:z+.31});
  }
  let seatNumber=0;
  for(let r=0;r<10;r++){
    const z=-2.90+r*.76;rows.push(z);
    seatXs.forEach((x,i)=>{if(r===7&&i<2)return;passengerSeat(x,z,++seatNumber);});
    for(const s of [-1,1]){
      if(r===7&&s<0)continue;
      const min=s<0?-1.20:-.04,max=s<0?-.37:1.21;
      // One painted sheet-metal back and one yellow grab frame per bench,
      // matching the user's old-body references rather than individual headrests.
      box(cabin,max-min-.035,.47,.018,blueSeatBack,(min+max)*.5,.906,z+.306,.009);
      for(const y of [.70,1.10])box(cabin,max-min-.055,.018,.025,creamEdge,(min+max)*.5,y,z+.325);
      pipe(cabin,[[min+.025,.69,z+.34],[min+.025,1.22,z+.34],[min+.075,1.285,z+.34],[max-.075,1.285,z+.34],[max-.025,1.22,z+.34],[max-.025,.69,z+.34]],.014,yellowRail,24);
      rod(cabin,[min,.478,z+.09],[max,.478,z+.09],.019,darkMetal);
      const ax=s<0?-.354:-.047;
      pipe(cabin,[[ax,.52,z-.19],[ax,.76,z-.16],[ax,.78,z+.15],[ax,.66,z+.22]],.012,chrome,12);
      box(cabin,.04,.028,.30,black,ax,.786,z-.006,.012);
    }
  }
  // A five-wide rear bench completes this 53-seat body; two paired rows sit behind the rear door.
  for(let i=0;i<5;i++)passengerSeat(-.86+i*.43,4.79,++seatNumber);
  // A small exposed window in an opaque pressed-metal rear body.
  box(cabin,2.53,1.34,.065,cream,0,.79,5.41);
  box(cabin,2.53,.82,.018,exteriorRed,0,.56,5.454);
  box(cabin,2.53,.49,.018,exteriorCream,0,1.215,5.454);
  for(const x of [-.9825,.9825]){
    box(cabin,.565,.56,.065,cream,x,1.72,5.41);
    box(cabin,.565,.56,.018,exteriorCream,x,1.72,5.454);
  }
  box(cabin,2.53,.11,.065,cream,0,2.035,5.41);
  for(const y of [1.46,1.98])box(cabin,1.44,.035,.075,black,0,y,5.405);
  for(const x of [-.70,.70])box(cabin,.035,.55,.075,black,x,1.72,5.405);
  mesh(cabin,new THREE.PlaneGeometry(1.40,.52),glass,0,1.72,5.40).rotation.y=Math.PI;
  const rearExit=sign('EMERGENCY EXIT',.76,.105,{background:'#294d3a',color:'#e3e4ce',font:60});rearExit.position.set(0,2.19,5.36);rearExit.rotation.y=Math.PI;
  // Stanchions, overhead rail, and freely swaying passenger grab handles.
  rod(cabin,[-.235,2.18,-3.45],[-.235,2.18,4.53],.019,yellowRail);
  const handles:THREE.Group[]=[];
  for(let i=0;i<5;i++){
    const h=new THREE.Group();h.position.set(-.235,2.18,-2.8+i*1.35);cabin.add(h);handles.push(h);
    box(h,.031,.157,.014,black,0,-.092,0,.005);mesh(h,new THREE.TorusGeometry(.048,.006,7,24),black,0,-.216,0);
    mesh(h,new THREE.TorusGeometry(.023,.006,6,14),aluminum,0,-.007,0).rotation.y=Math.PI/2;
  }
  const stanchionZ=[-3.38,-1.43,.88,2.82,4.40];
  for(const z of stanchionZ){
    // Keep the upright against the bench edge, leaving the walking line clear.
    pipe(cabin,[[-.365,.16,z],[-.365,2.04,z],[-.34,2.14,z],[-.235,2.18,z]],.018,yellowRail,18);
    mesh(cabin,new THREE.CylinderGeometry(.033,.033,.028,12),aluminum,-.365,.18,z);
  }
  // Front left and rear left double-leaf folding doors, with sunken entrance steps.
  for(const [doorZ,openingWidth] of [[-4.04,.92],[2.40,.72]]){
    // Keep the stair base below every tread; a floor-height slab here would
    // cover the cutout and make the visitor's feet sink into a solid platform.
    box(cabin,.45,.055,openingWidth,black,-1.04,-.2175,doorZ);
    for(const [outer,inner,top] of [[-1.275,-1.08,-.09],[-1.08,-.95,.015],[-.95,-.83,.12]]){
      box(cabin,inner-outer,top+.19,openingWidth,floor,(outer+inner)*.5,(top-.19)*.5,doorZ);
      box(cabin,.018,.009,openingWidth-.03,aluminum,outer+.009,top-.0045,doorZ);
    }
    for(let n=0;n<2;n++){
      const z=doorZ+(n-.5)*(openingWidth*.48);
      box(cabin,.045,1.98,.042,redPaint,-1.25,1.11,z-openingWidth*.235);box(cabin,.045,1.98,.042,redPaint,-1.25,1.11,z+openingWidth*.235);
      for(const y of [.18,.83,2.08])box(cabin,.045,.035,openingWidth*.465,redPaint,-1.25,y,z);
      box(cabin,.036,.61,openingWidth*.44,lowerRed,-1.25,.51,z);
      const dp=mesh(cabin,new THREE.PlaneGeometry(openingWidth*.43,1.20),glass,-1.264,1.45,z);dp.rotation.y=Math.PI/2;
    }
    for(const edge of [-1,1]){
      const jambZ=doorZ+edge*(openingWidth*.5+.025);
      box(cabin,.085,2.03,.065,creamEdge,-1.24,1.09,jambZ);
      box(cabin,.025,1.93,.018,black,-1.195,1.10,jambZ-edge*.029);
      for(const y of [.38,1.01,1.83])rod(cabin,[-1.19,y-.045,jambZ],[-1.19,y+.045,jambZ],.014,darkMetal);
    }
    box(cabin,.022,1.91,.018,black,-1.22,1.10,doorZ);
    for(const n of [-1,1]){
      const paneZ=doorZ+n*openingWidth*.24;
      for(const y of [.88,1.97])box(cabin,.018,.028,openingWidth*.40,black,-1.218,y,paneZ);
      for(const edge of [-1,1])box(cabin,.018,1.09,.018,black,-1.218,1.425,paneZ+edge*openingWidth*.20);
      box(cabin,.012,.42,openingWidth*.33,blueSeatBack,-1.223,.49,paneZ,.015);
      for(const y of [.33,.64])for(const edge of [-1,1])rivet(cabin,-1.211,y,paneZ+edge*openingWidth*.14,1);
    }
    rod(cabin,[-1.18,1.03,doorZ-.09],[-1.18,1.23,doorZ-.09],.012,chrome);
    for(const z of [doorZ-openingWidth*.58,doorZ+openingWidth*.58])pipe(cabin,[[-1.17,.28,z],[-.98,.85,z],[-.98,1.54,z],[-1.16,1.72,z]],.019,chrome,16);
    box(cabin,.065,.067,openingWidth+.08,redPaint,-1.25,2.13,doorZ);
  }
  // The front bulkhead, split windscreen, rubber gasket and large diesel engine cowling.
  box(cabin,2.47,.73,.10,greenDash,0,.51,-5.32,.025);
  for(const x of [-1.22,0,1.22])box(cabin,x===0?.032:.075,1.48,.071,black,x,1.43,-5.34);
  for(const x of [-.61,.61]){const pane=mesh(cabin,new THREE.PlaneGeometry(1.185,1.43),glass,x,1.41,-5.36);pane.rotation.y=Math.PI;}
  box(cabin,2.42,.064,.35,greenDash,0,.78,-5.16,.03);
  const cowling=box(cabin,.78,.63,1.36,greenDash,.01,.46,-4.43,.11);cowling.name='Front-engine insulated metal cover';
  box(cabin,.79,.025,.92,rubber,.01,.794,-4.25,.025);
  for(const z of [-4.87,-3.88])for(const x of [-.36,.38])box(cabin,.037,.10,.065,aluminum,x,.57,z,.007);
  for(let i=0;i<13;i++)box(cabin,.48,.009,.013,darkGreen,.01,.785,-4.78+i*.034);
  // Right-hand driving position, driver chair suspension, three pedals, gear lever and handbrake.
  box(cabin,.56,.11,.53,darkGreen,.78,.65,-4.21,.065);box(cabin,.55,.66,.12,darkGreen,.78,.97,-3.96,.055);
  box(cabin,.34,.31,.32,darkMetal,.78,.36,-4.16,.025);for(let i=0;i<5;i++)box(cabin,.37,.015,.35,black,.78,.24+i*.035,-4.16);
  for(const x of [.57,1.00])pipe(cabin,[[x,.66,-4.4],[x,.79,-4.38],[x,.81,-4.07],[x,.73,-3.99]],.015,darkMetal,16);
  rod(cabin,[.79,.56,-4.75],[.79,1.02,-4.80],.033,black);
  const steering=new THREE.Group();steering.position.set(.79,1.036,-4.79);steering.rotation.x=-.42;cabin.add(steering);
  const wheel=mesh(steering,new THREE.TorusGeometry(.231,.017,10,48),black);wheel.rotation.x=Math.PI/2;
  mesh(steering,new THREE.CylinderGeometry(.062,.067,.041,20),black,0,.006,0);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(steering,[Math.sin(a)*.055,.007,Math.cos(a)*.055],[Math.sin(a)*.224,.007,Math.cos(a)*.224],.013,darkMetal);}
  const horn=sign('TATA',.065,.025,{background:'#18251e',color:'#b3b9ae',font:100});horn.position.set(.79,1.06,-4.78);horn.rotation.x=-Math.PI/2;
  const dashboard=box(cabin,.68,.24,.23,darkMetal,.79,.91,-5.14,.04);dashboard.rotation.x=-.24;
  const instruments=canvasTexture(1024,512,c=>{
    c.fillStyle='#111b16';c.fillRect(0,0,1024,512);
    for(let i=0;i<3;i++){
      const x=245+i*275,y=245,r=i===1?174:115;c.fillStyle='#07110e';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle='#778778';c.lineWidth=9;c.stroke();
      for(let n=0;n<13;n++){const a=-Math.PI*.82+n*.137*Math.PI;c.strokeStyle='#c7cebb';c.lineWidth=5;c.beginPath();c.moveTo(x+Math.sin(a)*(r-17),y-Math.cos(a)*(r-17));c.lineTo(x+Math.sin(a)*(r-34),y-Math.cos(a)*(r-34));c.stroke();}
      c.fillStyle='#adbca6';c.textAlign='center';c.font='24px monospace';c.fillText(i===1?'km/h':i===0?'FUEL':'TEMP',x,y+45);c.strokeStyle='#ce7150';c.lineWidth=7;c.beginPath();c.moveTo(x,y+15);c.lineTo(x-36,y-r*.57);c.stroke();
    }
    c.fillStyle='#82a66e';c.fillRect(390,420,245,43);c.fillStyle='#183023';c.font='36px monospace';c.textAlign='center';c.fillText('084629',512,453);
  });
  const im=mesh(cabin,new THREE.PlaneGeometry(.58,.215),material({map:instruments,emissive:0x30482c,emissiveMap:instruments,emissiveIntensity:.28,roughness:.36}),.79,.956,-5.006);im.rotation.x=-.25;
  for(let i=0;i<6;i++){box(cabin,.033,.048,.017,black,.31+i*.075,.81,-5.015,.005);box(cabin,.012,.014,.003,i===1?orange:darkGreen,.31+i*.075,.82,-5.002);}
  for(const x of [.63,.81,1.00]){rod(cabin,[x,.16,-4.81],[x,.32,-4.94],.015,darkMetal);const pedal=box(cabin,.068,.018,.13,rubber,x,.33,-4.94,.009);pedal.rotation.x=-.35;}
  pipe(cabin,[[.40,.19,-4.12],[.39,.48,-4.12],[.32,.74,-4.16]],.017,darkMetal,14);mesh(cabin,new THREE.SphereGeometry(.042,16,10),black,.32,.755,-4.16);
  box(cabin,.14,.025,.19,black,.40,.169,-4.12,.04);pipe(cabin,[[1.06,.20,-4.08],[1.10,.39,-4.15],[1.09,.48,-4.29]],.013,darkMetal,14);box(cabin,.03,.036,.12,black,1.09,.48,-4.29,.012);
  // Driver partition, ticket box, extinguisher, small practical objects and printed notices.
  pipe(cabin,[[.30,.16,-3.59],[.30,1.52,-3.59],[1.20,1.52,-3.59]],.022,chrome,14);
  box(cabin,.89,.62,.035,cream,.77,.55,-3.59);box(cabin,.87,.028,.05,redPaint,.77,.87,-3.59);
  for(let n=0;n<5;n++)rod(cabin,[.36+n*.20,.88,-3.59],[.36+n*.20,1.51,-3.59],.007,chrome);
  box(cabin,.38,.31,.34,redPaint,-.73,.32,-3.43,.014);box(cabin,.40,.021,.36,lowerRed,-.73,.49,-3.43,.008);box(cabin,.09,.017,.014,aluminum,-.73,.43,-3.25);
  for(const x of [-.89,-.57])rod(cabin,[x,.16,-3.55],[x,.19,-3.55],.014,darkMetal);
  const fire=material({color:0xa43127,roughness:.4,metalness:.25});mesh(cabin,new THREE.CylinderGeometry(.063,.064,.35,16),fire,-1.12,.46,-3.28);mesh(cabin,new THREE.SphereGeometry(.063,14,8),fire,-1.12,.635,-3.28).scale.y=.45;box(cabin,.07,.027,.022,darkMetal,-1.12,.69,-3.28);pipe(cabin,[[-1.08,.65,-3.28],[-1.01,.62,-3.27],[-1.01,.36,-3.27]],.008,black,12);
  const extinguisherLabel=sign('FIRE',.084,.11,{background:'#dedbca',color:'#a73328',font:100});extinguisherLabel.position.set(-1.12,.45,-3.212);
  const firstAid=box(cabin,.35,.23,.09,cream,-.90,2.19,-3.18,.016);box(cabin,.11,.029,.004,fire,-.90,2.19,-3.132);box(cabin,.028,.109,.004,fire,-.90,2.19,-3.13);firstAid.name='First aid kit';
  const route=sign('KONNI – THIRUVANANTHAPURAM',1.65,.16,{background:'#eee8d2',color:'#254c36',font:60,sub:'KSRTC  ·  KERALA STATE ROAD TRANSPORT CORPORATION'});route.position.set(0,2.20,-5.185);
  const sf=sign('SUPER FAST',.82,.12,{background:'#5c3026',color:'#e0cf9d',font:81});sf.position.set(0,2.045,-5.18);
  const fleet=sign('KSRTC  ·  53 SEATS',.65,.06,{background:'#d4dbd7',color:'#38463b',font:70});fleet.position.set(0,2.305,-5.18);
  const women=sign('LADIES',.61,.09,{background:'#e4e4d0',color:'#6c3931',font:62});women.position.set(-1.198,2.20,-2.84);women.rotation.y=Math.PI/2;
  const warning=sign('KEEP HEAD AND HANDS INSIDE',.79,.09,{background:'#e4e4d0',color:'#6b3830',font:55,sub:''});warning.position.set(1.197,2.20,.36);warning.rotation.y=-Math.PI/2;
  const standing=sign('PLEASE HOLD THE HANDRAIL',.63,.09,{background:'#c5c1a7',color:'#4b5143',font:58});standing.position.set(.75,1.01,-3.555);
  // Mirror housing and a dim reflected cabin image, with no expensive render target.
  rod(cabin,[.55,2.16,-5.14],[.55,1.98,-4.94],.009,darkMetal);box(cabin,.35,.13,.032,black,.55,1.96,-4.94,.026);box(cabin,.309,.092,.005,darkGlass,.55,1.961,-4.921,.015);
  // Sun visors, windshield demister slots, driver's fan with separate wire cage.
  for(const x of [-.68,.76]){const visor=box(cabin,.63,.19,.016,darkGreen,x,2.057,-5.12,.015);visor.rotation.x=.15;for(let n=0;n<7;n++)box(cabin,.028,.007,.13,black,x-.20+n*.065,.822,-5.20);}
  const fan=new THREE.Group();fan.position.set(1.09,2.12,-4.54);fan.rotation.set(.20,-.55,0);cabin.add(fan);rod(fan,[0,0,0],[.03,.23,-.015],.013,darkMetal);const bladeRoot=new THREE.Group();fan.add(bladeRoot);
  for(let i=0;i<3;i++){const blade=mesh(bladeRoot,new THREE.SphereGeometry(.092,12,7),darkMetal,Math.sin(i*2.094)*.071,Math.cos(i*2.094)*.071,0);blade.scale.set(.45,1,.10);blade.rotation.z=-i*2.094;}
  for(const r of [.063,.114,.149])mesh(fan,new THREE.TorusGeometry(r,.0035,5,30),chrome,0,0,.033);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(fan,[0,0,.054],[Math.sin(a)*.15,Math.cos(a)*.15,.021],.0025,chrome);}mesh(fan,new THREE.SphereGeometry(.024,10,6),black,0,0,.049);
  // Wipers are outside the glass and sweep independently about their actual hinges.
  const wipers:THREE.Group[]=[];
  for(const x of [-.60,.61]){const pivot=new THREE.Group();pivot.position.set(x,.74,-5.408);cabin.add(pivot);wipers.push(pivot);rod(pivot,[0,0,0],[.02,.68,0],.009,darkMetal);rod(pivot,[-.12,.41,-.008],[.17,1.04,-.008],.011,black);mesh(pivot,new THREE.SphereGeometry(.026,10,6),black);}
  // Hanging ticket wallet and a folded newspaper on the parcel shelf.
  box(cabin,.25,.026,.17,wood,-.80,.829,-5.02,.006);
  const news=sign('KERALA DAILY',.22,.15,{background:'#d4d1b9',color:'#495146',font:92,sub:'THE MORNING EDITION'});news.position.set(-.81,.846,-5.015);news.rotation.x=-Math.PI/2;
  pipe(cabin,[[-.76,2.42,-3.2],[-.74,2.0,-3.2],[-.74,1.77,-3.2]],.008,wood,12);box(cabin,.22,.25,.065,wood,-.74,1.62,-3.2,.016);

  // Clear tropical daylight. Rain belongs exclusively to Spring after waking.
  const ambient=new THREE.HemisphereLight(0xd6edff,0x67725c,.65);group.add(ambient);
  const daylight=new THREE.DirectionalLight(0xffefd0,3.1);daylight.position.set(-18,29,-12);daylight.target.position.set(0,0,0);daylight.castShadow=true;daylight.shadow.mapSize.set(2048,2048);Object.assign(daylight.shadow.camera,{left:-24,right:24,top:27,bottom:-27,near:1,far:90});daylight.shadow.normalBias=.008;daylight.shadow.bias=-.00015;daylight.shadow.autoUpdate=false;daylight.shadow.needsUpdate=true;group.add(daylight,daylight.target);
  const skyMap=canvasTexture(1024,512,c=>{const g=c.createLinearGradient(0,0,0,512);g.addColorStop(0,'#4999d5');g.addColorStop(.55,'#94c9ec');g.addColorStop(1,'#e5efdc');c.fillStyle=g;c.fillRect(0,0,1024,512);for(let i=0;i<50;i++){const x=random(i)*1024,y=random(i+5)*180,g=c.createRadialGradient(x,y,10,x,y,80+random(i+2)*140);g.addColorStop(0,'rgba(255,255,255,.20)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,1024,512);}});
  // Infinite background avoids the circular far-plane intersection of the old dome.
  const skyTexture=surfaces?.sky??skyMap;skyTexture.mapping=THREE.EquirectangularReflectionMapping;
  const wetRoad=material({map:asphaltMap,bumpMap:asphaltMap,bumpScale:.016,roughness:.91,metalness:0,color:0xb2b3a8});
  const roadMaps:THREE.Texture[]=[],groundScrollMaps:THREE.Texture[]=[];
  if(surfaces){for(const source of [surfaces.asphalt,surfaces.asphaltNormal,surfaces.asphaltRoughness]){const copy=source.clone();copy.wrapS=copy.wrapT=THREE.RepeatWrapping;copy.repeat.set(2.1,400/3.5);copy.needsUpdate=true;textures.add(copy);roadMaps.push(copy);}wetRoad.map=roadMaps[0];wetRoad.normalMap=roadMaps[1];wetRoad.normalScale.set(.55,.55);wetRoad.roughnessMap=roadMaps[2];wetRoad.bumpMap=null;wetRoad.color.set(0xffffff);}
  const road=box(exterior,7.4,.055,400,wetRoad,1.6,-.72,-50);road.name='Dry sunlit two-lane Kerala road';
  const gravel=material({color:0x5c6251,roughness:.93}),earth=material({color:0x627349,roughness:.97}),lineMat=material({color:0xc1bfa3,roughness:.36,metalness:.07});
  scannedSurface(gravel,'laterite',1,80);gravel.color.set(0xb9a38b);
  if(surfaces?.ground){
    const groundMaps=[surfaces.ground.color,surfaces.ground.normal,surfaces.ground.roughness].map(source=>{const t=source.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(80,133);t.needsUpdate=true;textures.add(t);return t;});
    groundScrollMaps.push(...groundMaps);
    const roadside=material({map:groundMaps[0],normalMap:groundMaps[1],roughnessMap:groundMaps[2],normalScale:new THREE.Vector2(.8,.8),roughness:.9,color:0xffffff});
    roadside.color.set(0xa6b59a); // Keep the scan's soil variation within the green gardens.
    const g=new THREE.PlaneGeometry(240,400,80,134);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let n=0;n<p.count;n++){const x=p.getX(n),z=p.getZ(n);p.setY(n,-.77+Math.sin(z*.23+x*.36)*.035*Math.min(1,Math.max(0,Math.abs(x-1.6)-4)/3));}g.computeVertexNormals();mesh(exterior,g,roadside,1.6,0,-50).name='Textured three-dimensional roadside soil and grass';
  }else box(exterior,240,.12,400,earth,1.6,-.83,-50);
  for(const x of [-2.35,5.55])box(exterior,.46,.035,400,gravel,x,-.69,-50);
  const puddle=material({color:0x879b8e,roughness:.07,metalness:.36,transparent:true,opacity:.28});
  const markings:THREE.Object3D[]=[];
  for(let i=0;i<42;i++){const mark=box(exterior,.105,.004,2.75,lineMat,1.6,-.687,-160+i*8.1);markings.push(mark);}
  for(const x of [-1.94,5.14])box(exterior,.07,.004,400,lineMat,x,-.687,-50);

  const foliage=material({color:0x38632e,roughness:.92,side:THREE.DoubleSide}),leafLight=material({color:0x608648,roughness:.88,side:THREE.DoubleSide}),trunk=material({color:0x6d6b53,roughness:.95});
  const distant=material({color:0x536e55,roughness:1}),poleMat=material({color:0x747c6a,roughness:.95});
  const architecture=createSpringKeralaRoadside({mesh,box,rod,material,canvasTexture,surface:scannedSurface,models});
  const scenery:THREE.Group[]=[];
  type TreePart={geometry:THREE.BufferGeometry;material:THREE.Material;foliage:boolean};
  const treeParts=new Map<string,TreePart[]>(),treeMaterials=new Map<THREE.Material,THREE.Material>();
  const treeQueues=new Map<THREE.Object3D,Map<string,{x:number;z:number;h:number;yaw:number}[]>>();
  function queueTree(root:THREE.Object3D,key:string,x:number,z:number,h:number,seed:number){
    const source=models[key];if(!source)return false;
    if(!treeParts.has(key)){
      source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
      const normalize=new THREE.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new THREE.Matrix4().makeTranslation(-centre.x,-bounds.min.y,-centre.z));
      const parts:TreePart[]=[];source.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(normalize);geometries.add(g);
        const foliage=(m:THREE.Material)=>/leaf|leaves|foliage|frond|twig/i.test(m.name)||(m as THREE.MeshStandardMaterial).alphaTest>0;
        const mats=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{if(treeMaterials.has(m))return treeMaterials.get(m)!;const copy=m.clone() as THREE.MeshStandardMaterial;materials.add(copy);treeMaterials.set(m,copy);copy.envMapIntensity=.7;copy.roughness=.85;copy.metalness=0;copy.emissive?.set(0);if(foliage(m)){copy.side=THREE.DoubleSide;copy.transparent=false;copy.alphaTest=.38;copy.depthWrite=true;if(key.startsWith('forest')){copy.color.set(0xffffff);copy.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat leafLight=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(.18,.38,.07)*(.65+leafLight*1.9);');};copy.customProgramCacheKey=()=> 'kerala-road-green-leaves';}}return copy;});
        // Imported kit vegetation uses one material per mesh; preserve geometry/UVs.
        if(mats.length===1)parts.push({geometry:g,material:mats[0],foliage:foliage(Array.isArray(o.material)?o.material[0]:o.material)});
      });treeParts.set(key,parts);
    }
    const byKey=treeQueues.get(root)??new Map();treeQueues.set(root,byKey);const poses=byKey.get(key)??[];byKey.set(key,poses);poses.push({x,z,h,yaw:seed*2.39996});return true;
  }
  // Coconut fronds are curved tapering leaflets, not cone-shaped cartoon trees.
  function palm(root:THREE.Object3D,x:number,z:number,h:number,seed:number){
    if(queueTree(root,'palm',x,z,h,seed))return;
    const p=new THREE.Group();p.position.set(x,-.75,z);root.add(p);const bend=(random(seed)-.5)*1.4;
    pipe(p,[[0,0,0],[bend*.2,h*.33,.10],[bend*.65,h*.7,.18],[bend,h,.30]],.105,trunk,18);
    for(let n=1;n<18;n++){const y=n*h/18;const ring=mesh(p,new THREE.TorusGeometry(.108,.008,5,10),trunk,bend*(y/h)**1.6,y,.3*y/h);ring.rotation.x=Math.PI/2;}
    for(let f=0;f<8;f++){
      const a=f*Math.PI/4+random(seed)*2,reach=2.1+random(seed+f+9)*1.3;
      const mid=new THREE.Vector3(bend+Math.sin(a)*reach*.53,h+.43,.3+Math.cos(a)*reach*.53),end=new THREE.Vector3(bend+Math.sin(a)*reach,h-.94-random(seed+f)*.6,.3+Math.cos(a)*reach);
      pipe(p,[[bend,h,.3],[mid.x,mid.y,mid.z],[end.x,end.y,end.z]],.019,leafLight,12);
      const verts:number[]=[],uvs:number[]=[];
      for(let n=0;n<19;n++){
        const t=n/18,centre=new THREE.Vector3().lerpVectors(new THREE.Vector3(bend,h,.3),end,t);centre.y+=Math.sin(t*Math.PI)*.85;const width=Math.sin(t*Math.PI)*.49;
        for(const side of [-1,1]){verts.push(centre.x+Math.cos(a)*width*side,centre.y-.08-Math.sin(t*11)*.03,centre.z-Math.sin(a)*width*side);uvs.push(side<0?0:1,t);}
      }
      const ix:number[]=[];for(let n=0;n<18;n++){const k=n*2;ix.push(k,k+1,k+2,k+1,k+3,k+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(ix);g.computeVertexNormals();mesh(p,g,f%2?foliage:leafLight);
      for(let n=2;n<16;n+=2){const t=n/18,c=new THREE.Vector3().lerpVectors(new THREE.Vector3(bend,h,.3),end,t);c.y+=Math.sin(t*Math.PI)*.85;const w=Math.sin(t*Math.PI)*.50;for(const s of [-1,1])rod(p,[c.x,c.y,c.z],[c.x+Math.cos(a)*w*s,c.y-.09,c.z-Math.sin(a)*w*s],.0028,distant);}
    }
    for(let n=0;n<4;n++)mesh(p,new THREE.SphereGeometry(.105,8,6),trunk,bend+(random(n+seed)-.5)*.26,h-.16,.3+(random(n+seed+4)-.5)*.22);
  }
  function broadleaf(root:THREE.Object3D,x:number,z:number,h:number,seed:number){
    if(queueTree(root,'forest-tree',x,z,h*1.8,seed))return;
    rod(root,[x,-.8,z],[x+.12,h*.7,z],.11,trunk);
    for(let n=0;n<7;n++){const a=n*2.4,r=.6+random(seed+n)*1.2;const bush=mesh(root,new THREE.SphereGeometry(1,10,7),n%2?foliage:leafLight,x+Math.sin(a)*r,h-.5+random(seed+n+10)*1.4,z+Math.cos(a)*r);bush.scale.set(1.5+random(n)*.6,.9+random(n+7)*.7,1.3+random(n+5)*.5);}
  }
  for(let i=0;i<20;i++){
    // Two complete parcels share each translating material batch. This keeps
    // the richer street near the previous draw budget and preserves 15m lots.
    if(i%2===0){const moving=new THREE.Group();moving.position.z=-185+i*15;moving.name='Kerala roadside strip '+i/2;exterior.add(moving);scenery.push(moving);}
    const strip=new THREE.Group();strip.position.z=i%2*15;strip.name='Roadside parcel segment '+i;scenery[scenery.length-1].add(strip);
    for(const s of [-1,1]){
      // Garden trees sit beyond the architecture, leaving shop fronts clear.
      const x=s<0?-17.8-random(i+29)*3:21+random(i+41)*3;
      palm(strip,x,random(i+4)*9,5.6+random(i+8)*3,i*7+(s+1)*40);
      if(models.palm)for(let n=0;n<2;n++)palm(strip,x+s*(4.0+n*4.2),2+n*5+random(i+n)*3,6.1+random(i+n+13)*3.2,i*23+n*7+(s+1)*61);
      for(let n=0;n<10;n++){const gx=(s<0?-3.2:6.3)+s*random(i*31+n)*2.8,gz=random(i*19+n+4)*14;queueTree(strip,'grass',gx,gz,.24+random(i+n+8)*.42,i*43+n);}
      if(i%3===0)queueTree(strip,'river-rock',s<0?-3.4:6.6,random(i)*11,.15+random(i+7)*.14,i);
      if(i%2===0)broadleaf(strip,x+s*5,5,3.2+random(i+18)*2,i+70);
      architecture.addLot(strip,s,i);
    }
    // Concrete electricity poles, three insulators, and sagging overhead service wires.
    const px=-3.8;box(strip,.13,8.0,.15,poleMat,px,3.23,0);box(strip,1.22,.09,.09,darkMetal,px,6.7,0);
    for(const dx of [-.49,0,.49]){mesh(strip,new THREE.CylinderGeometry(.043,.043,.12,8),creamEdge,px+dx,6.80,0);pipe(strip,[[px+dx,6.86,0],[px+dx,6.30,7.5],[px+dx,6.86,15]],.008,darkMetal,12);}
  }
  // The distant belt belongs to the same translating strips as the near trees.
  // Previously its GLB instances were parented straight to `exterior`, leaving
  // an unmoving green layer behind the windows while the foreground travelled.
  // Translation at equal world speed produces the correct slower angular
  // parallax at distance, without rotating the sky or faking a scrolling image.
  for(let i=0;i<scenery.length;i++)for(const s of [-1,1])for(let n=0;n<4;n++){
    const seed=i*2+n,x=s*(28+random(seed+4)*17),z=n*7.5+random(seed+18)*2,root=scenery[i];
    if(queueTree(root,'forest-tree-far',x,z,8+random(seed)*5,seed*3+s))continue;
    const bush=mesh(root,new THREE.SphereGeometry(1,9,6),distant,x,2.5+random(seed+8)*3,z);bush.scale.set(5.2,3.8+random(seed)*2,5.2);
  }
  // Each moving strip is merged independently, so scenery recycling preserves
  // the parallax of real geometry without several thousand foliage draw calls.
  function batchStaticRoot(root:THREE.Object3D){
    group.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),parts=new Map<THREE.Material,THREE.BufferGeometry[]>(),remove:THREE.Mesh[]=[];
    root.traverse(o=>{if(!(o instanceof THREE.Mesh)||o instanceof THREE.InstancedMesh||Array.isArray(o.material)||o.material.transparent)return;const g=o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));const list=parts.get(o.material)??[];list.push(g);parts.set(o.material,list);remove.push(o);});
    for(const [m,gs] of parts){const normalized=gs.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(normalized,false);if(merged)mesh(root,merged,m).name='Batched Kerala scenery';gs.forEach(g=>g.dispose());normalized.forEach(g=>{if(!gs.includes(g))g.dispose();});}remove.forEach(o=>{o.removeFromParent();o.geometry.dispose();geometries.delete(o.geometry);});parts.clear();remove.length=0;
  }
  const treeTransform=new THREE.Object3D();
  for(const [root,byKey] of treeQueues)for(const [key,poses] of byKey){
    // A single bound spanning both sides of the road keeps trees behind the
    // viewer on the GPU. Spatial batches retain every instance and its LOD,
    // while allowing both camera and sun frusta to reject the unseen side.
    const zones=new Map<string,typeof poses>();
    for(const pose of poses){const zone=(pose.x<0?'left':'right')+(Math.abs(pose.x)>25?'-far':'-near'),list=zones.get(zone)??[];list.push(pose);zones.set(zone,list);}
    for(const [zone,visiblePoses] of zones)for(const part of treeParts.get(key)??[]){
      const batch=new THREE.InstancedMesh(part.geometry,part.material,visiblePoses.length);batch.name='Actual GLB Kerala roadside '+key+' '+zone;
      visiblePoses.forEach((p,i)=>{treeTransform.position.set(p.x,-.75,p.z);treeTransform.rotation.set(0,p.yaw,0);treeTransform.scale.setScalar(p.h);treeTransform.updateMatrix();batch.setMatrixAt(i,treeTransform.matrix);});batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();root.add(batch);
    }
  }
  scenery.forEach(batchStaticRoot);
  // Bake immutable interior pieces by material. Thousands of rivets/seat parts
  // retain their 3D detail but cost only a few dozen draw calls.
  const dynamicRoots=new Set<THREE.Object3D>([...handles,...wipers,bladeRoot,steering]);
  cabin.updateMatrixWorld(true);const cabinInverse=cabin.matrixWorld.clone().invert();
  const bake:THREE.Mesh[]=[];
  cabin.traverse(o=>{
    if(!(o instanceof THREE.Mesh)||Array.isArray(o.material)||o.material.transparent)return;
    let p:THREE.Object3D|null=o;while(p&&p!==cabin){if(dynamicRoots.has(p))return;p=p.parent;}
    const g=o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(cabinInverse,o.matrixWorld));
    const attrs=g.attributes;if(!attrs.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(attrs.position.count*2),2));
    const list=staticParts.get(o.material)??[];list.push(g);staticParts.set(o.material,list);bake.push(o);
  });
  for(const [m,parts] of staticParts){
    // Mixing indexed/nonindexed sources requires a common representation.
    const normalized=parts.map(g=>g.index?g.toNonIndexed():g);const merged=mergeGeometries(normalized,false);
    if(merged){const obj=mesh(cabin,merged,m);obj.name='Batched bus body · '+(m===redVinyl?'stitched rexine':m===chrome?'tubular frames':'fittings');}
    parts.forEach(g=>g.dispose());normalized.forEach(g=>{if(!parts.includes(g))g.dispose();});
  }
  bake.forEach(o=>{o.removeFromParent();o.geometry.dispose();geometries.delete(o.geometry);});bake.length=0;staticParts.clear();
  const seatPosition=new THREE.Vector3(400-.975*SPRING_BUS_WIDTH_SCALE,1.285,-2.94);
  const aislePosition=new THREE.Vector3(400-.235*SPRING_BUS_WIDTH_SCALE,1.78,-3.36);
  const seatYaw=0;
  // Only nearby moving strips contribute to the sun map; refresh in the same
  // frame as their transforms so shadows cannot trail behind the bus.
  const stripCasters=scenery.map(strip=>{const meshes:THREE.Mesh[]=[];strip.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});return meshes;});
  const cabinLighting=createCabinLighting(cabinLamps),cabinMaterials=new Set<THREE.MeshStandardMaterial>();
  cabin.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial)cabinMaterials.add(m);});
  cabinMaterials.forEach(m=>cabinLighting.bind(m));
  // Opaque cabin panels reject roadside fragments before their PBR shaders run.
  // All detail, moving shadows and the transparent window pass are preserved.
  cabin.traverse(o=>{if(o instanceof THREE.Mesh&&(Array.isArray(o.material)?o.material:[o.material]).every(m=>!m.transparent))o.renderOrder=-1;});
  // Batching leaves empty construction containers behind. Removing those
  // shells avoids thousands of useless transform visits on every frame.
  const retained=new Set<THREE.Object3D>([cabin,exterior,...dynamicRoots,...scenery,...cabinLamps.map(l=>l.anchor)]);
  function pruneEmpty(parent:THREE.Object3D){for(const child of [...parent.children]){pruneEmpty(child);if(child instanceof THREE.Group&&!child.children.length&&!retained.has(child))parent.remove(child);}}
  pruneEmpty(group);
  // Fixed fittings inherit cabin sway and roadside movement from their parent.
  // Recompute local matrices only for the parts that actually move.
  group.updateMatrixWorld(true);group.traverse(o=>{o.matrixAutoUpdate=false;});
  for(const object of [cabin,...handles,...wipers,bladeRoot,steering,...markings,...scenery])object.matrixAutoUpdate=true;
  let travelled=0;
  function update(dt:number,elapsed:number,_camera?:THREE.Camera){
    if(!group.visible)return;
    const step=Math.min(.07,Math.max(0,dt));travelled+=step*8.7;
    cabin.rotation.z=Math.sin(elapsed*.77)*.0028+Math.sin(elapsed*3.3)*.0006;cabin.position.y=Math.sin(elapsed*7.1)*.0025;
    if(_camera){for(const lamp of cabinLamps)lamp.anchor.getWorldPosition(lamp.position);cabinLighting.update(1,true,_camera);}
    handles.forEach((h,i)=>{h.rotation.z=Math.sin(elapsed*1.6+i*.28)*.035+Math.sin(elapsed*.77)*.019;h.rotation.x=Math.sin(elapsed*1.1+i*.15)*.018;});
    wipers.forEach(w=>{w.rotation.z=-1.24;});
    bladeRoot.rotation.z=elapsed*24;steering.rotation.y=Math.sin(elapsed*.28)*.019;
    // Top-face UV v decreases along world Z. Positive texture offset makes the
    // asphalt and grass pass towards +Z, in agreement with every roadside prop.
    asphaltMap.offset.y=travelled/13.333;roadMaps.forEach(t=>{t.offset.y=travelled/3.5;});groundScrollMaps.forEach(t=>{t.offset.y=travelled/(400/133);});
    markings.forEach((m,i)=>{const start=i<42?-160+i*8.1:-170+random(i-42+6)*255;m.position.z=((start+travelled+200)%340)-200;});
    scenery.forEach((strip,i)=>{strip.position.z=((-185+i*30+travelled+200)%300)-200;const near=strip.position.z> -65&&strip.position.z<35;stripCasters[i].forEach(mesh=>{mesh.castShadow=near;});});
    if(step>0){daylight.shadow.needsUpdate=true;return true;}return false;
  }
  /** Returns the standing floor. Eye height remains the host controller's choice. */
  function floorHeight(x=400,z=0){const localX=(x-400)/SPRING_BUS_WIDTH_SCALE;if(Math.abs(localX)>=1.27||z<=-5.31||z>=5.4)return null;if((z>2.04&&z<2.76||z> -4.50&&z< -3.58)&&localX<-.83)return localX< -1.08?-.09:localX<-.95?.015:.12;return .15;}
  /** The passenger can explore every row gap and the rear vestibule, but cannot walk through cushions or doors. */
  function constrainPosition(position:THREE.Vector3){
    let x=clamp((position.x-400)/SPRING_BUS_WIDTH_SCALE,-1.055,1.055),z=clamp(position.z,-3.37,4.43);
    const radius=.105;
    for(let n=0;n<3;n++)for(const s of seatSolids){
      const minX=s.minX-radius,maxX=s.maxX+radius,minZ=s.minZ-radius,maxZ=s.maxZ+radius;
      if(x<=minX||x>=maxX||z<=minZ||z>=maxZ)continue;
      const candidates=[{x:minX,z},{x:maxX,z},{x,z:minZ},{x,z:maxZ}].filter(p=>p.x>=-1.055&&p.x<=1.055&&p.z>=-3.37&&p.z<=4.43);
      candidates.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
      if(candidates.length){x=candidates[0].x;z=candidates[0].z;}
    }
    // Front engine bulkhead and the rear bench leave a continuous accessible aisle.
    if(z< -3.18&&x>.14)x=.14;
    for(const poleZ of stanchionZ){const dx=x+.365,dz=z-poleZ,d=Math.hypot(dx,dz),clearance=radius+.018;if(d<clearance){if(d<1e-6)x=-.365+clearance;else{x=-.365+dx/d*clearance;z=poleZ+dz/d*clearance;}}}
    position.x=400+clamp(x,-1.055,1.055)*SPRING_BUS_WIDTH_SCALE;position.z=clamp(z,-3.37,4.43);
  }
  // Seat-top coordinates are cabin-local so added keepsakes inherit the same
  // suspension motion and width scale as their seat.
  // Third right-hand three-person bench from the rear: row 9, 8, then 7.
  // The full-width five-person rear bench is not a three-person seat.
  const seatPropPosition=new THREE.Vector3(.585,.639,-2.90+7*.76);
  return {group,cabin,skyTexture,seatPosition,seatPropPosition,aislePosition,seatYaw,update,constrainPosition,floorHeight,
    shutterCount,closedShutterCount:closedShutters.size,roadsideStats:architecture.stats(),
    get seatCount(){return seatNumber;},
    dispose(){group.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();group.clear();},
  };
}
