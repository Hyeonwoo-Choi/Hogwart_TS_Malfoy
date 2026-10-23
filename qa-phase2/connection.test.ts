import {describe,it,expect} from 'vitest'
import {advance,choose,clone,continueChapter,currentNode,visibleOptions,setScenario} from '../src/engine/core'
import {SCENARIO,CH3_SCENARIO} from '../src/data/scenario'
import {validateSave} from '../src/engine/save'
import {simulate} from './simulate'
import type {GameState} from '../src/engine/types'
function walk(s:GameState,pred:(s:GameState)=>boolean){for(let i=0;i<300&&!pred(s);i++){const n=currentNode(s);if(n?.t==='line'||n?.t==='trans')s=advance(s);else if(n?.t==='choice')s=choose(s,visibleOptions(s,n,true)[0].key);else break}return s}
const connected=!!CH3_SCENARIO.v2c3_route
const atChoice=()=>{const prefix=simulate({profile:'research',seed:1,chapter:2});expect(prefix.completed).toBe(true);expect(prefix.final.chapter).toBe(2);setScenario(SCENARIO);return walk(continueChapter(clone(prefix.final)),s=>currentNode(s)?.t==='choice')}
describe('connected Ch3 independent regression with correct Ch2 prefix',()=>{
 it.skipIf(!connected)('round-trips a real Ch3 choice save and reaches the same routine',()=>{
  const a=atChoice();expect(a.scene).toBe('v2c3_wA');const file={schemaVersion:2,savedAt:'x',label:'phase2',story:'v2',read:[],state:a};const v=validateSave(JSON.parse(JSON.stringify(file)));expect(v.state).toBeTruthy()
  const stop=(s:GameState)=>s.mode==='ROUTINE'||s.mode==='ENDED';const x=walk(clone(a),stop),y=walk(clone(v.state!),stop);expect(x.mode).toBe('ROUTINE');expect(y.scene).toBe(x.scene);expect(y.idx).toBe(x.idx);expect(y.flags).toEqual(x.flags);expect(y.bonds).toEqual(x.bonds)
 })
 it.skipIf(!connected)('preserves stage/romance/poly and promises across Monday choice and first detention',()=>{
  const a=atChoice(),before=clone(a);const b=walk(a,s=>s.scene==='ch3_detention');expect(b.scene).toBe('ch3_detention');expect(b.bonds).toEqual(before.bonds);expect(b.promises).toEqual(before.promises)
 })
})
