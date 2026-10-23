import {SUMMER_HINTS,SUMMER_TRAINING_POSTS,SUMMER_OBSERVATION_START,SUMMER_OBSERVATIONS,SUMMER_PLATE_ORDER,summerChartCorrect,summerObservationCorrect,summerCurrentCorrect,summerCableCorrect,summerCassetteCorrect,type SummerCableSocket,type SummerChartPlacement,type SummerHintId,type SummerPlateId,type SummerRouteChoice,type SummerShape,type SummerTilePlacement} from './summer-puzzle-data';

import {SUMMER_AIR_CAPACITY,summerAirSeconds,summerAirWarning} from './summer-air';

export const SUMMER_SAVE_KEY='between-seasons-summer-v1';
export type SummerMode='walking'|'boarding'|'boating'|'mooring'|'gearing'|'enteringWater'|'swimming'|'climbing'|'docking'|'reading';
export type SummerCheckpoint='S0'|'S3'|'B0'|'B2'|'U0'|'U1'|'U2'|'REST'|'U3'|'U4'|'S1';
export type SummerPanel='note'|'chart'|'preparation'|'gear'|'bottle'|'observation'|'frame-1'|'frame-2'|'frame-3'|'current'|'rest'|'cable'|'cassette'|'case'|'letter'|'journal'|'recovery'|'boat'|'mooring';
export type SummerRecovery='post'|'boat'|'island';
export interface SummerStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export interface SummerSave {
  version:1;noteRead:boolean;chartPieces:[boolean,boolean];chartAssembled:boolean;airSeconds:number;bottleRead:boolean;
  consoleInspected:boolean;bagStowed:boolean;fuelCanTaken:boolean;capOpen:boolean;spoutFitted:boolean;fuelPoured:boolean;capReplaced:boolean;hoseConnected:boolean;fuelCanReturned:boolean;
  wetsuitWorn:boolean;bcdEquipped:boolean;gearChecked:boolean;gearOnboard:boolean;
  boatAnchor:'berth'|'mooring';engineRunning:boolean;ladderDown:boolean;maskFitted:boolean;finsFitted:boolean;finalGearChecked:boolean;
  trainingPosts:[boolean,boolean,boolean];observationRecords:[boolean,boolean,boolean];observationSolved:boolean;handleTaken:boolean;
  routeBoardOpen:boolean;routeRecorded:boolean;restReached:boolean;plates:SummerPlateId[];
  cableRouted:boolean;cableSupported:boolean;catchReleased:boolean;carriageRaised:boolean;carriagePinned:boolean;winchPlateTaken:boolean;cassetteReleased:boolean;
  caseRecovered:boolean;caseLocation:'keeper'|'harness'|'boat'|'table';returnedToShore:boolean;gearRemoved:boolean;caseLatches:[boolean,boolean];caseOpened:boolean;letterOpened:boolean;bookUnlocked:boolean;legacyBookUnlocked:boolean;
  checkpoint:SummerCheckpoint;lastUnderwaterPost:SummerCheckpoint;hints:Record<SummerHintId,number>;
  preferences:{reducedMotion:boolean;sound:boolean};
}
export interface SummerState extends SummerSave {
  mode:SummerMode;message:string;storageAvailable:boolean;saveNotice:string;
  chartPreview:{pieces:[SummerChartPlacement,SummerChartPlacement];north:number};
  observationDiscs:[SummerShape,SummerShape,SummerShape];routePreview:[SummerRouteChoice,SummerRouteChoice,SummerRouteChoice];
  cablePreview:SummerCableSocket[];cassetteTiles:[SummerTilePlacement|null,SummerTilePlacement|null,SummerTilePlacement|null];
  crankSeconds:number;tension:number;
}
export type SummerAction='read-bottle'|'refill-air'|'read-note'|'take-chart'|'preview-chart'|'assemble-chart'|'inspect-console'|'stow-bag'|'take-fuel-can'|'open-cap'|'fit-spout'|'pour-fuel'|'replace-cap'|'connect-hose'|'return-fuel-can'|'wear-wetsuit'|'equip-bcd'|'check-gear'|'stow-gear'|'board'|'start-engine'|'moor'|'stop-engine'|'lower-ladder'|'fit-mask'|'fit-fins'|'inspect-gear'|'enter-water'|'training-post'|'inspect-frame'|'preview-observation'|'solve-observation'|'take-handle'|'open-route-board'|'preview-route'|'record-route'|'reach-rest'|'take-rest-plate'|'preview-cable'|'route-cable'|'crank'|'release-catch'|'pin-carriage'|'take-winch-plate'|'lower-carriage'|'reset-cable'|'preview-cassette'|'release-cassette'|'recover-case'|'climb-ladder'|'remove-fins'|'release-mooring'|'dock'|'disembark'|'remove-gear'|'place-case'|'open-latch'|'open-case'|'read-letter'|'take-book'|'checkpoint'|'set-mode'|'recover'|'hint'|'preferences'|'reset';
const CHECKPOINTS:readonly SummerCheckpoint[]=['S0','S3','B0','B2','U0','U1','U2','REST','U3','U4','S1'];
const UNDERWATER:readonly SummerCheckpoint[]=['U0','U1','U2','REST','U3','U4'];
const MODES:readonly SummerMode[]=['walking','boarding','boating','mooring','gearing','enteringWater','swimming','climbing','docking','reading'];
const freshSave=():SummerSave=>({
  version:1,noteRead:false,chartPieces:[false,false],chartAssembled:false,airSeconds:SUMMER_AIR_CAPACITY,bottleRead:false,
  consoleInspected:false,bagStowed:false,fuelCanTaken:false,capOpen:false,spoutFitted:false,fuelPoured:false,capReplaced:false,hoseConnected:false,fuelCanReturned:false,
  wetsuitWorn:false,bcdEquipped:false,gearChecked:false,gearOnboard:false,
  boatAnchor:'berth',engineRunning:false,ladderDown:false,maskFitted:false,finsFitted:false,finalGearChecked:false,
  trainingPosts:[false,false,false],observationRecords:[false,false,false],observationSolved:false,handleTaken:false,
  routeBoardOpen:false,routeRecorded:false,restReached:false,plates:[],cableRouted:false,cableSupported:false,catchReleased:false,carriageRaised:false,carriagePinned:false,winchPlateTaken:false,cassetteReleased:false,
  caseRecovered:false,caseLocation:'keeper',returnedToShore:false,gearRemoved:false,caseLatches:[false,false],caseOpened:false,letterOpened:false,bookUnlocked:false,legacyBookUnlocked:false,
  checkpoint:'S0',lastUnderwaterPost:'U0',hints:{chart:0,preparation:0,observation:0,current:0,cable:0,cassette:0},preferences:{reducedMotion:false,sound:true},
});
const boolFields=Object.keys(freshSave()).filter(key=>typeof (freshSave() as unknown as Record<string,unknown>)[key]==='boolean');
const enumValue=<T extends string>(value:unknown,values:readonly T[],fallback:T):T=>values.includes(value as T)?value as T:fallback;
const tuple=(value:unknown,count:number)=>Array.from({length:count},(_,i)=>Array.isArray(value)&&value[i]===true);
export function summerDepartureMissing(s:SummerSave):string[]{
  return [!s.chartAssembled&&'Assemble both chart sheets at the shelter table.',!s.bagStowed&&'Stow the second seat’s dry bag under the console.',!s.fuelPoured&&'Pour the dock’s fuel can into the opened tank with its fitted spout.',!s.capReplaced&&'Replace the tank cap.',!s.hoseConnected&&'Connect the labelled engine supply hose.',!s.fuelCanReturned&&'Return the red fuel can to its dock bracket.',(!s.wetsuitWorn||s.gearRemoved)&&'Wear the wetsuit at the shelter.',!s.bcdEquipped&&'Fit the BCD, cylinder and regulator at the shelter.',!s.gearChecked&&'Check the connected equipment assembly.',!s.gearOnboard&&'Put mask, fins, torch, compass and slate into the boat tray.'].filter((v):v is string=>typeof v==='string');
}
export function summerDiveMissing(s:SummerSave):string[]{return [s.boatAnchor!=='mooring'&&'Moor at the DIVE MOORING buoy.',s.engineRunning&&'Stop the engine at the mooring.',!s.ladderDown&&'Lower the stern ladder.',(!s.wetsuitWorn||s.gearRemoved)&&'Wear the wetsuit at the shelter.',!s.bcdEquipped&&'Fit the BCD, cylinder and regulator at the shelter.',!s.gearChecked&&'Check the connected equipment assembly.',!s.gearOnboard&&'Bring the mask, fins, torch, compass and slate in the boat tray.',s.airSeconds<=30&&'Refill your cylinder from the secured deck air tank.',!s.maskFitted&&'Fit your mask while seated at the dive mooring.',!s.finsFitted&&'Fit your fins while seated at the dive mooring.',!s.finalGearChecked&&'Inspect the complete fitted equipment before entering.'].filter((v):v is string=>typeof v==='string');}

