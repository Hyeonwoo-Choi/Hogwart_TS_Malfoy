import { dayIndex } from '../src/engine/cond'
import { buildCases } from '../src/data/cases'
import { reactionOf } from '../src/engine/reactions'
import type { GameState } from '../src/engine/types'
import type { Finding } from './checks'
export const notebookSnapshot=(s:GameState)=>JSON.stringify(buildCases(s))
export interface Exposure { scene: string; idx: number; date: string; text: string; knowledge: Record<string, boolean>; flags: Record<string, boolean> }
const issue=(code:string,scene:string,detail:string,level:Finding['level']='error'):Finding=>({code,scene,detail,level})
export function auditTimeline(before:{date:string},after:{date:string},scene:string):Finding[]{
  return dayIndex(after.date)<dayIndex(before.date)?[issue('TIME_REVERSED',scene,before.date+' -> '+after.date)]:[]
}
/** Explicit observations only. No NLP inference that a speaker is truthful. */
export function auditExposure(s:GameState,e:Exposure,first:Record<string,string>):Finding[]{
 const out:Finding[]=[]; const book=JSON.stringify(buildCases(s))
 if(!s.knowledge.OB_STAIR_INSIDE && /칠십일 계단|이마 높이에 손바닥만 한/.test(book))out.push(issue('NOTEBOOK_STAIR_BEFORE_OBSERVATION',e.scene,'내부 관찰 없이 내부 확정 문구 공개'))
 if(e.scene==='ch2_eve_t_hermione_seen' && !s.flags.FLAG_P2_BREACH && /서고에 들어|필사한 쪽의 출처/.test(e.text))out.push(issue('CONFLICT_CAUSE_MISMATCH',e.scene,e.text))
 if(e.scene==='ch2_morning' && s.flags.FLAG_PAN_NIGHT && /어젯밤의 열쇠/.test(e.text)){
  const when=first.ch2_eve_i_pansy_night_A
  if(when && dayIndex(e.date)-dayIndex(when)!==1)out.push(issue('B02_RELATIVE_RECALL_DATE',e.scene,when+' 밤을 '+e.date+'에 어젯밤으로 회상'))
 }
 for(const observer of ['hermione','ginny','luna','pansy'])for(const subject of ['hermione','ginny','luna','pansy','draco']){
  if(reactionOf(s,observer,subject)==='none')continue
  const evidence=(s.recent??[]).filter(m=>m.who===subject&&m.witnesses.includes(observer))
  if(!evidence.some(m=>dayIndex(e.date)>=m.day&&dayIndex(e.date)-m.day<=3))out.push(issue('REACTION_WITHOUT_PAST_WITNESS',e.scene,observer+' -> '+subject))
 }
 return out
}
export interface CausalFact { id:string; kind:'obtain'|'use'|'witness'|'mention'|'promise'|'fulfill'|'reveal'|'event'|'transfer'; actor?:string; holder?:string; entity:string; at:number; requires?:string; epistemic?:'fact'|'inference'|'lie'; permission?:boolean }
/** QA annotations describe facts; they never grant production flags or move scenes. */
export function auditFacts(facts:CausalFact[]):string[]{
 const known=new Set<string>();const owners=new Map<string,string>();const out:string[]=[];let at=-Infinity
 for(const f of facts){
  if(f.at<at)out.push('TIME_REVERSED:'+f.id);at=f.at
  if(f.kind==='obtain')owners.set(f.entity,f.holder??f.actor??'harry')
  if(f.kind==='transfer'){if(owners.get(f.entity)!==(f.actor??'harry'))out.push('TRANSFER_NOT_HELD:'+f.id);else owners.set(f.entity,f.holder??'harry')}
  if(f.kind==='event'&&known.has('event:'+f.entity))out.push('DUPLICATE_EVENT:'+f.id)
  if(f.kind==='use'&&owners.has(f.entity)&&owners.get(f.entity)!==(f.actor??'harry'))out.push('ITEM_NOT_HELD:'+f.id)
  if(f.kind==='use'&&!known.has('obtain:'+f.entity))out.push('ITEM_BEFORE_ACQUISITION:'+f.id)
  if(f.kind==='mention'&&f.epistemic!=='inference'&&f.epistemic!=='lie'&&!known.has('witness:'+f.entity))out.push('MENTION_BEFORE_WITNESS:'+f.id)
  if(f.kind==='fulfill'&&!known.has('promise:'+f.entity))out.push('FULFILL_WITHOUT_PROMISE:'+f.id)
  if(f.kind==='reveal'&&f.epistemic!=='inference'&&f.epistemic!=='lie'&&f.requires&&!known.has(f.requires))out.push('KNOWLEDGE_EARLY:'+f.id)
  if(f.kind==='reveal'&&f.permission===false)out.push('DISCLOSURE_WITHOUT_PERMISSION:'+f.id)
  known.add(f.kind+':'+f.entity)
 }return out
}
export function regressionStatus(sc:Record<string,any[]>){
 const all=Object.values(sc).flat();const inbound=all.some(n=>n.t==='goto'&&n.scene==='v2c3_route'||n.t==='if'&&(n.then==='v2c3_route'||n.else==='v2c3_route'))
 const d=sc.v2c3_wD_C??[],morning=sc.ch2_morning??[]
 return [
  {id:'B01',status:!inbound?'unconnected':(sc.v2c3_join??[]).some(n=>n.t==='end')?'invalid-story-end':'connected-needs-natural-run',timeRisk:d.some(n=>n.t==='line'&&/수요일 오후1/.test(n.text))&&!d.some(n=>n.t==='date')},
  {id:'B02',status:morning.some(n=>n.t==='line'&&/어젯밤의 열쇠/.test(n.text))?'needs-path-reproduction':'known-wording-absent'},
  {id:'B03',status:'manual-draft-review',reason:'문서상의 봉투 소유·이동은 엔진 이벤트 주석이 없어 자동 의미 판정 불가'},
 ]
}
