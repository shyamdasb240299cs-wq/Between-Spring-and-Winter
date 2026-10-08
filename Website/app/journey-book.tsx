"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { bookSheets, CLOSE_START, PAGE_STEP, READ_START, TURN_START, smooth, clamp } from "./journey-data";
import { PrintedPages } from "./printed-pages";
import { CLOSED_BOOK_CENTER, settleBookYaw } from "./book-motion";

export default function JourneyBook({position}:{position:RefObject<number>;paused:boolean}){
  const host=useRef<HTMLDivElement>(null);const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    const parent=host.current!;let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});}catch{return;}
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;parent.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(31,1,2,80),book=new THREE.Group(),presentation=new THREE.Group();presentation.add(book);scene.add(presentation);
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.6;room.dispose();
    scene.add(new THREE.HemisphereLight(0xd3e3e1,0x18251c,.9));const key=new THREE.DirectionalLight(0xfff4e2,2.4);key.position.set(-3,5,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=4;key.shadow.camera.top=3.4;key.shadow.camera.bottom=-3.4;key.shadow.camera.near=.5;key.shadow.camera.far=30;key.shadow.bias=-.00004;key.shadow.normalBias=.0015;key.shadow.radius=3;scene.add(key);const fill=new THREE.DirectionalLight(0xdbe6e3,1);fill.position.set(4,-1,4);scene.add(fill);
    let dirty=true,dead=false;
    const loader=new THREE.TextureLoader(),textures:THREE.Texture[]=[];
    const texture=(src:string,reverse=false)=>{const t=loader.load(src,()=>{dirty=true;});t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());if(reverse){t.repeat.x=-1;t.offset.x=1;}textures.push(t);return t;};
    const cloth=texture("/materials/binding-cloth.webp"),paper=texture("/materials/paper-stock.webp");
    cloth.wrapS=cloth.wrapT=paper.wrapS=paper.wrapT=THREE.RepeatWrapping;cloth.repeat.set(5,7);paper.repeat.set(4,6);
    // Printed leaves load around the current spread instead of decoding the
    // entire chapter and uploading every full-resolution page at startup.
    const prints=new PrintedPages(loader,Math.min(4,renderer.capabilities.getMaxAnisotropy()),()=>{dirty=true;});
    const binding=new THREE.MeshPhysicalMaterial({map:cloth,color:0x6b6b6b,bumpMap:cloth,bumpScale:.0009,roughness:.94,sheen:.12,sheenColor:0x3c4455,metalness:0});
    const pageEdges=new THREE.MeshStandardMaterial({color:0xeee6d8,roughness:1,bumpMap:paper,bumpScale:.0005});
    const closedSpine=new THREE.Mesh(new THREE.CylinderGeometry(.0452,.0452,4.48,32,1,false,0,Math.PI),binding);closedSpine.position.set(-1.43,0,-.02135);closedSpine.visible=false;book.add(closedSpine);
    const sheets=bookSheets.map((sheet,i)=>{
      const geometry=new THREE.PlaneGeometry(2.86,4.36,64,3);geometry.translate(1.43,0,0);
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
      edgeGeometry.setAttribute("position",new THREE.BufferAttribute(edgePositions,3));edgeGeometry.setIndex(edgeIndices);
      const edge=new THREE.Mesh(edgeGeometry,pageEdges);front.frustumCulled=false;back.frustumCulled=false;edge.frustumCulled=false;
      front.castShadow=true;front.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
      const shadow=new THREE.Mesh(geometry,new THREE.ShadowMaterial({color:0x1a1814,opacity:.30,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));shadow.receiveShadow=true;shadow.frustumCulled=false;
      const pivot=new THREE.Group();pivot.position.set(-1.43,0,-.014-i*.0012);pivot.add(front,back,edge,shadow);book.add(pivot);
      return {pivot,geometry,edgeGeometry,fold,gutter,angles:new Float64Array(64),velocity:new Float64Array(64),lastTurn:-1,direction:1,settled:false,wasVisible:false};
    });
    const preloadSpread=(index:number)=>{
      const requests:{src:string;reverse:boolean;priority:number}[]=[];
      for(const i of [index,index-1,index+1,index+2]){
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
      dirty=true;setLoaded(true);parent.dataset.loaded="true";
    });
    let reservedHeight=128;
    const resize=()=>{dirty=true;renderer.setSize(parent.clientWidth,parent.clientHeight,false);camera.aspect=parent.clientWidth/parent.clientHeight;camera.updateProjectionMatrix();const screen=parent.closest('.journey-screen');const footer=screen?.querySelector('.journey-footer')?.getBoundingClientRect().height??56;const toolbar=screen?.querySelector('.reading-chrome')?.getBoundingClientRect().height??44;reservedHeight=Math.max(128,2*(footer+8),2*(toolbar+8));};resize();const observer=new ResizeObserver(resize);observer.observe(parent);
    const portrait=matchMedia("(max-width: 1024px) and (orientation: portrait)");
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    const pivotCenter=new THREE.Vector3(),originalCenter=new THREE.Vector3(),presentationRotation=new THREE.Quaternion();
    let previous=-1,rendered=0,frames=0,preparedSpread=0,presentationYaw=-.48;
    const tick=()=>{
      if(dead)return;frame=requestAnimationFrame(tick);const now=performance.now();const dt=Math.min((now-last)/1000,.064);last=now;
      const p=position.current,mobile=false,opening=smooth(p,4.72,5.72),zoom=smooth(p,5.52,READ_START),close=smooth(p,CLOSE_START+.12,CLOSE_START+1.2),finish=smooth(p,CLOSE_START+1.2,CLOSE_START+2.15);
      const moving=Math.abs(p-previous)>.0001,settling=sheets.some(s=>s.pivot.visible&&!s.settled);
      if(document.hidden||p<4.2||portrait.matches)return;
      const finalTurn=smooth(p,CLOSE_START+2.65,CLOSE_START+3.65);
      const targetYaw=THREE.MathUtils.lerp(THREE.MathUtils.lerp(-.48,.025,opening),Math.PI-.10,finalTurn);
      const rotating=Math.abs(presentationYaw-targetYaw)>.0001;
      if(!dirty&&!moving&&!settling&&!rotating)return;
      const raw=clamp((p-READ_START)/PAGE_STEP,0,bookSheets.length+1),index=Math.min(bookSheets.length,Math.floor(raw)),fraction=raw-index;
      if(index!==preparedSpread){preparedSpread=index;preloadSpread(index);}
      if(cover){cover.rotation.y=-Math.PI*opening;cover.position.z=THREE.MathUtils.lerp(.0045,-.049,opening);}closedSpine.visible=close>.7;if(oldSpine)oldSpine.visible=opening<.3&&close<=.7;if(joint)joint.visible=opening<.6;
      if(rear){rear.rotation.y=-Math.PI*close;rear.position.z=THREE.MathUtils.lerp(-.049,.0063,close);}
      sheets.forEach((sheet,i)=>{
        // Only the exposed spread and the turning leaf can contribute pixels.
        sheet.pivot.visible=i>=index-1&&i<=index+1;
        const turn=raw>=i+1?1:raw<i?0:smooth(raw-i,TURN_START,1),change=turn-sheet.lastTurn;
        if(Math.abs(change)>.00001&&sheet.lastTurn>=0)sheet.direction=Math.sign(change);
        sheet.fold.value=turn;sheet.pivot.position.z=THREE.MathUtils.lerp(-.014-i*.0012,-.0268+i*.0012,turn);
        const gutterDepth=Math.max(.001,sheet.pivot.position.z+.0295);sheet.gutter.value=clamp(gutterDepth/.017);
        const base=Math.PI*turn,bend=Math.sin(base),dir=sheet.direction,flat=turn===0||turn===1;
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
        a.needsUpdate=true;sheet.geometry.computeVertexNormals();
        const n=sheet.geometry.attributes.normal,e=sheet.edgeGeometry.attributes.position;
        const edgePoint=(dest:number,source:number)=>{for(let face=0;face<2;face++){const off=(face?-.00055:.00055);e.setXYZ(dest+face,a.getX(source)+n.getX(source)*off,a.getY(source)+n.getY(source)*off,a.getZ(source)+n.getZ(source)*off);}};
        for(let col=0;col<65;col++){edgePoint(col*2,col);edgePoint(130+col*2,195+col);}
        for(let row=0;row<4;row++)edgePoint(260+row*2,row*65+64);
        e.needsUpdate=true;sheet.edgeGeometry.computeVertexNormals();sheet.lastTurn=turn;sheet.settled=forceFlat||maxError<.0005;
      });
      let focus=-1.43;
      if(mobile){focus=index>2?-2.86*(1-smooth(fraction,.3,.43)):0;if(index===bookSheets.length)focus=-2.86;}
      camera.fov=THREE.MathUtils.lerp(31,9,zoom)*(1-finish)+31*finish;camera.updateProjectionMatrix();
      const tangent=Math.tan(camera.fov*Math.PI/360),fitHeight=4.5/(2*tangent*(Math.max(80,parent.clientHeight-reservedHeight)/parent.clientHeight)),fitWidth=(mobile?3.04:6.06)/(2*tangent*((parent.clientWidth-22)/parent.clientHeight)),fullZ=Math.max(fitHeight,fitWidth);
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
      renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);previous=p;dirty=false;frames++;
      parent.dataset.rotation=String(presentation.rotation.y);parent.dataset.renders=String(frames);
      if(now-rendered>500){parent.dataset.drawCalls=String(renderer.info.render.calls);parent.dataset.printsLoaded=String(prints.loadedCount);parent.dataset.printsFailed=String(prints.failedCount);rendered=now;}
    };tick();
    return()=>{dead=true;cancelAnimationFrame(frame);prints.dispose();observer.disconnect();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.customDepthMaterial?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){(m as THREE.MeshStandardMaterial).map?.dispose();m.dispose();}}});textures.forEach(t=>t.dispose());environment.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();};
  },[position]);
  return <div className={"journey-book "+(loaded?"model-loaded":"")} ref={host} aria-hidden="true"><img src="/manga/cover-front.webp" alt="" className="journey-book-fallback"/></div>;
}


