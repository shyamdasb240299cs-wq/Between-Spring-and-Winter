type Point=readonly [number,number];
const shapes:Record<string,Point[][]>={
 S:[[[.84,.12],[.65,.04],[.32,.06],[.12,.21],[.16,.36],[.39,.46],[.70,.54],[.84,.69],[.78,.86],[.53,.96],[.24,.91],[.09,.82]]],
 '1':[[[.25,.24],[.52,.06],[.52,.94]]],
 '9':[[[.82,.44],[.60,.53],[.28,.48],[.13,.28],[.24,.08],[.58,.05],[.82,.20],[.82,.60],[.65,.88],[.35,.96]]],
 '6':[[[.78,.08],[.48,.06],[.22,.31],[.12,.67],[.23,.91],[.55,.96],[.80,.80],[.79,.59],[.56,.48],[.28,.54],[.12,.67]]],
};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
export const MIRROR_WRITING_DURATION=9;
// Rounded paths revealed by distance, including a pause between characters.
export const MIRROR_STROKES=[{v:'S',x:.19,y:.22},{v:'1',x:.56,y:.23},{v:'1',x:.10,y:.54},{v:'9',x:.39,y:.53},{v:'6',x:.68,y:.55}].flatMap((char,index)=>shapes[char.v].map(path=>{
 const points:Point[]=[];
 for(let i=0;i<path.length-1;i++)for(let step=0;step<12;step++){
  const t=step/12,a=path[Math.max(0,i-1)],b=path[i],c=path[i+1],d=path[Math.min(path.length-1,i+2)];
  const sample=(k:number)=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t);
  points.push([char.x+sample(0)*.22,char.y+sample(1)*.22]);
 }
 const end=path.at(-1)!;points.push([char.x+end[0]*.22,char.y+end[1]*.22]);
 const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i][0]-points[i-1][0],(points[i][1]-points[i-1][1])*1.5));
 return {points,distances,length:distances.at(-1)!,start:2.1+index*1.27,duration:char.v==='1'?.72:1.12};
}));
export function paintMirrorWriting(canvas:HTMLCanvasElement,age:number){
 const c=canvas.getContext('2d');if(!c)return;
 const w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
 // Breath blooms softly from the centre, leaving the edges of the glass clear.
 const breath=smooth(age/1.8);if(!breath)return;
 c.save();c.scale(w,h);
 for(const [x,y,rx,ry,alpha] of [[.48,.46,.46,.40,.72],[.39,.49,.32,.35,.21],[.61,.56,.32,.31,.18]]){
  c.save();c.translate(x,y);c.scale(rx*(.30+.70*breath),ry*(.30+.70*breath));
  const fog=c.createRadialGradient(0,0,0,0,0,1);fog.addColorStop(0,`rgba(217,233,232,${alpha*breath})`);fog.addColorStop(.58,`rgba(217,233,232,${alpha*.83*breath})`);fog.addColorStop(1,'rgba(217,233,232,0)');c.fillStyle=fog;c.fillRect(-1,-1,2,2);c.restore();
 }
 c.restore();
 // Stable, fine droplets avoid flicker and the old oversized white specks.
 for(let i=0;i<210;i++){
  const x=((Math.sin(i*91.7)*43758.54)%1+1)%1,y=((Math.sin(i*23.3)*13758.54)%1+1)%1;
  const density=Math.max(0,1-Math.hypot((x-.5)/.46,(y-.49)/.42));
  if(!density)continue;c.fillStyle=`rgba(244,252,251,${density*.16*breath})`;c.beginPath();c.ellipse(x*w,y*h,.6+i%2,.9+i%3,0,0,Math.PI*2);c.fill();
 }
 c.lineCap='round';c.lineJoin='round';
 for(const stroke of MIRROR_STROKES){
  const progress=clamp((age-stroke.start)/stroke.duration);if(!progress)continue;
  const distance=progress*stroke.length;c.beginPath();c.moveTo(stroke.points[0][0]*w,stroke.points[0][1]*h);
  for(let i=1;i<stroke.points.length;i++){
   const a=stroke.points[i-1],b=stroke.points[i],t=clamp((distance-stroke.distances[i-1])/(stroke.distances[i]-stroke.distances[i-1]));
   c.lineTo((a[0]+(b[0]-a[0])*t)*w,(a[1]+(b[1]-a[1])*t)*h);if(t<1)break;
  }
  // A fingertip clears condensation rather than painting printed black ink.
  c.globalCompositeOperation='destination-out';c.lineWidth=w*.027;c.strokeStyle='rgba(0,0,0,.94)';c.stroke();
  c.lineWidth=w*.040;c.strokeStyle='rgba(0,0,0,.12)';c.stroke();c.globalCompositeOperation='source-over';
 }
}
