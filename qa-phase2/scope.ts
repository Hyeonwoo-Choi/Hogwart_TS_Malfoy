import {SCENARIO,START_SCENE} from '../src/data/scenario'
import {CALENDAR} from '../src/data/calendar'
import {INCIDENTS} from '../src/data/incidents'
import {RANDOM_EVENTS} from '../src/data/randomEvents'
import {reactionOf} from '../src/engine/reactions'
import {INTIMATE,TENSION} from '../src/data/v2c2r'
import {dayIndex} from '../src/engine/cond'
import {inspectCondition} from './checks'
import type {RunResult} from './simulate'
import {inventory,summarize} from './report'
export type Category='observable'|'condition-unmet'|'inactive'|'future'|'forced-only'|'unreachable-suspect'
export function classify(x:{future?:boolean;active:boolean;natural:number;forced:number;conditions?:boolean[];disconnected?:boolean}):Category{
 if(x.natural)return 'observable';if(x.future)return 'future';if(!x.active)return 'inactive';if(x.forced)return 'forced-only';
 if(x.disconnected)return 'unreachable-suspect';if(x.conditions?.length&&x.conditions.every(v=>!v))return 'condition-unmet';return 'observable'
}
export function wilson(k:number,n:number){if(!n)return null;const z=1.96,d=1+z*z/n,p=k/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/d;return [Math.max(0,c-h),Math.min(1,c+h)]}
const chOf=(id:string)=>Number(id.match(/^(?:ch|v2c|fr|enc)(\d+)[_a-z]/)?.[1]??0)
export function scopedReport(runs:RunResult[],min=1,max=2,types:string[]=[]){
 const base=summarize(runs,{chapter:max});const structural=inventory(SCENARIO,START_SCENE,max)
 const natural=runs.filter(r=>r.provenance==='natural'),forced=runs.filter(r=>r.provenance==='forced')
 const windows=Object.entries(SCENARIO).filter(([id])=>chOf(id)>=min&&chOf(id)<=max).flatMap(([id,ns])=>ns.flatMap(n=>n.t==='routine'?n.days.map(d=>({chapter:chOf(id),date:d.date,places:n.locations})):[]))
 const horizon=windows.map(w=>dayIndex(w.date)),hi=horizon.length?Math.max(...horizon):-Infinity
 const events=[...CALENDAR.map(e=>({id:e.id,scene:e.scene,type:'calendar',places:[e.place],dates:[e.date],cond:e.cond,range:undefined as number[]|undefined})),...INCIDENTS.map(e=>({...e,scene:e.id,type:'incident',range:undefined as number[]|undefined})),...RANDOM_EVENTS.map(e=>({...e,scene:e.id,type:'random:'+e.type,dates:undefined as string[]|undefined,range:e.chapters}))]
 const rows:any[]=[]
 for(const e of events){
  if(types.length&&!types.includes(e.type)&&!types.includes(e.type.split(':')[0])&&!types.includes(e.type.split(':')[1]))continue
  const future=!!(e.range&&e.range[0]>max)||!!(e.dates?.length&&hi!==-Infinity&&Math.min(...e.dates.map(dayIndex))>hi)
  const fitting=windows.filter(w=>(!e.range||w.chapter>=e.range[0]&&w.chapter<=e.range[1])&&(!e.dates||e.dates.includes(w.date))&&e.places.some(p=>w.places.includes(p)))
  const visits=natural.filter(r=>r.scenes.includes(e.scene)),fv=forced.filter(r=>r.scenes.includes(e.scene))
  const samples=natural.flatMap(r=>Object.values(r.checkpoints).filter(s=>s.chapter>=min&&s.chapter<=max&&s.routine&&fitting.some(w=>w.date===s.calendar.date)).map(s=>({profile:r.profile,seed:r.seed,...inspectCondition(s,e.cond??'1')})))
  rows.push({...e,category:classify({future,active:!!fitting.length,natural:visits.length,forced:fv.length,conditions:samples.flatMap(s=>s.result===undefined?[]:[s.result])}),natural:visits.length,forced:fv.length,scheduleCandidates:fitting.length,conditions:samples.slice(0,8),note:'schedule candidate; hours/activity/RNG/priority remain production-engine constraints'})
 }
 const eventRoots=new Set(events.map(e=>e.scene)),eventDesc=new Set<string>();for(const e of events)for(const id of inventory(SCENARIO,e.scene,14))eventDesc.add(id)
 for(const id of new Set([...structural,...Object.keys(SCENARIO).filter(id=>chOf(id)>=min&&chOf(id)<=max)])){
  if(eventRoots.has(id)||eventDesc.has(id))continue;if(types.length&&!types.includes('main'))continue
  const ch=chOf(id);if(ch&&ch<min)continue
  const n=natural.filter(r=>r.scenes.includes(id)).length,f=forced.filter(r=>r.scenes.includes(id)).length
  const active=!ch||ch<=max;const disconnected=!structural.has(id)
  rows.push({id,scene:id,type:'main',category:classify({active,future:ch>max,natural:n,forced:f,disconnected}),natural:n,forced:f,note:disconnected?'no structural path from START; dynamic dispatch or prototype requires review':'structural candidate is not proof of reachability'})
 }
 const inScope=rows.filter(r=>!['future','inactive'].includes(r.category));const unvisited=inScope.filter(r=>!r.natural)
 const candidateScenes=new Set<string>();for(const r of inScope){candidateScenes.add(r.scene);if(r.type!=='main')for(const id of inventory(SCENARIO,r.scene,max))candidateScenes.add(id)}
 const choiceVisits=Object.fromEntries(Object.entries(base.choiceVisits).filter(([id])=>candidateScenes.has(id.split(':')[0])))
 const sceneVisits=Object.fromEntries(Object.entries(base.sceneVisits).filter(([id])=>candidateScenes.has(id)))
 return {...base,choiceVisits,sceneVisits,unvisitedChoices:Object.keys(choiceVisits).filter(id=>!choiceVisits[id]),scope:{...base.scope,minChapter:min,maxChapter:max,types},catalog:rows,categoryCounts:Object.fromEntries(['observable','condition-unmet','inactive','future','forced-only','unreachable-suspect'].map(c=>[c,rows.filter(r=>r.category===c).length])),
  unvisited:unvisited.map(r=>({...r,target:r.scene,verdict:r.category==='unreachable-suspect'?'구조 경로 없음 — 수동 검토 필요':'미관측 — 논리적 불가능 판정 아님'})),unvisitedEvents:unvisited.filter(r=>r.type!=='main'),
  relationshipEvidence:relationshipEvidence(runs),limits:[...base.limits,'observable은 일정/구조 후보 또는 자연 관측이며 방문 여부는 natural 필드로 구별','조건 표본은 자동 효과 전후 시점 차이가 있어 논리 증명이 아님','Wilson 구간은 정책/시드 표본에 대한 참고치이며 실제 플레이어 확률 추정이 아님']}
}
export function relationshipEvidence(runs:RunResult[]){
 const targets=[{id:'pansy-intimate',scene:'ch2_eve_i_pansy',cond:INTIMATE.pansy}, {id:'pansy-night',scene:'ch2_eve_i_pansy_night',cond:'FLAG_P2_PAN_CONFIDED && pansy.trust>=10'}, {id:'pansy-disclosure',flag:'FLAG_P2_BETRAYED_PANSY',cond:'KN_PANSY_NIGHTS || KN_LETTER_PRESSURE || FLAG_P2_PROMISE_KEPT'}, {id:'draco-fight',flag:'FLAG_P2_FIGHT_DRACO',cond:TENSION.draco}, {id:'hermione-conflict',scene:'ch2_eve_t_hermione',cond:TENSION.hermione}, {id:'hermione-repair',flag:'FLAG_HER_REPAIRED',cond:'1'}]
 const result:any[]=targets.map(t=>{const ns=runs.filter(r=>r.provenance==='natural'),fs=runs.filter(r=>r.provenance==='forced');const hit=(r:RunResult)=>t.scene?r.scenes.includes(t.scene):!!r.final.flags[t.flag!];const witnesses=ns.filter(hit);return {...t,natural:witnesses.length,denominator:ns.length,forced:fs.filter(hit).length,wilson95:wilson(witnesses.length,ns.length),witnesses:witnesses.map(r=>({profile:r.profile,seed:r.seed,policy:r.policy,actions:r.decisions.map(d=>d.action)})),unmet:ns.filter(r=>!hit(r)).slice(0,4).map(r=>({profile:r.profile,seed:r.seed,...inspectCondition(r.final,t.cond),timing:'final endpoint, not exact gate'}))}})
 const evidence=(r:RunResult)=>Object.entries(r.checkpoints).flatMap(([scene,s])=>['hermione','pansy'].flatMap(observer=>['hermione','ginny','luna','pansy','draco'].flatMap(subject=>reactionOf(s,observer,subject)==='jealousy'?[{scene,date:s.calendar.date,observer,subject,recent:s.recent}]:[])))
 const natural=runs.filter(r=>r.provenance==='natural'),hits=natural.filter(r=>evidence(r).length)
 result.push({id:'jealousy',cond:'actual reactionOf on first interactive scene checkpoints; past witnessed encounter + romantic stage',natural:hits.length,denominator:natural.length,forced:runs.filter(r=>r.provenance==='forced'&&evidence(r).length).length,wilson95:wilson(hits.length,natural.length),witnesses:hits.map(r=>({profile:r.profile,seed:r.seed,evidence:evidence(r).slice(0,4),actions:r.decisions.map(d=>d.action)})),limit:'첫 장면 체크포인트 표본; 모든 중간 반응 관측 보장 아님'})
 result.push({id:'trusted-transmission',natural:null,denominator:natural.length,forced:null,status:'manual-review',reason:'현재 reactionOf는 직접 목격 recent/witnesses만 사용. 신뢰할 전언의 별도 사건·출처 모델은 미구현; 자동 판정/자연 도달률 산출 불가'})
 return result
}
