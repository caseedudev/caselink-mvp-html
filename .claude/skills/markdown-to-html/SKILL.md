---
name: markdown-to-html
description: 마크다운(.md) 문서를 CaseLink 스타일의 HTML 뷰어 페이지로 변환합니다. marked.js, mermaid.js, KaTeX를 포함한 풀 렌더링 뷰어를 생성합니다. 마크다운을 HTML로 변환, 문서를 웹에서 보기, md 파일을 Phase에 추가, 마크다운 뷰어 생성 등의 요청 시 사용하세요. docs/ 디렉토리의 .md 파일을 언급하거나 마크다운 문서의 HTML 버전이 필요할 때도 트리거됩니다.
argument-hint: "<마크다운 파일 경로>"
---

# 마크다운 → HTML 뷰어 변환

마크다운 문서를 CaseLink 프로젝트의 디자인 시스템에 맞는 HTML 뷰어 페이지로 변환합니다.

## 생성되는 HTML 뷰어의 기능

- **marked.js** — 마크다운 → HTML 렌더링 (GFM 테이블, 코드 블록)
- **mermaid.js** — ` ```mermaid ` 코드 블록을 다이어그램으로 렌더링
- **KaTeX** — `$...$` 인라인 수식 렌더링
- **TOC 사이드바** — h2 기반 목차 자동 생성, 클릭 이동, 스크롤 하이라이트
- **커버 헤더** — CaseLink 스타일 네이비 커버 (제목, 설명, 메타 정보)
- **반응형** — 모바일에서 TOC 숨김, 폰트/패딩 조정
- **스크롤 투 탑** — 하단 고정 버튼

## Workflow

### Step 1: 마크다운 파일 읽기

사용자가 지정한 `.md` 파일을 Read로 읽는다.

### Step 2: 문서 메타 정보 추출

마크다운 내용에서 다음을 파악한다:
- **제목**: 첫 번째 `# ` 헤딩 또는 파일명에서 추출
- **설명**: 첫 단락 또는 문서 개요에서 2-3줄 추출
- **메타 항목**: 버전, 작성일, 분류 등 (테이블이나 YAML frontmatter에서)
- **Phase 번호**: 파일 경로 또는 사용자 지정에서 결정

### Step 3: HTML 파일 생성

아래 템플릿 구조에 따라 HTML 파일을 생성한다.

#### 파일명 규칙

`Phase{N}/YYMMDD_{제목요약}.html`

예: `docs/requirements/260408_퇴원경고.md` → `Phase1/260408_퇴원경고_알고리즘명세.html`

#### HTML 구조

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>CaseLink — {문서 제목}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<style>
  /* CaseLink 디자인 시스템 CSS — 아래 스타일 가이드 참조 */
</style>
</head>
<body>
  <!-- 1. 커버 -->
  <div class="cover">...</div>
  <!-- 2. 레이아웃: TOC + 콘텐츠 -->
  <div class="layout">
    <nav class="toc-sidebar" id="toc"></nav>
    <div class="content">
      <div class="md-body" id="md-content"></div>
    </div>
  </div>
  <!-- 3. 스크롤 투 탑 -->
  <button class="scroll-top" id="scrollTop">↑</button>
  <!-- 4. 스크립트 -->
  <script>
    var MD_SOURCE = `{마크다운 내용}`;
    // 렌더링 + TOC 빌드 + mermaid init
  </script>
