"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export default function BookScene({storyRef}: {storyRef:RefObject<HTMLElement|null>}) {
  const container=useRef<HTMLDivElement>(null);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    const host=container.current; const story=storyRef.current;
    if (!host || !story) return;
    let renderer:THREE.WebGLRenderer;
    try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});} catch {return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    host.appendChild(renderer.domElement);
    const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(32,1,.1,50);camera.position.set(0,0,12);
    scene.add(new THREE.HemisphereLight(0xe8edff,0x292033,2.4));
    const key=new THREE.DirectionalLight(0xffede2,3.3);key.position.set(-3,6,8);scene.add(key);
    const fill=new THREE.DirectionalLight(0x94b7ff,2.2);fill.position.set(5,2,3);scene.add(fill);
    const book=new THREE.Group();scene.add(book);let hinge:THREE.Object3D|undefined;let disposed=false;
    const textures:THREE.Texture[]=[];const loader=new THREE.TextureLoader();
    new GLTFLoader().load('/manga/book.glb',gltf=>{
      if(disposed) {gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});return;}
      book.add(gltf.scene);hinge=gltf.scene.getObjectByName('CoverHinge');
      const tex=loader.load('/manga/part-1.webp');tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);
      const page=new THREE.Mesh(new THREE.PlaneGeometry(2.83,4.33),new THREE.MeshStandardMaterial({map:tex,roughness:.85}));page.position.set(0,0,.147);book.add(page);setLoaded(true);
    },undefined,()=>{});
    const dots=new THREE.BufferGeometry();const positions=new Float32Array(45*3);
    for(let i=0;i<45;i++){positions[i*3]=(Math.random()-.5)*12;positions[i*3+1]=(Math.random()-.5)*9;positions[i*3+2]=-3-Math.random()*4;}
    dots.setAttribute('position',new THREE.BufferAttribute(positions,3));const dust=new THREE.Points(dots,new THREE.PointsMaterial({color:0xdab5ae,size:.018,transparent:true,opacity:.45}));scene.add(dust);
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};resize();const ro=new ResizeObserver(resize);ro.observe(host);
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pointerX=0,pointerY=0,current=0,frame=0;const start=performance.now();
    const pointer=(e:PointerEvent)=>{pointerX=e.clientX/window.innerWidth-.5;pointerY=e.clientY/window.innerHeight-.5;};window.addEventListener('pointermove',pointer,{passive:true});
    const tick=()=>{
      if(disposed)return;const rect=story.getBoundingClientRect();const target=THREE.MathUtils.clamp(-rect.top/(story.offsetHeight-window.innerHeight),0,1);current=reduce?target:THREE.MathUtils.lerp(current,target,.07);
      const p=current;const mobile=host.clientWidth<760;const time=(performance.now()-start)/1000;
      book.position.set(mobile?0:THREE.MathUtils.lerp(2.05,1.35,p),mobile?-.62:0,0);
      book.rotation.set((reduce?0:Math.sin(time*.5)*.015)+pointerY*.018,THREE.MathUtils.lerp(-.32,.1,p)+pointerX*.045,THREE.MathUtils.lerp(-.055,.015,p));
      book.scale.setScalar(mobile?THREE.MathUtils.lerp(.64,.66,p):THREE.MathUtils.lerp(1.02,1.03,p));
      if(hinge)hinge.rotation.y=-THREE.MathUtils.smoothstep(p,.18,.8)*Math.PI*.84;
      const copy=story.querySelector<HTMLElement>('.hero-copy'),caption=story.querySelector<HTMLElement>('.scene-caption');
      if(copy){copy.style.opacity=String(1-THREE.MathUtils.smoothstep(p,.02,.38));copy.style.transform=`translateY(${-p*80}px)`;copy.style.pointerEvents=p>.3?'none':'auto';}
      if(caption){caption.style.opacity=String(THREE.MathUtils.smoothstep(p,.58,.86));caption.style.pointerEvents=p<.68?'none':'auto';}
      story.style.setProperty('--story-progress',String(p));dust.rotation.z=reduce?0:time*.009;
      if(rect.bottom>0&&rect.top<window.innerHeight)renderer.render(scene,camera);frame=requestAnimationFrame(tick);
    };tick();
    return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();window.removeEventListener('pointermove',pointer);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){if('map' in m)(m as THREE.MeshStandardMaterial).map?.dispose();m.dispose();}}});textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
  },[storyRef]);
  return <div className={`book-canvas ${loaded?'is-loaded':''}`} ref={container} aria-hidden="true"><img className="book-fallback" src="/manga/cover-front.webp" alt=""/></div>;
}
