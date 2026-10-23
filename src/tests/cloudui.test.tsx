import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { CloudController, cloud } from '../cloud/cloudStore'
import { AccountPanel } from '../ui/Account'
import { SaveLoad } from '../ui/Overlays'
import { STORAGE_PREFIX } from '../engine/env'
import { saveToSlot } from '../engine/save'
import { store } from '../engine/store'
import { play } from './helpers'
import { FakeCloud, FakeServer } from './fakeCloud'

beforeEach(() => { window.localStorage.clear(); store.toTitle() })
afterEach(() => cleanup())

const st = (seed = 1, k3 = 'D') => play({ 'K-03': k3 }, seed, { stopAt: (s) => s.scene === 'v2c1_routine' }).s
const mk = () => { const srv = new FakeServer(); const api = new FakeCloud(srv); const c = new CloudController(true, async () => api, 0); return { srv, api, c } }
const click = (id: string) => act(async () => { fireEvent.click(screen.getByTestId(id)) })

describe('클라우드 미설정(기본)', () => {
  it('환경변수가 없으면 계정·클라우드 UI가 보이지 않고 로컬 저장은 정상이다', () => {
    expect(cloud.enabled).toBe(false)
    render(<App />)
    expect(screen.queryByTestId('open-account-title')).toBeNull()
    act(() => { fireEvent.click(screen.getByTestId('new-game')) })
    act(() => { fireEvent.click(screen.getByTestId('btn-menu')) })
    expect(screen.queryByTestId('menu-account')).toBeNull()
    act(() => { fireEvent.click(screen.getByTestId('menu-save')) }); act(() => { fireEvent.click(screen.getByTestId('save-slot1')) })
    expect(window.localStorage.getItem(`${STORAGE_PREFIX}save:slot1`)).toBeTruthy()
    expect(screen.queryByTestId('cloud-head')).toBeNull()
    expect(Object.keys(window.localStorage).filter((k) => k.includes('cloud')).length).toBe(0)
  })
})

describe('계정 패널', () => {
  it('입력 검증 → 가입 → 로그인 상태 표시 → 로그아웃', async () => {
    const { c } = mk(); await c.init()
    render(<AccountPanel onClose={() => {}} controller={c} />)
    fireEvent.change(screen.getByTestId('acc-email'), { target: { value: 'not-an-email' } }); fireEvent.change(screen.getByTestId('acc-pw'), { target: { value: 'password1' } })
    await click('acc-submit'); expect(screen.getByTestId('acc-error').textContent).toContain('이메일 형식')
    fireEvent.change(screen.getByTestId('acc-email'), { target: { value: 'a@example.com' } }); fireEvent.change(screen.getByTestId('acc-pw'), { target: { value: 'short' } })
    await click('acc-submit'); expect(screen.getByTestId('acc-error').textContent).toContain('8자')
    await click('tab-signup'); fireEvent.change(screen.getByTestId('acc-pw'), { target: { value: 'password1' } })
    await click('acc-submit')
    await waitFor(() => expect(screen.getByTestId('account-email').textContent).toBe('a@example.com'))
    await click('account-signout')
    await waitFor(() => expect(screen.getByTestId('tab-signin')).toBeTruthy())
  })
  it('틀린 비밀번호는 서버 오류 문구를 보여 주되 비밀번호 입력은 비워진다', async () => {
    const { c, api } = mk(); await c.init(); await api.signUp('a@example.com', 'password1'); await api.signOut()
    render(<AccountPanel onClose={() => {}} controller={c} />)
    fireEvent.change(screen.getByTestId('acc-email'), { target: { value: 'a@example.com' } }); fireEvent.change(screen.getByTestId('acc-pw'), { target: { value: 'wrong-password' } })
    await click('acc-submit')
    await waitFor(() => expect(screen.getByTestId('acc-error').textContent).toContain('올바르지'))
    expect((screen.getByTestId('acc-pw') as HTMLInputElement).value).toBe('')
  })
})

describe('저장 메뉴의 클라우드 행', () => {
  async function conflictSetup() {
    const m = mk(); await m.c.init(); await m.c.signUp('a@example.com', 'password1')
    saveToSlot('slot1', st(1, 'D'), new Set(['a'])); await m.c.pushSlot('slot1', 'normal')
    window.localStorage.removeItem(`${STORAGE_PREFIX}cloudmeta:${m.c.getSnapshot().user!.id}`)
    saveToSlot('slot1', st(2, 'A'), new Set(['b'])) // 서로 다른 내용
    await m.c.refresh()
    return m
  }
  it('로컬만 있는 슬롯은 "올리기" 버튼, 충돌 슬롯은 선택 버튼 두 개가 보인다', async () => {
    const m = mk(); await m.c.init(); await m.c.signUp('a@example.com', 'password1')
    saveToSlot('slot2', st(), new Set()); await m.c.refresh()
    render(<SaveLoad mode="save" canSave onClose={() => {}} controller={m.c} />)
    // useCloud는 기본 controller를 보므로 이 테스트는 주입된 c를 구독한다
    expect(screen.getByTestId('cloud-slot2').getAttribute('data-status')).toBe('local_only')
    await click('push-slot2'); await waitFor(() => expect(m.srv.rows.some((r) => r.slot === 'slot2')).toBe(true))
  })
  it('충돌: 첫 클릭은 확인 문구만 보여 주고 아무것도 바꾸지 않는다(2단계 확인)', async () => {
    const m = await conflictSetup()
    render(<SaveLoad mode="save" canSave onClose={() => {}} controller={m.c} />)
    expect(screen.getByTestId('cloud-slot1').getAttribute('data-status')).toBe('conflict')
    const before = JSON.stringify(m.srv.rows[0].state)
    await click('keeplocal-slot1')
    expect(screen.getByTestId('keeplocal-slot1').textContent).toContain('정말')
    expect(JSON.stringify(m.srv.rows[0].state)).toBe(before) // 아직 덮어쓰지 않음
    await click('keeplocal-slot1')
    await waitFor(() => expect(JSON.stringify(m.srv.rows[0].state)).not.toBe(before))
  })
  it('클라우드 삭제도 2단계 확인이며 로컬 슬롯은 남는다', async () => {
    const m = mk(); await m.c.init(); await m.c.signUp('a@example.com', 'password1')
    saveToSlot('slot3', st(), new Set()); await m.c.pushSlot('slot3', 'normal'); await m.c.refresh()
    render(<SaveLoad mode="save" canSave onClose={() => {}} controller={m.c} />)
    await click('del-slot3'); expect(m.srv.rows).toHaveLength(1)
    await click('del-slot3'); await waitFor(() => expect(m.srv.rows).toHaveLength(0))
    expect(window.localStorage.getItem(`${STORAGE_PREFIX}save:slot3`)).toBeTruthy()
  })
})
