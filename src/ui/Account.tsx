import { useState } from 'react'
import { cloud, useCloud, type CloudController } from '../cloud/cloudStore'
import { Modal } from './Overlays'

/** 계정(이메일 로그인·가입·로그아웃). 클라우드가 설정되지 않았다면 렌더하지 않는다. */
export function AccountPanel({ onClose, controller = cloud }: { onClose: () => void; controller?: CloudController }) {
  const c = useCloud(controller)
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [local, setLocal] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setNote(null); setLocal(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setLocal('이메일 형식을 확인해 주세요.'); return }
    if (pw.length < 8) { setLocal('비밀번호는 8자 이상이어야 합니다.'); return }
    if (mode === 'up') {
      const r = await controller.signUp(email, pw)
      if (r.ok && r.needsConfirm) setNote('확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.')
    } else await controller.signIn(email, pw)
    setPw('')
  }

  return (
    <Modal title="계정" onClose={onClose}>
      <div data-testid="account">
        {c.status === 'signed_in' && c.user ? (
          <>
            <p>로그인됨: <strong data-testid="account-email">{c.user.email}</strong></p>
            <p className="muted small">저장을 클라우드에 올려 다른 기기에서 이어 할 수 있습니다. 비로그인 상태의 로컬 저장은 그대로 유지됩니다.</p>
            <div className="row">
              <button className="btn" onClick={() => void controller.refresh()} disabled={c.busy} data-testid="account-refresh">동기화 상태 새로고침</button>
              <button className="btn" onClick={() => void controller.signOut()} data-testid="account-signout">로그아웃</button>
            </div>
            <p className="muted small">로그아웃하면 이 기기의 동기화 정보(클라우드 캐시)가 지워집니다. 이 기기의 저장 슬롯은 지워지지 않습니다.</p>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="row">
              <button type="button" className={`btn${mode === 'in' ? ' primary' : ''}`} onClick={() => setMode('in')} data-testid="tab-signin">로그인</button>
              <button type="button" className={`btn${mode === 'up' ? ' primary' : ''}`} onClick={() => setMode('up')} data-testid="tab-signup">회원가입</button>
            </div>
            <label className="field"><span>이메일</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="acc-email" /></label>
            <label className="field"><span>비밀번호</span><input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} data-testid="acc-pw" /></label>
            <div className="row"><button className="btn primary" type="submit" disabled={c.busy} data-testid="acc-submit">{mode === 'in' ? '로그인' : '가입하기'}</button></div>
            <p className="muted small">계정 없이도 게임은 이 기기에 저장됩니다. 비밀번호는 서버(Supabase Auth)에만 전달되며 이 앱은 저장하지 않습니다.</p>
          </form>
        )}
        {note && <p role="status" data-testid="acc-note">{note}</p>}
        {(local || c.error) && <p className="error" role="alert" data-testid="acc-error">{local ?? c.error}</p>}
        {c.offline && <p className="muted small" data-testid="acc-offline">오프라인 상태로 보입니다. 게임과 로컬 저장은 계속 쓸 수 있습니다.</p>}
      </div>
    </Modal>
  )
}
