# 마크다운 뷰어 검증

## 목적

마크다운 뷰어 HTML 페이지들이 필수 라이브러리(marked, mermaid, KaTeX)를 로드하고, TOC 네비게이션이 정상 동작하며, index.html에 등록되어 있는지 검증한다.

## 실행 시점

- 마크다운 뷰어 HTML 페이지를 추가하거나 수정한 후
- `/verify-implementation` 실행 시 자동 포함

## Workflow

### Check 1: 마크다운 렌더링 라이브러리 로드 여부

**도구:** Grep
**대상:** `Phase*/**/*.html` 중 `marked` 를 사용하는 파일
**방법:**
1. `marked.min.js` 또는 `marked.js` 를 로드하는 `<script>` 태그가 존재하는지 확인
2. `marked.parse` 또는 `marked(` 호출이 존재하는지 확인

**PASS 기준:** marked 라이브러리를 로드하고 실제로 호출하는 코드가 존재
**FAIL 시:**
- 파일 경로
- 누락된 항목: `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>` 추가 필요

### Check 2: Mermaid 다이어그램 지원

**도구:** Grep
**대상:** Check 1에서 찾은 동일 파일들
**방법:**
1. `mermaid.min.js` 또는 `mermaid.js` 를 로드하는 `<script>` 태그가 존재하는지 확인
2. `mermaid.initialize` 호출이 존재하는지 확인
3. 마크다운 소스에 `` ```mermaid `` 코드 블록이 있는 경우 렌더러에서 `class="mermaid"` div로 변환하는 로직이 있는지 확인

**PASS 기준:** mermaid 라이브러리 로드 + initialize 호출 + 코드 블록 변환 로직 존재
**FAIL 시:**
- 파일 경로
- 누락된 항목 상세

### Check 3: KaTeX 수식 지원 (선택)

**도구:** Grep
**대상:** Check 1에서 찾은 동일 파일들
**방법:**
1. 마크다운 소스에 `$...$` 패턴의 수식이 포함되어 있는지 확인
2. 수식이 있는 경우 `katex.min.js` 와 `katex.min.css` 를 로드하는지 확인
3. `katex.renderToString` 호출이 존재하는지 확인

**PASS 기준:** 수식이 있으면 KaTeX 로드 + 렌더링 코드 존재. 수식이 없으면 SKIP
**FAIL 시:**
- 파일 경로
- 수식이 포함되었으나 KaTeX가 로드되지 않음

### Check 4: TOC 네비게이션 동작

**도구:** Grep
**대상:** Check 1에서 찾은 동일 파일들
**방법:**
1. TOC를 생성하는 `buildTOC` 또는 유사 함수가 존재하는지 확인
2. TOC 항목 클릭 시 `scrollIntoView` 또는 앵커 이동 코드가 있는지 확인
3. 클릭 시 활성 상태(`active` 클래스)를 설정하는 코드가 있는지 확인

**PASS 기준:** TOC 생성 + 클릭 이동 + 활성 상태 설정 코드 모두 존재
**FAIL 시:**
- 파일 경로
- 누락된 기능 상세

### Check 5: index.html PAGES 배열 등록

**도구:** Read (index.html), Glob
**방법:**
1. Check 1에서 찾은 마크다운 뷰어 파일이 `index.html`의 PAGES 배열에 등록되어 있는지 확인

**PASS 기준:** 모든 마크다운 뷰어 파일이 PAGES에 등록
**FAIL 시:** 미등록 파일 경로 — PAGES 배열에 추가 권장

## Exceptions

다음은 **문제가 아닙니다:**

1. **KaTeX가 없는 마크다운 뷰어** — 수식(`$...$`)이 포함되지 않은 경우 KaTeX 미로드는 정상
2. **Mermaid가 없는 마크다운 뷰어** — `` ```mermaid `` 블록이 없는 경우 mermaid 미로드는 정상
3. **TOC가 없는 단순 마크다운** — 섹션이 3개 미만인 짧은 문서는 TOC 불필요
4. **`shared/` 디렉토리의 파일** — 유틸리티 페이지는 검증 대상 아님

## Related Files

| File | Purpose |
|------|---------|
| `index.html` | 메인 네비게이터 (PAGES 배열) |
| `Phase*/**/*.html` | 검증 대상 마크다운 뷰어 페이지 |
