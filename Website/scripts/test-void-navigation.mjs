import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile(new URL('../app/shrine-void/travel.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {createTravelController}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
function advance(c,seconds,hz=60){for(let i=0;i<seconds*hz;i++)c.update(1/hz);}
const idle=createTravelController(5);advance(idle,10);assert.equal(idle.state.distance,0,'No autonomous motion');
const a=createTravelController(5);a.key('ArrowUp',true);advance(a,1);assert.ok(a.state.distance>3.4&&a.state.distance<3.8,'Held key moves at walking speed');a.key('ArrowUp',false);advance(a,1);const stopped=a.state.distance;advance(a,3);assert.ok(a.state.distance-stopped<.001,'Key release stops movement');
const b=createTravelController(5);b.key('ArrowUp',true);advance(b,1,30);assert.ok(Math.abs(b.state.distance-3.8)<.4,'30 Hz movement uses elapsed time');
const turn=createTravelController(5);turn.key('ArrowLeft',true);advance(turn,1);assert.ok(turn.state.yaw>1.2);turn.resetInput();const yaw=turn.state.yaw;advance(turn,1);assert.equal(turn.state.yaw,yaw);
const touch=createTravelController(5);touch.joystick(1,-1);advance(touch,1);assert.ok(touch.state.distance>2&&touch.state.x>2);touch.block(true);const before=touch.state.distance;touch.key('ArrowUp',true);touch.joystick(0,-1);advance(touch,3);assert.equal(touch.state.distance,before,'Photo view blocks all movement');touch.block(false);advance(touch,1);assert.equal(touch.state.distance,before,'Closing a photo never restores held input');
const collision=createTravelController(5);collision.state.x=0;collision.key('ArrowUp',true);advance(collision,5);assert.ok(Math.hypot(collision.state.x,collision.state.distance-12)>=1.49,'Camera stays outside island collision');
const photo=createTravelController(5);photo.state.x=1;photo.state.distance=7;photo.update(0);assert.equal(photo.state.activePhotoIndex,0,'Front of photo is available');photo.state.distance=13;photo.update(0);assert.equal(photo.state.activePhotoIndex,-1,'Pillar back never activates a photo');
const reverse=createTravelController(5);reverse.key('ArrowDown',true);advance(reverse,4);assert.equal(reverse.state.distance,-1,'Entrance boundary is bounded');
console.log('Navigation passed: idle, held keys, stopping, frame-rate independence, turning, joystick, blocking, collision, photo facing, boundary.');
