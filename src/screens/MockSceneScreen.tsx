import { useState } from 'react'
import { SceneRenderer } from '../components/SceneRenderer'
import type { SceneView } from '../shared/presentation'
/** Local UI fixtures only. No game progress, saves, relationship state or backend. */
const frames: SceneView[] = [
  { id: 'dialogue', speaker: '표현 샘플', text: '대화창과 이름표를 확인하는 화면입니다. 문장을 펼친 뒤 다음 화면에서 선택지와 이미지 레이어를 확인할 수 있습니다.', characters: [{ id: 'sample', name: '인물 이미지 자리', pose: 'stand' }] },
  { id: 'choices', speaker: '긴 이름표의 줄임 처리를 확인하는 표현 샘플', text: '이미지가 없어도 장면을 표시합니다. 긴 선택지는 작은 화면에서도 줄바꿈됩니다.', characters: [{ id: 'left', name: '왼쪽 레이어', position: 'left', pose: 'lean' }, { id: 'right', name: '오른쪽 레이어', position: 'right', pose: 'back' }], choices: [{ id: 'cg', text: 'CG 프레임과 화면 전환을 확인한다.' }, { id: 'restart', text: '처음부터 다시 확인한다.' }, { id: 'disabled', text: '비활성 선택지 예시', disabled: true }] },
  { id: 'cg', text: 'CG 이미지가 없는 경우에도 제목과 대화창을 유지합니다.', cg: { title: 'CG 표시 영역' }, characters: [], effect: 'fade' },
]
export function MockSceneScreen() {
  const [index, setIndex] = useState(0)
  const [instant, setInstant] = useState(false)
  return <div className="app-root">
    <header className="presentation-toolbar"><strong>UI 기술 자산 데모</strong><label><input type="checkbox" checked={instant} onChange={e => setInstant(e.target.checked)} /> 즉시 표시</label><button className="btn" onClick={() => setIndex(0)}>처음으로</button></header>
    <SceneRenderer scene={frames[index]} instant={instant} onAdvance={() => setIndex(i => (i + 1) % frames.length)} onChoose={id => setIndex(id === 'cg' ? 2 : 0)} />
  </div>
}
