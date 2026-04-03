# CaseLink MVP HTML

학원 운영 관리 프로토타입. 순수 HTML/CSS/JS 단일 파일 구조로, 각 Phase별 HTML이 독립적으로 동작한다.

## 프로젝트 구조

```
caselink-mvp-html/
├── index.html                  # 메인 네비게이터 (LLM 설정 UI 포함)
├── config.json                 # LLM Provider/모델/옵션 정의
├── shared/
│   ├── llm.js                  # 공통 LLM 모듈 (모든 HTML이 의존)
│   └── llm-test.html           # LLM 모듈 통합 테스트 (82 tests)
├── Phase0/                     # Phase 0 HTML 페이지들
│   └── 260331_퇴원예방서비스.html
├── Phase1/                     # Phase 1 HTML 페이지들
│   └── 260403_강사용UI.html
├── start.sh                    # 로컬 개발 서버 시작
└── stop.sh                     # 로컬 개발 서버 중지
```

## 로컬 실행

```bash
./start.sh          # 기본 포트 8080
./start.sh 3000     # 커스텀 포트
./stop.sh           # 서버 중지
```

## LLM 아키텍처

### 핵심 원칙

**모든 LLM 관련 로직은 `shared/llm.js` 하나에서 관리한다.**

- HTML 파일에 LLM 함수를 직접 구현하지 않는다
- Provider 추가/수정은 `shared/llm.js`와 `config.json`만 수정한다
- 각 HTML은 `<script src>` 로 공통 모듈을 로드하고, 제공된 함수만 호출한다

### shared/llm.js — 공통 LLM 모듈

| 함수 | 용도 |
|------|------|
| `setCookie(name, value, days)` | 쿠키 저장 |
| `getCookie(name)` | 쿠키 읽기 |
| `getLLMConfig()` | 쿠키에서 LLM 설정 객체 반환 |
| `saveLLMConfig(cfg)` | LLM 설정 객체를 쿠키에 저장 |
| `getActiveLLM()` | 현재 활성 Provider의 `{provider, apiKey, model, options}` 반환. 미설정 시 `null` |
| `callLLM(provider, apiKey, prompt, model, systemPrompt, opts)` | 4개 Provider 통합 API 호출 |
| `loadLLMProviders(configPath)` | config.json 로드 → `LLM_PROVIDERS` 전역 세팅 |

모든 함수는 `window` 전역에 노출되어 후속 `<script>` 블록에서 바로 사용 가능하다.

### config.json — Provider/모델/옵션 정의

```json
{
  "defaultProvider": "gemini",
  "providers": {
    "gemini": {
      "label": "Google Gemini",
      "icon": "G",
      "models": ["gemini-3-flash-preview", "gemini-2.5-flash", ...],
      "defaultModel": "gemini-3.1-flash-lite-preview",
      "options": [
        { "key": "temperature", "label": "Temperature", "type": "range", "min": 0, "max": 2, "step": 0.1, "default": 1, "tooltip": "..." },
        { "key": "maxOutputTokens", ... },
        { "key": "topP", ... },
        { "key": "topK", ... }
      ]
    },
    "anthropic": { ... },
    "openai": { ... },
    "zai": { ... }
  }
}
```

**Provider 추가 시 수정 파일:**
1. `config.json` — 새 Provider 항목 추가 (label, icon, models, options)
2. `shared/llm.js` — `callLLM()` 함수에 새 `else if` 분기 추가

### LLM 설정 저장 구조 (쿠키)

쿠키명: `caselink_llm`. 구조:

```json
{
  "_activeProvider": "gemini",
  "gemini": {
    "apiKey": "AIza...",
    "model": "gemini-2.5-flash",
    "options": { "temperature": 0.7, "maxOutputTokens": 4096 }
  },
  "anthropic": {
    "apiKey": "sk-ant-...",
    "model": "claude-sonnet-4-6",
    "options": { "temperature": 0.5 }
  }
}
```

- `_activeProvider` — 현재 사용 중인 Provider 키
- 각 Provider별로 `apiKey`, `model`, `options` 저장
- `index.html`의 설정 UI에서 저장 → 모든 서브 페이지에서 `getActiveLLM()`으로 읽기

### 각 HTML 페이지의 역할

| 파일 | LLM 역할 |
|------|----------|
| `index.html` | 설정 UI (`openSettings`, `saveSettings`) + `loadLLMProviders()` 호출 |
| 서브 페이지들 | `getActiveLLM()` → `callLLM()` 호출만 (설정 UI 없음) |

## 새 HTML 페이지 추가 가이드

### 1. shared/llm.js 로드

```html
<!-- Phase 하위 디렉토리에서 -->
<script src="../shared/llm.js"></script>
<script>
// 이후 getActiveLLM(), callLLM() 등 바로 사용 가능
</script>
```

루트에 위치하면 `src="shared/llm.js"`.

### 2. LLM 호출 패턴

```javascript
async function doAnalysis() {
  var llm = getActiveLLM();
  if (!llm) {
    alert('LLM API 설정이 필요합니다. 메인 페이지 > LLM API 설정');
    return;
  }

  try {
    var result = await callLLM(
      llm.provider,
      llm.apiKey,
      '분석해주세요: ' + data,     // prompt
      llm.model,
      '당신은 학원 AI 도우미입니다.',  // systemPrompt (선택)
      llm.options                    // temperature, max_tokens 등
    );
    // result는 AI 응답 텍스트
    console.log(result);
  } catch (e) {
    alert('AI 분석 실패: ' + e.message);
  }
}
```

### 3. 금지 사항

- HTML 파일 내에 `getCookie`, `getLLMConfig`, `getActiveLLM`, `callLLM` 함수를 직접 구현하지 않는다
- fetch로 AI API를 직접 호출하지 않는다 — 반드시 `callLLM()`을 경유한다
- API 키를 하드코딩하지 않는다 — 쿠키 기반 설정만 사용한다

## Provider별 callLLM 옵션 키 매핑

각 Provider의 API가 다른 파라미터명을 사용하므로, `options` 객체의 키가 다르다:

| 용도 | Gemini | Anthropic | OpenAI | Z.ai |
|------|--------|-----------|--------|------|
| 최대 출력 토큰 | `maxOutputTokens` | `max_tokens` | `max_completion_tokens` | `max_tokens` |
| 온도 | `temperature` | `temperature` | `temperature` | `temperature` |
| Top P | `topP` | `top_p` | `top_p` | `top_p` |
| Top K | `topK` | `top_k` | — | — |
| 빈도 패널티 | — | — | `frequency_penalty` | — |
| 존재 패널티 | — | — | `presence_penalty` | — |

`config.json`의 각 Provider `options` 배열에 `key` 필드가 해당 Provider의 API 파라미터명과 일치해야 한다.

## 테스트

```bash
./start.sh
# 브라우저에서 http://localhost:8080/shared/llm-test.html 열기
# "Run All Tests" 클릭 → 82개 테스트 전체 PASS 확인
```

테스트 커버리지:
- 쿠키 CRUD (한국어, JSON 포함)
- LLM Config 저장/로드/멀티 Provider
- `getActiveLLM()` Provider 전환, null 반환
- `callLLM()` 4개 Provider request body 검증 (fetch mock)
- `loadLLMProviders()` config.json 로드/실패 fallback
- 통합 플로우 (설정 저장 → 크로스 페이지 읽기)
