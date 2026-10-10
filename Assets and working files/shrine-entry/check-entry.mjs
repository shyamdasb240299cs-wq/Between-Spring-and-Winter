import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {createEntryClock,beginEntryHold,cancelEntryHold,advanceEntry,entryPose,entryPlaneScale,HOLD_MS,ENTRY_MS}=await import('../../Website/app/shrine-entry-motion.ts');
const {createShrineInput}=await import('../../Website/app/shrine-entry-input.ts');
for(const rate of[24,60,120]){
 const c=createEntryClock();assert.ok(beginEntryHold(c));
 for(let i=0;i<Math.floor(rate*.3);i++)advanceEntry(c,1000/rate);
 assert.equal(c.committed,false);assert.ok(c.charge>0);cancelEntryHold(c);
 for(let i=0;i<Math.ceil(rate*.3);i++)advanceEntry(c,1000/rate);
 assert.equal(c.phase,'idle');assert.equal(c.charge,0);assert.equal(entryPose(c).scale,1);
 assert.ok(beginEntryHold(c));advanceEntry(c,HOLD_MS-1);assert.equal(c.committed,false);
 advanceEntry(c,1);assert.equal(c.phase,'rush');assert.equal(c.committed,true);
 cancelEntryHold(c);assert.equal(c.phase,'rush');assert.equal(beginEntryHold(c),false);
 advanceEntry(c,600);const rush=entryPose(c);assert.ok(rush.scale===1&&rush.travel>.5&&rush.flash===0);assert.ok(entryPlaneScale(600,.95)>entryPlaneScale(600,1.15));assert.ok(entryPlaneScale(600,1.15)>entryPlaneScale(600,3));
 advanceEntry(c,360);assert.equal(c.phase,'portal');assert.ok(entryPose(c).flash>.9);
 advanceEntry(c,650);assert.equal(c.phase,'tunnel');assert.ok(entryPose(c).black>.99&&entryPose(c).tunnel>.9);
 advanceEntry(c,ENTRY_MS-c.elapsed);assert.equal(c.phase,'complete');assert.equal(entryPose(c).tunnel,0);assert.equal(entryPose(c).black,1);
}
const reduced=createEntryClock();beginEntryHold(reduced);advanceEntry(reduced,700,true);advanceEntry(reduced,350,true);
assert.equal(entryPose(reduced,true).scale,1);assert.equal(entryPose(reduced,true).flash,0);assert.equal(entryPose(reduced,true).streak,0);advanceEntry(reduced,350,true);assert.equal(reduced.phase,'complete');
// Repeated cancelled holds never accumulate toward the commitment threshold.
const repeated=createEntryClock();for(let i=0;i<10;i++){beginEntryHold(repeated);advanceEntry(repeated,200);cancelEntryHold(repeated);advanceEntry(repeated,250);assert.equal(repeated.committed,false);}
for(const pointerType of['mouse','touch','pen']){
 const clock=createEntryClock(),captured=new Set();let starts=0;
 const target={setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)};
 const input=createShrineInput(target,()=>{starts++;return beginEntryHold(clock);},()=>cancelEntryHold(clock),()=>clock.committed);
 const event={pointerType,pointerId:1,isPrimary:true,button:0,preventDefault(){}};
 input.down({...event,isPrimary:false});input.down({...event,button:2});assert.equal(starts,0);
 input.down(event);input.down({...event,pointerId:2});assert.equal(starts,1);assert.ok(captured.has(1));advanceEntry(clock,250);input.up(event);advanceEntry(clock,250);assert.equal(clock.phase,'idle');assert.equal(captured.size,0);
 input.down(event);advanceEntry(clock,250);input.lost(event);advanceEntry(clock,250);assert.equal(clock.phase,'idle');
 input.down(event);advanceEntry(clock,700);input.up(event);assert.equal(clock.committed,true);input.down(event);assert.equal(starts,3);input.dispose();assert.equal(captured.size,0);
}
console.log('700ms continuous hold, cancellation, mouse/touch/pen capture contracts, duplicate/release guards, 3s phases, reduced motion and repeated holds pass at 24/60/120Hz.');
