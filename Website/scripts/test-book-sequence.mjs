import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';
const {BookSequence,FLIP_SECONDS,COVER_SECONDS}=await import(await typescriptUrl(new URL('../app/book-sequence.ts',import.meta.url)));
const {READ_START,FLIP_START,CLOSED_REST,bookSheets}=await import(await typescriptUrl(new URL('../app/journey-data.ts',import.meta.url)));
const sequence=new BookSequence();
for(let i=0;i<120;i++)sequence.step(READ_START,1/60,true);
assert.equal(sequence.phase,'intro');assert.equal(sequence.cursor,0);
for(let i=0;i<120;i++)sequence.step(FLIP_START+.01,1/60,false);
assert.equal(sequence.phase,'intro','Wait on the letter until all prints are GPU ready');
sequence.step(FLIP_START+.01,1/60,true);
assert.equal(sequence.phase,'forward');assert.equal(sequence.lockAt,FLIP_START);
let previous=sequence.cursor,forwardEnd=null,intermediate=0;
for(let i=0;i<120&&sequence.active;i++){
  // Alternating input and stopping entirely cannot stall or reverse an active run.
  forwardEnd=sequence.step(i%2?0:FLIP_START+.01,1/60,true);
  assert.ok(sequence.cursor>=previous);previous=sequence.cursor;
  if(sequence.cursor>0&&sequence.cursor<bookSheets.length)intermediate++;
}
assert.ok(intermediate>10,'Render the rapid sequential turns instead of jumping covers');
assert.equal(forwardEnd,CLOSED_REST);assert.equal(sequence.phase,'closed');assert.equal(sequence.cursor,bookSheets.length);
for(let i=0;i<120;i++)sequence.step(CLOSED_REST,1/60,true);
assert.equal(sequence.active,false,'The closed endpoint waits for the next scroll');
sequence.step(CLOSED_REST-.11,1/60,true);
assert.equal(sequence.phase,'reverse');assert.equal(sequence.lockAt,CLOSED_REST);
let reverseEnd=null;previous=sequence.cursor;
for(let i=0;i<120&&sequence.active;i++){
  reverseEnd=sequence.step(CLOSED_REST+10,1/60,true);
  assert.ok(sequence.cursor<=previous);previous=sequence.cursor;
}
assert.equal(reverseEnd,READ_START);assert.equal(sequence.phase,'intro');assert.equal(sequence.cursor,0);
for(let i=0;i<120;i++)sequence.step(READ_START,1/60,true);
assert.equal(sequence.active,false,'The letter stays open after automatic return');
const reduced=new BookSequence();
assert.equal(reduced.step(FLIP_START,0,true,true),CLOSED_REST);
assert.equal(reduced.step(READ_START,0,true,true),READ_START);
assert.ok(FLIP_SECONDS+COVER_SECONDS<1.5,'Keep the cinematic brief');
console.log('Automatic book sequence passed: letter hold, preload gate, uninterrupted forward/reverse runs, ignored mid-run input, endpoint holds and reduced motion.');
