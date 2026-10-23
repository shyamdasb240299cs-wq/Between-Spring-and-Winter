import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';

const data=await import(await typescriptUrl(new URL('../app/shrine-void/summer-puzzle-data.ts',import.meta.url)));
const {SUMMER_CHART,SUMMER_OBSERVATIONS,SUMMER_CURRENT_GRAPH,SUMMER_CABLE_SOCKETS,SUMMER_PLATES,SUMMER_PLATE_ORDER,summerChartCorrect,summerObservationCorrect,summerCurrentCorrect,summerCableCorrect,summerCassetteCorrect}=data;
const product=(values,count)=>count===0?[[]]:product(values,count-1).flatMap(head=>values.map(value=>[...head,value]));
const permutations=values=>values.length?values.flatMap((value,index)=>permutations(values.filter((_,i)=>i!==index)).map(rest=>[value,...rest])):[[]];

// The diagram's authored placement is the accepted answer. No single wrong
// registration, sheet order, north direction, or quarter turn can pass.
const chart=SUMMER_CHART.pieces.map(piece=>({tray:piece.tray,turn:piece.turn,x:0,y:0}));
assert.ok(summerChartCorrect(chart,0));
for(let sheet=0;sheet<2;sheet++)for(const [field,values]of Object.entries({tray:[0,1],turn:[0,1,2,3],x:[-2,-1,0,1,2],y:[-2,-1,0,1,2]}))for(const value of values){
  const attempt=structuredClone(chart);attempt[sheet][field]=value;
  assert.equal(summerChartCorrect(attempt,0),value===chart[sheet][field],`Chart ${sheet+1} ${field}=${value}`);
}
for(const north of [1,2,3])assert.equal(summerChartCorrect(chart,north),false);
assert.equal(summerChartCorrect([...chart].reverse(),0),false);

const shapes=['BRANCH','FAN','MOUND','TABLE'];
const observationAnswers=product(shapes,3).filter(summerObservationCorrect);
assert.deepEqual(observationAnswers,[['FAN','BRANCH','MOUND']]);
assert.deepEqual(SUMMER_OBSERVATIONS.map(frame=>frame.shape),observationAnswers[0]);
assert.deepEqual(SUMMER_OBSERVATIONS.map(frame=>frame.number),[1,2,3]);

const currentAnswers=product(['A','B','C'],3).filter(summerCurrentCorrect);
assert.deepEqual(currentAnswers,[['B','A','C']]);
for(let i=0;i<3;i++)assert.ok(SUMMER_CURRENT_GRAPH[i].choices[currentAnswers[0][i]].following,'Each route segment must follow the current');
assert.deepEqual(SUMMER_CURRENT_GRAPH.map((junction,i)=>junction.choices[currentAnswers[0][i]].destination),['JUNCTION 2','REST','WINCH']);
assert.equal(SUMMER_CURRENT_GRAPH[1].choices.B.destination,'BYPASS','Following current alone cannot bypass the rest-ledged objective');

const cableAnswers=product(SUMMER_CABLE_SOCKETS.map(socket=>socket.id),4).filter(summerCableCorrect);
assert.deepEqual(cableAnswers,[['ANCHOR','LOAD','TOP','DRUM']]);
assert.match(SUMMER_CABLE_SOCKETS.find(socket=>socket.id==='LOAD').label,/UNDER/);
assert.match(SUMMER_CABLE_SOCKETS.find(socket=>socket.id==='TOP').label,/OVER/);
assert.equal(summerCableCorrect(['ANCHOR','SPARE','TOP','DRUM']),false);

// Test all 384 tile order/rotation combinations, then verify that the exact
// accepted strip physically joins its engraved endpoints to START and RETURN.
const cassetteAnswers=[];
for(const order of permutations([...SUMMER_PLATE_ORDER]))for(const turns of product([0,1,2,3],3)){
  const tiles=order.map((id,i)=>({id,turn:turns[i]}));
  if(summerCassetteCorrect(tiles))cassetteAnswers.push(tiles);
}
assert.deepEqual(cassetteAnswers,[[{id:'P1',turn:0},{id:'P2',turn:0},{id:'P3',turn:0}]]);
let endpoint=.5;
for(const id of SUMMER_PLATE_ORDER){
  const plate=SUMMER_PLATES[id];
  assert.deepEqual(plate.path[0],[0,endpoint],`${id} begins where the previous plate ends`);
  assert.equal(plate.entry,endpoint);assert.deepEqual(plate.path.at(-1),[1,plate.exit]);endpoint=plate.exit;
  assert.ok(plate.path.every(([x,y])=>x>=0&&x<=1&&y>=0&&y<=1),'Engravings stay inside identical square tiles');
}
assert.equal(endpoint,.5,'P3 must exit at the RETURN rail');
for(const attempt of [[],[null,null,null],[{id:'P1',turn:0},{id:'P1',turn:0},{id:'P3',turn:0}]])assert.equal(summerCassetteCorrect(attempt),false);
console.log('Summer puzzles passed: canonical chart registration, all observation/current/cable answers, all 384 cassette layouts, joined engraved endpoints.');
