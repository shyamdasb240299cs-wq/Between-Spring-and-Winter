import {clamp, smooth} from './journey-data';

export type BurnPoint={x:number;y:number};
const TAU=Math.PI*2;

/** A lopsided tear with coarse bays and fine charred teeth, rooted at the gate. */
export function paperBurnContour(progress:number,origin:BurnPoint,width:number,height:number):BurnPoint[]{
  const p=clamp(progress),far=Math.max(...[[0,0],[width,0],[width,height],[0,height]].map(([x,y])=>Math.hypot(x-origin.x,y-origin.y)));
  if(p<=0)return [];
  const radius=5+far*4.5*p**1.7,points:BurnPoint[]=[];
  for(let i=0;i<320;i++){
    const angle=i/320*TAU;
    const bays=.72+.17*Math.sin(angle*3+.7)+.12*Math.sin(angle*5-1.4)+.065*Math.sin(angle*11+.3);
    const teeth=.012*Math.sin(angle*31+p*2)+.007*Math.sin(angle*59-p*3)+.004*Math.sin(angle*97);
    const r=radius*(bays+teeth);
    points.push({x:origin.x+Math.cos(angle)*r*1.16,y:origin.y+Math.sin(angle)*r*.86});
  }
  return points;
}

export function contourPath(points:BurnPoint[]){
  return points.length?'M'+points.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('L')+'Z':'';
}

/** Static washi fibres, painted once; no noise or blur is regenerated per frame. */
export function paintWashi(canvas:HTMLCanvasElement,width:number,height:number){
  canvas.width=Math.ceil(width);canvas.height=Math.ceil(height);
  const tile=document.createElement('canvas');tile.width=tile.height=128;
  const ctx=tile.getContext('2d')!,data=ctx.createImageData(128,128);
  let seed=31973;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<data.data.length;i+=4){const grain=random();data.data[i]=205+grain*23;data.data[i+1]=178+grain*24;data.data[i+2]=136+grain*28;data.data[i+3]=grain>.985?110:grain<.035?57:42;}
  ctx.putImageData(data,0,0);ctx.strokeStyle='#47342528';ctx.lineWidth=.5;
  for(let i=0;i<95;i++){const x=random()*128,y=random()*128;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*5-2.5,y+random()*12);ctx.stroke();}
  const target=canvas.getContext('2d')!;target.fillStyle=target.createPattern(tile,'repeat')!;target.fillRect(0,0,width,height);
}

