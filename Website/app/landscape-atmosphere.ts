/** Softly feathered noise is rasterized once; ambient drift and scrolling only transform it. */
export const fogBands=[
  {top:.168,height:.078,depth:.28,colour:[236,205,197]},
  {top:.229,height:.068,depth:.43,colour:[226,200,196]},
  {top:.286,height:.075,depth:.63,colour:[224,202,200]},
  {top:.352,height:.071,depth:.8,colour:[218,201,199]},
  {top:.418,height:.062,depth:1,colour:[213,202,199]},
] as const;

function hash(x:number,y:number){const value=Math.sin(x*127.1+y*311.7)*43758.5453;return value-Math.floor(value);}
function noise(x:number,y:number){
  const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);
  return (hash(a,b)*(1-s)+hash(a+1,b)*s)*(1-t)+(hash(a,b+1)*(1-s)+hash(a+1,b+1)*s)*t;
}

export function prepareFog(elements:HTMLElement[]){
  elements.forEach((element,index)=>{
    const band=fogBands[index],canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
    const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(canvas.width,canvas.height);
    for(let y=0;y<128;y++)for(let x=0;x<768;x++){
      const u=x/767,v=y/127;
      // Valley-shaped filaments, fine turbulent wisps, transparent edges.
      const centre=.49+Math.sin(u*14+index*1.7)*.13+Math.sin(u*31+index)*.055;
      const envelope=Math.exp(-(((v-centre)/.19)**2))*Math.sin(Math.PI*u)**.55;
      const density=noise(u*7+index*19,v*3)*.56+noise(u*19,v*7+index*7)*.29+noise(u*49,v*15)*.15;
      const i=(y*768+x)*4;
      pixels.data[i]=band.colour[0];pixels.data[i+1]=band.colour[1];pixels.data[i+2]=band.colour[2];
      pixels.data[i+3]=Math.round(Math.max(0,density-.22)*envelope*116);
    }
    ctx.putImageData(pixels,0,0);element.style.backgroundImage=`url(${canvas.toDataURL()})`;
  });
}
