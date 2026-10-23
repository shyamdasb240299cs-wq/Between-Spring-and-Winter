import * as THREE from 'three';

/** Small, deterministic material studies: no remote fetches or extra loading step. */
export function createClassroomSurfaces(keep:(texture:THREE.Texture)=>void){
  function canvas(width=512,height=512){const element=document.createElement('canvas');element.width=width;element.height=height;return {element,c:element.getContext('2d')!};}
  function texture(element:HTMLCanvasElement,colour=true,repeatX=1,repeatY=1){
    const result=new THREE.CanvasTexture(element);result.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;
    result.wrapS=result.wrapT=THREE.RepeatWrapping;result.repeat.set(repeatX,repeatY);result.anisotropy=4;keep(result);return result;
  }
  let seed=8647;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const plaster=canvas(),plasterRelief=canvas();
  plaster.c.fillStyle='#d9d1ba';plaster.c.fillRect(0,0,512,512);plasterRelief.c.fillStyle='#808080';plasterRelief.c.fillRect(0,0,512,512);
  for(let n=0;n<11000;n++){
    const x=random()*512,y=random()*512,r=.4+random()*3;
    plaster.c.fillStyle=n%3===0?'#9389770a':'#fff9df13';plaster.c.fillRect(x,y,r,r*.65);
    plasterRelief.c.fillStyle=n%2?'#9c9c9c':'#6d6d6d';plasterRelief.c.fillRect(x,y,r,r*.7);
  }
  // Limewash keeps the subtle trowel variation visible in raking window light.
  for(let n=0;n<90;n++){plaster.c.strokeStyle='#fff5d909';plaster.c.lineWidth=8+random()*22;plaster.c.beginPath();const x=random()*512,y=random()*512;plaster.c.moveTo(x,y);plaster.c.lineTo(x+60+random()*100,y-12+random()*24);plaster.c.stroke();}
  const terrazzo=canvas(),floorRelief=canvas();terrazzo.c.fillStyle='#bdb5a7';terrazzo.c.fillRect(0,0,512,512);floorRelief.c.fillStyle='#a6a6a6';floorRelief.c.fillRect(0,0,512,512);
  const chips=['#f0e8d5','#9d998b','#cfb9a3','#7c8179','#d7d4be'];
  for(let n=0;n<3600;n++){
    const x=random()*512,y=random()*512,w=1+random()*3.5,h=1+random()*2.4;
    terrazzo.c.fillStyle=chips[n%chips.length];terrazzo.c.beginPath();terrazzo.c.moveTo(x,y);terrazzo.c.lineTo(x+w,y+h*.3);terrazzo.c.lineTo(x+w*.4,y+h);terrazzo.c.lineTo(x-w*.3,y+h*.6);terrazzo.c.closePath();terrazzo.c.fill();
    floorRelief.c.fillStyle='#b2b2b2';floorRelief.c.fillRect(x,y,w,h);
  }
  for(let i=0;i<4;i++){
    const p=i*128;terrazzo.c.fillStyle='#706e623d';terrazzo.c.fillRect(p,0,2,512);terrazzo.c.fillRect(0,p,512,2);
    terrazzo.c.fillStyle='#ece2cd66';terrazzo.c.fillRect(p+2,0,1,512);terrazzo.c.fillRect(0,p+2,512,1);
    floorRelief.c.fillStyle='#454545';floorRelief.c.fillRect(p,0,2,512);floorRelief.c.fillRect(0,p,512,2);
  }
  const board=canvas(1024,384);board.c.fillStyle='#284236';board.c.fillRect(0,0,1024,384);
  for(let n=0;n<800;n++){board.c.fillStyle=n%2?'#d9dfb704':'#081d1407';board.c.fillRect(random()*1024,random()*384,12+random()*130,2+random()*10);}
  board.c.fillStyle='#e6e5cd';board.c.font='italic 39px Georgia';board.c.fillText('Some evenings stay with us.',62,84);
  board.c.strokeStyle='#cbd3b984';board.c.lineWidth=1.6;board.c.beginPath();board.c.moveTo(62,107);board.c.lineTo(947,107);board.c.stroke();
  board.c.font='23px Georgia';board.c.fillStyle='#d8dec59c';board.c.fillText('Welcome back to our classroom',64,157);
  board.c.font='21px Georgia';board.c.fillText('Follow the blue cloth on the front desk.',64,196);
  board.c.font='italic 22px Georgia';board.c.fillText('A place for the little things we kept.',64,303);
  // The board is scenery rather than another puzzle: its instructions name a real object.
  const sign=canvas(768,192);sign.c.fillStyle='#ece1c8';sign.c.fillRect(0,0,768,192);sign.c.strokeStyle='#675b45';sign.c.lineWidth=4;sign.c.strokeRect(12,12,744,168);sign.c.fillStyle='#504c3e';sign.c.textAlign='center';sign.c.font='36px Georgia';sign.c.fillText('THE GARDEN CLASSROOM',384,87);sign.c.font='24px Georgia';sign.c.fillText('An evening worth keeping',384,134);
  const exit=canvas(384,96);exit.c.fillStyle='#d7c6a5';exit.c.fillRect(0,0,384,96);exit.c.fillStyle='#4b5140';exit.c.font='27px Georgia';exit.c.textAlign='center';exit.c.fillText('BACK TO THE GARDEN',192,59);
  const poster=canvas(384,512);poster.c.fillStyle='#d9d1ad';poster.c.fillRect(0,0,384,512);poster.c.strokeStyle='#787c5666';poster.c.lineWidth=3;poster.c.strokeRect(14,14,356,484);poster.c.fillStyle='#4f6550';poster.c.textAlign='center';poster.c.font='25px Georgia';poster.c.fillText('GROW A LITTLE EVERY DAY',192,62);
  poster.c.strokeStyle='#627b4d';poster.c.lineWidth=5;poster.c.beginPath();poster.c.moveTo(192,408);poster.c.bezierCurveTo(170,340,216,264,190,157);poster.c.stroke();
  for(let i=0;i<6;i++){const y=190+i*33,side=i%2?1:-1;poster.c.fillStyle=i%2?'#7a925f':'#526d4b';poster.c.beginPath();poster.c.ellipse(190+side*29,y,36,13,side*.5,0,Math.PI*2);poster.c.fill();}
  poster.c.fillStyle='#6e7658';poster.c.font='19px Georgia';poster.c.fillText('Care  ·  patience  ·  sunshine',192,466);
  return {
    plaster:texture(plaster.element,true,3,2),plasterBump:texture(plasterRelief.element,false,3,2),
    floor:texture(terrazzo.element,true,5,6.5),floorBump:texture(floorRelief.element,false,5,6.5),
    blackboard:texture(board.element),sign:texture(sign.element),exit:texture(exit.element),poster:texture(poster.element),
  };
}
