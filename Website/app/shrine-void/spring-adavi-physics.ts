/** Deterministic stone skipping. All positions are local to the Adavi river. */
export interface SkipPoint {x:number;y:number;z:number}
export interface AdaviStone {
  id:string;
  name:string;
  shape:'flat'|'oval'|'round';
  /** Hydrodynamic suitability: a thin, broad face is close to one. */
  flatness:number;
  size:number;
  model:'river-pebble'|'river-rock'|'rock';
  scale:SkipPoint;
  position:{x:number;z:number};
  rotation:number;
}
export interface SkipSettings {power:number;angle:number;aim:number;seed?:number}
export interface SkipConditions {drift:number;speed:number;lift:number}
export interface SkipImpact extends SkipPoint {t:number;skip:number;speed:number;strength:number;incidence:number}
export interface SkipSegment {
  t0:number;t1:number;start:SkipPoint;velocity:SkipPoint;gravity:number;
  kind:'flight'|'sink';
}
export interface SkipTrajectory {
  stoneId:string;settings:SkipSettings;
  samples:(SkipPoint&{t:number})[];
  segments:SkipSegment[];
  impacts:SkipImpact[];
  duration:number;distance:number;skips:number;success:boolean;
  feedback:string;
  end:SkipPoint;
  landing:'bank'|'sink'|'miss';
}

export const ADAVI_WATER_Y=.16;
export const ADAVI_THROW_START:Readonly<SkipPoint>=Object.freeze({x:-6.8,y:1.35,z:7});
export const ADAVI_TARGET=Object.freeze({x:6.65,y:.20,z:7,halfWidth:2.1});
export const ADAVI_SKIP_GRAVITY=9.81;
const radians=Math.PI/180;
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const finite=(v:number,fallback:number)=>Number.isFinite(v)?v:fallback;
const random=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
const conditionSeed=(seed:number)=>Math.trunc(finite(seed,0))>>>0;
const conditionRandom=(seed:number,salt:number)=>{let n=(seed^salt)>>>0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;};
/** One stable set of river conditions per attempt. Drift is in degrees. */
export function skipConditions(seed:number):SkipConditions {
  const key=conditionSeed(seed);if(!key)return {drift:0,speed:1,lift:1};
  return {drift:(conditionRandom(key,0x7f4a7c15)*2-1)*12,speed:.965+conditionRandom(key,0x6a09e667)*.07,lift:.94+conditionRandom(key,0x3c6ef372)*.12};
}
// Match the visible main channel without importing the Three.js environment.
const centre=(z:number)=>1.05*Math.sin(z*.075)+.33*Math.sin(z*.22);
const width=(z:number)=>5.55+.48*Math.sin(z*.13)+.26*Math.cos(z*.31);
const bankEdge=(p:SkipPoint)=>Math.abs(p.x-centre(p.z))-width(p.z);
const smooth=(x:number)=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
const bankGround=(x:number,z:number)=>{
  const d=Math.max(0,Math.abs(x-centre(z))-width(z));
  const relief=Math.sin(x*.72+z*.19)*.017+Math.sin(z*.55-x*.23)*.012;
  return ADAVI_WATER_Y-.04+.11*d+.19*smooth(d/2.2)+Math.min(1.8,d*d*.006)+relief*smooth(d/1.2)+.025;
};

