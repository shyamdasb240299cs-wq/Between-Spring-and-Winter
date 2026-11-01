"use client";
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {createSpringNorthTrain,SPRING_TRAIN_MODEL} from '../shrine-void/spring-north-train';
import {COACH_BAYS,COACH_CENTRE} from '../shrine-void/spring-coach-layout';
import {createSpringTrainQuest,SPRING_TRAIN_CASE_MODEL} from '../shrine-void/spring-train-quest';
import {createSpringTreasureState,type SpringTreasureController} from '../shrine-void/spring-treasure-state';
import {createSpringPreviewStorage} from '../shrine-void/spring-preview';
import {createSeasonTravel} from '../shrine-void/season-navigation';
import {SpringGameHUD} from '../shrine-void/spring-treasure-ui';
import './train-preview.css';

export default function TrainPreview(){
 const host=useRef<HTMLDivElement>(null),commands=useRef<(action:string,value?:unknown)=>void>(()=>{}),view=useRef<(id:string)=>void>(()=>{});
 const [game,setGame]=useState<SpringTreasureController|null>(null),[message,setMessage]=useState('Loading the furnished coach…'),[hint,setHint]=useState(''),[night,setNight]=useState(false);
 const nightRef=useRef(night);nightRef.current=night;
 useEffect(()=>{
  let dead=false,frame=0,train:ReturnType<typeof createSpringNorthTrain>|undefined,quest:ReturnType<typeof createSpringTrainQuest>|undefined;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xa9b5bd);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Redesigned 72-berth train: drag to look, W A S D or arrow keys to walk');host.current!.appendChild(canvas);
  const camera=new THREE.PerspectiveCamera(58,1,.05,220);camera.rotation.order='YXZ';
  const ambient=new THREE.HemisphereLight(0xd9e8f0,0x555f52,2.1),sun=new THREE.DirectionalLight(0xffedcf,2.2);sun.position.set(15,25,-65);scene.add(ambient,sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(220,220),new THREE.MeshStandardMaterial({color:0x737865,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(12,-.04,-80);scene.add(ground);
  const travel=createSeasonTravel({origin:[-5,-130],cell:.5,width:100,depth:220,heights:new Array(22000).fill(0),spawn:{x:12,z:-40,yaw:0}},(x,z)=>train?.blockedAt(x,z)??false);
  const controller=createSpringTreasureState(createSpringPreviewStorage('rail'));controller.act('read-train-note');controller.act('close-train-note');controller.act('equip-storage',1);
  let walking=false,wasBlocked=false,last=performance.now(),elapsed=0,pointer:{x:number;y:number}|null=null,lastHint='';
  const resize=()=>{if(!host.current)return;const {width,height}=host.current.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host.current!);resize();
  function interact(){if(!quest||!train)return;camera.updateMatrixWorld(true);const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(),camera);const target=quest.target(camera,ray);if(target){quest.interact(target.action,target.value);return;}const door=train.target(camera,ray);if(door)train.interact(door.id,camera.position);}
  commands.current=(action,value)=>{travel.resetInput();if(action==='interact')interact();else quest?.interact(action,value);canvas.focus();};
  view.current=id=>{
   if(!train||!quest)return;if(controller.state.trainCaseOpen)controller.act('close-train-case');quest.focusLock(camera);
   let x=11.44,z=COACH_BAYS[0].z,y=train.floorY+1.63,yaw=-Math.PI/2,pitch=-.13;walking=id!=='exterior';
   if(id==='exterior'){x=49;z=COACH_CENTRE;y=6;yaw=Math.PI/2;pitch=-.10;}
   if(id==='first'){z=COACH_BAYS[0].z;yaw=-.70;pitch=-.20;}
   if(id==='last'){z=COACH_BAYS[8].z;yaw=-.70;pitch=-.20;}
   if(id==='side'){z=COACH_BAYS[0].z;yaw=Math.PI/2;pitch=-.18;}
   if(id==='wash'){x=12.03;z=quest.basinPoint.z+.9;yaw=.5;pitch=-.65;}
   if(id==='case'){z=quest.casePosition.z;yaw=Math.PI/2;pitch=-.75;}
   if(id==='entry'){x=train.entrancePosition.x;z=train.entrancePosition.z;y=(train.walkingHeight(x,z)??0)+1.63;yaw=Math.PI/2;pitch=-.18;}
   travel.resetInput();Object.assign(travel.state,{x,y,z,yaw,pitch});camera.position.set(x,y,z);camera.rotation.set(pitch,yaw,0,'YXZ');canvas.focus();
  };
  const key=(e:KeyboardEvent)=>{if(e.target instanceof Element&&e.target.closest('button,input,select,textarea'))return;if(e.type==='keydown'&&(e.key==='Enter'||e.key.toLowerCase()==='e')){e.preventDefault();interact();}else travel.key(e.key,e.type==='keydown');};
  const down=(e:PointerEvent)=>{pointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus();};const move=(e:PointerEvent)=>{if(!pointer||controller.state.trainCaseOpen)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer={x:e.clientX,y:e.clientY};if(walking)travel.look(dx,dy);else{camera.rotation.y-=dx*.003;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-dy*.003,-1.1,.95);}};const up=()=>{pointer=null;};const blur=()=>travel.resetInput();
  window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('blur',blur);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  async function load(){try{const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);const [coach,bag]=await Promise.all([loader.loadAsync(SPRING_TRAIN_MODEL),loader.loadAsync(SPRING_TRAIN_CASE_MODEL)]);if(dead)return;train=createSpringNorthTrain(coach.scene,()=>0);quest=createSpringTrainQuest(train,bag.scene,controller);scene.add(train.group,quest.group);travel.setSurface(train.walkingHeight,true,train.stepAllowance);view.current('exterior');setGame(controller);setMessage('');}catch(error){if(!dead)setMessage(String(error));}}
  void load();
  function render(now:number){if(dead)return;const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;
   const n=nightRef.current;scene.background=new THREE.Color(n?0x101a29:0xa9b5bd);ambient.intensity=n?.3:2.1;sun.intensity=n?.12:2.2;
   if(train&&quest){const blocked=controller.state.trainCaseOpen||!!controller.state.trainNoteOpen;if(blocked!==wasBlocked){travel.block(blocked);wasBlocked=blocked;}if(walking&&!controller.state.trainCaseOpen){travel.update(dt);const p=travel.state;camera.position.set(p.x,p.y,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');}
    quest.focusLock(camera);train.update(elapsed,dt,camera,n?1:0);quest.update(elapsed,dt,camera);camera.updateMatrixWorld(true);const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(),camera);const label=quest.target(camera,ray)?.label??train.target(camera,ray)?.label??'';if(label!==lastHint){lastHint=label;setHint(label);}}
   renderer.render(scene,camera);frame=requestAnimationFrame(render);
  }frame=requestAnimationFrame(render);
  return()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);train?.dispose();quest?.dispose();ground.geometry.dispose();ground.material.dispose();renderer.dispose();canvas.remove();};
 },[]);
 return <main className="coach-review"><div ref={host} className="coach-review-canvas"/><nav className="coach-review-toolbar" aria-label="Coach inspection views"><strong>72-berth coach</strong>{[['exterior','Full exterior'],['entry','Entrance'],['first','Seats 1–8'],['side','Side seats 7–8'],['last','Seats 65–72'],['wash','Opposite wash space'],['case','Suitcase · 23–24']].map(([id,label])=><button key={id} onClick={()=>view.current(id)}>{label}</button>)}<button onClick={()=>setNight(v=>!v)}>{night?'Daylight':'Night lighting'}</button></nav>{message&&<p className="coach-review-loading" role="status">{message}</p>}{game&&<SpringGameHUD controller={game} onCommand={(a,v)=>commands.current(a,v)} canPutBack={()=>false} hint={hint}/>}<span className="coach-review-crosshair" aria-hidden="true">+</span><p className="coach-review-help">Drag to look · W A S D / arrows to walk · E / Enter to interact · Hold the mushroom to reveal numbers</p></main>;
}