/** Reject inconsistent advanced milestones instead of manufacturing missing items. */
export function validateSummerSave(input:unknown):SummerSave|null {
  if(!input||typeof input!=='object'||Array.isArray(input)||(input as {version?:unknown}).version!==1)return null;
  const raw=input as Record<string,unknown>,s=freshSave();
  s.airSeconds=summerAirSeconds(raw.airSeconds);
  for(const key of boolFields)(s as unknown as Record<string,unknown>)[key]=raw[key]===true;
  s.chartPieces=tuple(raw.chartPieces,2) as [boolean,boolean];s.trainingPosts=tuple(raw.trainingPosts,3) as [boolean,boolean,boolean];s.observationRecords=tuple(raw.observationRecords,3) as [boolean,boolean,boolean];s.caseLatches=tuple(raw.caseLatches,2) as [boolean,boolean];
  s.boatAnchor=enumValue(raw.boatAnchor,['berth','mooring'],'berth');s.checkpoint=enumValue(raw.checkpoint,CHECKPOINTS,'S0');s.lastUnderwaterPost=enumValue(raw.lastUnderwaterPost,UNDERWATER,'U0');s.caseLocation=enumValue(raw.caseLocation,['keeper','harness','boat','table'],'keeper');
  const hints=raw.hints&&typeof raw.hints==='object'?raw.hints as Record<string,unknown>:{};
  for(const id of Object.keys(s.hints) as SummerHintId[])s.hints[id]=typeof hints[id]==='number'&&Number.isFinite(hints[id])?Math.min(3,Math.max(0,Math.floor(hints[id] as number))):0;
  const preferences=raw.preferences&&typeof raw.preferences==='object'?raw.preferences as Record<string,unknown>:{};
  s.preferences={reducedMotion:preferences.reducedMotion===true,sound:preferences.sound!==false};
  s.chartAssembled&&=s.chartPieces.every(Boolean);
  s.spoutFitted&&=s.fuelCanTaken&&s.capOpen;s.fuelPoured&&=s.spoutFitted;s.capReplaced&&=s.fuelPoured;s.hoseConnected&&=s.capReplaced;s.fuelCanReturned&&=s.fuelPoured;
  s.bcdEquipped&&=s.wetsuitWorn;s.gearChecked&&=s.bcdEquipped;s.gearOnboard&&=s.gearChecked;
  s.observationSolved&&=s.gearOnboard;s.handleTaken&&=s.observationSolved;s.routeBoardOpen&&=s.handleTaken;s.routeRecorded&&=s.routeBoardOpen;s.restReached&&=s.routeRecorded;
  s.cableRouted&&=s.handleTaken;s.cableSupported&&=s.cableRouted;s.catchReleased&&=s.cableSupported;s.carriageRaised&&=s.catchReleased;s.carriagePinned&&=s.carriageRaised;
  // A collected plate stays in its pouch when the demonstration rig is lowered.
  s.winchPlateTaken=s.handleTaken&&(s.winchPlateTaken||(s.carriagePinned&&Array.isArray(raw.plates)&&raw.plates.includes('P3')));
  s.plates=SUMMER_PLATE_ORDER.filter(id=>Array.isArray(raw.plates)&&raw.plates.includes(id)&&(id==='P1'?s.observationSolved:id==='P2'?s.restReached:s.winchPlateTaken));
  s.cassetteReleased&&=s.carriagePinned&&s.plates.length===3;s.caseRecovered&&=s.cassetteReleased;
  s.returnedToShore&&=s.caseRecovered;s.gearRemoved&&=s.wetsuitWorn&&s.boatAnchor==='berth';
  if(!s.caseRecovered)s.caseLocation='keeper';
  if(s.caseLocation==='table'&&(!s.returnedToShore||!s.gearRemoved))s.caseLocation='boat';
  s.caseLatches=s.caseLatches.map(v=>v&&s.caseLocation==='table') as [boolean,boolean];s.caseOpened&&=s.caseLatches.every(Boolean)&&s.caseLocation==='table';s.letterOpened&&=s.caseOpened;
  s.bookUnlocked=s.legacyBookUnlocked||(s.bookUnlocked&&s.letterOpened);
  // A stored moving boat always returns to its last valid anchor; an interrupted
  // dive returns to its last post. Engines never restart without player input.
  s.engineRunning=false;
  if(s.boatAnchor==='mooring'&&summerDepartureMissing(s).length)s.boatAnchor='berth';
  if(s.boatAnchor==='berth'){s.ladderDown=false;s.maskFitted=false;s.finsFitted=false;s.finalGearChecked=false;}
  s.maskFitted&&=s.gearOnboard;s.finsFitted&&=s.gearOnboard;s.finalGearChecked&&=s.maskFitted&&s.finsFitted&&s.gearChecked;
  if(UNDERWATER.includes(s.checkpoint)&&summerDiveMissing(s).length)s.checkpoint=s.boatAnchor==='mooring'?'B2':'S3';
  if(s.checkpoint==='B2'&&s.boatAnchor!=='mooring')s.checkpoint='B0';
  if(s.caseRecovered&&s.caseLocation==='harness'&&!UNDERWATER.includes(s.checkpoint))s.caseLocation='boat';
  return s;
}
function restoreMode(s:SummerSave):SummerMode{return UNDERWATER.includes(s.checkpoint)?'swimming':s.checkpoint==='B2'?'mooring':'walking';}
function withTransient(s:SummerSave,storageAvailable:boolean,saveNotice=''):SummerState{return {...s,mode:restoreMode(s),message:'',storageAvailable,saveNotice,
  chartPreview:{pieces:[{tray:0,turn:s.chartAssembled?0:1,x:0,y:0},{tray:1,turn:s.chartAssembled?0:2,x:s.chartAssembled?0:1,y:0}],north:s.chartAssembled?0:1},
  observationDiscs:(s.observationSolved?SUMMER_OBSERVATIONS.map(frame=>frame.shape):[...SUMMER_OBSERVATION_START]) as [SummerShape,SummerShape,SummerShape],
  routePreview:s.routeRecorded?['B','A','C']:['A','A','A'],cablePreview:s.cableRouted?['ANCHOR','LOAD','TOP','DRUM']:[],cassetteTiles:s.cassetteReleased?[{id:'P1',turn:0},{id:'P2',turn:0},{id:'P3',turn:0}]:[null,null,null],crankSeconds:s.carriageRaised?6:0,tension:s.cableSupported?1:0};}
