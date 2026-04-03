# URL 라우팅 검증

## 목적

caselink-mvp-html 프로젝트의 모든 HTML 페이지에서 메뉴/탭 전환 시 URL hash가 올바르게 변경되는지 검증한다. 브라우저 뒤로가기, URL 공유, 새로고침 시 섹션 복원이 정상 동작하는지 확인한다.

## 실행 시점

- 새 HTML 페이지를 추가한 후
- 기존 HTML의 메뉴/탭을 수정한 후
- `/verify-implementation` 실행 시 자동 포함

## Workflow

### Check 1: goPage 함수에 hash 업데이트 존재 여부

**도구:** Grep
**대상:** `caselink-mvp-html/Phase*/**/*.html`
**방법:**
1. `function goPage` 가 정의된 모든 HTML 파일을 찾는다
2. 해당 파일에서 `history.replaceState` 또는 `history.pushState` 가 `goPage` 함수 내에 존재하는지 확인한다
3. hash 업데이트 코드가 없는 파일을 FAIL로 기록한다

**PASS 기준:** `goPage`를 정의한 모든 HTML 파일에 `history.replaceState(null,'','#'+id)` 또는 동등한 hash 업데이트 코드가 존재
**FAIL 시:**
- 파일 경로 및 `goPage` 함수 라인 번호
- 누락된 코드: `history.replaceState(null,'','#'+id)` 추가 필요

### Check 2: 페이지 로드 시 hash 복원 로직 존재 여부

**도구:** Grep
**대상:** Check 1에서 찾은 동일 파일들
**방법:**
1. `location.hash` 를 읽어서 초기 섹션을 복원하는 IIFE가 존재하는지 확인
2. `goPage(h, true)` 또는 `goPage(s, true)` 형태의 skipHash=true 호출이 존재하는지 확인

**PASS 기준:** 각 파일에 hash 파싱 → goPage 호출 로직이 존재
**FAIL 시:**
- 파일 경로
- 누락된 코드 블록 제시:
```javascript
(function(){
  var h=location.hash.replace('#','');
  if(h&&pages.indexOf(h)!==-1){goPage(h,true);return;}
  var p=new URLSearchParams(location.search);
  var s=p.get('section');
  if(s&&pages.indexOf(s)!==-1)goPage(s,true);
})();
```

### Check 3: hashchange 이벤트 리스너 존재 여부

**도구:** Grep
**대상:** Check 1에서 찾은 동일 파일들
**방법:**
1. `addEventListener('hashchange'` 가 존재하는지 확인
2. hashchange 핸들러 내에서 `goPage` 를 호출하는지 확인

**PASS 기준:** hashchange 리스너가 등록되어 있고 goPage를 호출
**FAIL 시:**
- 파일 경로
- 누락된 코드:
```javascript
window.addEventListener('hashchange',function(){
  var h=location.hash.replace('#','');
  if(h&&pages.indexOf(h)!==-1)goPage(h,true);
});
```

### Check 4: postMessage를 통한 parent 연동

**도구:** Grep
**대상:** Check 1에서 찾은 동일 파일들
**방법:**
1. `window.parent.postMessage` 호출이 goPage 함수 내에 존재하는지 확인
2. `{type:'section-change', section:id}` 형태의 메시지를 전송하는지 확인

**PASS 기준:** postMessage 호출이 존재하고 올바른 메시지 형식을 사용
**FAIL 시:**
- 파일 경로
- 누락된 코드: `try{window.parent.postMessage({type:'section-change',section:id},'*');}catch(e){}`

### Check 5: index.html PAGES 배열과 실제 파일 동기화

**도구:** Read (index.html), Glob (Phase*/*.html)
**방법:**
1. `index.html`의 PAGES 배열에서 `file:` 값을 모두 추출
2. `Phase*/**/*.html` glob으로 실제 파일 목록을 수집
3. PAGES에 등록되지 않은 HTML 파일이 있으면 WARN
4. PAGES에 등록되었지만 파일이 존재하지 않으면 FAIL

**PASS 기준:** PAGES 배열과 실제 파일이 1:1 대응
**WARN 시:** 미등록 파일 목록 제시 — index.html PAGES 배열에 추가 권장
**FAIL 시:** 존재하지 않는 파일 경로 — PAGES 배열에서 제거 또는 파일 생성 필요

### Check 6: 브라우저 실행 검증 (선택)

**도구:** Bash (browse tool)
**조건:** 로컬 서버가 실행 중인 경우에만 수행
**방법:**
1. `http://localhost:8080` 접속 가능 여부 확인
2. 접속 가능하면 각 HTML 페이지를 열어 메뉴 클릭 시 hash 변경 확인
3. 접속 불가능하면 이 Check를 SKIP 처리

**PASS 기준:** 메뉴 클릭 후 `location.hash`가 해당 섹션 ID와 일치
**SKIP 시:** "로컬 서버 미실행 — `./start.sh`로 서버를 시작한 후 재검증하세요"

## Exceptions

다음은 **문제가 아닙니다:**

1. **`index.html` 자체** — index.html은 iframe 호스트이므로 goPage가 없어도 정상 (자체 라우팅은 `loadPage` + `loadFromHash`로 처리)
2. **`shared/` 디렉토리의 파일** — llm-test.html 등 유틸리티 페이지는 메뉴 라우팅 불필요
3. **goPage가 없는 단순 페이지** — 사이드바 메뉴가 없는 단일 뷰 페이지는 hash 라우팅 불필요
4. **`?section=xxx` 쿼리 파라미터** — hash 라우팅의 fallback으로 허용 (둘 다 있는 것이 이상적)

## Related Files

| File | Purpose |
|------|---------|
| `caselink-mvp-html/CLAUDE.md` | URL 기반 네비게이션 필수 규칙 정의 |
| `caselink-mvp-html/index.html` | 메인 네비게이터 (PAGES 배열, loadPage, postMessage 수신) |
| `caselink-mvp-html/Phase*/**/*.html` | 검증 대상 HTML 페이지들 |
