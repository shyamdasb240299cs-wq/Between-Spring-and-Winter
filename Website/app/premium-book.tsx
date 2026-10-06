"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export default function PremiumBook({storyRef,paused,onImmersed}:{storyRef:RefObject<HTMLElement|null>;paused:boolean;onImmersed:(active:boolean)=>void}){
  const hostRef=useRef<HTMLDivElement>(null),pausedRef=useRef(paused);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{pausedRef.current=paused;},[paused]);
  useEffect(()=>{
    const host=hostRef.current,story=storyRef.current;if(!host||!story)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});}catch{
      const fallback=()=>{const r=story.getBoundingClientRect(),progress=THREE.MathUtils.clamp(-r.top/(story.offsetHeight-innerHeight),0,1);onImmersed(progress>.9);story.style.setProperty("--reader-reveal",progress>.9?"1":"0");const copy=story.querySelector<HTMLElement>(".hero-copy");if(copy)copy.style.visibility=progress>.3?"hidden":"visible";};
      window.addEventListener("scroll",fallback,{passive:true});fallback();return()=>window.removeEventListener("scroll",fallback);
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(31,1,.1,60);camera.position.set(0,.05,12.8);
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
    const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();
    scene.add(new THREE.HemisphereLight(0xc7d0e3,0x33283a,.65));
    const key=new THREE.DirectionalLight(0xfff2df,2.8);key.position.set(-3,6,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.normalBias=.015;key.shadow.bias=-.0001;key.shadow.radius=5;scene.add(key);
    const rim=new THREE.DirectionalLight(0xe6dbf8,1.1);rim.position.set(4,2,-4);scene.add(rim);
    const book=new THREE.Group();scene.add(book);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.32}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.48;floor.receiveShadow=true;
    const textures:THREE.Texture[]=[];
    const fibers=document.createElement("canvas");fibers.width=256;fibers.height=256;
    const ctx=fibers.getContext("2d")!,pixels=ctx.createImageData(256,256);
    for(let i=0;i<pixels.data.length;i+=4){const n=188+Math.random()*48;pixels.data[i]=n;pixels.data[i+1]=n;pixels.data[i+2]=n;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
    const paperBump=new THREE.CanvasTexture(fibers);paperBump.wrapS=paperBump.wrapT=THREE.RepeatWrapping;paperBump.repeat.set(3,5);textures.push(paperBump);
    const loader=new THREE.TextureLoader();
    const texture=(url:string)=>{const t=loader.load(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();textures.push(t);return t;};
    let cover:THREE.Object3D|undefined,leaf:THREE.Group|undefined,leafGeo:THREE.PlaneGeometry|undefined;
    let dead=false,frame=0,p=0,px=0,py=0;
    new GLTFLoader().load("/manga/book-v3.glb",gltf=>{
      if(dead)return;
      gltf.scene.traverse(node=>{
        if(!(node instanceof THREE.Mesh))return;
        node.castShadow=true;node.receiveShadow=true;
        const old=node.material as THREE.MeshStandardMaterial;
        if(node.name==="CoverArt"||node.name==="BackArt"){
          node.material=new THREE.MeshPhysicalMaterial({map:old.map,roughness:.58,metalness:0,clearcoat:.16,clearcoatRoughness:.5,bumpMap:paperBump,bumpScale:.002,envMapIntensity:.5,side:old.side});
          old.dispose();
        }else if(node.name==="PageBlock"){old.color.set("#f1e8d5");old.roughness=.98;old.bumpMap=paperBump;old.bumpScale=.007;}
      });
      book.add(gltf.scene);cover=gltf.scene.getObjectByName("CoverHinge");
      if(cover){
        const endpaper=new THREE.Mesh(new THREE.PlaneGeometry(2.88,4.35),new THREE.MeshStandardMaterial({map:texture("/manga/blank.webp"),roughness:.95,bumpMap:paperBump,bumpScale:.004}));
        endpaper.rotation.y=Math.PI;endpaper.position.set(1.5,0,-.021);cover.add(endpaper);
      }
      const under=new THREE.Mesh(new THREE.PlaneGeometry(2.84,4.34),new THREE.MeshStandardMaterial({map:texture("/manga/page-001.webp"),roughness:.92,bumpMap:paperBump,bumpScale:.003}));under.position.z=.0295;under.receiveShadow=true;book.add(under);
      leaf=new THREE.Group();leaf.position.set(-1.42,0,.0305);book.add(leaf);
      leafGeo=new THREE.PlaneGeometry(2.84,4.34,48,3);leafGeo.translate(1.42,0,0);
      const front=new THREE.Mesh(leafGeo,new THREE.MeshStandardMaterial({map:texture("/manga/part-1.webp"),roughness:.9,bumpMap:paperBump,bumpScale:.002,side:THREE.FrontSide}));front.castShadow=true;front.receiveShadow=true;leaf.add(front);
      const reverse=texture("/manga/blank.webp");reverse.wrapS=THREE.RepeatWrapping;reverse.repeat.x=-1;reverse.offset.x=1;
      const back=new THREE.Mesh(leafGeo,new THREE.MeshStandardMaterial({map:reverse,roughness:.9,bumpMap:paperBump,bumpScale:.002,side:THREE.BackSide}));back.castShadow=true;back.receiveShadow=true;leaf.add(back);
      setLoaded(true);
    },undefined,()=>{});
    const resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();};
    resize();const observer=new ResizeObserver(resize);observer.observe(host);
    const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const move=(e:PointerEvent)=>{px=(e.clientX/innerWidth-.5);py=(e.clientY/innerHeight-.5);};window.addEventListener("pointermove",move,{passive:true});
    let time=0,last=performance.now(),immersed=false;
    const tick=()=>{
      if(dead)return;
      const now=performance.now();if(!pausedRef.current&&!reduce)time+=(now-last)/1000;last=now;
      const rect=story.getBoundingClientRect();const target=THREE.MathUtils.clamp(-rect.top/(story.offsetHeight-host.clientHeight),0,1);p=reduce?target:THREE.MathUtils.lerp(p,target,.08);
      const mobile=host.clientWidth<760,short=host.clientHeight<620;
      const opening=THREE.MathUtils.smoothstep(p,.16,.5),zoom=THREE.MathUtils.smoothstep(p,.43,.83),turn=0;
      const startX=mobile?(short?1.4:0):2.3,endX=mobile?0:1.42;
      book.position.set(THREE.MathUtils.lerp(startX,endX,opening),THREE.MathUtils.lerp(mobile&&!short?-1.45:0,0,zoom),0);
      book.rotation.set(THREE.MathUtils.lerp(.12,0,zoom)+(reduce||pausedRef.current?0:Math.sin(time*.35)*.004),THREE.MathUtils.lerp(-.6,0,opening)+(reduce||pausedRef.current?0:px*.025*(1-zoom)),THREE.MathUtils.lerp(.035,0,opening));
      const baseScale=mobile?(short?.64:.52):1;book.scale.setScalar(THREE.MathUtils.lerp(baseScale,1,zoom));
      const fullZ=mobile?9.4:Math.max(9.4,5.95/(2*Math.tan(31*Math.PI/360)*camera.aspect));
      camera.position.z=THREE.MathUtils.lerp(12.8,fullZ,zoom);
      const nextImmersed=p>.91;if(nextImmersed!==immersed){immersed=nextImmersed;onImmersed(immersed);}
      const reveal=THREE.MathUtils.smoothstep(p,.83,.97);
      story.style.setProperty("--reader-reveal",String(reveal));
      story.style.setProperty("--scene-zoom",String(1+p*.14));
      story.style.setProperty("--canopy-shift",(p*-45)+"px");
      if(cover)cover.rotation.y=-opening*Math.PI*.999;
      if(leaf&&leafGeo){
        leaf.rotation.y=-turn*Math.PI*.92;
        const position=leafGeo.attributes.position;
        for(let i=0;i<position.count;i++){const x=(i%49)/48*2.84;position.setZ(i,Math.sin(x/2.84*Math.PI)*Math.sin(turn*Math.PI)*.44);}
        position.needsUpdate=true;leafGeo.computeVertexNormals();
      }
      floor.position.x=book.position.x;host.style.opacity=String(1-THREE.MathUtils.smoothstep(p,.88,.98));
      const copy=story.querySelector<HTMLElement>(".hero-copy"),caption=story.querySelector<HTMLElement>(".scene-caption"),label=story.querySelector<HTMLElement>(".book-label");
      if(copy){const opacity=1-THREE.MathUtils.smoothstep(p,.02,.22);copy.style.opacity=String(opacity);copy.style.transform="translateY("+(-p*65)+"px)";copy.style.visibility=opacity<.01?"hidden":"visible";}
      if(caption){const opacity=THREE.MathUtils.smoothstep(p,.62,.88);caption.style.opacity=String(opacity);caption.style.visibility=opacity<.01?"hidden":"visible";}
      if(label)label.style.opacity=String(1-opening);
      story.style.setProperty("--story-progress",String(p));
      if(rect.bottom>0&&rect.top<innerHeight)renderer.render(scene,camera);
      frame=requestAnimationFrame(tick);
    };tick();
    return()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("pointermove",move);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){(m as THREE.MeshStandardMaterial).map?.dispose();m.dispose();}}});textures.forEach(t=>t.dispose());environment.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();};
  },[storyRef,onImmersed]);
  return <div className={"book-canvas "+(loaded?"is-loaded":"")} ref={hostRef} aria-hidden="true"><img className="book-fallback" src="/manga/cover-front.webp" alt=""/></div>;
}
