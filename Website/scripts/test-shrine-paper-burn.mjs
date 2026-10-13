import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {paperBurnContour,contourPath}=await import('../app/shrine-paper-burn.ts');
const {shrineVideoPose,SHRINE_FILM}=await import('../app/shrine-video-motion.ts');
function inside(point,polygon){let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)result=!result;}return result;}
const area=points=>Math.abs(points.reduce((sum,p,i)=>{const next=points[(i+1)%points.length];return sum+p.x*next.y-next.x*p.y;},0))/2;
for(const [width,height] of [[1265,720],[1920,1080],[2560,1080],[844,390],[390,844]]){
  const origin={x:width*.64,y:height*.42};assert.deepEqual(paperBurnContour(0,origin,width,height),[]);
  let previous=0;
  for(let p=.01;p<=1.001;p+=.01){const points=paperBurnContour(p,origin,width,height);assert.ok(points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)));assert.ok(inside(origin,points),'Burn stays rooted in the shrine');const next=area(points);assert.ok(next>previous,'Reveal grows continuously');previous=next;assert.ok(contourPath(points).startsWith('M'));}
  const end=paperBurnContour(1,origin,width,height);for(const point of [{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}])assert.ok(inside(point,end),'Final reveal covers the complete viewport');
  const early=paperBurnContour(.001,origin,width,height);assert.ok(early.every(p=>Math.hypot(p.x-origin.x,p.y-origin.y)<8),'First tear is localized to the shrine');
  const gate={...origin,w:width*.14};
  for(let ms=10;ms<=SHRINE_FILM.zoomEndMs;ms+=10){const pose=shrineVideoPose(ms,gate,width,height),bounds=pose.filmBounds;
    const contour=paperBurnContour(pose.burnProgress,{x:pose.x,y:pose.y},width,height);
    assert.ok(contour.every(p=>p.x>bounds.left&&p.x<bounds.left+bounds.width&&p.y>bounds.top&&p.y<bounds.top+bounds.height),'Early reveal contains only the live video, never a tile boundary or a frozen mirror');
  }
  const final=shrineVideoPose(SHRINE_FILM.zoomMs,gate,width,height),reveal=paperBurnContour(final.burnProgress,{x:final.x,y:final.y},width,height);
  for(const point of [{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}])assert.ok(inside(point,reveal),'Final reveal reaches every viewport corner');
}
console.log('Paper burn passed: gate-local start, continuous growth, finite contours and complete final coverage at five viewport shapes.');
