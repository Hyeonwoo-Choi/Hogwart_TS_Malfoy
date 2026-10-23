import json, sys
from playwright.sync_api import sync_playwright
URL="http://localhost:5173/?debug=1"
VPS=[("mobile-portrait",390,844),("mobile-landscape",844,390),("tablet",768,1024),("laptop",1366,768),("desktop",1920,1080)]
res=[]; fails=[]
def ok(name,cond,detail=""):
    res.append((name,bool(cond),detail)); 
    if not cond: fails.append(name)
def rect(pg,sel):
    return pg.evaluate("""s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}}""",sel)
def to_choice(pg,limit=80):
    for _ in range(limit):
        if pg.query_selector('[data-testid=choices]'): return True
        pg.click('[data-testid=stage]', position={"x":5,"y":300 if False else 200}) if False else pg.keyboard.press('Enter')
        pg.wait_for_timeout(15)
    return False
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,w,h in VPS:
        ctx=b.new_context(viewport={"width":w,"height":h}, has_touch=name.startswith("mobile"))
        pg=ctx.new_page(); errs=[]
        pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None)
        pg.add_init_script("localStorage.setItem('hfd:settings', JSON.stringify({typing:'instant',autoSpeed:'normal',textSize:2,timer:'normal'}))")
        pg.goto(URL); pg.click('[data-testid=new-game]'); pg.wait_for_selector('[data-testid=dialogue]')
        # 지도 잠금(스토리 중)
        ok(f"{name}: 스토리 중 지도 없음", pg.query_selector('[data-testid=map]') is None)
        # 대사 화면 레이아웃
        for _ in range(6): pg.keyboard.press('Enter'); pg.wait_for_timeout(10)
        d=rect(pg,'[data-testid=dialogue]'); s=rect(pg,'[data-testid=sprite] svg') or rect(pg,'[data-testid=sprite]')
        ok(f"{name}: 대사창이 화면 안에 있음", d and d['l']>=-1 and d['r']<=w+1 and d['b']<=h+1, str(d))
        ok(f"{name}: 캐릭터가 대사창에 가려지지 않음", (s is None) or s['b']<=d['t']+2, f"sprite.b={s and s['b']:.0f} dlg.t={d['t']:.0f}")
        ok(f"{name}: 가로 스크롤 없음", pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        pg.screenshot(path=f"/tmp/shots/{name}-dialogue.png")
        # 선택지
        got=False
        for _ in range(60):
            if pg.query_selector('[data-testid=choices]'): got=True;break
            pg.keyboard.press('Enter'); pg.wait_for_timeout(10)
        ok(f"{name}: 선택지 도달", got)
        c=rect(pg,'[data-testid=choices]'); d=rect(pg,'[data-testid=dialogue]')
        ok(f"{name}: 선택지가 화면 안·대사창과 겹치지 않음", c['l']>=-1 and c['r']<=w+1 and c['t']>=0 and c['b']<=d['t']+1, f"choices={c['t']:.0f}-{c['b']:.0f} dlg.t={d['t']:.0f}")
        bt=pg.query_selector_all('.choice'); ok(f"{name}: 선택지 버튼 높이 ≥44px", all(x.bounding_box()['height']>=44 for x in bt))
        # 호버는 표정 불변
        before=pg.get_attribute('[data-testid=sprite]','data-expr'); pg.hover('[data-testid=choice-A]'); pg.wait_for_timeout(100)
        ok(f"{name}: 호버 시 표정 불변", pg.get_attribute('[data-testid=sprite]','data-expr')==before)
        pg.screenshot(path=f"/tmp/shots/{name}-choices.png")
        ok(f"{name}: 콘솔 오류 없음", not errs, "; ".join(errs)[:200])
        ctx.close()
    # 상세 시나리오 (laptop)
    ctx=b.new_context(viewport={"width":1366,"height":768}); pg=ctx.new_page()
    pg.add_init_script("if(!sessionStorage.getItem('init')){localStorage.setItem('hfd:settings', JSON.stringify({typing:'instant',autoSpeed:'normal',textSize:2,timer:'normal'}));sessionStorage.setItem('init','1')}")
    pg.goto(URL); pg.click('[data-testid=new-game]')
    # 클릭 진행/타이핑
    pg.evaluate("window.__hfd.store.jump('c1_potions')")
    for _ in range(40):
        if pg.query_selector('[data-testid=choices]'): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(10)
    ok("선택지 K-02에서 숨은 선택지(B) 미노출", pg.query_selector('[data-testid=choice-B]') is None and pg.query_selector('[data-testid=choice-A]') is not None)
    pg.click('[data-testid=choice-A]'); pg.wait_for_timeout(50)
    ok("클릭 후 표정 변경(interest)", pg.get_attribute('[data-testid=sprite]','data-expr')=='interest')
    # 저장 → 새로고침 → 불러오기
    state_before=pg.evaluate("JSON.stringify(window.__hfd.store.state)")
    pg.click('[data-testid=btn-menu]'); pg.click('[data-testid=menu-save]'); pg.click('[data-testid=save-slot1]'); pg.wait_for_timeout(50)
    pg.reload(); pg.wait_for_selector('[data-testid=title]')
    pg.click('[data-testid=open-load]'); pg.click('[data-testid=load-slot1]'); pg.wait_for_selector('[data-testid=dialogue]')
    state_after=pg.evaluate("JSON.stringify(window.__hfd.store.state)")
    ok("새로고침 후 불러오기 = 저장 시점과 동일 상태", state_before==state_after)
    # 이어하기(자동저장)
    pg.reload(); pg.wait_for_selector('[data-testid=title]')
    ok("자동 저장 이어하기 버튼 활성", pg.is_enabled('[data-testid=continue]'))
    # 내보내기/가져오기
    pg.click('[data-testid=continue]'); pg.wait_for_selector('[data-testid=dialogue]')
    pg.click('[data-testid=btn-menu]'); pg.click('[data-testid=menu-save]')
    with pg.expect_download() as dl: pg.click('[data-testid=export]')
    path=dl.value.path(); data=json.load(open(path)); ok("내보낸 파일이 유효한 저장 JSON", data['schemaVersion']==1 and 'state' in data)
    pg.keyboard.press('Escape')
    pg.click('[data-testid=btn-menu]'); pg.click('[data-testid=menu-title]'); pg.click('[data-testid=open-load]')
    pg.set_input_files('[data-testid=import-file]', path); pg.wait_for_selector('[data-testid=dialogue]')
    ok("가져오기로 상태 복원", pg.evaluate("window.__hfd.store.state.scene")==data['state']['scene'])
    # 자동 진행 중단
    pg.evaluate("window.__hfd.store.jump('c1_train')")
    n0=pg.evaluate("window.__hfd.store.state.choices.length")
    pg.click('[data-testid=btn-auto]')
    pg.wait_for_function("!!document.querySelector('[data-testid=choices]')", timeout=60000)
    sc=pg.evaluate("window.__hfd.store.state.idx"); pg.wait_for_timeout(5000)
    ok("자동 진행이 선택지에서 중단됨", pg.evaluate("window.__hfd.store.state.idx")==sc and pg.evaluate("window.__hfd.store.state.choices.length")==n0)
    # 일과: 지도 활성
    pg.evaluate("window.__hfd.store.jump('c1_routine')")
    for _ in range(5):
        if pg.query_selector('[data-testid=map]'): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(20)
    ok("일과 구간에서 지도 표시", pg.query_selector('[data-testid=map]') is not None)
    pg.screenshot(path="/tmp/shots/laptop-map.png")
    # 만남 이벤트 → 지도 잠금
    pg.click('[data-testid=loc-common]'); pg.click('[data-testid=act-rest]')
    pg.click('[data-testid=loc-courtyard]'); pg.click('[data-testid=act-talk]'); pg.wait_for_selector('[data-testid=dialogue]')
    ok("특별 이벤트 중 지도 잠금", pg.query_selector('[data-testid=map]') is None and pg.evaluate("window.__hfd.store.state.mode")=='EVENT')
    for _ in range(12):
        if pg.query_selector('[data-testid=map]'): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(20)
    ok("이벤트 종료 후 일과 복귀", pg.query_selector('[data-testid=map]') is not None)
    ctx.close()
    # 지도 반응형
    for name,w,h in VPS:
        ctx=b.new_context(viewport={"width":w,"height":h}); pg=ctx.new_page()
        pg.goto(URL); pg.click('[data-testid=new-game]'); pg.evaluate("window.__hfd.store.jump('c1_routine')")
        for _ in range(5):
            if pg.query_selector('[data-testid=map]'): break
            pg.keyboard.press('Enter'); pg.wait_for_timeout(20)
        ok(f"{name}: 지도 가로 스크롤 없음", pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        ok(f"{name}: 지도 장소 버튼 전부 화면 폭 안", pg.evaluate("[...document.querySelectorAll('.loc')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})"))
        ctx.close()
    # 에셋 교체
    ctx=b.new_context(viewport={"width":1366,"height":768}); pg=ctx.new_page(); logs=[]
    pg.on("console",lambda m: logs.append(m.text))
    pg.goto(URL); pg.click('[data-testid=new-game]'); pg.evaluate("window.__hfd.store.jump('c1_potions')")
    for _ in range(3): pg.keyboard.press('Enter'); pg.wait_for_timeout(10)
    ok("에셋 없을 때 플레이스홀더 표시", pg.get_attribute('[data-testid=sprite]','data-asset')=='placeholder')
    ctx.close()
    b.close()
w=max(len(n) for n,_,_ in res)
for n,c,d in res: print(("PASS " if c else "FAIL ")+n+("  ["+d+"]" if (not c and d) else ""))
print(f"\n{sum(1 for _,c,_ in res if c)}/{len(res)} passed"); sys.exit(1 if fails else 0)