const stoneSpecs:ReadonlyArray<readonly [string,string,AdaviStone['shape'],number,AdaviStone['model']]>=[
  ['slate-skipper','Flat slate skipper','flat',.97,'river-pebble'],
  ['river-disc','Smooth river disc','flat',.92,'river-pebble'],
  ['thin-shale','Thin shale flake','flat',.77,'river-rock'],
  ['silver-slate','Silver slate','flat',.95,'rock'],
  ['warm-pebble','Warm oval pebble','oval',.63,'river-pebble'],
  ['broad-oval','Broad oval stone','oval',.74,'river-rock'],
  ['moss-oval','Mossy oval pebble','oval',.58,'rock'],
  ['river-egg','Round river egg','round',.22,'river-pebble'],
  ['speckled-round','Speckled round stone','round',.29,'river-rock'],
  ['grey-knuckle','Grey knuckle stone','round',.16,'rock'],
  ['little-slate','Little flat slate','flat',.79,'river-pebble'],
  ['broad-skimmer','Broad flat skimmer','flat',.94,'river-rock'],
  ['weathered-oval','Weathered oval','oval',.68,'rock'],
  ['round-quartz','Rounded quartz pebble','round',.25,'river-pebble'],
  ['dark-disc','Dark river disc','flat',.96,'rock'],
  ['heavy-cobble','Heavy river cobble','round',.13,'river-rock'],
];
/** Stable scattered pickup positions; thin and round shapes use imported 3D rocks. */
export const ADAVI_STONES:ReadonlyArray<AdaviStone>=Object.freeze(stoneSpecs.map(([id,name,shape,flatness,model],i)=>{
  const z=3.2+random(i+581)*11.2;
  const x=centre(z)-width(z)-1.45-random(i+729)*2.8;
  return Object.freeze({id,name,shape,flatness,model,size:.19+random(i+999)*.115,
    position:Object.freeze({x,z}),rotation:random(i+82)*Math.PI*2,
    scale:Object.freeze({x:.91+random(i+38)*.25,y:shape==='flat'?Math.min(.29,.18+(1-flatness)*.6):shape==='oval'?.48:.83+random(i+17)*.22,z:.71+random(i+52)*.23})});
}));

function at(segment:SkipSegment,t:number):SkipPoint {
  const elapsed=clamp(t-segment.t0,0,segment.t1-segment.t0);
  return {x:segment.start.x+segment.velocity.x*elapsed,y:segment.start.y+segment.velocity.y*elapsed-.5*segment.gravity*elapsed*elapsed,z:segment.start.z+segment.velocity.z*elapsed};
}

/** Sample exact ballistic segments, so rendering never depends on frame rate. */
export function sampleSkip(trajectory:SkipTrajectory,time:number):SkipPoint {
  if(!trajectory.segments.length)return {...ADAVI_THROW_START};
  const t=clamp(finite(time,0),0,trajectory.duration);
  let low=0,high=trajectory.segments.length-1;
  while(low<high){const mid=(low+high)>>1;if(trajectory.segments[mid].t1<t)low=mid+1;else high=mid;}
  return at(trajectory.segments[low],t);
}

/** Find the first dry-bank collision; water intersections are solved analytically. */
function shoreContact(segment:SkipSegment):number|null {
  const span=segment.t1-segment.t0,steps=Math.max(24,Math.ceil(span*120));
  let previous=segment.t0;
  for(let i=1;i<=steps;i++){
    const t=segment.t0+span*i/steps,p=at(segment,t);
    if(bankEdge(p)>.12&&p.y<=bankGround(p.x,p.z)){
      let lo=previous,hi=t;
      for(let j=0;j<28;j++){const mid=(lo+hi)/2,q=at(segment,mid);if(bankEdge(q)>.12&&q.y<=bankGround(q.x,q.z))hi=mid;else lo=mid;}
      return hi;
    }
    previous=t;
  }
  return null;
}

/**
 * Release slightly down toward the water, then exchange downward momentum for
 * hydrodynamic lift on each flat-face contact. Horizontal drag and a limited
 * restitution dissipate energy on every hop; no authored teleport or tween is
 * used. A shallow release and a broad, thin stone preserve that lift longest.
 */
