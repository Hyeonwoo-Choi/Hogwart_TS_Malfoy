import {createRequire} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import vm from 'node:vm';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
export function runtime(source,qa=dirname(fileURLToPath(import.meta.url))){
 const req=createRequire(resolve(source,'package.json')),ts=req('typescript'),cache=new Map(),hashes={};
 function load(file){file=resolve(file);if(!existsSync(file)){if(existsSync(file+'.ts'))file+='.ts';else if(existsSync(file+'.tsx'))file+='.tsx';else throw Error('Missing module '+file)}if(cache.has(file))return cache.get(file).exports;
 const m={exports:{}};cache.set(file,m);const raw=readFileSync(file,'utf8');hashes[file]=createHash('sha256').update(raw).digest('hex');
 if(file.replaceAll('\\','/').endsWith('/src/engine/env.ts')){m.exports={IS_TEST:true,QA_MODE:true,DEBUG_MODE:false,STORAGE_PREFIX:'hfd-qa:',devAttrs:()=>true};return m.exports}
 const code=ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const local=id=>id.startsWith('.')?load(id.startsWith('../src/')?resolve(source,'src',id.slice(7)):resolve(dirname(file),id)):req(id);
 vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{console,URLSearchParams,structuredClone,window:{localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},location:{search:'?qa'}}},{filename:file})(local,m,m.exports);return m.exports;
 }return {load:f=>load(resolve(qa,f)),hashes}
}
