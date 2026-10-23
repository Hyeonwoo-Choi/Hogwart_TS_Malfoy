# 에셋 교체 방법
1. 이미지를 `public/assets/char/` (캐릭터, 투명 PNG/WebP 권장) 또는 `public/assets/bg/` (배경) 에 넣습니다.
2. `public/assets/manifest.json` 의 `assets` 배열에 항목을 추가합니다.

    { "id": "char.draco.smirk", "kind": "char", "status": "final", "path": "/assets/char/draco_smirk.png" }

3. 브라우저를 새로고침하면 반영됩니다(재빌드 불필요). 파일이 없으면 자동으로 플레이스홀더로 돌아갑니다.

ID 규칙: 배경 `bg.<id>` / 캐릭터 `char.<인물>.<표정>`.
드레이코 표정: calm blank smirk interest flustered angry anxious sad resolve smile.
