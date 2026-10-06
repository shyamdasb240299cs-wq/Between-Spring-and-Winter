const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const ts=require(path.join(root,'Website/node_modules/typescript'));
const sharp=require(path.join(root,'Website/node_modules/sharp'));
const cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,{exports,require:name=>load(path.resolve(path.dirname(file),name+'.ts'))});return exports;}
const {landscapeLayout}=load(path.join(root,'Website/app/scenery-layout.ts'));
const {smooth}=load(path.join(root,'Website/app/journey-data.ts'));
async function asset(name){const {data,info}=await sharp(path.join(root,'Website/public/scene/layers',name+'.webp')).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data,...info};}
function alpha(im,x,y){x=Math.floor(x);y=Math.floor(y);return x>=0&&y>=0&&x<im.width&&y<im.height?im.data[(y*im.width+x)*4+3]:0;}
(async()=>{
const [house,gate,bank]=await Promise.all(['house','torii','grounding-bank'].map(asset));
const rows=[];
for(const [w,h] of [[1021,572],[1440,900],[844,390]]){
const l=landscapeLayout(w,h);
for(const p of [3.15,3.78,3.85,4]){
const pass=smooth(p,3.78,4.35),depth=l.camera(p)-l.letterCamera;
const hx=l.house.left+pass*l.houseExit,hy=l.house.top-l.camera(p)-depth*.045-pass*h*.06;
const gx=l.gate.left,gy=l.gate.top-l.camera(p)-depth*.012;
const bw=l.house.width*.92,bh=bw*bank.height/bank.width,bx=hx+l.house.width*.16,by=hy+l.house.height*1.07-bh;
let gatePixels=0,overlapPixels=0,bankOverlap=0,maxHouseAlpha=0;
for(let y=Math.max(0,Math.floor(gy));y<Math.min(h,Math.ceil(gy+l.gate.height));y++)for(let x=Math.max(0,Math.floor(gx));x<Math.min(w,Math.ceil(gx+l.gate.width));x++){
const ga=alpha(gate,(x-gx)/l.gate.width*gate.width,(y-gy)/l.gate.height*gate.height);if(ga<50)continue;gatePixels++;
const ha=alpha(house,(x-hx)/l.house.width*house.width,(y-hy)/l.house.height*house.height);maxHouseAlpha=Math.max(maxHouseAlpha,ha);if(ha>50)overlapPixels++;
if(alpha(bank,(x-bx)/bw*bank.width,(y-by)/bh*bank.height)>50)bankOverlap++;
}
rows.push({size:[w,h],p,gatePixels,houseOverlapPixels:overlapPixels,bankOverlapPixels:bankOverlap,maxHouseAlpha});
}}
console.log(JSON.stringify({assets:{house:[house.width,house.height],gate:[gate.width,gate.height],bank:[bank.width,bank.height]},rows},null,2));
})();
