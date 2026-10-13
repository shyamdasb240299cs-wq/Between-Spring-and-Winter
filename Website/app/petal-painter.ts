import {flowPetalPose, type FlowPetal} from './petal-flow';

/** The same 160-petal simulation, batched into three small depth passes. */
export function createPetalPainter(host: HTMLElement) {
  const canvases=Array.from(host.querySelectorAll<HTMLCanvasElement>('.petal-stream canvas'));
  const contexts=canvases.map(canvas=>canvas.getContext('2d', {alpha:true})!);
  const sprites=[1,2,3].map(i=>{const image=new Image();image.src=`/scene/layers/sakura-petal-${i}.svg`;return image;});
  let ratio=1, width=0, height=0;
  const painted=[false,false,false];
  return {
    resize(w:number,h:number){
      width=w;height=h;ratio=Math.min(devicePixelRatio,2);
      canvases.forEach(canvas=>{canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);canvas.style.width=w+'px';canvas.style.height=h+'px';});
    },
    paint(pool:FlowPetal[], cameraX:number,cameraY:number,left:number,scale:number,reduced:boolean){
      for(let i=0;i<contexts.length;i++)if(painted[i]){const ctx=contexts[i];ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width*ratio,height*ratio);painted[i]=false;}
      if(reduced)return;
      for(let i=0;i<pool.length;i++){
        const petal=pool[i];if(!petal.active)continue;
        const pose=flowPetalPose(petal),x=cameraX+left+pose.x*scale,y=pose.y*scale-cameraY;
        if(x<-16||x>width+16||y<-16||y>height+16)continue;
        const sprite=sprites[i%3];if(!sprite.complete||!sprite.naturalWidth)continue;
        const depth=pose.layer===1?0:pose.layer===3?1:2,ctx=contexts[depth];painted[depth]=true;
        const size=petal.size/6*scale*pose.depth,angle=pose.turn*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
        ctx.globalAlpha=pose.opacity;
        // Match the original 7 × 9.333 CSS sprite's centered transform origin.
        ctx.setTransform(c*size*ratio,s*size*ratio,-s*size*pose.fold*ratio,c*size*pose.fold*ratio,(x+3.5)*ratio,(y+4.6665)*ratio);
        ctx.drawImage(sprite,-3.5,-4.6665,7,9.333);
      }
      canvases.forEach((canvas,i)=>{const visibility=painted[i]?'visible':'hidden';if(canvas.style.visibility!==visibility)canvas.style.visibility=visibility;});
    }
  };
}
