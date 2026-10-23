import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Exercise the real React markup and input handlers without constructing WebGL.
// Name hooks from their variable bindings so adding unrelated state cannot shift
// these fixtures. All scene effects stay disabled; depth-control effects run below.
const filename=new URL('../app/shrine-void/void-scene.tsx',import.meta.url);
const source=ts.createSourceFile(filename.pathname,await fs.readFile(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const transformed=ts.transform(source,[context=>root=>{
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&node.initializer&&ts.isCallExpression(node.initializer)&&ts.isIdentifier(node.initializer.expression)){
      const hook=node.initializer.expression.text;
      const binding=hook==='useState'&&ts.isArrayBindingPattern(node.name)?node.name.elements[0].name:hook==='useRef'?node.name:null;
      if(binding&&ts.isIdentifier(binding)&&(hook==='useState'||hook==='useRef')){
        const initializer=context.factory.updateCallExpression(node.initializer,node.initializer.expression,node.initializer.typeArguments,[...node.initializer.arguments,context.factory.createStringLiteral(binding.text)]);
        return context.factory.updateVariableDeclaration(node,node.name,node.exclamationToken,node.type,ts.visitEachChild(initializer,visit,context));
      }
    }
    return ts.visitEachChild(node,visit,context);
  };
  return ts.visitNode(root,visit);
}]);
const printer=ts.createPrinter();
const functions=transformed.transformed[0].statements.filter(statement=>ts.isFunctionDeclaration(statement)&&['VoidScene','SummerDepthControls'].includes(statement.name?.text));
assert.equal(functions.length,2,'Test harness must load both actual components');
const harness=`
let fixtures={},refs=new Map(),pending=[],cleanups=[];
export function configure(next={},reset=true){fixtures=next;if(reset){refs=new Map();pending=[];}}
export function flushEffects(){for(const cleanup of cleanups)cleanup?.();cleanups=pending.map(effect=>effect());pending=[];}
export function unmount(){for(const cleanup of cleanups)cleanup?.();cleanups=[];}
function useState(initial,name){return [Object.hasOwn(fixtures.states??{},name)?fixtures.states[name]:initial,()=>{}];}
function useRef(initial,name){if(!refs.has(name))refs.set(name,{current:Object.hasOwn(fixtures.refs??{},name)?fixtures.refs[name]:initial});return refs.get(name);}
function useEffect(effect){if(fixtures.effects)pending.push(effect);}
function useAudioEnabled(){return false;}
const requestAudioToggle=()=>{};
const SEASONS={spring:{title:'Spring'},summer:{title:'Summer'},autumn:{title:'Autumn'},winter:{title:'Winter'}};
const ArrowLeft=()=>null,Pause=()=>null,Play=()=>null,Volume2=()=>null,VolumeX=()=>null,Hand=()=>null,HandMetal=()=>null,ArrowDownToLine=()=>null,BookOpen=()=>null,KeyRound=()=>null;
const PhotoOverlay=()=>null,SummerHUD=()=>null,SummerUI=()=>null,SeasonMangaReader=()=>null,SpringTreasureUI=()=>null;
${functions.map(statement=>printer.printNode(ts.EmitHint.Unspecified,statement,transformed.transformed[0])).join('\n')}
export {SummerDepthControls};
`;
transformed.dispose();
const compiled=ts.transpileModule(harness,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText.replaceAll('"react/jsx-runtime"',JSON.stringify(import.meta.resolve('react/jsx-runtime')));
const {default:VoidScene,SummerDepthControls,configure,flushEffects,unmount}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

const originalEnv=process.env.NODE_ENV;
try{
  const sceneMarkup=(environment,preview)=>{
    process.env.NODE_ENV=environment;
    configure({states:{ready:true,season:'summer',phase:'awake'}});
    return renderToStaticMarkup(createElement(VoidScene,{active:true,paused:false,preview}));
  };
  const published=sceneMarkup('production',true);
  assert.ok(published.includes('data-preview="false"'),'Production ignores an accidentally passed preview prop');
  for(const label of ['Development world preview','Summer authoring viewpoint','Inspect Summer','Blossom world'])assert.equal(published.includes(label),false,`Published gameplay excludes ${label}`);
  const preview=sceneMarkup('development',true);
  for(const label of ['Development world preview','Summer authoring viewpoint','Inspect Summer','Blossom world','Island overview','Shipwreck'])assert.ok(preview.includes(label),`Local preview keeps ${label}`);
  assert.ok(preview.includes('data-preview="true"'));
  assert.equal(sceneMarkup('development',false).includes('Development world preview'),false,'Ordinary local gameplay also hides authoring tools');
}finally{
  if(originalEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=originalEnv;
}

const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
Object.defineProperty(globalThis,'document',{configurable:true,value:new EventTarget()});
try{
  const calls=[],movement={vertical:(up,down)=>calls.push([up,down])};let focused=0;
  configure({effects:true});
  const controls=SummerDepthControls({movement,blocked:false,onPointerFocus:()=>focused++}),[ascend,descend]=controls.props.children.map(button=>button.props);
  const markup=renderToStaticMarkup(controls);
  assert.ok(markup.includes('↑ Ascend')&&markup.includes('↓ Descend'),'Both depth controls are labelled');
  flushEffects();
  const captures=new Set(),target={setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)};
  const pointer=pointerId=>({button:0,pointerId,currentTarget:target,preventDefault(){this.prevented=true;}});
  const key=value=>({key:value,preventDefault(){this.prevented=true;}});
  const expect=(up,down)=>assert.deepEqual(calls.at(-1),[up,down]);
  const first=pointer(1);ascend.onPointerDown(first);expect(true,false);assert.ok(first.prevented,'Touch controls prevent focus from leaving the canvas');assert.equal(focused,1);
  descend.onPointerDown(pointer(2));expect(true,true);
  ascend.onPointerUp(pointer(1));expect(false,true);assert.equal(captures.has(1),false,'Released buttons release pointer capture');
  descend.onLostPointerCapture(pointer(2));expect(false,false);
  ascend.onPointerDown(pointer(3));ascend.onPointerCancel(pointer(3));expect(false,false);
  ascend.onPointerDown({...pointer(4),button:2});expect(false,false);
  ascend.onKeyDown(key(' '));ascend.onKeyDown(key('Enter'));expect(true,false);
  ascend.onKeyUp(key(' '));expect(true,false);
  ascend.onBlur();expect(false,false);
  descend.onPointerDown(pointer(5));window.dispatchEvent(new Event('blur'));expect(false,false);
  ascend.onPointerDown(pointer(6));document.dispatchEvent(new Event('visibilitychange'));expect(false,false);
  descend.onPointerDown(pointer(7));expect(false,true);
  configure({effects:true},false);
  const blocked=SummerDepthControls({movement,blocked:true,onPointerFocus:()=>focused++});flushEffects();expect(false,false);
  for(const button of blocked.props.children){assert.equal(button.props.disabled,true);button.props.onPointerDown(pointer(8));button.props.onKeyDown(key(' '));expect(false,false);}
  configure({effects:true},false);
  const resumed=SummerDepthControls({movement,blocked:false,onPointerFocus:()=>focused++});flushEffects();
  resumed.props.children[0].props.onPointerDown(pointer(9));expect(true,false);unmount();expect(false,false);
}finally{
  unmount();
  if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else delete globalThis.window;
  if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else delete globalThis.document;
}
console.log('Preview and swim controls passed: production exclusion, retained local authoring tools, independent held inputs, focus, cancellation, blur, overlays and unmount.');