</body>
</html>
```

### Step 4: 마크다운 내용 임베딩 시 주의사항

마크다운 소스를 JS 템플릿 리터럴(`` ` ``)에 넣을 때:
- 백틱(`` ` ``)은 `\`` `으로 이스케이프
- `${` 는 `\${`로 이스케이프
- `\n`은 그대로 유지 (템플릿 리터럴은 멀티라인 지원)
- 마크다운 내 `[` `]` 가 heading에 있으면 `\[` `\]`로 이스케이프

### Step 5: 렌더링 스크립트 필수 요소

```javascript
// 1. marked 렌더러 커스터마이징 — mermaid 코드 블록 처리
var renderer = new marked.Renderer();
renderer.code = function(obj) {
  var text = obj.text || obj;
  var lang = obj.lang || '';
  if(lang === 'mermaid'){
    return '<div class="mermaid">' + text + '</div>';
  }
  return '<pre><code>' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</code></pre>';
};

// 2. marked 파싱
var html = marked.parse(MD_SOURCE);

// 3. KaTeX 인라인 수식 처리 ($...$)
html = html.replace(/\$([^$]+)\$/g, function(m, tex){
  try { return katex.renderToString(tex, {throwOnError:false}); }
  catch(e){ return m; }
});

// 4. DOM 삽입
document.getElementById('md-content').innerHTML = html;

// 5. mermaid 초기화
mermaid.initialize({ startOnLoad: true, theme: 'base', ... });

// 6. TOC 빌드 — h2 기반, 클릭 시 scrollIntoView + active 클래스
buildTOC();
```

### Step 6: TOC 빌드 필수 패턴

TOC가 정상 동작하려면 두 가지 메커니즘이 필요하다:

```javascript
// 1. 클릭 핸들러 — 즉시 활성 상태 설정
link.addEventListener('click', function(e){
  e.preventDefault();
  links.forEach(function(l){ l.classList.remove('active'); });
  this.classList.add('active');
  target.scrollIntoView({behavior:'smooth', block:'start'});
});

// 2. IntersectionObserver — 스크롤 시 활성 상태 자동 업데이트
var observer = new IntersectionObserver(function(entries){
  entries.forEach(function(entry){
    if(entry.isIntersecting){
      // active 클래스 전환
    }
  });
}, {rootMargin:'0px 0px -60% 0px', threshold:0.1});
```

클릭 핸들러 없이 IntersectionObserver만 사용하면, 빠른 스크롤 시 활성 항목이 업데이트되지 않는 버그가 발생한다.

### Step 7: index.html 등록

생성된 HTML 파일을 `index.html`의 PAGES 배열에 추가한다:

```javascript
{ phase: N, date: "YYMMDD", title: "문서 제목", file: "PhaseN/YYMMDD_파일명.html" },
```

### Step 8: 검증

1. 로컬 서버에서 페이지 접근 가능 확인 (200 OK)
2. JS 콘솔 에러 없음 확인
3. mermaid 다이어그램 렌더링 확인 (SVG 생성)
4. KaTeX 수식 렌더링 확인 (수식이 있는 경우)
5. TOC 클릭 시 스크롤 이동 + 활성 항목 변경 확인
6. index.html에서 페이지 선택 가능 확인

## 스타일 가이드 (CSS 변수)

CaseLink 디자인 시스템의 핵심 변수:

```css
--navy:#0B1E3D;  --navy2:#142952;
--blue:#1E6FD9;  --blue-l:#EBF3FF;
--teal:#0A9268;  --teal-l:#E3F6EF;
--amber:#C97008; --amber-l:#FEF3C7;
--red:#C8220E;   --red-l:#FEE2E2;
--purple:#6B2FBA; --purple-l:#F0E9FF;
--g50:#F7F8FA;   --g100:#EEF0F4;  --g150:#E4E7ED;
--g200:#D6DAE3;  --g500:#737D90;  --g800:#252B36;
--white:#FFFFFF;
```

- 커버 배경: `var(--navy)`
- 커버 제목 강조: `#7AB3F5`
- 테이블: 흰 배경 + `var(--g150)` 보더 + 라운드 10px
- 코드 블록: `#0F1A2E` 배경 + `JetBrains Mono`
- 본문 폰트: `Noto Sans KR` 15px

## Mermaid 다이어그램 보강

원본 마크다운에 mermaid 다이어그램이 없더라도, 문서의 내용을 분석하여 적절한 다이어그램을 추가할 수 있다:

- **시스템 아키텍처** → `graph TB` (top-bottom 플로우)
- **프로세스 흐름** → `flowchart LR` (left-right 플로우)
- **타임라인** → `timeline`
- **데이터 흐름** → `flowchart TB` with subgraphs

Mermaid 노드 스타일은 CaseLink 색상 체계를 따른다:
```
style 노드명 fill:#EBF3FF,stroke:#1E6FD9  (파란색 — 정보/입력)
style 노드명 fill:#E3F6EF,stroke:#0A9268  (초록색 — 성공/완료)
style 노드명 fill:#FEF3C7,stroke:#C97008  (주황색 — 주의/처리중)
style 노드명 fill:#FEE2E2,stroke:#C8220E  (빨간색 — 위험/경고)
```

## 금지사항

- 마크다운 원본 파일을 수정하지 않는다
- 외부 빌드 도구(webpack, vite 등)를 사용하지 않는다 — 순수 CDN + 인라인 스크립트
- `shared/llm.js`를 로드하지 않는다 — 문서형 페이지에 LLM 기능 불필요
- goPage/hash 라우팅을 추가하지 않는다 — 사이드바 네비게이션 없는 문서형 페이지