export function simulateSkip(stone:AdaviStone,settings:SkipSettings):SkipTrajectory {
  const input:SkipSettings={power:clamp(finite(settings.power,.5),0,1),angle:clamp(finite(settings.angle,12),4,40),aim:clamp(finite(settings.aim,0),-25,25),...(settings.seed===undefined?{}:{seed:conditionSeed(settings.seed)})};
  const conditions=skipConditions(input.seed??0),heading=(input.aim+conditions.drift)*radians;
  const flatness=clamp(finite(stone.flatness,.2),0,1),speed=(4.2+input.power*8)*conditions.speed;
  const direction={x:Math.cos(heading),z:Math.sin(heading)};
  let horizontal=speed*Math.cos(input.angle*radians),vertical=-speed*Math.sin(input.angle*radians),position:SkipPoint={...ADAVI_THROW_START},time=0;
  const segments:SkipSegment[]=[],impacts:SkipImpact[]=[];
  let landing:SkipTrajectory['landing']='sink';
  for(let hop=0;hop<10;hop++){
    const waterTime=(vertical+Math.sqrt(vertical*vertical+2*ADAVI_SKIP_GRAVITY*Math.max(0,position.y-ADAVI_WATER_Y)))/ADAVI_SKIP_GRAVITY;
    const segment:SkipSegment={t0:time,t1:time+Math.max(.0001,waterTime),start:{...position},velocity:{x:direction.x*horizontal,y:vertical,z:direction.z*horizontal},gravity:ADAVI_SKIP_GRAVITY,kind:'flight'};
    const shore=shoreContact(segment);
    if(shore!==null){
      segment.t1=shore;segments.push(segment);time=shore;position=at(segment,time);
      landing=position.x>centre(position.z)?'bank':'miss';break;
    }
    segments.push(segment);time=segment.t1;position=at(segment,time);position.y=ADAVI_WATER_Y;
    if(bankEdge(position)>.18){landing=position.x>centre(position.z)?'bank':'miss';break;}
    const downward=Math.abs(vertical-ADAVI_SKIP_GRAVITY*waterTime),incidence=Math.atan2(downward,horizontal)/radians;
    impacts.push({...position,t:time,skip:impacts.length+1,speed:horizontal,strength:clamp(downward/5,.22,1),incidence});
    // Thick stones enter the water; steep impacts cannot generate skimming lift.
    if(flatness<.45||incidence>14+flatness*16||horizontal<3.7||hop===9)break;
    const skim=clamp(1-Math.max(0,incidence-18)/20,0,1);
    const retained=horizontal*(.89+.07*flatness-.10*(1-skim));
    const lift=(downward*(.25+.17*flatness)+retained*.0625*flatness*flatness*skim)*conditions.lift;
    // The rebound cannot create energy: its vertical component fits within
    // the kinetic energy left after horizontal drag and splash dissipation.
    const energyLimit=Math.sqrt(Math.max(0,(horizontal*horizontal+downward*downward)*.96-retained*retained));
    vertical=Math.min(lift,retained*.25,energyLimit);horizontal=retained;
    if(vertical<.32)break;
  }
  const reachedBank=landing==='bank';
  const aligned=Math.abs(position.z-ADAVI_TARGET.z)<=ADAVI_TARGET.halfWidth;
  const success=reachedBank&&aligned&&impacts.length>=4;
  if(reachedBank&&!aligned)landing='miss';
  if(landing==='sink'){
    const sink:SkipSegment={t0:time,t1:time+.48,start:{...position},velocity:{x:direction.x*horizontal*.16,y:-.24,z:direction.z*horizontal*.16},gravity:2.2,kind:'sink'};
    segments.push(sink);time=sink.t1;position=at(sink,time);
  }
  let feedback:string;
  if(success)feedback='Four skips and across! That was the perfect stone.';
  else if(flatness<.45)feedback='That rounded stone sank. Look for a thin, flat stone on the shore.';
  else if(input.angle>23||input.angle>11&&impacts.length===0)feedback='The release was too steep. Keep the angle low so the stone clears the shore and skims the surface.';
  else if(!aligned||Math.abs(input.aim)>12)feedback='It drifted away from the opposite landing. Aim along the centre guide.';
  else if(reachedBank&&impacts.length<4)feedback='Across, but it needs four skips. Lower the release angle and ease the power a little.';
  else if(input.power<.55)feedback='The stone ran out of speed. Add more force for the opposite bank.';
  else if(flatness<.82)feedback='A flatter stone will hold its lift for longer. Try one with a broad, thin face.';
  else feedback='Almost. Try a shallow angle near 10° and about three-quarter force.';
  const trajectory:SkipTrajectory={stoneId:stone.id,settings:input,segments,impacts,samples:[],duration:time,distance:Math.hypot(position.x-ADAVI_THROW_START.x,position.z-ADAVI_THROW_START.z),skips:impacts.length,success,feedback,end:{...position},landing};
  const times=new Set<number>([0,time,...impacts.map(impact=>impact.t),...segments.map(segment=>segment.t1)]);
  for(let t=1/60;t<time;t+=1/60)times.add(t);
  trajectory.samples=[...times].sort((a,b)=>a-b).map(t=>({...sampleSkip(trajectory,t),t}));
  return trajectory;
}