const durable=(state:SummerState):SummerSave=>Object.fromEntries(Object.keys(freshSave()).map(key=>[key,state[key as keyof SummerSave]])) as unknown as SummerSave;
export function createSummerState(storage?:SummerStorage,options?:{legacyBookUnlocked?:boolean}){
  let valid:SummerSave|null=null,storageAvailable=!!storage,notice='';
  try{const raw=storage?.getItem(SUMMER_SAVE_KEY);if(raw){try{valid=validateSummerSave(JSON.parse(raw));}catch{/* Malformed JSON does not mean storage itself is unavailable. */}if(!valid)notice='This Summer save could not be read. A fresh trail is ready; your other seasons are safe.';}}
  catch{notice='Progress cannot be saved on this device. You can still play this session.';storageAvailable=false;}
  const saved=valid??freshSave();
  // Reader access is independent from trail completion. Old books do not award
  // chart, plates, route, lift or case milestones, even on a replay/reset.
  let legacy=options?.legacyBookUnlocked===true;
  try{legacy ||= JSON.parse(storage?.getItem('between-seasons-relic-summer-v1')??'null')?.bookTaken===true;}catch{/* Unreadable legacy data grants no items. */}
  if(legacy){saved.legacyBookUnlocked=true;saved.bookUnlocked=true;}
  let state=withTransient(saved,storageAvailable,notice),revision=0;
  let airElapsed=0;
  const listeners=new Set<()=>void>();
  let actionGuard:((action:SummerAction|string,value?:unknown)=>string|null)|null=null;
  const emit=()=>{revision++;for(const fn of listeners)fn();};
  const persist=()=>{if(!storage)return;try{storage.setItem(SUMMER_SAVE_KEY,JSON.stringify(durable(state)));}catch{state={...state,storageAvailable:false,saveNotice:'Progress cannot be saved on this device. You can still play this session.'};}};
  const reject=(message:string)=>{state={...state,message};emit();return false;};
  const controller={
    get state(){return state;},get message(){return state.message;},get storageAvailable(){return state.storageAvailable;},get revision(){return revision;},getSnapshot:()=>state,snapshot:()=>state,restoreMode:()=>restoreMode(state),
    subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
    setGuard(guard:((action:SummerAction|string,value?:unknown)=>string|null)|null){actionGuard=guard;},
    tickAir(seconds:number,submerged:boolean,paused=false){
      if(paused||!submerged||state.mode!=='swimming'||!Number.isFinite(seconds)||seconds<=0)return;
      airElapsed+=Math.min(seconds,1);
      const consumed=Math.floor(airElapsed+1e-8);if(consumed===0)return;airElapsed=Math.max(0,airElapsed-consumed);
      const before=state.airSeconds,remaining=Math.max(0,before-consumed);
      if(before===remaining)return;
      const warning=[90,45,15].some(limit=>before>limit&&remaining<=limit)?summerAirWarning(remaining):'';
      state={...state,airSeconds:remaining,...(warning?{message:warning}:{})};
      if(remaining===0){controller.act('recover','boat');state={...state,message:'Your air reserve brought you safely back aboard. Refill at the deck tank before another dive. All discoveries are kept.'};persist();emit();}
      else {persist();emit();}
    },
    act(action:SummerAction|string,value?:unknown):boolean{
      const blocked=actionGuard?.(action,value);if(blocked)return reject(blocked);
      const next:SummerState={...state,chartPieces:[...state.chartPieces],trainingPosts:[...state.trainingPosts],observationRecords:[...state.observationRecords],plates:[...state.plates],caseLatches:[...state.caseLatches],hints:{...state.hints},preferences:{...state.preferences},message:''};
      const requireDive=()=>state.mode==='swimming'||state.mode==='reading'&&UNDERWATER.includes(state.checkpoint);
      const aboard=()=>['boarding','boating','mooring','gearing','climbing','docking'].includes(state.mode);
      const atDiveDeck=()=>state.boatAnchor==='mooring'&&['mooring','gearing','climbing'].includes(state.mode);
      let save=true;
      switch(action){
        case 'read-bottle':if(!requireDive())return reject('Swim to the sealed bottle beside the descent rope.');next.bottleRead=true;next.trainingPosts=[true,true,true];next.message='The sealed note is copied to your slate. Reef garden → sheltered anchor → open shipwreck hold. Return aboard to refill after five minutes.';break;
        case 'refill-air':if(!aboard()||state.mode==='boating'||state.engineRunning)return reject('Climb aboard the secured boat and stop the engine before connecting the air hose.');next.airSeconds=SUMMER_AIR_CAPACITY;next.finalGearChecked=false;airElapsed=0;next.message='Cylinder refilled from the secured deck air tank · 5:00. Check the fitted equipment before diving again.';break;
        case 'read-note':next.noteRead=true;break;
        case 'take-chart':{if(value!==0&&value!==1)return reject('The two chart sheets are on the beach table and in the lookout’s weatherproof box.');next.chartPieces[value]=true;break;}
        case 'preview-chart':{const v=value as SummerState['chartPreview'];if(!v||!Array.isArray(v.pieces)||v.pieces.length!==2||!v.pieces.every(p=>p&&[0,1].includes(p.tray)&&Number.isInteger(p.turn)&&p.turn>=0&&p.turn<4&&Number.isInteger(p.x)&&Math.abs(p.x)<=2&&Number.isInteger(p.y)&&Math.abs(p.y)<=2)||!Number.isInteger(v.north)||v.north<0||v.north>3)return false;next.chartPreview={pieces:v.pieces.map(p=>({...p})) as [SummerChartPlacement,SummerChartPlacement],north:v.north};save=false;break;}
        case 'assemble-chart':{const v=(value??state.chartPreview) as SummerState['chartPreview'];if(!state.chartPieces.every(Boolean))return reject('Bring both chart sheets: beach table and island lookout.');if(!v||!summerChartCorrect(v.pieces,v.north))return reject('Match the duplicated jetty and both registration crosses A and B. Point north toward the table’s N.');next.chartAssembled=true;next.message='JETTY → OUTER BUOY → DIVE MOORING. The chart is in your slate journal; the gear shelf is open.';break;}
        case 'inspect-console':next.consoleInspected=true;break;
        case 'stow-bag':next.bagStowed=true;break;
        case 'take-fuel-can':if(!state.chartAssembled)return reject('Assemble the chart at the shelter table to open the prepared shelf.');next.fuelCanTaken=true;break;
        case 'open-cap':if(!state.fuelCanTaken)return reject('Collect the red fuel can from the dock shelf first.');if(state.capReplaced)break;next.capOpen=true;break;
        case 'fit-spout':if(!state.capOpen||!state.fuelCanTaken)return reject('Open the tank cap and bring the dock’s fuel can.');next.spoutFitted=true;break;
        case 'pour-fuel':if(!state.capOpen||!state.spoutFitted)return reject('Fit the fuel can’s labelled spout into the open tank.');next.fuelPoured=true;next.message='The gauge rises to READY. There is enough fuel for the whole day.';break;
        case 'replace-cap':if(!state.fuelPoured)return reject('Finish the short fuel pour before replacing the cap.');next.capReplaced=true;break;
        case 'connect-hose':if(!state.capReplaced)return reject('Replace the fuel tank cap, then connect the matching supply hose.');next.hoseConnected=true;break;
        case 'return-fuel-can':if(!state.fuelPoured)return reject('Fuel the boat before returning the can to its dock bracket.');next.fuelCanReturned=true;break;
        case 'wear-wetsuit':if(!state.chartAssembled)return reject('Assemble the chart at the shelter table to open the gear shelf.');next.wetsuitWorn=true;next.gearRemoved=false;break;
        case 'equip-bcd':if(!state.wetsuitWorn)return reject('Wear the wetsuit from the shelter rack first.');next.bcdEquipped=true;break;
        case 'check-gear':if(!state.bcdEquipped)return reject('Fit the labelled BCD, cylinder and regulator assembly first.');next.gearChecked=true;break;
        case 'stow-gear':if(!state.gearChecked)return reject('Check the connected equipment assembly at the shelter first.');next.gearOnboard=true;break;
        case 'board':if(state.boatAnchor!=='berth')return reject('The boat is waiting at the dive mooring. Use Return to boat.');if(state.mode!=='walking')return reject('Step onto the jetty before boarding the boat.');next.mode='boarding';next.checkpoint='B0';break;
        case 'start-engine':{if(!aboard())return reject('Board the boat before taking the helm.');const missing=summerDepartureMissing(state);if(missing.length)return reject(missing[0]);if(state.finsFitted)return reject('Remove your fins while seated before starting the return trip.');next.engineRunning=true;next.mode=state.mode==='boating'?'boating':state.boatAnchor==='mooring'?'mooring':'boating';next.ladderDown=false;break;}
        case 'moor':if(state.mode!=='boating'&&state.boatAnchor!=='mooring')return reject('Pilot through the marked channel to the DIVE MOORING buoy.');next.boatAnchor='mooring';next.checkpoint='B2';next.mode='mooring';next.message='The mooring line is attached. Stop the engine, lower the ladder, and fit mask and fins.';break;
        case 'stop-engine':if(!aboard())return reject('The engine controls are aboard the boat.');next.engineRunning=false;break;
        case 'lower-ladder':if(!atDiveDeck()||state.engineRunning)return reject('Moor the boat and stop the engine before lowering the ladder.');next.ladderDown=true;break;
        case 'fit-mask':case 'fit-fins':if(!atDiveDeck()||!state.gearOnboard||state.engineRunning)return reject('Fit mask and fins while seated at the dive mooring with the engine stopped.');if(action==='fit-mask')next.maskFitted=true;else next.finsFitted=true;break;
        case 'inspect-gear':if(!atDiveDeck()||state.engineRunning||!state.maskFitted||!state.finsFitted||!state.gearChecked)return reject('Fit mask and fins at the mooring, then inspect the whole connected assembly.');next.finalGearChecked=true;break;
        case 'enter-water':{if(!atDiveDeck())return reject('Enter from the aft deck of the moored boat.');const missing=summerDiveMissing(state);if(missing.length)return reject(missing[0]);next.mode='enteringWater';next.checkpoint='U0';next.lastUnderwaterPost='U0';if(state.caseRecovered&&state.caseLocation==='boat')next.caseLocation='harness';break;}
        case 'training-post':{if(!requireDive())return reject('Enter the water from the moored boat to reach the reef.');if(![1,2,3].includes(value as number))return false;next.trainingPosts[(value as number)-1]=true;next.checkpoint='U0';next.lastUnderwaterPost='U0';next.message=SUMMER_TRAINING_POSTS[(value as number)-1];break;}
        case 'inspect-frame':{if(!requireDive())return reject('The living coral colonies are in the reef garden.');if(![1,2,3].includes(value as number))return false;next.observationRecords[(value as number)-1]=true;next.checkpoint='U1';next.lastUnderwaterPost='U1';break;}
        case 'preview-observation':if(!Array.isArray(value)||value.length!==3||!value.every(shape=>['BRANCH','FAN','MOUND','TABLE'].includes(shape)))return false;next.observationDiscs=[...value] as SummerState['observationDiscs'];save=false;break;
        case 'solve-observation':{if(!requireDive())return reject('Reach the garden locker underwater.');const discs=(value??state.observationDiscs) as string[];if(!Array.isArray(discs)||!summerObservationCorrect(discs)){const index=SUMMER_OBSERVATIONS.findIndex((frame,i)=>frame.shape!==discs?.[i]);return reject(`Revisit reef stop ${index+1}; its silhouette differs from this disc.`);}next.observationSolved=true;next.observationDiscs=['FAN','BRANCH','MOUND'];if(!next.plates.includes('P1'))next.plates.push('P1');next.handleTaken=true;next.message='The locker opens. P1 GARDEN and the fitting handle are in your slate pouch.';break;}
        case 'take-handle':if(!state.observationSolved)return reject('The fitting handle is inside the salvaged specimen chest.');next.handleTaken=true;break;
        case 'open-route-board':if(!state.handleTaken)return reject('The salvaged specimen chest contains the handle for the captain’s chart tube.');next.routeBoardOpen=true;break;
        case 'preview-route':if(!Array.isArray(value)||value.length!==3||!value.every(choice=>['A','B','C'].includes(choice)))return false;next.routePreview=[...value] as SummerState['routePreview'];save=false;break;
        case 'record-route':{if(!state.routeBoardOpen)return reject('Use the fitting handle from the garden locker to open the captain’s sealed chart tube.');const route=(value??state.routePreview) as string[];if(!Array.isArray(route)||!summerCurrentCorrect(route)){const i=['B','A','C'].findIndex((choice,index)=>choice!==route?.[index]);const descriptions=[{A:'ends at OVERLOOK against the current',B:'reaches junction 2',C:'loops to START'},{A:'passes REST',B:'bypasses REST',C:'loops back against the current'},{A:'returns to MOORING',B:'reaches WINCH against the current',C:'reaches WINCH'}];return reject(`At junction ${i+1}, ${route?.[i]??'your choice'} ${descriptions[i]?.[route?.[i] as 'A'|'B'|'C']??'does not connect'}. Choose following current and pass REST before WINCH.`);}next.routeRecorded=true;next.routePreview=['B','A','C'];next.message='B → A → C recorded. Follow the sand corridor to the sheltered REST ledge.';break;}
        case 'reach-rest':if(!requireDive())return reject('The sheltered REST ledge is along the underwater sand corridor.');if(state.routeRecorded){next.restReached=true;next.checkpoint='REST';next.lastUnderwaterPost='REST';}else return reject('Record a connected route through REST on the captain’s passage chart first.');break;
        case 'take-rest-plate':if(!state.restReached||!state.routeRecorded)return reject('Follow your recorded route to the sheltered REST ledge, then open its locker.');if(!next.plates.includes('P2'))next.plates.push('P2');break;
        case 'preview-cable':if(!Array.isArray(value)||value.length>4||!value.every(id=>['ANCHOR','LOAD','TOP','SPARE','DRUM'].includes(id)))return false;if(state.cableSupported)return reject('Lower the supported carriage before changing its cable path.');next.cablePreview=[...value] as SummerCableSocket[];save=false;break;
        case 'route-cable':{if(!state.handleTaken)return reject('Bring the fitting handle from the observation locker.');const route=(value??state.cablePreview) as string[];if(!Array.isArray(route)||!summerCableCorrect(route))return reject('From FIXED END go under LOAD, over TOP, into DRUM. SPARE holds the return line.');next.cableRouted=true;next.cablePreview=['ANCHOR','LOAD','TOP','DRUM'];break;}
        case 'crank':{if(!state.cableRouted)return reject('Accept the correct cable route before turning the drum.');if(state.carriagePinned)break;const seconds=typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(.75,value)):.75;if(!state.cableSupported){next.tension=Math.min(1,state.tension+seconds/1.5);if(next.tension>=1){next.cableSupported=true;next.message='SUPPORTED · the cable holds the weight. You can release the retaining catch.';}}else if(!state.catchReleased)next.message='SUPPORTED · release the retaining catch before raising the carriage.';else{next.crankSeconds=Math.min(6,state.crankSeconds+seconds);if(next.crankSeconds>=6){next.carriageRaised=true;next.message='The carriage is at its ledge. Engage the visible locking pin.';}}break;}
        case 'release-catch':if(!state.cableSupported)return reject('The catch stays engaged. Turn the crank until the needle reads SUPPORTED.');next.catchReleased=true;break;
        case 'pin-carriage':if(!state.carriageRaised)return reject('Crank the supported carriage all the way to its ledge first.');next.carriagePinned=true;break;
        case 'take-winch-plate':if(!state.carriagePinned)return reject('Engage the locking pin at the ledge before taking P3 from the tool tray.');next.winchPlateTaken=true;if(!next.plates.includes('P3'))next.plates.push('P3');break;
        case 'lower-carriage':case 'reset-cable':if(state.cassetteReleased||state.caseRecovered)return reject('The completed keeper is open. The case and plates remain safe.');next.catchReleased=false;next.carriageRaised=false;next.carriagePinned=false;next.crankSeconds=0;next.cableSupported=false;next.tension=0;if(action==='reset-cable'){next.cableRouted=false;next.cablePreview=[];}break;
        case 'preview-cassette':{if(!Array.isArray(value)||value.length!==3||!value.every(tile=>tile===null||tile&&state.plates.includes(tile.id)&&Number.isInteger(tile.turn)&&tile.turn>=0&&tile.turn<4))return false;const ids=value.filter(Boolean).map(tile=>tile.id);if(new Set(ids).size!==ids.length)return reject('Each plate has one owner. Remove it from its previous slot first.');next.cassetteTiles=value.map(tile=>tile?{...tile}:null) as SummerState['cassetteTiles'];save=false;break;}
        case 'release-cassette':{if(!state.carriagePinned)return reject('Raise and pin the carriage at the winch before accessing the keeper.');const missing=SUMMER_PLATE_ORDER.find(id=>!state.plates.includes(id));if(missing)return reject(`Find ${missing} at ${missing==='P1'?'the observation garden':missing==='P2'?'the sheltered REST ledge':'the winch tool tray'}.`);const tiles=(value??state.cassetteTiles) as SummerState['cassetteTiles'];if(!Array.isArray(tiles)||!summerCassetteCorrect(tiles))return reject('Put GARDEN, REST, WINCH in visit order. Keep north up and join every endpoint from START into RETURN.');next.cassetteReleased=true;next.cassetteTiles=[{id:'P1',turn:0},{id:'P2',turn:0},{id:'P3',turn:0}];next.message='The continuous route lights section by section. The case keeper opens.';break;}
        case 'recover-case':if(!state.cassetteReleased)return reject('The case is held by its keeper. Complete the route cassette first.');if(!state.caseRecovered){next.caseRecovered=true;next.caseLocation='harness';}next.message='The sealed case is clipped securely to your harness. Bring it back to the chairs; open it on the beach.';break;
        case 'climb-ladder':if(state.mode!=='swimming'||state.boatAnchor!=='mooring'||!state.ladderDown)return reject('Return to the moored boat and its lowered stern ladder.');next.mode='climbing';next.checkpoint='B2';if(state.caseRecovered&&state.caseLocation==='harness')next.caseLocation='boat';break;
        case 'remove-fins':if(!atDiveDeck()||state.engineRunning)return reject('Climb aboard and stop the engine before removing your fins.');next.finsFitted=false;next.finalGearChecked=false;break;
        case 'release-mooring':if(!atDiveDeck())return reject('Return aboard the moored boat before releasing its line.');if(state.finsFitted)return reject('Remove your fins while seated in the boat first.');if(!state.engineRunning)return reject('Start the engine, then release the mooring for the return channel.');next.mode='boating';break;
        case 'dock':if(state.mode!=='boating'&&state.boatAnchor!=='berth')return reject('Pilot back through the channel to the jetty, or choose Return to island.');next.boatAnchor='berth';next.engineRunning=false;next.ladderDown=false;next.maskFitted=false;next.finsFitted=false;next.finalGearChecked=false;next.mode='docking';next.checkpoint='B0';if(state.caseRecovered){next.returnedToShore=true;next.caseLocation=state.caseLocation==='table'?'table':'boat';}break;
        case 'disembark':if(state.boatAnchor!=='berth'||state.engineRunning||state.mode==='boating')return reject('Dock at the island jetty and stop the engine before stepping ashore.');next.mode='walking';next.checkpoint='S3';if(state.wetsuitWorn&&!state.gearRemoved)next.message='Back on land. Return the wetsuit and scuba equipment to the shelter rack before settling at the chairs.';break;
        case 'remove-gear':if(state.boatAnchor!=='berth'||state.mode!=='walking')return reject('Return to the shelter on the island to remove the equipment.');next.gearRemoved=true;next.maskFitted=false;next.finsFitted=false;next.finalGearChecked=false;next.message='Wetsuit and scuba equipment returned to the shelter rack. You are ready for the beach.';break;
        case 'place-case':if(!state.caseRecovered)return reject('The sealed keepsake case is still at the winch’s route keeper.');if(!state.returnedToShore||!state.gearRemoved)return reject('Dock at the island and remove the equipment at the shelter before bringing the case to the chairs.');next.caseLocation='table';next.checkpoint='S1';break;
        case 'open-latch':if(state.caseLocation!=='table')return reject('Open on the beach: place the sealed case on the table by the two chairs.');if(value!==0&&value!==1)return false;next.caseLatches[value]=true;break;
        case 'open-case':if(state.caseLocation!=='table'||!state.caseLatches.every(Boolean))return reject('Release both visible case latches on the beach table.');next.caseOpened=true;break;
        case 'read-letter':if(!state.caseOpened)return reject('Open the case on the beach table to find the dry envelope.');next.letterOpened=true;next.bookUnlocked=true;break;
        case 'take-book':if(!state.bookUnlocked)return reject('Read the dry letter in the beach case first.');next.bookUnlocked=true;break;
        case 'checkpoint':{if(!CHECKPOINTS.includes(value as SummerCheckpoint))return false;const id=value as SummerCheckpoint;if(UNDERWATER.includes(id)){if(summerDiveMissing(state).length)return reject('The boat and fitted gear must be ready before saving an underwater route post.');next.lastUnderwaterPost=id;}next.checkpoint=id;break;}
        case 'set-mode':{if(!MODES.includes(value as SummerMode))return false;const mode=value as SummerMode;if((mode==='swimming'||mode==='enteringWater')&&summerDiveMissing(state).length)return reject(summerDiveMissing(state)[0]);if(mode==='boating'&&(!state.engineRunning||summerDepartureMissing(state).length))return reject('Complete the departure checklist and start the engine.');next.mode=mode;save=false;break;}
        case 'recover':{const target=enumValue(value,['post','boat','island'],'post');if(target==='post'&&state.boatAnchor==='mooring'&&!summerDiveMissing(state).length){next.checkpoint=state.lastUnderwaterPost;next.mode='swimming';if(state.caseRecovered&&state.caseLocation==='boat')next.caseLocation='harness';}else if(target!=='island'&&state.boatAnchor==='mooring'){next.checkpoint='B2';next.mode='mooring';next.engineRunning=false;if(state.caseLocation==='harness')next.caseLocation='boat';}else{next.checkpoint='S3';next.mode='walking';next.boatAnchor='berth';next.engineRunning=false;next.ladderDown=false;next.maskFitted=false;next.finsFitted=false;next.finalGearChecked=false;if(state.caseRecovered){next.returnedToShore=true;if(state.caseLocation==='harness')next.caseLocation='boat';}}next.message='You are back at a safe place. Your discoveries and completed puzzles are kept.';break;}
        case 'hint':{if(typeof value!=='string'||!(value in SUMMER_HINTS))return false;const id=value as SummerHintId;next.hints[id]=Math.min(3,state.hints[id]+1);next.message=SUMMER_HINTS[id][Math.max(0,next.hints[id]-1)];break;}
        case 'preferences':{if(!value||typeof value!=='object')return false;const p=value as Record<string,unknown>;if(typeof p.reducedMotion==='boolean')next.preferences.reducedMotion=p.reducedMotion;if(typeof p.sound==='boolean')next.preferences.sound=p.sound;break;}
        case 'reset':{const fresh=freshSave();fresh.legacyBookUnlocked=state.bookUnlocked;fresh.bookUnlocked=state.bookUnlocked;fresh.preferences={...state.preferences};state=withTransient(fresh,state.storageAvailable,state.saveNotice);persist();emit();return true;}
        default:return false;
      }
      state=next;if(save)persist();emit();return true;
    },
  };
  return controller;
}
export type SummerController=ReturnType<typeof createSummerState>;
/** One next step, derived from saved milestones, survives interruptions and return trips. */
export function summerObjective(s:SummerState):{title:string;detail:string;stage:number}{
  if(s.letterOpened)return {title:'A day to keep',detail:'The letter is yours. Stay by the two chairs, or explore the reef again whenever you like.',stage:8};
  if(s.caseRecovered){
    if(!s.returnedToShore)return {title:'Bring the day home',detail:s.mode==='swimming'?'Return to the descent rope and climb the boat’s stern ladder.':'Remove fins, pilot back through the channel, and dock at the island jetty.',stage:7};
    if(!s.gearRemoved)return {title:'Back on the island',detail:'Step ashore and return your wetsuit and equipment to the shelter rack.',stage:7};
    return {title:'The two chairs',detail:s.caseLocation!=='table'?'Bring the sealed case to the beach table.':'Release both latches, open the case, and unfold the dry letter.',stage:7};
  }
  if(s.cassetteReleased)return {title:'The keeper is open',detail:'Clip the sealed keepsake case to your harness before leaving the cargo hold.',stage:6};
  if(s.plates.length===3)return {title:'Put the day together',detail:'Fit the three route plates into the keeper beside the winch. Join START to RETURN.',stage:6};
  if(s.plates.includes('P2'))return {title:'The cargo windlass',detail:!s.cableRouted?'Use the handle at the wreck’s winch and trace the cable through the load pulley.':!s.cableSupported?'Turn the crank until the load is supported.':!s.catchReleased?'Release the retaining catch now that the cable supports the load.':!s.carriageRaised?'Keep cranking until the carriage reaches its ledge.':!s.carriagePinned?'Engage the locking pin.':'Take P3 from the winch’s tool tray.',stage:5};
  if(s.routeRecorded)return {title:'The sheltered anchor cove',detail:'Follow the sand passage to REST. Mark the ledge and collect P2 from its salvaged chest.',stage:4};
  if(s.observationSolved)return {title:'The captain’s passage',detail:'Use the fitting handle on the sealed chart tube. Trace a route through REST to WINCH.',stage:3};
  if(s.mode==='swimming'||s.boatAnchor==='mooring')return {title:'The living reef garden',detail:s.mode!=='swimming'?'Stop the engine, lower the ladder, fit your mask and fins, and check your air.':!s.bottleRead?'Read the corked bottle beside the descent rope.':'Examine the three coral colonies, then set the salvaged chest’s shape discs.',stage:2};
  if(s.chartAssembled)return {title:'A boat for two',detail:summerDepartureMissing(s)[0]??'Board at the jetty and follow the marked channel to the dive mooring.',stage:1};
  return {title:'The two chart sheets',detail:!s.chartPieces[0]?'Find the note and shoreline sheet on the beach table by the two chairs.':!s.chartPieces[1]?'Collect the second chart sheet from the weatherproof box at the island lookout.':'Bring both sheets to the shelter table. Align the coastline, registration marks, and north arrow.',stage:0};
}
export const SUMMER_PREPARATION_STEPS:readonly {field:keyof SummerSave;action:SummerAction;label:string;location:string}[]=[
  {field:'consoleInspected',action:'inspect-console',label:'Inspect the console checklist',location:'boat console'},
  {field:'bagStowed',action:'stow-bag',label:'Stow the dry bag under the console',location:'second seat'},
  {field:'fuelCanTaken',action:'take-fuel-can',label:'Collect the red fuel can',location:'dock shelf'},
  {field:'capOpen',action:'open-cap',label:'Open the tank cap',location:'boat tank'},
  {field:'spoutFitted',action:'fit-spout',label:'Fit the matching fuel spout',location:'boat tank'},
  {field:'fuelPoured',action:'pour-fuel',label:'Pour fuel until the gauge reads READY',location:'boat tank'},
  {field:'capReplaced',action:'replace-cap',label:'Replace the tank cap',location:'boat tank'},
  {field:'hoseConnected',action:'connect-hose',label:'Connect the labelled supply hose',location:'engine socket'},
  {field:'fuelCanReturned',action:'return-fuel-can',label:'Return the can to its dock bracket',location:'dock bracket'},
  {field:'wetsuitWorn',action:'wear-wetsuit',label:'Wear the wetsuit',location:'shelter rack'},
  {field:'bcdEquipped',action:'equip-bcd',label:'Fit BCD, cylinder and regulator',location:'labelled gear stand'},
  {field:'gearChecked',action:'check-gear',label:'Check the connected assembly',location:'gear inspection stand'},
  {field:'gearOnboard',action:'stow-gear',label:'Put mask, fins, torch, compass and slate in the boat tray',location:'fitted boat tray'},
];
export function summerJournal(s:SummerState):{title:string;body:string}[]{return [
  ...(s.bottleRead?[{title:'Message in the sealed bottle',body:'Start with the sea fan nearest the rope, then the branching colony in the limestone hollow, and the rounded coral towards the wreck. These shapes open the salvaged chest. Its handle opens the captain’s chart tube; follow its passage through the sheltered anchor cove to the Marigold’s cargo windlass. Refill your five-minute air supply aboard the boat. Reading and surfacing pause air use.'}]:[]),
  {title:'A day we have time for',body:s.noteRead?'Bring the beach and lookout chart sheets to the shelter table. We’ll come back to the two chairs afterwards.':'The opening note is on the beach table.'},
  {title:'Route chart',body:s.chartAssembled?'JETTY → OUTER BUOY → DIVE MOORING. Both A/B registration marks match; north is up.':`Chart sheets kept: ${s.chartPieces.filter(Boolean).length}/2. Beach table; weatherproof lookout box.`},
  ...SUMMER_TRAINING_POSTS.flatMap((body,i)=>s.trainingPosts[i]?[{title:`Swimming practice ${i+1}`,body}]:[]),
  ...SUMMER_OBSERVATIONS.filter((_,i)=>s.observationRecords[i]).map(frame=>({title:`Reef stop ${frame.number}`,body:`${frame.shape}. ${frame.description}`})),
  ...(s.observationSolved?[{title:'Quiet company',body:'P1 GARDEN and the fitting handle are safely kept. The handle opens the captain’s sealed chart tube.'}]:[]),
  ...(s.routeRecorded?[{title:'The quieter way',body:'B → A → C. Following current, through the sheltered REST ledge, then WINCH.'}]:[]),
  ...(s.restReached?[{title:'The rest ledge',body:'Some days we’ll have plenty of energy. Some days we’ll take the easier way. I still want the day with you.'}]:[]),
  ...(s.cableRouted?[{title:'The load path',body:'ANCHOR → LOAD PULLEY (under) → TOP GUIDE (over) → DRUM. Take the weight; release the catch; raise and pin.'}]:[]),
  {title:'Plates in your slate pouch',body:s.plates.length?s.plates.map(id=>`${id} ${id==='P1'?'GARDEN':id==='P2'?'REST':'WINCH'}`).join(' · '):'No route plates collected yet. They cannot be dropped or lost.'},
  ...(s.caseRecovered?[{title:'The sealed case',body:'Bring this back to our chairs. The letter is dry inside. The case stays secured to your harness or boat stowage.'}]:[]),
  ...(s.letterOpened?[{title:'Room for two',body:'The letter and the two chairs are always here to revisit.'}]:[]),
];}
