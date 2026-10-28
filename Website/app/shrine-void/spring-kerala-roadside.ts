import * as THREE from 'three';

type Builder={
  mesh:(root:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x?:number,y?:number,z?:number)=>THREE.Mesh;
  box:(root:THREE.Object3D,w:number,h:number,d:number,m:THREE.Material,x?:number,y?:number,z?:number,r?:number)=>THREE.Mesh;
  rod:(root:THREE.Object3D,a:number[],b:number[],r:number,m:THREE.Material)=>THREE.Mesh;
  material:(p:THREE.MeshStandardMaterialParameters)=>THREE.MeshStandardMaterial;
  canvasTexture:(w:number,h:number,paint:(c:CanvasRenderingContext2D)=>void,rx?:number,ry?:number)=>THREE.CanvasTexture;
  surface:(m:THREE.MeshStandardMaterial,prefix:string,rx:number,ry:number)=>void;
  models:Record<string,THREE.Object3D>;
};

export const SPRING_ROADSIDE_MODELS=Object.fromEntries(['fence','shutter','crate','barrel','plant','chair'].map(key=>['roadside-'+key,'/seasons/kit/spring-roadside/'+key+'.glb']));

/** Metre-scale Kerala street architecture. Openings, verandas, roofs, shop
 * interiors, gates and drainage are physical geometry, seen in real parallax. */
