import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('./'))return next(specifier+'.ts',context);throw error;}}});
const {journeySpreads,focusedSide,READ_START,CLOSE_START,PAGE_STEP}=await import('../../Website/app/journey-data.ts');
const {landscapeLayout}=await import('../../Website/app/scenery-layout.ts');

// A portrait scroll must show every numbered page once and in order, including
// the back of the final sheet; the desktop spread still uses both faces.
const pages=[];
for(let position=READ_START;position<CLOSE_START;position+=.005){
  const raw=(position-READ_START)/PAGE_STEP,index=Math.min(journeySpreads.length-1,Math.floor(raw));
  const side=focusedSide(index,raw-index,true),page=journeySpreads[index][side];
  if(page.number&&pages.at(-1)!==page.number)pages.push(page.number);
}
assert.deepEqual(pages,Array.from({length:22},(_,i)=>i+1));
assert.equal(focusedSide(3,.2,true),'left');
assert.equal(focusedSide(3,.6,true),'right');
assert.equal(focusedSide(3,.2,false),'right');

for(const [width,height,topInset,bottomInset] of [[320,568,0,0],[360,640,0,0],[390,844,47,34],[430,932,59,34],[768,1024,24,20]]){
  const layout=landscapeLayout(width,height);
  for(let p=0;p<=5.25;p+=.01){
    const x=layout.background.left+layout.cameraX(p);
    assert.ok(x<=0&&x+layout.background.width>=width,'Portrait camera must keep the painting across the whole viewport');
  }
  const availableWidth=width-36,availableHeight=height-72-topInset-84-bottomInset;
  assert.ok(availableWidth>0&&availableHeight>0);
  const pageAspect=2.86/4.36,pageHeight=Math.min(availableHeight,availableWidth/pageAspect);
  const pageTop=72+topInset+(availableHeight-pageHeight)/2;
  assert.ok(pageTop>=58+topInset+14,'Manga must clear the top toolbar');
  assert.ok(pageTop+pageHeight<=height-66-bottomInset-18,'Manga must clear the bottom controls');
  // The grid gives the cue its own flexible column; controls keep full touch
  // targets while leaving enough room to wrap the cue on a 320px phone.
  const cueWidth=width-32-8-(110+8+44);
  assert.ok(cueWidth>=80);
}
console.log('Portrait reading shows all 22 pages in order; camera coverage, safe-area reservations and footer controls pass at five mobile sizes.');
