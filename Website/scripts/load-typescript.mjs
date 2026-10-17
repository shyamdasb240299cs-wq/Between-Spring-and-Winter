import fs from 'node:fs/promises';
import ts from 'typescript';

/** Load this project's small pure TypeScript modules, resolving local imports. */
export async function typescriptUrl(url){
  let source=await fs.readFile(url,'utf8');
  source=source.replace(/from\s+['"]three['"]/g,`from "${new URL('../node_modules/three/build/three.module.js',import.meta.url).href}"`);
  const imports=[...source.matchAll(/from\s+["'](\.[^"']+)["']/g)];
  for(const match of imports){
    const child=await typescriptUrl(new URL(match[1]+'.ts',url));
    source=source.replace(match[0],`from "${child}"`);
  }
  return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText).toString('base64');
}
