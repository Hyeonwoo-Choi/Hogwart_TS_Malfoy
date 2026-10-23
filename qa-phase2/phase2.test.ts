import {describe,it,expect} from 'vitest'
import {newState,clone} from '../src/engine/core'
import {SCENARIO} from '../src/data/scenario'
import {dayIndex} from '../src/engine/cond'
import {auditFacts,auditTimeline,auditExposure,regressionStatus} from './contracts'
import {classify,scopedReport,wilson} from './scope'
import {simulate} from './simulate'
describe('phase 2 evidence contracts',()=>{
 it('separates future/inactive/forced/conditions and never proves impossibility by zero hits',()=>{
  expect(classify({future:true,active:true,natural:0,forced:1})).toBe('future')
  expect(classify({active:false,natural:0,forced:0})).toBe('inactive')
  expect(classify({active:true,natural:0,forced:1})).toBe('forced-only')
  expect(classify({active:true,natural:0,forced:0,conditions:[false,false]})).toBe('condition-unmet')
  expect(classify({active:true,natural:0,forced:0})).toBe('observable')
 })
 it('excludes future snow events from the Ch1–2 failure denominator',()=>{
  const r=scopedReport([],1,2);expect(r.catalog.find(x=>x.id==='rev_hall_snow')?.category).toBe('future');expect(r.unvisitedEvents.some(x=>x.id==='rev_hall_snow')).toBe(false)
 })
 it('keeps an unconnected prototype separate from natural main reachability',()=>{
  const r=scopedReport([],3,3);if(regressionStatus(SCENARIO).find(x=>x.id==='B01')?.status==='unconnected')expect(r.catalog.find(x=>x.id==='v2c3_route')?.category).toBe('unreachable-suspect')
 })
 it('detects time regressions but accepts academic-year progression',()=>{
  expect(auditTimeline({date:'10-02'},{date:'09-30'},'x')).toHaveLength(1)
  expect(auditTimeline({date:'12-20'},{date:'01-03'},'x')).toHaveLength(0)
 })
 it('detects use before acquisition, witness/promise order and missing disclosure permission',()=>{
  expect(auditFacts([{id:'a',kind:'use',entity:'seal',at:1},{id:'b',kind:'mention',entity:'inside',at:2},{id:'c',kind:'fulfill',entity:'meet',at:3},{id:'d',kind:'reveal',entity:'letter',at:4,requires:'witness:letter',permission:false}])).toEqual(['ITEM_BEFORE_ACQUISITION:a','MENTION_BEFORE_WITNESS:b','FULFILL_WITHOUT_PROMISE:c','KNOWLEDGE_EARLY:d','DISCLOSURE_WITHOUT_PERMISSION:d'])
  expect(auditFacts([{id:'a',kind:'obtain',entity:'seal',at:1},{id:'b',kind:'use',entity:'seal',at:2},{id:'c',kind:'mention',entity:'guess',at:3,epistemic:'inference'},{id:'d',kind:'mention',entity:'false',at:4,epistemic:'lie'}])).toEqual([])
 })
 it('does not accept a future witness as evidence for a present relationship reaction',()=>{
  const s=newState('x');s.bonds!.pansy.stage=3;s.bonds!.pansy.romance='open';s.recent=[{who:'hermione',witnesses:['pansy'],day:dayIndex(s.calendar.date)+1} as any]
  expect(auditExposure(s,{scene:'x',idx:0,date:s.calendar.date,text:'',flags:s.flags,knowledge:s.knowledge},{}).some(f=>f.code==='REACTION_WITHOUT_PAST_WITNESS')).toBe(true)
 })
 it('replays a legal policy change to Pansy night and catches the dated recall regression',()=>{
  const a=simulate({profile:'politics',seed:1,overrides:{'L-04':'B','L-21':'A'}})
  expect(a.completed).toBe(true);expect(a.provenance).toBe('natural');expect(a.scenes).toContain('ch2_eve_i_pansy_night_A')
  const oldRecall=SCENARIO.ch2_morning.some(n=>n.t==='line'&&/어젯밤의 열쇠/.test(n.text));expect(a.findings.some(f=>f.code==='B02_RELATIVE_RECALL_DATE')).toBe(oldRecall)
  const b=simulate({profile:'politics',seed:1,replay:a.decisions.map(d=>d.action)});expect(b.final).toEqual(a.final);expect(b.exposures).toEqual(a.exposures)
 })
 it('does not inflate natural coverage with direct prototype entry',()=>{
  const prefix=simulate({profile:'politics',seed:1}),s=clone(prefix.final);s.scene='v2c3_route';s.idx=0;s.mode='STORY'
  const probe=simulate({profile:'politics',seed:1,initialState:s});expect(probe.provenance).toBe('forced');if(SCENARIO.v2c3_join.some(n=>n.t==='end'))expect(probe.failure).toContain('STORY에서 end')
  const r=scopedReport([prefix,probe],1,3);expect(r.plays).toBe(1);expect(r.forcedProbes).toBe(1);expect(r.catalog.find(x=>x.id==='v2c3_route')?.category).toBe('forced-only')
 })
 it('tracks envelope ownership rather than treating another character acquisition as Harry knowledge',()=>{
  expect(auditFacts([{id:'a',kind:'obtain',entity:'sealed-envelope',actor:'pansy',at:1},{id:'b',kind:'use',entity:'sealed-envelope',actor:'harry',at:2},{id:'c',kind:'event',entity:'reward',at:3},{id:'d',kind:'event',entity:'reward',at:4}])).toEqual(['ITEM_NOT_HELD:b','DUPLICATE_EVENT:d'])
 })
 it('keeps witnessed jealousy probes outside the natural rate and marks unsupported transmission as manual review',()=>{
 const s=newState('probe');s.bonds!.pansy.stage=3;s.bonds!.pansy.romance='open';s.recent=[{who:'hermione',witnesses:['pansy'],day:dayIndex(s.calendar.date)} as any]
 const probe=simulate({profile:'politics',seed:1,chapter:1,scenario:{probe:[{t:'line',text:'직접 본 만남.'},{t:'endChapter',title:'진단'}]},initialState:s,events:false})
 const r=scopedReport([probe],1,2);expect(r.relationshipEvidence.find(x=>x.id==='jealousy').forced).toBe(1);expect(r.relationshipEvidence.find(x=>x.id==='jealousy').natural).toBe(0);expect(r.relationshipEvidence.find(x=>x.id==='trusted-transmission').status).toBe('manual-review')
 })
 it('reports uncertainty without calling rare events impossible',()=>{expect(wilson(0,8)?.[1]).toBeGreaterThan(.3);expect(wilson(0,0)).toBeNull()})
})
