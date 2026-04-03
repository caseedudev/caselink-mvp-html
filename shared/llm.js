/**
 * CaseLink LLM 공통 모듈
 *
 * 모든 HTML 페이지에서 공유하는 LLM 관련 유틸리티입니다.
 * 사용법: <script src="(상대경로)/shared/llm.js"></script>
 *
 * 제공 함수:
 *   setCookie / getCookie          — 쿠키 읽기/쓰기
 *   getLLMConfig / saveLLMConfig    — LLM 설정 저장/불러오기 (쿠키 기반)
 *   getActiveLLM()                 — 현재 활성 Provider 정보 반환
 *   callLLM(provider,apiKey,prompt,model,systemPrompt,opts) — 통합 LLM API 호출
 *   loadLLMProviders(configPath)   — config.json에서 LLM_PROVIDERS 로드
 */

// ── 전역 상태 ──
var LLM_PROVIDERS = window.LLM_PROVIDERS || {};

// ── Cookie helpers ──
function setCookie(name, value, days) {
  var d = new Date();
  d.setTime(d.getTime() + (days || 365) * 24 * 60 * 60 * 1000);
  document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
}

function getCookie(name) {
  var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

// ── LLM Config (쿠키 기반 저장) ──
function getLLMConfig() {
  var raw = getCookie('caselink_llm');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

function saveLLMConfig(cfg) {
  setCookie('caselink_llm', JSON.stringify(cfg), 365);
}

// ── 활성 Provider 조회 ──
function getActiveLLM() {
  var cfg = getLLMConfig();
  var active = cfg._activeProvider || window._configDefaultProvider || 'gemini';
  if (cfg[active] && cfg[active].apiKey) {
    return {
      provider: active,
      apiKey: cfg[active].apiKey,
      model: cfg[active].model,
      options: cfg[active].options || {}
    };
  }
  return null;
}

// ── 통합 LLM API 호출 ──
async function callLLM(provider, apiKey, prompt, model, systemPrompt, opts) {
  var o = opts || {};
  var res, data;

  if (provider === 'anthropic') {
    var body = {
      model: model,
      max_tokens: o.max_tokens || 4096,
      messages: [{ role: 'user', content: prompt }]
    };
    if (systemPrompt) body.system = systemPrompt;
    if (o.temperature !== undefined) body.temperature = o.temperature;
    if (o.top_p !== undefined) body.top_p = o.top_p;
    if (o.top_k) body.top_k = o.top_k;
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });
    data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return (data.content || []).map(function (b) { return b.text || ''; }).join('\n');

  } else if (provider === 'gemini') {
    var gc = { maxOutputTokens: o.maxOutputTokens || 4096 };
    if (o.temperature !== undefined) gc.temperature = o.temperature;
    if (o.topP !== undefined) gc.topP = o.topP;
    if (o.topK !== undefined) gc.topK = o.topK;
    var contents = [{ parts: [{ text: (systemPrompt ? systemPrompt + '\n\n' : '') + prompt }] }];
    res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model +
      ':generateContent?key=' + encodeURIComponent(apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: contents, generationConfig: gc })
      }
    );
    data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return (
      data.candidates && data.candidates[0] &&
      data.candidates[0].content && data.candidates[0].content.parts || []
    ).map(function (p) { return p.text || ''; }).join('\n');

  } else if (provider === 'openai') {
    var msgs = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    msgs.push({ role: 'user', content: prompt });
    var ob = {
      model: model,
      max_completion_tokens: o.max_completion_tokens || 4096,
      messages: msgs
    };
    if (o.temperature !== undefined) ob.temperature = o.temperature;
    if (o.top_p !== undefined) ob.top_p = o.top_p;
    if (o.frequency_penalty !== undefined) ob.frequency_penalty = o.frequency_penalty;
    if (o.presence_penalty !== undefined) ob.presence_penalty = o.presence_penalty;
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(ob)
    });
    data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

  } else if (provider === 'zai') {
    var zm = [];
    if (systemPrompt) zm.push({ role: 'system', content: systemPrompt });
    zm.push({ role: 'user', content: prompt });
    var baseUrl = (LLM_PROVIDERS.zai && LLM_PROVIDERS.zai.baseUrl) || 'https://api.z.ai/api/coding/paas/v4';
    var zb = {
      model: model,
      max_tokens: o.max_tokens || 4096,
      messages: zm
    };
    if (o.temperature !== undefined) zb.temperature = o.temperature;
    if (o.top_p !== undefined) zb.top_p = o.top_p;
    res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(zb)
    });
    data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  }

  throw new Error('알 수 없는 프로바이더: ' + provider);
}

// ── config.json 로드 ──
async function loadLLMProviders(configPath) {
  try {
    var res = await fetch(configPath || 'config.json');
    var cfg = await res.json();
    LLM_PROVIDERS = cfg.providers || {};
    window.LLM_PROVIDERS = LLM_PROVIDERS;
    window._configDefaultProvider = cfg.defaultProvider || 'gemini';
    return cfg;
  } catch (e) {
    console.warn('config.json load failed:', e);
    return {};
  }
}

// 전역 노출
window.setCookie = setCookie;
window.getCookie = getCookie;
window.getLLMConfig = getLLMConfig;
window.saveLLMConfig = saveLLMConfig;
window.getActiveLLM = getActiveLLM;
window.callLLM = callLLM;
window.loadLLMProviders = loadLLMProviders;
window.LLM_PROVIDERS = LLM_PROVIDERS;