export function createBurnPainter(canvas:HTMLCanvasElement){
  const ctx=canvas.getContext('2d')!;
  const smoke=document.createElement('canvas');smoke.width=smoke.height=96;
  const smokeCtx=smoke.getContext('2d')!,gradient=smokeCtx.createRadialGradient(48,48,4,48,48,46);
  gradient.addColorStop(0,'#d9cabb48');gradient.addColorStop(.4,'#aca69c23');gradient.addColorStop(1,'#a8a19500');smokeCtx.fillStyle=gradient;smokeCtx.fillRect(0,0,96,96);
  const flame=document.createElement('canvas');flame.width=64;flame.height=128;
  const fire=flame.getContext('2d')!,heat=fire.createLinearGradient(0,10,0,125);
  heat.addColorStop(0,'#ff721000');heat.addColorStop(.35,'#ff6400a0');heat.addColorStop(.8,'#ffab20eb');heat.addColorStop(1,'#fff4ba');
  fire.shadowBlur=10;fire.shadowColor='#ff5300';fire.fillStyle=heat;fire.beginPath();fire.moveTo(17,123);fire.bezierCurveTo(8,94,31,75,37,15);fire.bezierCurveTo(23,65,56,78,49,116);fire.quadraticCurveTo(36,129,17,123);fire.fill();
  fire.shadowBlur=0;fire.fillStyle='#fff0b9cf';fire.beginPath();fire.moveTo(25,124);fire.bezierCurveTo(23,110,33,90,35,73);fire.bezierCurveTo(30,102,46,112,39,124);fire.fill();
  const ash=document.createElement('canvas');ash.width=ash.height=64;
  const ashCtx=ash.getContext('2d')!,char=ashCtx.createImageData(64,64);
  for(let i=0;i<char.data.length;i+=4){const grain=(Math.sin(i*1.713)*43758.5453)%1,value=22+Math.abs(grain)*32;char.data[i]=value*1.22;char.data[i+1]=value;char.data[i+2]=value*.77;char.data[i+3]=255;}
  ashCtx.putImageData(char,0,0);const ashPattern=ctx.createPattern(ash,'repeat')!;
  let width=0,height=0,ratio=1;
  return{
    resize(w:number,h:number){width=w;height=h;ratio=Math.min(devicePixelRatio,1.25);canvas.width=Math.ceil(w*ratio);canvas.height=Math.ceil(h*ratio);},
    paint(points:BurnPoint[],progress:number,time:number){
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);if(!points.length||progress>=1)return;
      const outer=points.map((point,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.max(1,Math.hypot(dx,dy)),curl=12+7*Math.sin(i*.47)+4*Math.sin(i*2.17);return{x:point.x+dy/length*curl,y:point.y-dx/length*curl};});
      ctx.lineJoin='round';ctx.globalAlpha=1;
      // An uneven band of charred fibres and lifted paper replaces a drawn border.
      ctx.beginPath();outer.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
      [...points].reverse().forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
      ctx.shadowBlur=8*ratio;ctx.shadowColor='#160d0bd9';ctx.fillStyle=ashPattern;ctx.fill('evenodd');ctx.shadowBlur=0;
      ctx.beginPath();outer.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
      ctx.lineWidth=1.4;ctx.strokeStyle='#d7b58469';ctx.stroke();
      ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
      ctx.shadowBlur=19*ratio;ctx.shadowColor='#ff5907';ctx.lineWidth=4;ctx.strokeStyle=`rgba(255,112,12,${.8+.16*Math.sin(time*13)})`;ctx.stroke();
      ctx.shadowBlur=5*ratio;ctx.shadowColor='#ffb025';ctx.lineWidth=1.8;ctx.strokeStyle='#ffe49fee';
      // White-hot sections break up along the char, rather than a uniform outline.
      ctx.beginPath();for(let i=0;i<points.length-1;i++){if(Math.sin(i*2.41)+Math.sin(i*.37+time*3)<-.15)continue;ctx.moveTo(points[i].x,points[i].y);ctx.lineTo(points[i+1].x,points[i+1].y);}ctx.stroke();
      ctx.shadowBlur=0;
      const life=smooth(progress,0,.08)*(1-smooth(progress,.84,1));
      for(let i=0;i<points.length;i+=13){const point=points[i],tip=outer[i],flicker=.65+.35*Math.sin(time*9+i*1.3),size=(24+10*Math.sin(i*.73))*flicker;
        ctx.save();ctx.translate(point.x,point.y);ctx.rotate(Math.atan2(tip.y-point.y,tip.x-point.x)+Math.PI/2);ctx.globalAlpha=life*(.6+.25*Math.sin(i));ctx.drawImage(flame,-size*.35,-size*1.35,size*.7,size*1.4);ctx.restore();
      }
      for(let i=0;i<38;i++){
        const point=points[(i*47)%points.length],age=(time*.53+i*.618)%1;
        const x=point.x-age*(55+i%5*13),y=point.y-age*(100+i%7*17);
        ctx.globalAlpha=life*(1-age)*.83;ctx.fillStyle=i%3?'#ff9d3c':'#ffe0a1';
        ctx.fillRect(x,y,1.1+i%3*.7,2.3+i%4*.9);
        if(i%5===0){ctx.globalAlpha=life*(1-age)*.35;const size=58+age*74;ctx.drawImage(smoke,x-size/2,y-size/2,size,size);}
      }
      ctx.globalAlpha=1;
    }
  };
}
