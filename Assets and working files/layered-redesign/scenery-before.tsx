"use client";
import {useEffect,useRef,type RefObject} from "react";
import * as T from "three";
import {architecture,birdModel,rabbitModel} from "./scene-models";
import {smooth,CLOSE_START} from "./journey-data";

export default function Scenery({position,paused}:{position:RefObject<number>;paused:boolean}){
  const host=useRef<HTMLDivElement>(null),pause=useRef(paused);
  useEffect(()=>{pause.current=paused;},[paused]);
  useEffect(()=>{
    const parent=host.current!;let renderer:T.WebGLRenderer;
    try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});}catch{return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
    parent.appendChild(renderer.domElement);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,80);camera.position.z=16;
    scene.add(new T.HemisphereLight(0xe4ead9,0x465044,2));
    const light=new T.DirectionalLight(0xffe2b9,2.3);light.position.set(-8,-6,12);light.target.position.set(0,-17,2);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-10,right:10,top:8,bottom:-8,near:1,far:45});light.shadow.normalBias=.025;scene.add(light,light.target);
    let dirty=true,dead=false;
    const textures:T.Texture[]=[],loader=new T.TextureLoader();
    const texture=(src:string)=>{const t=loader.load(src,()=>{dirty=true;});t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures.push(t);return t;};
    const uniforms={uMap:{value:texture('/scene/valley-v5.webp')},uTime:{value:0}};
    const material=new T.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
      uniform sampler2D uMap;uniform float uTime;varying vec2 vUv;
      void main(){vec2 uv=vUv;vec4 base=texture2D(uMap,uv);
        // Only the white waterfall receives a tiny downstream shimmer; rocks stay still.
        float band=1.-smoothstep(.016,.039,abs(uv.x-(.899-.07*(1.-smoothstep(.50,.70,uv.y)))));
        float mask=band*smoothstep(.48,.52,uv.y)*(1.-smoothstep(.71,.73,uv.y))*smoothstep(.65,.87,dot(base.rgb,vec3(.299,.587,.114)));
        vec2 offset=vec2(.00012*sin(uv.y*110.-uTime*1.3),.00038*sin(uv.y*230.+uTime*2.2));
        base.rgb=mix(base.rgb,texture2D(uMap,uv+offset).rgb,mask*.36);
        gl_FragColor=base;#include <colorspace_fragment>
      }`.replace('base;#include','base;\n#include')});
    scene.add(new T.Mesh(new T.PlaneGeometry(24,24*1672/941),material));
    const cedar=texture('/materials/cedar.webp'),roof=texture('/materials/roof.webp');
    cedar.wrapS=cedar.wrapT=roof.wrapS=roof.wrapT=T.RepeatWrapping;
    const shrine=architecture(cedar,roof,true),house=architecture(cedar,roof);
    shrine.position.set(-4.05,-14.25,1.3);shrine.rotation.set(.24,.28,0);shrine.scale.setScalar(.95);scene.add(shrine);
    house.position.set(5.35,-18.55,1.5);house.rotation.set(.20,-.40,0);house.scale.setScalar(1.12);scene.add(house);
    const shadow=(w:number,h:number)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float a=exp(-dot((vUv-.5)*5.,(vUv-.5)*5.))*.38;gl_FragColor=vec4(.025,.045,.024,a);}' }));return m;};
    const shrineShadow=shadow(4.1,.9);shrineShadow.position.set(-4.05,-14.32,1.1);scene.add(shrineShadow);
    const houseShadow=shadow(6.1,1.4);houseShadow.position.set(5.35,-18.62,1.3);scene.add(houseShadow);
    const rabbit=rabbitModel();rabbit.root.scale.setScalar(.65);rabbit.root.rotation.set(.17,-.2,0);scene.add(rabbit.root);
    const rabbitShadow=shadow(.8,.19);scene.add(rabbitShadow);
    const birds=[birdModel(),birdModel()];birds.forEach((b,i)=>{b.root.scale.setScalar(i?.40:.52);scene.add(b.root);});
    let frame=0,last=performance.now(),time=0,previous=-1,rendered=0,total=0,lastReport=0;
    const resize=()=>{dirty=true;renderer.setSize(parent.clientWidth,parent.clientHeight,false);camera.aspect=parent.clientWidth/parent.clientHeight;camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;};
    resize();const observer=new ResizeObserver(resize);observer.observe(parent);
    const tick=()=>{
      if(dead)return;frame=requestAnimationFrame(tick);
      const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
      if(document.hidden||matchMedia('(max-width: 1024px) and (orientation: portrait) and (pointer: coarse)').matches)return;
      const p=position.current,moved=Math.abs(p-previous)>.0001,reading=p>6.5&&p<CLOSE_START+.6;
      if(reading&&!dirty)return;
      if(!moved&&!dirty&&(pause.current||now-rendered<33))return;
      if(!pause.current)time+=Math.min((now-rendered)/1000,.07);
      const height=32*Math.tan(38*Math.PI/360),range=(24*1672/941-height)/2-.25;
      camera.position.y=T.MathUtils.lerp(range,-range,smooth(p,0,4.25));camera.position.x=Math.sin(Math.min(p,4.25)*.8)*.15;
      uniforms.uTime.value=time;
      // World-space flight, with alternating downstrokes and glides. It returns after a quiet interval.
      const flight=(time%23)/12,fly=flight<1&&p<2.7;
      birds.forEach((b,i)=>{b.root.visible=fly;const t=flight-i*.07;b.root.position.set(-10+t*22,range-3.4+i*.8+Math.sin(t*Math.PI)*1.2,2);b.root.rotation.z=.06*Math.cos(t*Math.PI);const beat=Math.sin(time*5.1-i*.8)*.55;const glide=smooth(time%6,3.5,4)*(1-smooth(time%6,5.2,6));b.wings.forEach((w,j)=>{w.rotation.x=(j?1:-1)*(.13+beat*(1-glide));});});
      // Each hop has planted feet, push-off, flight, landing and a pause. No root sliding on contact.
      const cycle=time%13,hop=Math.floor(cycle/1.45),phase=(cycle%1.45)/1.45,travel=smooth(phase,.23,.82),air=phase>.23&&phase<.82?Math.sin((phase-.23)/.59*Math.PI):0;
      const active=hop<4;rabbit.root.visible=p>2.65&&p<4.65&&active;rabbitShadow.visible=rabbit.root.visible;
      const x=-4.8+Math.min(hop,4)*.82+travel*.82,y=-16.15;
      rabbit.root.position.set(x,y+air*.24,3);rabbit.body.rotation.z=-Math.sin(phase*Math.PI*2)*.09;
      rabbit.body.scale.y=1-(1-smooth(phase,.12,.23))*smooth(phase,0,.12)*.09;
      rabbit.head.rotation.z=-rabbit.body.rotation.z*.5;rabbit.ears.forEach((e,i)=>{e.rotation.z=-air*.24+Math.sin(time*1.7+i)*.025;});
      rabbit.feet.forEach((f,i)=>{f.rotation.z=air*(i<2?-.55:.4);});
      rabbitShadow.position.set(x,y-.035,2.98);rabbitShadow.scale.setScalar(1-air*.2);
      if(dirty)renderer.shadowMap.needsUpdate=true;
      renderer.render(scene,camera);previous=p;dirty=false;rendered=now;total++;
      if(now-lastReport>1000){parent.dataset.drawCalls=String(renderer.info.render.calls);parent.dataset.triangles=String(renderer.info.render.triangles);parent.dataset.renders=String(total);parent.dataset.rabbitPhase=String(Math.round(phase*100));parent.dataset.birdsVisible=String(fly);lastReport=now;}
    };tick();
    return()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
  },[position]);
  return <div className="shrine-scenery" ref={host} aria-hidden="true"/>;
}