export function createSpringKeralaRoadside({mesh,box,rod,material,canvasTexture,surface,models}:Builder){
  const walls=[0xe3ddc6,0xd2d9cc,0xc4d5d1,0xdac2a5,0xe7d9c8].map(color=>{const m=material({color,roughness:.94});surface(m,'plaster',2.5,1.5);return m;});
  const cement=material({color:0x96988b,roughness:.94}),damp=material({color:0x65705c,roughness:1});surface(cement,'plaster',2,1);
  const laterite=material({color:0xc2a08b,roughness:1});surface(laterite,'masonry',3,1);
  const roof=material({color:0xd0a18b,roughness:.94});surface(roof,'roof',4,2);
  const ridge=material({color:0x8c5036,roughness:.94}),timber=material({color:0x53402a,roughness:.83});surface(timber,'plaster',1,2);
  const paintedWood=material({color:0x55796f,roughness:.81}),iron=material({color:0x283b36,roughness:.65,metalness:.65});
  const sill=material({color:0xc7c7b4,roughness:.85}),inside=material({color:0x18231d,roughness:.95});
  const window=material({color:0x25433c,roughness:.25,metalness:.3}),steel=material({color:0x92998d,metalness:.78,roughness:.4});
  const awnings=[0x3d6c64,0x9b5742,0x506a82].map(color=>material({color,roughness:.9,side:THREE.DoubleSide}));
  const terracotta=material({color:0x9c6141,roughness:.9}),leaf=material({color:0x3c6136,roughness:.9,side:THREE.DoubleSide});
  const yellow=material({color:0xbd963c,roughness:.8}),fruitGreen=material({color:0x637a37,roughness:.85}),fruitRed=material({color:0x9e4b32,roughness:.82});
  const tanks=material({color:0x263730,roughness:.75});
  const signCache=new Map<string,THREE.Material>();
  const importedMaterials=new Map<THREE.Material,THREE.Material>();
  const random=(seed:number)=>{const n=Math.sin(seed*91.71+6.71)*43758.5453;return n-Math.floor(n);};
  // Shared image textures retain their scan detail; subtle base staining makes
  // the plaster meet damp tropical ground rather than float above a flat lawn.
  walls.forEach(m=>{m.onBeforeCompile=shader=>{
    shader.vertexShader='varying float roadsideHeight;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nroadsideHeight=(modelMatrix*vec4(transformed,1.)).y;');
    shader.fragmentShader='varying float roadsideHeight;\n'+shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat footDamp=1.-smoothstep(-.55,-.16,roadsideHeight);diffuseColor.rgb*=mix(vec3(1.),vec3(.69,.74,.62),footDamp*.48);');
  };m.customProgramCacheKey=()=> 'kerala-plaster-ground-contact-v1';});
  let buildingCount=0,shopCount=0,gateCount=0;

  function group(parent:THREE.Object3D,name:string,x=0,y=0,z=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
  function imported(parent:THREE.Object3D,key:string,x:number,y:number,z:number,size:number,yaw=0){
    const template=models['roadside-'+key];if(!template)return null;
    const copy=template.clone(true),bounds=new THREE.Box3().setFromObject(copy),extent=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
    copy.position.sub(new THREE.Vector3(centre.x,bounds.min.y,centre.z));
    const root=group(parent,'Imported roadside '+key,x,y,z);root.add(copy);root.scale.setScalar(size/Math.max(extent.x,extent.y,extent.z));root.rotation.y=yaw;
    copy.traverse(o=>{if(!(o instanceof THREE.Mesh))return;o.castShadow=o.receiveShadow=true;
      const own=(m:THREE.MeshStandardMaterial)=>{let shared=importedMaterials.get(m);if(!shared){shared=material({}).copy(m);importedMaterials.set(m,shared);}return shared;};
      o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);
    });return root;
  }
  function sign(parent:THREE.Object3D,text:string,sub:string,width:number,x:number,y:number,z:number,palette=0){
    const key=text+'|'+sub;
    let m=signCache.get(key);if(!m){const map=canvasTexture(1024,256,c=>{
      c.fillStyle=['#2f5c50','#914b35','#37556c'][palette%3];c.fillRect(0,0,1024,256);
      c.strokeStyle='#d8cca0';c.lineWidth=5;c.strokeRect(13,13,998,230);
      c.textAlign='center';c.fillStyle='#f2e8c9';c.font='600 73px "Nirmala UI", Arial, sans-serif';c.fillText(text,512,113,950);
      c.font='37px "Nirmala UI", Arial, sans-serif';c.fillStyle='#ded4b6';c.fillText(sub,512,194,950);
    });m=material({map,roughness:.85});signCache.set(key,m);}
    // Plane fronts point toward the road, the negative local Z direction.
    const height=Math.min(width/4,.68);
    const board=mesh(parent,new THREE.PlaneGeometry(width,height),m,x,y,z);board.rotation.y=Math.PI;
    box(parent,width+.10,height+.09,.10,timber,x,y,z+.055);
  }
  function openingWall(parent:THREE.Object3D,width:number,height:number,z:number,m:THREE.Material,holes:{x:number;w:number;sill:number;top:number}[]){
    let cursor=-width/2;
    for(const h of [...holes].sort((a,b)=>a.x-b.x)){
      const left=h.x-h.w/2,right=h.x+h.w/2;
      if(left>cursor)box(parent,left-cursor,height,.24,m,(left+cursor)/2,height/2,z);
      if(h.sill>0)box(parent,h.w,h.sill,.24,m,h.x,h.sill/2,z);
      if(h.top<height)box(parent,h.w,height-h.top,.24,m,h.x,(height+h.top)/2,z);
      cursor=right;
    }
    if(cursor<width/2)box(parent,width/2-cursor,height,.24,m,(cursor+width/2)/2,height/2,z);
  }
  function framedWindow(parent:THREE.Object3D,x:number,y:number,z:number,w=1.16,h=1.22,shutters=true){
    const frame=group(parent,'Recessed barred timber window',x,y,z);
    box(frame,w,h,.035,window,0,0,.07);
    for(const dx of [-1,1])box(frame,.067,h+.12,.13,timber,dx*(w+.065)/2,0,-.02);
    for(const dy of [-1,1])box(frame,w+.20,.067,.13,timber,0,dy*(h+.065)/2,-.02);
    box(frame,w+.30,.08,.43,sill,0,-h/2-.10,-.10);
    box(frame,w+.41,.075,.69,sill,0,h/2+.19,-.19);
    for(let n=1;n<5;n++)box(frame,.015,h,.018,iron,-w/2+n*w/5,0,-.05);
    box(frame,w,.014,.018,iron,0,0,-.05);
    if(shutters)for(const side of [-1,1]){
      const leaf=group(frame,'Louvred window shutter',side*(w/2+.08),0,-.08);leaf.rotation.y=side*.65;
      box(leaf,w*.43,h,.055,paintedWood,side*w*.22,0,0);
      for(let n=0;n<6;n++){const l=box(leaf,w*.37,.075,.032,timber,side*w*.22,-h*.40+n*h*.16,-.04);l.rotation.x=.22;}
    }
  }
  function door(parent:THREE.Object3D,x:number,z:number,open=false){
    box(parent,1.02,2.12,.035,inside,x,1.06,z+.10);
    for(const dx of [-.57,.57])box(parent,.09,2.25,.17,timber,x+dx,1.125,z-.03);
    box(parent,1.23,.09,.17,timber,x,2.22,z-.03);
    const leaf=group(parent,'Panelled timber front door',x-.50,0,z-.04);leaf.rotation.y=open?-.83:0;
    box(leaf,.99,2.09,.055,timber,.495,1.045,0);
    for(const y of [.40,1.05,1.72])for(const dx of [.25,.74])box(leaf,.36,.42,.018,paintedWood,dx,y,-.036);
    box(leaf,.025,.17,.04,steel,.86,1.06,-.07);
  }
  function pitchedRoof(parent:THREE.Object3D,width:number,depth:number,eaveY:number,rise:number){
    const half=depth/2+.40,slope=Math.hypot(half,rise),angle=Math.atan2(rise,half);
    for(const side of [-1,1]){
      const panel=box(parent,width+.78,.10,slope,roof,0,eaveY+rise/2,side*half/2);panel.rotation.x=side*angle;
      box(parent,width+.82,.12,.10,timber,0,eaveY-.035,side*half);
      // Rounded clay end tiles and ridge caps give the roof a real silhouette.
      const count=Math.ceil((width+.72)/.28);
      for(let n=0;n<count;n++){
        const tile=mesh(parent,new THREE.CylinderGeometry(.086,.086,.33,6,1,true,0,Math.PI),ridge,-(width+.72)/2+(n+.5)*(width+.72)/count,eaveY+.035,side*(half-.13));
        tile.rotation.set(Math.PI/2-side*angle,0,Math.PI/2);
      }
    }
    for(let n=0;n<Math.ceil(width/.34);n++){
      const cap=mesh(parent,new THREE.CylinderGeometry(.12,.12,.36,6,1,true,0,Math.PI),ridge,-width/2+n*.34,eaveY+rise+.035,0);cap.rotation.z=Math.PI/2;
    }
    for(const side of [-1,1]){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([side*width/2,eaveY,-depth/2,side*width/2,eaveY,depth/2,side*width/2,eaveY+rise,0],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));g.setIndex(side<0?[0,2,1]:[0,1,2]);g.computeVertexNormals();mesh(parent,g,walls[0]);
      for(const z of [-depth/2,depth/2])rod(parent,[side*(width/2+.22),eaveY,z],[side*(width/2+.22),eaveY+rise,0],.038,timber);
    }
    // Roof runoff enters an actual pipe, ending at the ground drain.
    const gutter=box(parent,width+.85,.10,.11,iron,0,eaveY-.08,-half-.04);gutter.name='Eave gutter';
    rod(parent,[-width/2,eaveY-.08,-half],[-width/2,.16,-half],.032,iron);
  }
  function porch(parent:THREE.Object3D,width:number,z:number,top=2.66){
    box(parent,width+.44,.21,1.70,cement,0,.105,z-.72);
    box(parent,width+.20,.10,.30,sill,0,.05,z-1.66);
    for(const x of [-width/2+.12,width/2-.12]){
      box(parent,.24,top,.24,walls[0],x,top/2,z-1.30);
      box(parent,.34,.12,.34,sill,x,.15,z-1.30);box(parent,.34,.13,.34,sill,x,top-.10,z-1.30);
    }
    const awning=box(parent,width+.72,.11,1.94,roof,0,top+.08,z-.76);awning.rotation.x=-.10;
    for(let n=0;n<7;n++)box(parent,.065,.105,1.75,timber,-width/2+.12+n*(width-.24)/6,top-.05,z-.75);
  }
  function pottedPlant(parent:THREE.Object3D,x:number,z:number,size=.5){
    if(imported(parent,'plant',x,.12,z,size))return;
    mesh(parent,new THREE.CylinderGeometry(.15,.11,.26,10),terracotta,x,.25,z);
    for(let n=0;n<7;n++){
      const a=n*2.4,blade=mesh(parent,new THREE.PlaneGeometry(.13,.57),leaf,x+Math.sin(a)*.12,.55,z+Math.cos(a)*.12);blade.rotation.set(.4,a,.25*Math.sin(a));
    }
  }
  function boundary(parent:THREE.Object3D,width:number,z:number,index:number){
    const opening=2.8,gateX=index%2?1.3:0,low=index%3===1;
    for(const [a,b] of [[-width/2,gateX-opening/2],[gateX+opening/2,width/2]]){
      const length=b-a;if(length<=0)continue;
      box(parent,length,.50,.23,laterite,(a+b)/2,.25,z);
      box(parent,length,.085,.32,sill,(a+b)/2,.54,z);
      if(!low){
        for(let n=0;n<Math.ceil(length/.19);n++)box(parent,.018,.58,.02,iron,a+(n+.5)*length/Math.ceil(length/.19),.88,z);
        for(const y of [.65,1.14])box(parent,length,.022,.025,iron,(a+b)/2,y,z);
      }
    }
    for(const x of [-width/2,gateX-opening/2,gateX+opening/2,width/2]){
      box(parent,.31,1.32,.35,walls[(index+1)%walls.length],x,.66,z);box(parent,.39,.10,.42,sill,x,1.34,z);
    }
    const gate=group(parent,'Two-leaf iron entrance gate',gateX,0,z);gateCount++;
    for(const side of [-1,1]){
      const leaf=group(gate,'Gate leaf',side*opening/2,0,0);leaf.rotation.y=side*(index%4===0?.34:.03);
      const mid=-side*opening/4;
      for(const y of [.18,1.17])box(leaf,opening/2,.045,.045,iron,mid,y,0);
      for(let n=0;n<8;n++)box(leaf,.024,1.02,.028,iron,-side*(.09+n*(opening/2-.15)/7),.68,0);
    }
    // Gate, bridge over the drain and front door share one continuous approach.
    box(parent,opening+.2,.12,1.52,cement,gateX,-.01,z-.73);
    box(parent,2.08,.035,Math.max(.8,Math.abs(z)-2.8),cement,gateX,.045,(z-2.8)/2);
  }
  function home(parent:THREE.Object3D,index:number,modern:boolean){
    const w=6.3+random(index)*1.1,d=5.1+random(index+3)*.9,h=modern?2.95:2.75,m=walls[index%walls.length];
    parent.name=modern?'Kerala concrete house · balcony and terrace':'Kerala tiled house · shaded veranda';buildingCount++;
    box(parent,w+.23,.24,d+.24,cement,0,.12,0);
    box(parent,w,h,.24,m,0,h/2,d/2);
    for(const side of [-1,1]){
      const wall=group(parent,'Side wall with recessed window',side*w/2,0,0);wall.rotation.y=-side*Math.PI/2;
      openingWall(wall,d,h,0,m,[{x:0,w:1.28,sill:.92,top:2.18}]);framedWindow(wall,0,1.55,-.02,1.17,1.14,false);
    }
    openingWall(parent,w,h,-d/2,m,[{x:-2.05,w:1.30,sill:.92,top:2.22},{x:0,w:1.15,sill:0,top:2.27},{x:2.05,w:1.30,sill:.92,top:2.22}]);
    for(const x of [-2.05,2.05])framedWindow(parent,x,1.57,-d/2-.04,1.17,1.17,!modern);
    door(parent,0,-d/2-.03,index%3===0);porch(parent,w,-d/2,modern?2.80:2.62);
    for(const side of [-1,1])box(parent,.025,.23,d+.12,damp,side*(w/2+.13),.26,0);
    if(!modern)pitchedRoof(parent,w,d,h+.04,1.14);
    else {
      const upper=group(parent,'Recessed first floor',0,h+.13,.45),uw=w-.5,ud=d-1.1,uh=2.65;
      box(parent,w+.55,.20,d+.54,sill,0,h+.03,0);
      box(upper,uw,uh,ud,m,0,uh/2,0);
      for(const x of [-1.77,1.77])framedWindow(upper,x,1.46,-ud/2-.15,1.22,1.23,false);
      box(upper,uw+.38,.18,ud+.38,sill,0,uh+.04,0);
      for(const x of [-uw/2,uw/2])box(upper,.14,.57,ud+.32,m,x,uh+.38,0);
      box(upper,uw,.57,.14,m,0,uh+.38,ud/2);
      // Balcony casts its own thin, correctly spaced railing shadows.
      box(upper,uw+.18,.16,1.15,sill,0,-.03,-ud/2-.47);
      for(const y of [.19,1.02])box(upper,uw,.035,.035,iron,0,y,-ud/2-1);
      for(let n=0;n<27;n++)box(upper,.018,.86,.018,iron,-uw/2+n*uw/26,.6,-ud/2-1);
      mesh(upper,new THREE.CylinderGeometry(.54,.54,.9,16),tanks,1.6,uh+.62,.65);
      for(const y of [uh+.26,uh+.48,uh+.7,uh+.92])mesh(upper,new THREE.TorusGeometry(.547,.018,4,16),tanks,1.6,y,.65).rotation.x=Math.PI/2;
      mesh(upper,new THREE.CylinderGeometry(.59,.59,.06,16),tanks,1.6,uh+1.1,.65);
      rod(upper,[1.6,uh+.14,.65],[1.6,-2.8,.65],.024,iron);
    }
    pottedPlant(parent,-2.35,-d/2-.9,.62);if(modern||index%2===0)pottedPlant(parent,2.3,-d/2-.85,.58);
    if(index%3===0)imported(parent,'chair',1.16,.22,-d/2-.82,.84,Math.PI+.17);
    boundary(parent,12,-d/2-3.45,index);
  }
  function shop(parent:THREE.Object3D,index:number){
    const kinds=[['SREE TEA & SNACKS','ചായ · കാപ്പി · പലഹാരം'],['ANU STORES','GROCERIES · PROVISIONS'],['MALABAR BAKERY','FRESH BREAD · TEA · SNACKS'],['COASTAL HARDWARE','PAINTS · TOOLS · PLUMBING'],['ROSE TAILORS','STITCHING · ALTERATIONS']];
    const kind=index%kinds.length,w=7.4,d=4.8,h=3.28,m=walls[(index+2)%walls.length];
    parent.name='Open roadside shop · '+kinds[kind][0];buildingCount++;shopCount++;
    box(parent,w+.30,.18,d+.30,cement,0,.09,0);box(parent,w,h,.22,m,0,h/2,d/2);
    for(const side of [-1,1])box(parent,.24,h,d,m,side*w/2,h/2,0);
    box(parent,w,.50,.24,m,0,h-.25,-d/2);
    for(const x of [-w/2,0,w/2])box(parent,.24,h,.30,m,x,h/2,-d/2);
    box(parent,w-.5,.035,d-.45,cement,0,.20,0);
    // The dark rear, shelves and counter sit behind the actual open frontage.
    box(parent,w-.5,h-.6,.035,inside,0,(h-.6)/2+.2,d/2-.15);
    for(const y of [.65,1.27,1.89]){
      box(parent,w-.75,.07,.48,timber,0,y,d/2-.41);
      for(let n=0;n<12;n++)box(parent,.20,.29,.20,[fruitGreen,yellow,terracotta,paintedWood][(n+kind)%4],-w/2+.6+n*(w-1.2)/11,y+.18,d/2-.43);
    }
    box(parent,2.7,.92,.70,timber,-1.75,.65,-d/2+.30);
    box(parent,2.78,.075,.78,sill,-1.75,1.15,-d/2+.30);
    for(let n=0;n<5;n++){
      const jar=mesh(parent,new THREE.CylinderGeometry(.085,.085,.26,8),n%2?yellow:terracotta,-2.70+n*.46,1.32,-d/2+.25);jar.name='Counter jars and tins';
    }
    if(kind===0||kind===2){
      mesh(parent,new THREE.CylinderGeometry(.17,.17,.22,12),steel,-1.2,1.30,-d/2+.3);
      box(parent,1.48,.08,.46,timber,1.75,.60,-d/2-1.05);
      for(const x of [1.1,2.4])for(const z of [-d/2-.92,-d/2-1.21])box(parent,.055,.55,.055,iron,x,.30,z);
      for(let n=0;n<3;n++)mesh(parent,new THREE.CylinderGeometry(.035,.027,.095,8),sill,1.3+n*.35,.69,-d/2-1.05);
      imported(parent,'chair',.55,.14,-d/2-.74,.85,-.27);
    }
    for(const x of [1.1,2.45]){
      if(!imported(parent,'crate',x,.2,-d/2+.15,.63)){
        box(parent,.59,.42,.52,paintedWood,x,.4,-d/2+.15);
        for(let n=0;n<4;n++)box(parent,.49,.035,.018,timber,x,.26+n*.09,-d/2-.12);
      }
      for(let n=0;n<5;n++){const fruit=mesh(parent,new THREE.SphereGeometry(.095,6,4),kind%2?fruitRed:fruitGreen,x+(n%3-1)*.14,.68,-d/2+.05+Math.floor(n/3)*.16);fruit.scale.y=.85;}
    }
    if(kind===3)imported(parent,'barrel',2.9,.19,-.9,1.05);
    sign(parent,kinds[kind][0],kinds[kind][1],w-.65,0,3.14,-d/2-.21,kind);
    pitchedRoof(parent,w,d,3.58,.90);
    const awning=box(parent,w+.55,.075,1.95,awnings[kind%3],0,2.62,-d/2-.88);awning.rotation.x=-.13;
    box(parent,w+.55,.22,.045,awnings[kind%3],0,2.39,-d/2-1.85);
    for(const x of [-w/2,w/2])rod(parent,[x,.15,-d/2-1.78],[x,2.55,-d/2-1.78],.032,iron);
    box(parent,w+.25,.12,1.52,cement,0,.06,-d/2-.74);
    if(index%2===0)imported(parent,'shutter',1.85,.20,-d/2+.035,2.45,Math.PI);
    pottedPlant(parent,-w/2+.18,-d/2-1.15,.66);
  }
  function shelter(parent:THREE.Object3D){
    parent.name='Village bus shelter · open paved forecourt';
    box(parent,5,.16,2.3,cement,0,.08,0);
    for(const x of [-2.2,2.2])box(parent,.18,2.7,.18,sill,x,1.35,.72);
    box(parent,4.6,1.38,.16,walls[1],0,1.13,.85);
    const top=box(parent,5.3,.12,2.75,roof,0,2.78,-.17);top.rotation.x=-.10;
    box(parent,3.3,.13,.48,timber,0,.62,.20);for(const x of [-1.3,1.3])box(parent,.14,.54,.40,cement,x,.30,.2);
    sign(parent,'BUS STOP','KSRTC · KONNI',2.7,0,2.32,.74,0);
    pottedPlant(parent,2,-.6,.7);
  }
  function addLot(strip:THREE.Group,side:number,index:number){
    const seed=index*2+(side>0?1:0),kind=seed%9;
    const isShop=kind===0||kind===4||kind===7;
    const x=isShop?(side<0?-8.65:11.85):(side<0?-12.2:15.4);
    const lot=group(strip,'Kerala roadside parcel',x,-.75,7.5+(random(seed+9)-.5)*1.2);lot.rotation.y=side*Math.PI/2;
    if(kind===5){lot.position.x=side<0?-6.6:9.8;shelter(lot);}
    else if(kind===8){
      lot.name='Coconut garden behind chain-link boundary';
      if(models['roadside-fence']){
        const bounds=new THREE.Box3().setFromObject(models['roadside-fence']),extent=bounds.getSize(new THREE.Vector3());
        const height=1.65,width=extent.x/extent.y*height,count=Math.ceil(12/width);
        for(let n=0;n<count;n++)imported(lot,'fence',-6+(n+.5)*width,0,-5.4,Math.max(extent.x,extent.y,extent.z)/extent.y*height,Math.PI);
      }else boundary(lot,12,-5.4,seed);
    }else if(isShop)shop(lot,seed);else home(lot,seed,kind===2||kind===6);
    // Road-parallel open concrete channel. Each entrance crosses on a slab.
    const drainX=side<0?-3.28:6.48;
    box(strip,.53,.045,15,inside,drainX,-.76,7.5);
    for(const dx of [-.31,.31])box(strip,.10,.25,15,cement,drainX+dx,-.72,7.5);
    box(strip,1.65,.12,2.8,cement,drainX,-.60,7.5);
    // An asphalt-coloured driveway meets the shoulder, with a raised shop apron.
    if(isShop)box(strip,side<0?3.8:3.8,.06,9.3,cement,side<0?-4.76:7.96,-.72,7.5);
    return lot;
  }
  return {addLot,stats:()=>({buildings:buildingCount,shops:shopCount,gates:gateCount,signs:signCache.size})};
}
