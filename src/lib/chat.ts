// Sohbet verisi, saklama ve bicimlendirme yardimcilari. React'e bagli degildir.

import type { CSSProperties } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  status?: 'stopped' | 'network' | 'rate_limited' | 'not_configured' | 'daily_limit' | 'upstream_failed' | 'generic';
  /** Yazildigi an (eski kayitlarda yok) */
  at?: number;
  /** Yanit uzunluk sinirinda kesildi */
  truncated?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  /** Kullanici basligi kendisi verdiyse ilk mesaj duzenlenince degismez */
  renamed?: boolean;
  pinned?: boolean;
}

/** Kenar cubugunun bir sohbetten ihtiyac duydugu kadari */
export type ConvMeta = Pick<Conversation, 'id' | 'title' | 'updatedAt' | 'pinned'>;

// ─── Constants ───────────────────────────────────────────────────────────────

export const LS_KEY        = 'yamanai_conversations';
export const MAX_INPUT_CHARS = 32_000; // sunucudaki MAX_MESSAGE_CHARS ile ayni
export const MAX_HISTORY     = 60;     // sunucudaki MAX_MESSAGES ile ayni
// Kod indirirken dosya uzantisi: dil adi uzantiyla ayni degilse
export const CODE_EXT: Record<string, string> = {
  python: 'py', javascript: 'js', typescript: 'ts', bash: 'sh', shell: 'sh', sh: 'sh', zsh: 'sh',
  powershell: 'ps1', ruby: 'rb', rust: 'rs', kotlin: 'kt', csharp: 'cs', 'c#': 'cs', cpp: 'cpp', 'c++': 'cpp',
  markdown: 'md', yaml: 'yml', text: 'txt', plaintext: 'txt', golang: 'go', jsx: 'jsx', tsx: 'tsx',
};

// Kod bloklari iki temada da lacivert zemin ustunde: tokenlar ebru murekkeplerinin acik tonlari
export const CODE_THEME: Record<string, CSSProperties> = {
  'code[class*="language-"]': { color: '#E8E6F0' },
  'pre[class*="language-"]': { color: '#E8E6F0' },
  comment: { color: '#9AA6CF', fontStyle: 'italic' }, prolog: { color: '#9AA6CF' }, doctype: { color: '#9AA6CF' }, cdata: { color: '#9AA6CF' },
  punctuation: { color: '#C4CBE4' },
  keyword: { color: '#F2997F' }, atrule: { color: '#F2997F' }, tag: { color: '#F2997F' }, boolean: { color: '#F2997F' }, important: { color: '#F2997F' },
  string: { color: '#EBCB7E' }, char: { color: '#EBCB7E' }, 'attr-value': { color: '#EBCB7E' }, regex: { color: '#EBCB7E' }, inserted: { color: '#EBCB7E' },
  function: { color: '#86D6DB' }, 'class-name': { color: '#86D6DB' }, builtin: { color: '#86D6DB' }, selector: { color: '#86D6DB' },
  number: { color: '#B7C4F5' }, constant: { color: '#B7C4F5' }, symbol: { color: '#B7C4F5' }, 'attr-name': { color: '#B7C4F5' }, property: { color: '#B7C4F5' }, variable: { color: '#E8E6F0' },
  operator: { color: '#C4CBE4' }, deleted: { color: '#F2997F' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const uid = () => Math.random().toString(36).slice(2, 9);

export function loadConversations(): Conversation[] {
  try {
    const parsed: Conversation[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
    return parsed.filter(c => c.messages?.length > 0);
  } catch { return []; }
}
/** Disa aktarilmis dosyayi dogrular; bozuk ya da yabanci kayitlari atar. */
export function parseImport(raw: string): Conversation[] | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    const out: Conversation[] = [];
    for (const c of data) {
      if (!c || typeof c.id !== 'string' || typeof c.title !== 'string' || !Array.isArray(c.messages)) continue;
      const messages: Message[] = c.messages
        .filter((m: Message) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'ai'))
        .map((m: Message) => ({ id: typeof m.id === 'string' ? m.id : uid(), role: m.role, text: m.text, ...(typeof m.at === 'number' ? { at: m.at } : {}), ...(m.status ? { status: m.status } : {}) }));
      if (!messages.length) continue;
      out.push({ id: c.id, title: c.title.slice(0, 80), messages, updatedAt: Number(c.updatedAt) || Date.now(), ...(c.renamed ? { renamed: true } : {}), ...(c.pinned ? { pinned: true } : {}) });
    }
    return out;
  } catch { return null; }
}
export function groupByDate<T extends ConvMeta>(convs: T[]) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const todayStart = start.getTime();
  const yesterdayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1).getTime();
  const rest = convs.filter(c => !c.pinned);
  return {
    pinned:    convs.filter(c => c.pinned),
    today:     rest.filter(c => c.updatedAt >= todayStart),
    yesterday: rest.filter(c => c.updatedAt >= yesterdayStart && c.updatedAt < todayStart),
    older:     rest.filter(c => c.updatedAt < yesterdayStart),
  };
}
/** Builds a sandboxed page that compiles and mounts a React component in the browser. */
export function reactPreviewDoc(code: string) {
  const name = /export\s+default\s+function\s+(\w+)/.exec(code)?.[1]
    ?? /export\s+default\s+(\w+)\s*;?/.exec(code)?.[1]
    ?? /(?:function|const)\s+([A-Z]\w*)/.exec(code)?.[1];
  const source = code
    .replace(/^\s*import\s[\s\S]*?['"][^'"]+['"];?\s*$/gm, '')
    .replace(/export\s+default\s+function/, 'function')
    .replace(/export\s+default\s+\w+\s*;?/, '')
    .replace(/^\s*export\s+/gm, '')
    .replace(/<\/script/gi, '<\\/script');
  const mount = name ? `ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${name}));` : '';
  return `<!doctype html><html><body style="margin:0;font-family:sans-serif"><div id="root"></div>
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.7/babel.min.js"><\/script>
<script type="text/plain" id="src">const {useState,useEffect,useRef,useMemo,useCallback,useReducer,useContext,createContext}=React;
${source}
${mount}<\/script>
<script>try{(0,eval)(Babel.transform(document.getElementById('src').textContent,{filename:'preview.tsx',presets:['typescript','react']}).code)}catch(e){document.body.innerHTML='<pre style="color:#A8281A;padding:1rem;white-space:pre-wrap"></pre>';document.querySelector('pre').textContent=String(e)}<\/script>
</body></html>`;
}

/**
 * Sunucuya gidecek gecmis. Sunucu en fazla MAX_HISTORY mesaj ve mesaj basina MAX_INPUT_CHARS kabul eder:
 * uzun sohbette en yeni mesajlar gider ve liste kullanicinin mesajiyla baslar.
 */
export function toApiHistory(messages: Message[]) {
  let history = messages
    .filter(m => m.text.trim())
    .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text.slice(0, MAX_INPUT_CHARS) }));
  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY);
    if (history[0].role === 'assistant') history = history.slice(1);
  }
  return history;
}
