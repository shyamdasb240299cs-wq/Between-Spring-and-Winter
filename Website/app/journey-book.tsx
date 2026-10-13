"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { bookSheets, CLOSE_START, PAGE_STEP, READ_START, TURN_START, smooth, clamp } from "./journey-data";
import { PrintedPages } from "./printed-pages";
import { CLOSED_BOOK_CENTER, settleBookYaw, bookViewport } from "./book-motion";
import {motionAudit} from './motion-audit';

export default function JourneyBook({position,readCursor}:{position:RefObject<number>;readCursor:RefObject<number|null>;paused:boolean}){
  const host=useRef<HTMLDivElement>(null);const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    const parent=host.current!,audit=motionAudit(parent);let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});}catch{return;}
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;parent.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(31,1,2,80),book=new THREE.Group(),presentation=new THREE.Group();presentation.add(book);scene.add(presentation);
    camera.position.set(0,0,12.8);
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.6;room.dispose();
    scene.add(new THREE.HemisphereLight(0xd3e3e1,0x18251c,.9));const key=new THREE.DirectionalLight(0xfff4e2,2.4);key.position.set(-3,5,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=4;key.shadow.camera.top=3.4;key.shadow.camera.bottom=-3.4;key.shadow.camera.near=.5;key.shadow.camera.far=30;key.shadow.bias=-.00004;key.shadow.normalBias=.0015;key.shadow.radius=3;scene.add(key);const fill=new THREE.DirectionalLight(0xdbe6e3,1);fill.position.set(4,-1,4);scene.add(fill);
    let dirty=true,dead=false,programsReady=false,announcedLoaded=false;
    const loader=new THREE.TextureLoader(),textures:THREE.Texture[]=[];
    const texture=(src:string,reverse=false)=>{const t=loader.load(src,()=>{dirty=true;});t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());if(reverse){t.repeat.x=-1;t.offset.x=1;}textures.push(t);return t;};
    const cloth=texture("/materials/binding-cloth.webp"),paper=texture("/materials/paper-stock.webp");
    cloth.wrapS=cloth.wrapT=paper.wrapS=paper.wrapT=THREE.RepeatWrapping;cloth.repeat.set(5,7);paper.repeat.set(4,6);
    // Printed leaves load around the current spread instead of decoding the
    // entire chapter and uploading every full-resolution page at startup.
    let uploadFrame=0;
    const visiblePrints=new Set<string>();
    const uploads:{map:THREE.Texture;resolve:()=>void;reject:(reason:Error)=>void}[]=[];
    function scheduleUpload(){return requestAnimationFrame(uploadNext);}
    const uploadNext=()=>{
      uploadFrame=0;const item=uploads.shift();if(!item)return;
      try{renderer.initTexture(item.map);item.resolve();}catch(error){item.reject(error instanceof Error?error:new Error('Page upload failed'));}
      if(uploads.length)uploadFrame=scheduleUpload();
    };
    const firstPrints=bookSheets.slice(0,3).flatMap(sheet=>[{src:sheet.front.src,reverse:false},{src:sheet.back.src,reverse:true}]);
    function revealBook(){if(!dead&&programsReady&&!announcedLoaded&&prints.ready(firstPrints)){announcedLoaded=true;dirty=true;setLoaded(true);parent.dataset.loaded='true';}}
    const prints=new PrintedPages(loader,Math.min(4,renderer.capabilities.getMaxAnisotropy()),src=>{if(visiblePrints.has(src))dirty=true;revealBook();},map=>new Promise<void>((resolve,reject)=>{uploads.push({map,resolve,reject});if(!uploadFrame)uploadFrame=scheduleUpload();}));
    const binding=new THREE.MeshPhysicalMaterial({map:cloth,color:0x6b6b6b,bumpMap:cloth,bumpScale:.0009,roughness:.94,sheen:.12,sheenColor:0x3c4455,metalness:0});
    const pageEdges=new THREE.MeshStandardMaterial({color:0xeee6d8,roughness:1,bumpMap:paper,bumpScale:.0005});
    const closedSpine=new THREE.Mesh(new THREE.CylinderGeometry(.0452,.0452,4.48,32,1,false,0,Math.PI),binding);closedSpine.position.set(-1.43,0,-.02135);closedSpine.visible=false;book.add(closedSpine);
    // A continuous cloth web joins the original case spine to both boards.
    // The rounded shells alone leave an open strip at their meeting edge.
    const bindingWeb=new THREE.Mesh(new THREE.BoxGeometry(.125,4.48,.0905),binding);bindingWeb.position.set(-1.4675,0,-.02135);bindingWeb.castShadow=true;bindingWeb.receiveShadow=true;book.add(bindingWeb);
    // Fill the bound edge and paper block between the boards when shut.
    const closedBlock=new THREE.Mesh(new THREE.BoxGeometry(2.858,4.358,.031),pageEdges);closedBlock.position.set(0,0,-.021);closedBlock.castShadow=true;closedBlock.receiveShadow=true;book.add(closedBlock);
    const sheets=bookSheets.map((sheet,i)=>{
      const geometry=new THREE.PlaneGeometry(2.86,4.36,64,3);geometry.translate(1.43,0,0);
      (geometry.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);(geometry.attributes.normal as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      const fold={value:0},gutter={value:1};
      const print=(src:string,reverse:boolean,side:THREE.Side)=>{
        const mat=prints.material(src,reverse,side);
        mat.onBeforeCompile=shader=>{shader.uniforms.uFold=fold;shader.uniforms.uGutter=gutter;shader.uniforms.uPaper={value:paper};shader.vertexShader="varying vec2 vSheetUv;\n"+shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvSheetUv=uv;");shader.fragmentShader="uniform float uFold;uniform float uGutter;uniform sampler2D uPaper;varying vec2 vSheetUv;\n"+shader.fragmentShader.replace("#include <opaque_fragment>","outgoingLight *= (0.994 + 0.006*texture2D(uPaper,vSheetUv*vec2(4.,6.)).r) * (1.0 - (0.11+0.15*uGutter)*exp(-vSheetUv.x*18.0) - 0.10*sin(uFold*3.14159265)*pow(abs(vSheetUv.x-.5)*2.0,2.0));\n#include <opaque_fragment>");};
        return mat;
      };
      const front=new THREE.Mesh(geometry,print(sheet.front.src,false,THREE.FrontSide));
      const back=new THREE.Mesh(geometry,print(sheet.back.src,true,THREE.BackSide));
      const edgeGeometry=new THREE.BufferGeometry(),edgePositions=new Float32Array((65*4+4*2)*3),edgeIndices:number[]=[];
      for(const start of [0,130,260]){const count=start===260?4:65;for(let j=0;j<count-1;j++){const a=start+2*j;edgeIndices.push(a,a+1,a+2,a+1,a+3,a+2);}}
      edgeGeometry.setAttribute("position",new THREE.BufferAttribute(edgePositions,3).setUsage(THREE.DynamicDrawUsage));edgeGeometry.setAttribute("normal",new THREE.BufferAttribute(new Float32Array(edgePositions.length),3).setUsage(THREE.DynamicDrawUsage));edgeGeometry.setIndex(edgeIndices);
      const edge=new THREE.Mesh(edgeGeometry,pageEdges);front.frustumCulled=false;back.frustumCulled=false;edge.frustumCulled=false;
      front.castShadow=true;front.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
      back.customDepthMaterial=front.customDepthMaterial;
      const shadow=new THREE.Mesh(geometry,new THREE.ShadowMaterial({color:0x1a1814,opacity:.30,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));shadow.receiveShadow=true;shadow.frustumCulled=false;
      const pivot=new THREE.Group();pivot.position.set(-1.43,0,-.014-i*.0012);pivot.add(front,back,edge,shadow);book.add(pivot);
      return {pivot,front,back,geometry,edgeGeometry,fold,gutter,angles:new Float64Array(64),velocity:new Float64Array(64),lastTurn:-1,direction:1,settled:false,wasVisible:false};
    });
    const preloadSpread=(index:number, target=index)=>{
      const requests:{src:string;reverse:boolean;priority:number}[]=[];
      for(const i of new Set([index,index-1,index+1,index+2,index-2,target,target-1,target+1])){
        const sheet=bookSheets[i];if(!sheet)continue;
        for(const [page,reverse] of [[sheet.front,false],[sheet.back,true]] as const){
          requests.push({src:page.src,reverse,priority:(i===index&&!reverse)||(i===index-1&&reverse)?0:Math.abs(i-index)+1});
        }
      }
      prints.prioritize(requests);
    };
    preloadSpread(0);
    let cover:THREE.Object3D|undefined,oldSpine:THREE.Object3D|undefined,joint:THREE.Object3D|undefined,rear:THREE.Group|undefined,frame=0,last=performance.now();
    new GLTFLoader().load("/manga/book-v3.glb",gltf=>{
      if(dead)return;
      gltf.scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const m=o.material as THREE.MeshStandardMaterial;
        if(/PageBlock|PageEdge|TopPageEdge|WovenEndband/.test(o.name))o.visible=false;
        o.castShadow=true;o.receiveShadow=true;
        if(o.name==="RoundedSpine"){o.scale.z*=.04425/.071;o.position.z-=.02225;}
        if(o.name.startsWith("SpineFoil")){o.scale.z*=.04425/.071;o.position.z-=.02225;}
        if(o.name==="BindingJoint")o.position.z-=.0445;
        if(/^(FrontBoard|BackBoard|RoundedSpine|BindingJoint)$/.test(o.name)){o.material=binding;}
        if(o.name==="CoverArt"||o.name==="BackArt"){o.material=new THREE.MeshPhysicalMaterial({map:m.map,roughness:.74,clearcoat:.17,clearcoatRoughness:.64,ior:1.46,bumpMap:paper,bumpScale:.0005,side:m.side});m.dispose();}
      });
      book.add(gltf.scene);cover=gltf.scene.getObjectByName("CoverHinge");oldSpine=gltf.scene.getObjectByName("RoundedSpine");
      if(cover){
        cover.position.set(-1.43,0,.0045);cover.children.forEach(child=>{child.position.x=1.45;if(child.name==="FrontBoard")child.scale.x*=2.90/3;if(child.name==="CoverArt")child.scale.x*=2.84/2.92;if(child.name==="InsideCover")child.visible=false;});
        const endpaperGeometry=new THREE.PlaneGeometry(2.88,4.35,64,3);endpaperGeometry.translate(1.44,0,0);const ep=endpaperGeometry.attributes.position;for(let i=0;i<ep.count;i++){const x=ep.getX(i);ep.setZ(i,-.021+.0015*Math.exp(-x*24));}endpaperGeometry.computeVertexNormals();
        const endpaperMaterial=new THREE.MeshBasicMaterial({color:0xf1e7d6,side:THREE.BackSide,toneMapped:false});endpaperMaterial.onBeforeCompile=s=>{s.vertexShader="varying vec2 vEndUv;\n"+s.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvEndUv=uv;");s.fragmentShader="varying vec2 vEndUv;\n"+s.fragmentShader.replace("#include <opaque_fragment>","outgoingLight *= 1.0 - 0.24*exp(-vEndUv.x*18.0);\n#include <opaque_fragment>");};
        const blank=new THREE.Mesh(endpaperGeometry,endpaperMaterial);cover.add(blank);const blankShadow=new THREE.Mesh(endpaperGeometry,new THREE.ShadowMaterial({color:0x1a1814,side:THREE.BackSide,opacity:.30,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));blankShadow.receiveShadow=true;cover.add(blankShadow);
        gltf.scene.updateMatrixWorld(true);joint=gltf.scene.getObjectByName("BindingJoint");if(joint)cover.attach(joint);
      }
      rear=new THREE.Group();rear.position.set(-1.43,0,-.049);gltf.scene.add(rear);gltf.scene.updateMatrixWorld(true);
      for(const name of ["BackBoard","BackArt"]){const obj=gltf.scene.getObjectByName(name);if(obj)rear.attach(obj);}
      const insideBack=new THREE.Mesh(new THREE.PlaneGeometry(2.88,4.35),new THREE.MeshBasicMaterial({map:texture("/manga/blank.webp"),toneMapped:false}));insideBack.position.set(1.43,0,.020);rear.add(insideBack);
      // Warm both colour and depth programs before the first visible shadow pass.
      const depthWarm=new THREE.Group(),boardDepth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.BackSide});
      depthWarm.add(new THREE.Mesh(sheets[0].geometry,sheets[0].front.customDepthMaterial!),new THREE.Mesh(closedBlock.geometry,boardDepth));
      void Promise.all([renderer.compileAsync(scene,camera),renderer.compileAsync(depthWarm,camera,scene)]).then(()=>{
        boardDepth.dispose();if(dead)return;
        // Some drivers finish their graphics pipeline on the first draw, even
        // after parallel shader compilation. Exercise it before the reveal.
        renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
        programsReady=true;dirty=true;revealBook();
      });
    });
    let reservedHeight=128,viewportWidth=parent.clientWidth,viewportHeight=parent.clientHeight;
    const resize=()=>{
      dirty=true;viewportWidth=parent.clientWidth;viewportHeight=parent.clientHeight;
      const screen=parent.closest('.journey-screen'),footer=screen?.querySelector('.journey-footer')?.getBoundingClientRect().height??56,toolbar=screen?.querySelector('.reading-chrome')?.getBoundingClientRect().height??44;
      reservedHeight=Math.max(128,2*(footer+8),2*(toolbar+8));
      // Retain the full-stage projection and pixel density, but allocate the
      // antialiased framebuffer only around the region the book can occupy.
      const{left,top,width,height}=bookViewport(viewportWidth,viewportHeight,reservedHeight);
      renderer.setSize(width,height,false);Object.assign(renderer.domElement.style,{position:'absolute',left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
      camera.setViewOffset(viewportWidth,viewportHeight,left,top,width,height);
      if(audit){parent.dataset.bufferPixels=String(renderer.domElement.width*renderer.domElement.height);parent.dataset.fullBufferPixels=String(Math.round(viewportWidth*renderer.getPixelRatio())*Math.round(viewportHeight*renderer.getPixelRatio()));}
    };resize();const observer=new ResizeObserver(resize);observer.observe(parent);
    const portrait=matchMedia("(max-width: 1024px) and (orientation: portrait)");
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    const pivotCenter=new THREE.Vector3(),originalCenter=new THREE.Vector3(),presentationRotation=new THREE.Quaternion();
    let previous=-1,rendered=0,frames=0,preparedSpread='',presentationYaw=-.48,displayRaw=0,lastPose='';
    const tick=()=>{
      if(dead)return;frame=requestAnimationFrame(tick);const now=performance.now();const dt=Math.min((now-last)/1000,.064);last=now;
      const requestedP=position.current;
      const p=requestedP>CLOSE_START&&displayRaw<bookSheets.length+1-.0001?CLOSE_START:requestedP,mobile=false,opening=smooth(p,4.72,5.72),zoom=smooth(p,5.52,READ_START),close=smooth(p,CLOSE_START+.12,CLOSE_START+1.2),finish=smooth(p,CLOSE_START+1.2,CLOSE_START+2.15);
      const moving=Math.abs(p-previous)>.0001,settling=sheets.some(s=>s.pivot.visible&&!s.settled);
      if(document.hidden||p<4.2||portrait.matches||!programsReady||!announcedLoaded)return;
      const auditStart=audit?.start(now)??0;
      const finalTurn=smooth(p,CLOSE_START+2.65,CLOSE_START+3.65);
      const targetYaw=THREE.MathUtils.lerp(THREE.MathUtils.lerp(-.48,.025,opening),Math.PI-.10,finalTurn);
      const rotating=Math.abs(presentationYaw-targetYaw)>.0001;
      const targetRaw=clamp((requestedP-READ_START)/PAGE_STEP,0,bookSheets.length+1);
      const following=Math.abs(targetRaw-displayRaw)>.0001;
      if(!dirty&&!moving&&!settling&&!rotating&&!following){audit?.end(auditStart);return;}
      const proposed=displayRaw+Math.sign(targetRaw-displayRaw)*Math.min(Math.abs(targetRaw-displayRaw),dt*5);
      const candidate=Math.min(bookSheets.length,Math.floor(proposed)),targetIndex=Math.min(bookSheets.length,Math.floor(targetRaw));
      const prepareKey=`${candidate}:${targetIndex}`;
      if(prepareKey!==preparedSpread){preparedSpread=prepareKey;preloadSpread(candidate,targetIndex);}
      const required:{src:string;reverse:boolean}[]=[];
      for(const i of [candidate-1,candidate,candidate+1]){const sheet=bookSheets[i];if(sheet)required.push({src:sheet.front.src,reverse:false},{src:sheet.back.src,reverse:true});}
      const ready=prints.ready(required);
      parent.dataset.waiting=String(!ready);if(ready)displayRaw=proposed;
      if(!ready&&!dirty&&!moving&&!settling&&!rotating){audit?.end(auditStart);return;}
      const raw=displayRaw,index=Math.min(bookSheets.length,Math.floor(raw)),fraction=raw-index;
      if(readCursor.current!==raw){readCursor.current=raw;window.dispatchEvent(new Event('journey-book-update'));}
      if(cover){cover.rotation.y=-Math.PI*opening;cover.position.z=THREE.MathUtils.lerp(.0045,-.049,opening);}closedSpine.visible=opening<.035||close>.7;closedSpine.rotation.y=close>.7?0:Math.PI;closedBlock.visible=opening<.025;bindingWeb.visible=opening<.015;if(oldSpine)oldSpine.visible=opening<.3&&close<=.7;if(joint)joint.visible=opening<.6;
      if(rear){rear.rotation.y=-Math.PI*close;rear.position.z=THREE.MathUtils.lerp(-.049,.0063,close);}
      let geometryChanged=false;
      visiblePrints.clear();
      sheets.forEach((sheet,i)=>{
        // Only the exposed spread and the turning leaf can contribute pixels.
        sheet.pivot.visible=opening>.015&&(i===index-1||i===index||(i===index+1&&fraction>TURN_START));
        if(sheet.pivot.visible){visiblePrints.add(bookSheets[i].front.src);visiblePrints.add(bookSheets[i].back.src);}
        const turn=raw>=i+1?1:raw<i?0:smooth(raw-i,TURN_START,1),change=turn-sheet.lastTurn;
        if(Math.abs(change)>.00001&&sheet.lastTurn>=0)sheet.direction=Math.sign(change);
        sheet.fold.value=turn;sheet.pivot.position.z=THREE.MathUtils.lerp(-.014-i*.0012,-.0268+i*.0012,turn);
        const gutterDepth=Math.max(.001,sheet.pivot.position.z+.0295);sheet.gutter.value=clamp(gutterDepth/.017);
        const base=Math.PI*turn,bend=Math.sin(base),dir=sheet.direction,flat=turn===0||turn===1;
        sheet.front.visible=turn!==1||!sheet.settled;sheet.back.visible=turn!==0||!sheet.settled;
        sheet.front.castShadow=sheet.front.visible;sheet.back.castShadow=!sheet.front.visible;
        if(!sheet.pivot.visible){sheet.angles.fill(base);sheet.velocity.fill(0);sheet.lastTurn=turn;sheet.settled=true;sheet.wasVisible=false;return;}
        if(!sheet.wasVisible){sheet.settled=false;sheet.wasVisible=true;}
        if(sheet.settled&&Math.abs(change)<.00001)return;
        const forceFlat=flat&&(raw>i+1.16||raw<i-.16||sheet.lastTurn<0);
        let maxError=0;
        if(forceFlat){sheet.angles.fill(base);sheet.velocity.fill(0);}
        else {
          // Inextensible strips respond to torsion springs; drag lets the free edge settle.
          const steps=Math.max(1,Math.ceil(dt*120)),step=dt/steps;
          for(let k=0;k<steps;k++)for(let j=0;j<64;j++){
            const u=j/63,goal=base-dir*bend*(.55*u-.18*Math.sin(u*2*Math.PI));
            const neighbor=(sheet.angles[Math.max(0,j-1)]+sheet.angles[Math.min(63,j+1)]-2*sheet.angles[j])*30;
            sheet.velocity[j]+=(220*(goal-sheet.angles[j])+neighbor-30*sheet.velocity[j])*step;
            sheet.angles[j]=clamp(sheet.angles[j]+sheet.velocity[j]*step,0,Math.PI);
            if(j===0){sheet.angles[j]=base;sheet.velocity[j]=0;}
            maxError=Math.max(maxError,Math.abs(goal-sheet.angles[j]),Math.abs(sheet.velocity[j])*.1);
          }
          if(flat&&maxError<.0005){sheet.angles.fill(base);sheet.velocity.fill(0);}
        }
        if(sheet.settled&&Math.abs(change)<.00001)return;
        const a=sheet.geometry.attributes.position;
        for(let row=0;row<4;row++){
          const y=2.18-row*4.36/3;let x=0,z=0;
          for(let col=0;col<65;col++){
            if(col){const u=(col-.5)/64,theta=sheet.angles[col-1]+dir*bend*.075*(y/4.36)*u*u;x+=Math.cos(theta)*2.86/64;z+=Math.sin(theta)*2.86/64;}
            a.setXYZ(row*65+col,x,y,z-gutterDepth*Math.exp(-col/64*25)+.032*Math.sin(Math.PI*col/64)*Math.exp(-col/64*4)*(1-bend));
          }
        }
        a.needsUpdate=true;sheet.geometry.computeVertexNormals();geometryChanged=true;
        const n=sheet.geometry.attributes.normal,e=sheet.edgeGeometry.attributes.position;
        const edgePoint=(dest:number,source:number)=>{for(let face=0;face<2;face++){const off=(face?-.00055:.00055);e.setXYZ(dest+face,a.getX(source)+n.getX(source)*off,a.getY(source)+n.getY(source)*off,a.getZ(source)+n.getZ(source)*off);}};
        for(let col=0;col<65;col++){edgePoint(col*2,col);edgePoint(130+col*2,195+col);}
        for(let row=0;row<4;row++)edgePoint(260+row*2,row*65+64);
        e.needsUpdate=true;sheet.edgeGeometry.computeVertexNormals();sheet.lastTurn=turn;sheet.settled=forceFlat||maxError<.0005;
        sheet.front.visible=turn!==1||!sheet.settled;sheet.back.visible=turn!==0||!sheet.settled;
        sheet.front.castShadow=sheet.front.visible;sheet.back.castShadow=!sheet.front.visible;
      });
      let focus=-1.43;
      if(mobile){focus=index>2?-2.86*(1-smooth(fraction,.3,.43)):0;if(index===bookSheets.length)focus=-2.86;}
      const nextFov=THREE.MathUtils.lerp(31,9,zoom)*(1-finish)+31*finish;if(camera.fov!==nextFov){camera.fov=nextFov;camera.updateProjectionMatrix();}
      const tangent=Math.tan(camera.fov*Math.PI/360),fitHeight=4.5/(2*tangent*(Math.max(80,viewportHeight-reservedHeight)/viewportHeight)),fitWidth=(mobile?3.04:6.06)/(2*tangent*((viewportWidth-22)/viewportHeight)),fullZ=Math.max(fitHeight,fitWidth);
      camera.position.set(THREE.MathUtils.lerp(0,focus,zoom)*(1-finish),0,THREE.MathUtils.lerp(THREE.MathUtils.lerp(12.8,fullZ,zoom),12.8,finish));
      const startX=mobile?0:2.25,baseYaw=THREE.MathUtils.lerp(-.48,.025,opening);
      const scale=THREE.MathUtils.lerp(THREE.MathUtils.lerp(mobile?.6:1,1,zoom),.88,finish);
      // The closing hinges leave the book to the left of its original origin.
      // Recenter the contents inside a presentation pivot so the final half-turn
      // rotates through the book's center without swinging across the copy.
      pivotCenter.set(CLOSED_BOOK_CENTER.x*close,0,CLOSED_BOOK_CENTER.z*close);book.position.copy(pivotCenter).negate();
      presentation.rotation.set((1-zoom)*.065+finish*.035,baseYaw,.018*(1-opening)-finish*.025);
      presentationRotation.copy(presentation.quaternion);
      originalCenter.copy(pivotCenter).multiplyScalar(scale).applyQuaternion(presentationRotation);originalCenter.x+=startX*(1-zoom);
      const finalViewWidth=2*Math.tan(31*Math.PI/360)*12.8*camera.aspect;
      presentation.position.set(THREE.MathUtils.lerp(originalCenter.x,finalViewWidth*.24,finish),THREE.MathUtils.lerp(originalCenter.y,0,finish),THREE.MathUtils.lerp(originalCenter.z,0,finish));
      if(p<CLOSE_START+2.3)presentationYaw=baseYaw;
      else presentationYaw=settleBookYaw(presentationYaw,targetYaw,dt,reduced.matches);
      presentation.rotation.y=presentationYaw;presentation.scale.setScalar(scale);
      parent.dataset.spread=String(index);parent.dataset.turn=String(Math.round(fraction*1000)/1000);parent.dataset.left=index===0?"Blank":bookSheets[index-1].back.label;parent.dataset.right=index===bookSheets.length?"Blank":bookSheets[index].front.label;
      parent.dataset.settling=String(sheets.some(sheet=>sheet.pivot.visible&&!sheet.settled));
      const pose=[opening,zoom,close,finish,presentationYaw,index].map(value=>value.toFixed(5)).join(':');
      if(!dirty&&!geometryChanged&&pose===lastPose){previous=p;audit?.end(auditStart);return;}
      renderer.shadowMap.needsUpdate=geometryChanged||pose!==lastPose;renderer.render(scene,camera);previous=p;dirty=false;lastPose=pose;frames++;
      audit?.end(auditStart);
      parent.dataset.rotation=String(presentation.rotation.y);parent.dataset.renders=String(frames);
      if(now-rendered>500){parent.dataset.drawCalls=String(renderer.info.render.calls);parent.dataset.printsLoaded=String(prints.loadedCount);parent.dataset.printsFailed=String(prints.failedCount);rendered=now;}
    };tick();
    return()=>{dead=true;readCursor.current=null;cancelAnimationFrame(frame);cancelAnimationFrame(uploadFrame);prints.dispose();for(const item of uploads)item.reject(new Error('Book disposed'));uploads.length=0;observer.disconnect();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.customDepthMaterial?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){(m as THREE.MeshStandardMaterial).map?.dispose();m.dispose();}}});textures.forEach(t=>t.dispose());environment.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();};
  },[position,readCursor]);
  return <div className={"journey-book "+(loaded?"model-loaded":"")} ref={host} aria-hidden="true"><img src="/manga/cover-front.webp" alt="" className="journey-book-fallback"/></div>;
}


