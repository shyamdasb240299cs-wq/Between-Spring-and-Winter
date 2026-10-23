/** The diagrams, scene engravings, journal and answer checks all use this data. */
export type SummerShape='BRANCH'|'FAN'|'MOUND'|'TABLE';
export type SummerPlateId='P1'|'P2'|'P3';
export type SummerRouteChoice='A'|'B'|'C';
export type SummerCableSocket='ANCHOR'|'LOAD'|'TOP'|'SPARE'|'DRUM';
export type QuarterTurn=0|1|2|3;
export const SUMMER_SHAPES:readonly SummerShape[]=['BRANCH','FAN','MOUND','TABLE'];
export const SUMMER_SILHOUETTES:Record<SummerShape,string>={
  BRANCH:'M40 72V32M40 52 23 36 20 18M40 42 57 27 60 12M28 42 12 36M49 34 47 17M40 66 61 51 68 35',
  FAN:'M40 73V58M40 60C3 60 7 9 40 10C73 9 77 60 40 60ZM40 60 17 25M40 60 27 14M40 60V10M40 60 53 14M40 60 63 25',
  MOUND:'M8 68C8 46 15 30 28 33C33 13 52 17 57 34C72 30 77 52 72 68ZM21 56 27 48M40 50 45 38M58 57 64 50',
  TABLE:'M38 74V42M47 74V42M9 34C13 23 65 23 72 34L68 42H13ZM20 34H60',
};
export const SUMMER_OBSERVATIONS=[
  {number:1,shape:'FAN' as const,position:{x:122,y:-8.5,z:-34},description:'A broad upright fan spreads above one narrow stem.'},
  {number:2,shape:'BRANCH' as const,position:{x:128,y:-9,z:-40},description:'Several narrow branches reach upward from an open centre.'},
  {number:3,shape:'MOUND' as const,position:{x:134,y:-10,z:-34},description:'A low rounded mound rests against the sand.'},
] as const;
export const SUMMER_OBSERVATION_START:readonly SummerShape[]=['MOUND','TABLE','FAN'];
export const SUMMER_TRAINING_POSTS=[
  'Move forward and turn gently. Desktop: WASD or the arrow keys; drag to look. Touch: move the joystick and use the separate look area.',
  'Ascend and descend at your own pace. Desktop: Space goes up; C or Ctrl goes down. Touch: hold the labelled Ascend or Descend button. Looking up does not move you upward.',
  'The next part is beside the three coral shapes. You can take your time here. Look for the sealed bottle on grounded timber. Its note describes the reef garden and the wreck; your slate and safe return are always available.',
] as const;
export const SUMMER_CHART={
  width:400,height:240,
  north:{x:360,y:36},
  registration:[{id:'A',x:188,y:65},{id:'B',x:201,y:181}],
  jetty:'M64 156h65v-20H64v40h65v-20',
  coast:'M27 218C74 201 72 177 64 155S79 100 121 95S150 61 172 24',
  route:[{x:99,y:155,label:'JETTY'},{x:244,y:110,label:'OUTER BUOY'},{x:331,y:55,label:'DIVE MOORING'}],
  pieces:[{id:0,name:'Shoreline sheet',tray:0,turn:0},{id:1,name:'Mooring sheet',tray:1,turn:0}],
} as const;
export interface SummerChartPlacement {tray:number;turn:number;x:number;y:number;}
export function summerChartCorrect(pieces:readonly SummerChartPlacement[],north:number){
  return Array.isArray(pieces)&&pieces.length===2&&north===0&&SUMMER_CHART.pieces.every((p,i)=>pieces[i]&&pieces[i].tray===p.tray&&pieces[i].turn===p.turn&&pieces[i].x===0&&pieces[i].y===0);
}
export const SUMMER_CURRENT_GRAPH=[
  {junction:1,position:{x:147,y:-13,z:-17},choices:{A:{following:false,destination:'OVERLOOK',label:'Opposing current · ends at OVERLOOK'},B:{following:true,destination:'JUNCTION 2',label:'Following current · reaches JUNCTION 2'},C:{following:true,destination:'START',label:'Following current · loops to START'}}},
  {junction:2,position:{x:156,y:-15,z:-20},choices:{A:{following:true,destination:'REST',label:'Following current · passes the sheltered REST ledge'},B:{following:true,destination:'BYPASS',label:'Following current · bypasses REST'},C:{following:false,destination:'JUNCTION 1',label:'Opposing current · loops to JUNCTION 1'}}},
  {junction:3,position:{x:166,y:-17,z:-24},choices:{A:{following:true,destination:'MOORING',label:'Following current · returns to MOORING'},B:{following:false,destination:'WINCH',label:'Opposing current · reaches WINCH'},C:{following:true,destination:'WINCH',label:'Following current · reaches WINCH'}}},
] as const;
export const SUMMER_CURRENT_SOLUTION:readonly SummerRouteChoice[]=['B','A','C'];
export const SUMMER_CABLE_SOCKETS:readonly {id:SummerCableSocket;label:string;x:number;y:number}[]=[
  {id:'ANCHOR',label:'FIXED END · ANCHOR',x:35,y:35},
  {id:'LOAD',label:'LOAD PULLEY · UNDER',x:110,y:165},
  {id:'TOP',label:'TOP GUIDE · OVER',x:205,y:35},
  {id:'SPARE',label:'SPARE · return-line mount',x:300,y:95},
  {id:'DRUM',label:'DRUM',x:360,y:170},
];
export const SUMMER_CABLE_SOLUTION:readonly SummerCableSocket[]=['ANCHOR','LOAD','TOP','DRUM'];
export const SUMMER_PLATES:Record<SummerPlateId,{id:SummerPlateId;stop:number;name:string;entry:number;exit:number;path:readonly [number,number][]}>={
  P1:{id:'P1',stop:1,name:'GARDEN',entry:.5,exit:.25,path:[[0,.5],[.25,.5],[.5,.25],[1,.25]]},
  P2:{id:'P2',stop:2,name:'REST',entry:.25,exit:.75,path:[[0,.25],[.3,.25],[.7,.75],[1,.75]]},
  P3:{id:'P3',stop:3,name:'WINCH',entry:.75,exit:.5,path:[[0,.75],[.3,.75],[.6,.5],[1,.5]]},
};
export const SUMMER_PLATE_ORDER:readonly SummerPlateId[]=['P1','P2','P3'];
export interface SummerTilePlacement {id:SummerPlateId;turn:number;}
export function summerCassetteCorrect(tiles:readonly (SummerTilePlacement|null)[]){return tiles.length===3&&SUMMER_PLATE_ORDER.every((id,i)=>tiles[i]?.id===id&&tiles[i]?.turn===0);}
export function summerObservationCorrect(discs:readonly string[]){return discs.length===3&&SUMMER_OBSERVATIONS.every((frame,i)=>frame.shape===discs[i]);}
export function summerCurrentCorrect(route:readonly string[]){return route.length===3&&SUMMER_CURRENT_SOLUTION.every((choice,i)=>route[i]===choice);}
export function summerCableCorrect(route:readonly string[]){return route.length===4&&SUMMER_CABLE_SOLUTION.every((socket,i)=>route[i]===socket);}
export const SUMMER_WORDS={
  opening:['Aami, I wanted to make us a whole day with nowhere else to rush to.','There’s a boat in the little bay. I’ve left the route in two pieces—one here, and one at the lookout. Bring them to the table by the equipment shed.','We’ll come back to these chairs afterwards.'],
  bag:['We managed with one seat once. I thought we could have two this time.','The bag fits under the console. Your towel is inside.'],
  observation:['I liked how you let me stay there by the water without needing me to say anything. I want you to have that with me too.'],
  rest:['Some days we’ll have plenty of energy. Some days we’ll take the easier way. I still want the day with you.'],
  cable:['You’ve looked after me in ways I still think about. I want to be someone you can lean on too.'],
  letter:['Aami,','I keep thinking about how much I liked doing ordinary things with you. Sharing that seat on the train. Feeding you laddoo on the bus. Lying beside the water with my head in your lap.','I want more days like that. Days when we can go somewhere together, and days when we don’t need to go anywhere at all. I want to hear how your day went without already counting the time until I have to leave.','You’ve made me feel cared for. I want you to feel that with me too—in the little things I remember, in making time, and in being there when you need a quieter day.','I don’t know every detail of what comes next. I do know I want to keep making room for you in it.','For today, I left us two chairs. Come sit with me for a bit.','Shyamu'],
} as const;
export const SUMMER_HINTS={
  chart:['The two sheets share a piece of coastline.','Match both A and B, then check north.','Put the shoreline sheet upright in the left tray and the mooring sheet upright in the right tray. Slide both to match A and B; keep the assembled north arrow at the fixed N.'],
  preparation:['Look at the console checklist and the labelled equipment tray.','Finish the first unchecked assembly. The fuel can belongs on the dock bracket; mask and fins are fitted at the dive mooring.','Choose “Help me finish preparation” to see each remaining physical preparation step. Your chart still comes from the two sheets.'],
  observation:['Use the bottle note to order the three living coral colonies.','The sea fan nearest the descent rope comes first; the branching colony is in the hollow; the rounded coral is closer to the wreck.','Set the discs to FAN / BRANCH / MOUND, in that order, then pull the locker lever.'],
  current:['A following arrow is not enough; look at where the path ends.','Your route needs REST before WINCH.','Record B / A / C. Follow the open sand channel to the fallen anchor at REST and open the salvaged chest.'],
  cable:['The pulley on the load has to be in the rope path.','Select ANCHOR, LOAD (under), TOP (over), then DRUM. SPARE only holds the return line.','Accept ANCHOR → LOAD → TOP → DRUM. Crank to SUPPORTED, release the catch, crank the carriage to its ledge, and engage the locking pin.'],
  cassette:['This is a map of the places you visited.','Garden, rest ledge, then winch; check the arrows.','Place P1 GARDEN, P2 REST, P3 WINCH from left to right, all north-up (0°). The line runs from START through the three squares into RETURN.'],
} as const;
export type SummerHintId=keyof typeof SUMMER_HINTS;
