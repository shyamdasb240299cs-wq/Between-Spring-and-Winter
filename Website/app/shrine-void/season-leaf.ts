import * as THREE from 'three';

/** A veined, serrated broadleaf, shared by the curled litter and airborne leaves. */
export function createLeafTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const c=canvas.getContext('2d')!;
  c.beginPath();c.moveTo(128,18);
  for(let i=1;i<=36;i++){
    const t=i/36,y=18+t*207,w=Math.sin(Math.PI*t)**.82*76;
    c.lineTo(128+w*(i%2?.94:1),y);
  }
  for(let i=36;i>=0;i--){const t=i/36;c.lineTo(128-Math.sin(Math.PI*t)**.82*70*(i%2?.94:1),18+t*207);}
  c.closePath();c.save();c.clip();
  const gradient=c.createLinearGradient(40,0,210,240);gradient.addColorStop(0,'#e7cc85');gradient.addColorStop(.5,'#fff1bd');gradient.addColorStop(1,'#a4783e');c.fillStyle=gradient;c.fillRect(0,0,256,256);
  for(let i=0;i<1700;i++){const x=(Math.sin(i*47.1)*.5+.5)*256,y=(Math.sin(i*19.7)*.5+.5)*256;c.fillStyle=i%3?'#68452210':'#fff8d014';c.fillRect(x,y,1+i%3,1+i%2);}
  c.strokeStyle='#76552266';c.lineWidth=1.5;
  for(let i=0;i<9;i++){const y=58+i*18,w=Math.sin((y-18)/207*Math.PI)*66;for(const side of [-1,1]){c.beginPath();c.moveTo(128,y+28);c.quadraticCurveTo(128+side*w*.55,y+12,128+side*w,y-8);c.stroke();}}
  c.restore();c.strokeStyle='#75572b';c.lineWidth=2;c.beginPath();c.moveTo(126,245);c.quadraticCurveTo(133,150,128,25);c.stroke();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
