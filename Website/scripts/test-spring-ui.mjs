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
    let resolved;
    if(match[2].startsWith('.')){
      const base=path.resolve(path.dirname(filename),match[2]);
      let target=base+'.ts';
      try{await fs.access(target);}catch{target=base+'.tsx';}
      resolved=await sourceModule(target);
    }else resolved=import.meta.resolve(match[2]);
    source=source.replace(match[0],`from ${JSON.stringify(resolved)}`);
  }
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(filename,url);return url;
}
const {SpringGameHUD}=await import(await sourceModule(path.join(root,'app/shrine-void/spring-treasure-ui.tsx')));
const {createSpringTreasureState}=await import(await sourceModule(path.join(root,'app/shrine-void/spring-treasure-state.ts')));
const {createSpringPreviewStorage}=await import(await sourceModule(path.join(root,'app/shrine-void/spring-preview.ts')));
const game=createSpringTreasureState(createSpringPreviewStorage('ending'));
assert.ok(game.act('equip-storage',game.state.storageSlots.indexOf('candle')));
const render=(state=game.state)=>renderToStaticMarkup(createElement(SpringGameHUD,{controller:{...game,snapshot:()=>state},onCommand(){},canPutBack:()=>false,hint:'Take Part One · Spring'}));
const html=render();
assert.match(html,/>\s*Take Part One · Spring<\/button>/,'A candle in hand retains the on-screen book interaction');
assert.match(html,/data-backpack="false"/,'Holding a bag item does not hide the world action row');
assert.doesNotMatch(html,/aria-label="Backpack controls"/,'The legacy bag toolbar cannot cover the chest action');
assert.match(render({...game.state,paperHeld:'letter'}),/>\s*Take Part One · Spring<\/button>/,'A note in the other hand cannot mask a valid world interaction');
console.log('Spring UI passed: the candle and a second held note retain the book pickup button without an overlapping backpack toolbar.');
