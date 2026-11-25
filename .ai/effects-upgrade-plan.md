# 효과 업그레이드 설계안 · Claude Code × Codex · 2026-11-25

## 확인 범위

- Aside의 [Shaders Vibrant Stream 편집기](https://shaders.com/design-editor/07f25f5e-d447-407b-b70e-e0d88af3af12)는 Glass, CursorRipples, MeshGradient가 겹친 푸른 유리 데모다. 색과 형태를 복제하지 않고 느린 유동과 국소 반응만 참고한다.
- Aside의 Spline 탭은 가입 화면이고 Framer 탭은 빈 Home 캔버스였다. 실제 3D 씬이나 완성된 Framer 모션을 관찰한 것으로 간주하지 않는다. [Spline Code export](https://docs.spline.design/exporting-your-scene/web/exporting-as-code)와 [Framer 상태 전환](https://www.framer.com/academy/lessons/component-variants-in-framer)은 가능성만 검토했다.
- 현재 사이트는 바닐라 JS, CSS, Leaflet과 사진 기반 료칸 장면이다. 프레임 성능 실측 전이며 WebKit도 미검증이다.

## 채택할 방향

1. **현 선택 → 온천 배너: 종이 아래에서 올라오는 얇은 증기.** 현 클릭 후 지도 확대가 진행되는 약 0.8초 동안 보드 아래에 낮은 대비의 크림색 증기가 짧게 지나가고 배너의 사진에 이어진다. `web/map-explore.js`의 `leave()`/`dismissBanner()` 상태에 연결하고 `web/map-experience.css`에 한 레이어를 추가한다. 움직이는 속성은 `transform`과 `opacity`만 사용하며 기존 전체 화면 blur는 줄인다. 배너 내용과 지도 클릭 영역을 가리지 않는다.
2. **문 개방: 문틈과 바닥에 따뜻한 투과광.** `web/intro.js`의 문 안쪽에 장식 요소 하나를 넣고, `web/experience.css`에서 쇼지문 개방 구간에만 약한 호박색 빛을 보인다. 사진의 기존 조명과 겹쳐 과장되지 않도록 최대 알파를 화면에서 조정한다.
3. **선택형: 지도 위 국소적인 등불빛과 단일 물결.** 마우스에서만 종이 위 등불빛이 아주 약하게 따라오고, 현/지역 선택 한 번에 0.7초짜리 물결 하나를 표시한다. `web/map-explore.js`는 포인터 위치를 `requestAnimationFrame`당 한 번만 갱신하고 `web/map-experience.css`는 반응만 그린다. 지도 글자 대비 또는 프레임 시간이 악화되면 이 효과는 제외한다.

## 구현과 검증 순서

- 먼저 효과별로 정지 전후 상태를 정의하고 문 개방, 현 선택, 배너 표시의 시간축을 맞춘다. 한 장면에 움직이는 강조 효과는 하나만 둔다.
- 새 네트워크 에셋 0개, 추가 합성 레이어 동시 3개 이하를 **목표**로 잡는다. 수치 성능은 구현 후 Chromium·WebKit의 데스크톱 1440×900과 모바일 390×844에서 측정한다.
- `prefers-reduced-motion`에서는 증기를 짧은 불투명도 변화로 바꾸고 포인터 빛·물결을 끈다. 터치에서는 포인터 추적을 끈다. 숨은 탭에서 반복 애니메이션을 멈춘다.
- 문 개방, 지도 펼침, 현 클릭, 배너 최종 상태를 프레임 캡처해 좌표와 가독성을 확인하고, 클릭·키보드·뒤로 가기를 재검증한다.

## 보류

- [Shaders](https://static.shaders.com/docs/guide/hooks-events)는 WebGPU 전용이라 GPU를 쓸 수 없는 브라우저의 폴백이 필수다. 현재 계획은 그 런타임 없이 CSS로 구현한다.
- 실제 확인된 Spline 씬이 없어 임베드나 런타임을 넣지 않는다. 나중에 진짜 료칸 씬을 제작한다면 문/창밖 배경만 작은 수직 프로토타입으로 비교한다. [Spline의 최적화 지침](https://docs.spline.design/exporting-your-scene/how-to-optimize-your-scene)에 따라 객체·텍스처·조명을 줄여야 한다.
- 빈 Framer 프로젝트로 옮기지 않는다. [Framer의 모션 원칙](https://www.framer.com/help/articles/how-animations-and-effects-work-in-framer/)만 기존 상태 클래스와 CSS 전환에 적용한다. 전체 화면 Glass, 파랑·보라 그라디언트, 지도 왜곡, 과도한 스크롤 애니메이션은 제외한다.
