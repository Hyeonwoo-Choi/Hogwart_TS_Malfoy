import blueprint from '../docs/codex-phase2/scene-contracts.json'
import {describe,it,expect} from 'vitest'
import {dayIndex} from '../src/engine/cond'
const spec:any=blueprint
describe('story blueprint contracts',()=>{
 it('covers 14 chapters with five independent event contracts and sixty detailed scenes',()=>{expect(spec.contracts).toHaveLength(70);for(let chapter=1;chapter<=14;chapter++)expect(spec.contracts.filter((c:any)=>c.chapter===chapter).map((c:any)=>c.axis)).toEqual(['A','B','C','D','E']);expect(spec.contracts.filter((c:any)=>c.chapter<=4).flatMap((c:any)=>c.scenes)).toHaveLength(60)})
 it('has no dangling or duplicate scene/choice targets',()=>{
  const scenes=spec.contracts.flatMap((c:any)=>c.scenes),ids=scenes.map((s:any)=>s.id).concat(spec.common.map((s:any)=>s.id),spec.codas.map((s:any)=>s.id));expect(new Set(ids).size).toBe(ids.length)
  for(const s of scenes)for(const choice of s.choices){expect(ids,choice.next).toContain(choice.next);expect(choice.text.length).toBeGreaterThan(3);expect(choice.result.length).toBeGreaterThan(3)}
 })
 it('gives every produced outcome an explicit consumer that reads it, including absent-state fallbacks',()=>{
  const all=spec.contracts.flatMap((c:any)=>c.scenes).concat(spec.codas)
  for(const c of spec.contracts){expect(c.consumer.length).toBeGreaterThan(0);for(const id of c.consumer){const target=all.find((s:any)=>s.id===id);expect(target,id).toBeTruthy();expect(target.consumes.some((x:any)=>typeof x==='string'?x===c.state:x.key===c.state)).toBe(true)}}
 })
 it('contains all detailed scene fields and dates within the proposed chapter bounds',()=>{
  for(const c of spec.contracts.filter((c:any)=>c.chapter<=4))for(const s of c.scenes){for(const key of ['id','chapter','date','time','place','cast','entry','knowledge','inciting','action','conflict','emotion','reveal','withhold','choices','state','consumer','payoff','shot','writing'])expect(s[key],s.id+':'+key).toBeTruthy();expect(dayIndex(s.date)).toBeGreaterThanOrEqual(dayIndex(spec.bounds[s.chapter][0]));expect(dayIndex(s.date)).toBeLessThanOrEqual(dayIndex(spec.bounds[s.chapter][1]))}
 })
 it('preserves W-01–05 as aliases instead of silently reallocating existing IDs',()=>{expect(spec.contracts.filter((c:any)=>c.chapter===3).map((c:any)=>c.scenes[2].engineAlias.id)).toEqual(['W-01','W-02','W-03','W-04','W-05'])})
})
