import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const root=path.resolve(import.meta.dirname,'..'),cache=new Map();
async function sourceModule(filename){
  if(cache.has(filename))return cache.get(filename);
  let source=ts.transpileModule(await fs.readFile(filename,'utf8'),{fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  source=source.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
  for(const match of [...source.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
    const resolved=match[2].startsWith('.')?await sourceModule(path.resolve(path.dirname(filename),match[2]+'.ts')):import.meta.resolve(match[2]);
    source=source.replace(match[0],`from ${JSON.stringify(resolved)}`);
  }
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(filename,url);return url;
}
const {SummerUI,SummerHUD}=await import(await sourceModule(path.join(root,'app/shrine-void/summer-ui.tsx')));
const {createSummerState}=await import(await sourceModule(path.join(root,'app/shrine-void/summer-state.ts')));
const act=(game,action,value)=>assert.equal(game.act(action,value),true,`${action}: ${game.message}`);
const buttons=(game,target='boat')=>{
  const html=renderToStaticMarkup(createElement(SummerUI,{controller:game,target,onClose(){},onReadBook:()=>false}));
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([,attrs,body])=>({text:body.replace(/<[^>]*>/g,'').replace(/&#x27;/g,"'"),disabled:/\bdisabled/.test(attrs)}));
};
const find=(game,text,target)=>buttons(game,target).find(button=>button.text===text);
const game=createSummerState();
assert.ok(find(game,'Board the boat'));
assert.equal(find(game,'Start engine and take the helm'),undefined,'The shore panel requires boarding first');
for(const index of [0,1])act(game,'take-chart',index);
act(game,'assemble-chart',{pieces:[{tray:0,turn:0,x:0,y:0},{tray:1,turn:0,x:0,y:0}],north:0});
for(const action of ['inspect-console','stow-bag','take-fuel-can','open-cap','fit-spout','pour-fuel','replace-cap','connect-hose','return-fuel-can','wear-wetsuit','equip-bcd','check-gear','stow-gear'])act(game,action);
act(game,'board');assert.equal(find(game,'Start engine and take the helm')?.disabled,false);assert.ok(find(game,'Step onto the jetty'));
act(game,'start-engine');
assert.equal(find(game,'Dock at the island jetty')?.disabled,false,'An underway player can explicitly dock after physically returning');
assert.ok(find(game,'Moor beside the dive buoy'));assert.equal(find(game,'Step onto the jetty'),undefined,'The helm cannot disembark at sea');
act(game,'moor');assert.equal(find(game,'Lower the stern ladder')?.disabled,true);act(game,'stop-engine');assert.equal(find(game,'Lower the stern ladder')?.disabled,false);
const hud=()=>renderToStaticMarkup(createElement(SummerHUD,{controller:game,onOpen(){},depth:6,heading:90}));
assert.ok(hud().includes('Next clue'),'The slate explains where to get the next clue without a desktop-only tooltip');
assert.equal(hud().includes('View through fitted diving mask'),false);
act(game,'fit-mask');assert.ok(hud().includes('View through fitted diving mask'),'Fitting the mask adds the optical viewport frame');
for(const action of ['lower-ladder','fit-mask','fit-fins','inspect-gear','enter-water'])act(game,action);act(game,'set-mode','swimming');
assert.equal(find(game,'Climb the stern ladder')?.disabled,false);
for(const label of ['Start engine for the return','Remove fins while seated','Enter water beside the rope','Dock at the island jetty'])assert.equal(find(game,label),undefined,`Underwater console hides ${label}`);
act(game,'climb-ladder');assert.ok(find(game,'Remove fins while seated'));act(game,'remove-fins');assert.equal(find(game,'Start engine for the return')?.disabled,false);act(game,'start-engine');act(game,'release-mooring');
assert.equal(find(game,'Dock at the island jetty')?.disabled,false,'The return console retains its final docking action');
act(game,'dock');assert.equal(find(game,'Step onto the jetty')?.disabled,false);act(game,'disembark');act(game,'remove-gear');
assert.equal(hud().includes('View through fitted diving mask'),false,'Returning equipment removes the mask view');
assert.ok(find(game,'Wear the wetsuit from the rack','gear'),'Removed gear can be worn again from the rack');
assert.ok(find(game,'Wear the wetsuit for another trip','preparation'),'The completed checklist still offers a second-trip suit action');
console.log('Summer UI passed: shore/deck/helm/swimmer controls, explicit return docking, engine safety and equipment replay.');
