# Asset Manifest Spec
Status: DRAFT / NOT APPROVED
문서 제안이며 타입·JSON 스키마·Resolver·자동화 구현 승인이 아니다.

## 개념 필드(실행 스키마 아님)
id, revision, kind, character, appearance, outfit, expression, pose, gaze,
target constraints, file/layers, canvas, anchor, z-order, compatibility group,
mirrorAllowed, status, referenceRevision, checksum, license/provenance, review record.
특정 target 인물에 고정된 이미지와 방향성 이미지의 gaze 메타데이터를 구분한다.

## 상태
planned → generating → review → approved → deprecated.
반려 시 review에서 generating으로 돌아가되 이력·사유 보존.
파일 존재 여부와 상태는 별개. approved인데 파일/해시가 없으면 오류.
생성 중 파일을 자동 승인하지 않는다. deprecated는 기본 후보에서 제외한다.

## 레이어 합성
공통 캔버스·앵커·호환 그룹·가림 순서가 같은 레이어만 합성.
몸체/얼굴/눈/입의 의상·외형·reference revision이 다르면 차단.
현 UI ImageLayers는 여러 완성 이미지의 화면 배치다. 얼굴/눈 정합 합성기 구현과 다르다.

## 결정성·fallback
같은 manifest revision과 표현 요청이면 같은 결과가 필요하다.
approved exact match → 같은 공개 외형/의상의 허용 중립 변형 → 안전 placeholder.
타깃·외형 비밀·의상 연속성을 깨는 fallback은 실패로 분류한다.
미등록/중복 ID, 잘못된 상태 전이, 파일 누락, 경로 탈출, 절대경로, alias 순환은 QA 오류 후보.
