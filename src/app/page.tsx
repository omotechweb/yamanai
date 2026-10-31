"use client";

import {
  useState, useRef, useEffect, useCallback, useMemo, memo, createContext, useContext,
} from 'react';
import {
  Plus, Menu, X, MonitorDown, Copy, Check, Trash2, Play, Search,
  Settings, HelpCircle, Sun, Moon, Download, Type, LogIn, LogOut,
  ArrowUp, ArrowDown, Square, RotateCcw, AlertCircle, Lock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import EbruPlate from '@/components/EbruPlate';
import { LogoMark, ChatMark } from '@/components/Mark';
import {
  STRINGS, LS_SETTINGS, useLang, notifySettingsChanged,
  type LangPref, type Strings,
} from '@/lib/i18n';

// Prism tum dilleri icerir ve agirdir: yalnizca kod blogu gorununce yuklenir
const SyntaxHighlighter = dynamic(
  // @ts-expect-error -- paket tip tanimi icermiyor
  () => import('react-syntax-highlighter').then(m => m.Prism),
  { ssr: false, loading: () => null },
) as React.ComponentType<Record<string, unknown>>;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  status?: 'stopped' | 'network' | 'rate_limited' | 'not_configured' | 'daily_limit' | 'generic';
}

interface Usage {
  used: number;
  limit: number;
  guestLimit: number;
  userLimit: number;
  resetHours: number;
}

// Giris gerektiren ozellikler: sunucu da ayrica uygular, bu yalnizca arayuz icin
const GateContext = createContext<{ signedIn: boolean; requireLogin: () => void }>({ signedIn: false, requireLogin: () => {} });

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  fontSize: 'sm' | 'base' | 'lg';
  model: 'gpt-4o' | 'gpt-4o-mini';
  systemPrompt: string;
  language: LangPref;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_KEY        = 'yamanai_conversations';
const LS_POPUP      = 'hasSeenDesktopPopup';
const LS_MSG_COUNT  = 'yamanai_msg_count';
const LS_LOGIN_SEEN = 'yamanai_login_popup_seen';
const LOGIN_POPUP_AFTER = 3; // kac mesaj sonra login popup ciksin
const SEARCH_AFTER  = 6;     // kac sohbetten sonra arama kutusu gorunsun
const UNDO_MS       = 6000;
const PREVIEW_LANGS = new Set(['html', 'css', 'javascript', 'js', 'jsx', 'tsx']);
const DOWNLOAD_URL  = '/download/YamanAISetup.exe';
const GUEST_MODEL   = 'gpt-4o-mini';
const DEFAULT_GUEST_LIMIT = 10;
const DEFAULT_USER_LIMIT  = 50;

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  fontSize: 'base',
  model: 'gpt-4o',
  systemPrompt: '',
  language: 'auto',
};

const FONT_SIZE_MAP   = { sm: 'text-[15px]', base: 'text-[17px]', lg: 'text-[19px]' };
const MODEL_SHORT_MAP = { 'gpt-4o': 'GPT-4o', 'gpt-4o-mini': 'GPT-4o Mini' };

const TOOLTIP_CLS = 'absolute top-full right-0 mt-2 px-2.5 py-1 bg-y-bubble text-y-bubble-ink text-xs font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-events-none transition-opacity duration-150 z-50';
const ICON_BTN = 'y-hit group inline-flex items-center justify-center size-10 rounded-full text-y-muted hover:text-y-ink hover:bg-y-surface2 transition-colors duration-150';
const SIDE_ICON_BTN = 'y-hit inline-flex items-center justify-center size-9 rounded-full text-y-side-muted hover:text-y-side-ink hover:bg-y-side-hover transition-colors duration-150';
const MODAL_BACKDROP = 'y-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-[#070C1E]/60 p-4';
const MODAL_PANEL = 'y-panel relative w-full bg-y-raised text-y-ink shadow-[0_18px_50px_rgb(7_12_30_/_0.35)]';

// Kod bloklari iki temada da lacivert zemin ustunde: tokenlar ebru murekkeplerinin acik tonlari
const CODE_THEME: Record<string, React.CSSProperties> = {
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

const uid = () => Math.random().toString(36).slice(2, 9);

function loadConversations(): Conversation[] {
  try {
    const parsed: Conversation[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
    return parsed.filter(c => c.messages?.length > 0);
  } catch { return []; }
}
function loadSettings(): AppSettings {
  const system: AppSettings['theme'] = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, theme: system, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS, theme: system };
  } catch { return { ...DEFAULT_SETTINGS, theme: system }; }
}
function groupByDate(convs: Conversation[]) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const todayStart = start.getTime();
  const yesterdayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1).getTime();
  return {
    today:     convs.filter(c => c.updatedAt >= todayStart),
    yesterday: convs.filter(c => c.updatedAt >= yesterdayStart && c.updatedAt < todayStart),
    older:     convs.filter(c => c.updatedAt < yesterdayStart),
  };
}
function toUsage(data: Omit<Usage, 'resetHours'> & { resetAt: number }): Usage {
  return {
    used: data.used, limit: data.limit, guestLimit: data.guestLimit, userLimit: data.userLimit,
    resetHours: Math.max(1, Math.ceil((data.resetAt - Date.now()) / 3_600_000)),
  };
}
/** Builds a sandboxed page that compiles and mounts a React component in the browser. */
function reactPreviewDoc(code: string) {
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
function offersDesktopApp() {
  const ua = navigator.userAgent;
  return /Windows/.test(ua) && !/Electron/.test(ua) && !/Mobile/.test(ua);
}

/** Moves focus into a dialog, keeps Tab inside it, and restores focus on close. */
function useDialogFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => [...root.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea,input,iframe')];
    root.tabIndex = -1;
    root.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    root.addEventListener('keydown', onKey);
    return () => { root.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, []);
  return ref;
}

// ─── LoginPopup ──────────────────────────────────────────────────────────────

const LoginPopup = memo(({ onClose, t, guestLimit, userLimit }: { onClose: () => void; t: Strings; guestLimit: number; userLimit: number }) => {
  const ref = useDialogFocus<HTMLDivElement>();
  return (
    <div className={MODAL_BACKDROP} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="login-title" className={`${MODAL_PANEL} max-w-sm rounded-2xl p-7`}>
        <button onClick={onClose} aria-label={t.close} className={`${ICON_BTN} absolute top-3 right-3 size-8`}><X size={18} /></button>
        <LogoMark size={36} className="mb-4" />
        <h2 id="login-title" className="text-xl font-bold tracking-tight mb-2 pr-6 text-balance">{t.loginTitle}</h2>
        <ul className="mb-6 space-y-2">
          {t.loginBenefits(guestLimit, userLimit).map(benefit => (
            <li key={benefit} className="flex items-start gap-2.5 text-y-muted leading-snug">
              <Check size={16} className="mt-0.5 flex-shrink-0 text-y-link" /> {benefit}
            </li>
          ))}
        </ul>
        <div className="space-y-2.5">
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full min-h-12 flex items-center gap-3 px-5 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-full border border-gray-300 transition-colors duration-150"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="flex-1 text-left">{t.google}</span>
          </button>
          <button
            onClick={() => signIn('github', { callbackUrl: '/' })}
            className="w-full min-h-12 flex items-center gap-3 px-5 bg-[#24292f] hover:bg-[#2f363d] text-white font-semibold rounded-full border border-[#444d56] transition-colors duration-150"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span className="flex-1 text-left">{t.github}</span>
          </button>
          <button onClick={onClose} className="w-full min-h-11 text-sm font-medium text-y-muted hover:text-y-ink rounded-full transition-colors duration-150">
            {t.later}
          </button>
        </div>
      </div>
    </div>
  );
});
LoginPopup.displayName = 'LoginPopup';

// ─── DesktopPopup ────────────────────────────────────────────────────────────

const DesktopPopup = memo(({ onClose, t }: { onClose: () => void; t: Strings }) => {
  const ref = useDialogFocus<HTMLDivElement>();
  return (
    <div className={MODAL_BACKDROP} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="desktop-title" className={`${MODAL_PANEL} max-w-md rounded-2xl p-7`}>
        <button onClick={onClose} aria-label={t.close} className={`${ICON_BTN} absolute top-3 right-3 size-8`}><X size={18} /></button>
        <h2 id="desktop-title" className="text-xl font-bold tracking-tight mb-2 pr-6">{t.desktopTitle}</h2>
        <p className="text-y-muted mb-6 leading-relaxed">{t.desktopBody}</p>
        <div className="flex flex-col gap-1">
          <a href={DOWNLOAD_URL} download
            className="w-full min-h-12 px-5 bg-y-accent hover:bg-y-accent-hover text-white font-semibold rounded-full transition-colors duration-150 flex items-center justify-center gap-2">
            <MonitorDown size={18} /> {t.desktopDownload}
          </a>
          <button onClick={onClose} className="min-h-11 text-sm font-medium text-y-muted hover:text-y-ink rounded-full transition-colors duration-150">{t.desktopLater}</button>
        </div>
      </div>
    </div>
  );
});
DesktopPopup.displayName = 'DesktopPopup';

// ─── CopyButton ──────────────────────────────────────────────────────────────

const CopyButton = memo(({ text, showLabel = true, className = '', t }: {
  text: string; showLabel?: boolean; className?: string; t: Strings;
}) => {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch {}
  }, [text]);
  return (
    <button type="button" onClick={handle} title={t.copy} aria-label={copied ? t.copied : t.copy}
      className={`y-hit inline-flex items-center justify-center gap-1.5 transition-colors duration-150 ${className}`}>
      <span className="relative size-3.5 flex-shrink-0">
        <Copy size={14} className={`absolute inset-0 transition-opacity duration-150 ${copied ? 'opacity-0' : 'opacity-100'}`} />
        <Check size={14} className={`absolute inset-0 transition-opacity duration-150 ${copied ? 'opacity-100' : 'opacity-0'}`} />
      </span>
      {showLabel && <span className="hidden sm:inline" aria-hidden="true">{copied ? t.copied : t.copy}</span>}
    </button>
  );
});
CopyButton.displayName = 'CopyButton';

// ─── LivePreviewModal ─────────────────────────────────────────────────────────

const LivePreviewModal = memo(({ code, lang, onClose, t }: { code: string; lang: string; onClose: () => void; t: Strings }) => {
  const ref = useDialogFocus<HTMLDivElement>();
  const srcDoc = useMemo(() => {
    const l = lang.toLowerCase();
    if (l === 'css') return `<html><head><style>${code}</style></head><body style="background:#fff;padding:2rem"><p style="font-family:sans-serif;color:#555">${t.cssPreview}</p></body></html>`;
    if (l === 'javascript' || l === 'js') return `<html><body style="background:#fff;color:#111;font-family:monospace;padding:1rem"><script>${code}<\/script></body></html>`;
    if (l === 'jsx' || l === 'tsx') return reactPreviewDoc(code);
    return code;
  }, [code, lang, t.cssPreview]);
  const download = useCallback(() => {
    const url = URL.createObjectURL(new Blob([srcDoc], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'yamanai-preview.html'; a.click();
    URL.revokeObjectURL(url);
  }, [srcDoc]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div className="y-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-[#070C1E]/70 p-0 md:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={t.livePreview}
        className={`${MODAL_PANEL} max-w-4xl md:w-[90vw] h-dvh md:h-[80vh] rounded-none md:rounded-2xl overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between h-12 pl-4 pr-2 border-b border-y-line flex-shrink-0">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="font-semibold">{t.livePreview}</span>
            <span className="font-mono text-xs text-y-muted">{lang}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={download} aria-label={t.saveHtml} title={t.saveHtml} className={`${ICON_BTN} size-9`}><Download size={16} /></button>
            <button onClick={onClose} aria-label={t.close} title={t.close} className={`${ICON_BTN} size-9`}><X size={17} /></button>
          </div>
        </div>
        {/* allow-same-origin bilerek yok: uretilen kod sohbetlere (localStorage) erisemesin */}
        <iframe srcDoc={srcDoc} sandbox="allow-scripts allow-modals" className="flex-1 w-full bg-white" title={t.livePreview} />
      </div>
    </div>
  );
});
LivePreviewModal.displayName = 'LivePreviewModal';

// ─── CodeBlock ───────────────────────────────────────────────────────────────

const CodeBlock = memo(({ language, children, t }: { language: string; children: React.ReactNode; t: Strings }) => {
  const [preview, setPreview] = useState(false);
  const { signedIn, requireLogin } = useContext(GateContext);
  const canPreview = PREVIEW_LANGS.has(language.toLowerCase());
  const code = String(children ?? '').replace(/\n$/, '');
  const headerBtn = 'h-7 px-2 rounded-md text-xs font-medium hover:bg-white/10';
  return (
    <>
      {preview && <LivePreviewModal code={code} lang={language.toLowerCase()} onClose={() => setPreview(false)} t={t} />}
      <div className="y-code rounded-xl overflow-hidden my-4 not-prose">
        <div className="h-10 pl-4 pr-2 flex justify-between items-center gap-2 border-b border-white/10">
          <span className="font-mono text-xs lowercase text-[#C4CBE4] truncate">{language || 'text'}</span>
          <div className="flex items-center gap-1.5">
            {canPreview && (
              <button type="button" onClick={() => (signedIn ? setPreview(true) : requireLogin())}
                aria-label={signedIn ? t.preview : `${t.preview} (${t.requiresLogin})`} title={signedIn ? t.preview : t.requiresLogin}
                className={`y-hit inline-flex items-center gap-1.5 text-[#EBCB7E] transition-colors duration-150 ${headerBtn}`}>
                {signedIn ? <Play size={13} /> : <Lock size={13} />}<span className="hidden sm:inline" aria-hidden="true">{t.preview}</span>
              </button>
            )}
            <CopyButton text={code} t={t} className={`text-[#C4CBE4] hover:text-white ${headerBtn}`} />
          </div>
        </div>
        <SyntaxHighlighter style={CODE_THEME} language={language || 'text'} PreTag="div" wrapLongLines={false}
          codeTagProps={{ style: { fontFamily: 'inherit' } }}
          customStyle={{ margin: 0, padding: '1rem', fontSize: '13.5px', lineHeight: '1.65', borderRadius: 0, background: 'transparent', overflowX: 'auto', fontFamily: 'var(--font-code), ui-monospace, monospace' }}>
          {code}
        </SyntaxHighlighter>
      </div>
    </>
  );
});
CodeBlock.displayName = 'CodeBlock';

// ─── MarkdownRenderer ─────────────────────────────────────────────────────────

const MarkdownRenderer = memo(({ content, fontSize, t }: { content: string; fontSize: string; t: Strings }) => (
  <div dir="auto" className={`y-prose text-y-ink ${fontSize} leading-[1.65] break-words`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      code({ className, children, ...props }: React.ComponentProps<'code'>) {
        const match = /language-(\w+)/.exec(className || '');
        if (match) return <CodeBlock language={match[1]} t={t}>{children}</CodeBlock>;
        return <code className="bg-y-surface2 px-1.5 py-0.5 rounded-md text-[0.88em] font-mono" {...props}>{children}</code>;
      },
      pre: ({ children }) => <>{children}</>,
      p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
      h1: ({ children }) => <h1 className="text-[1.5em] font-bold tracking-tight mt-7 mb-3">{children}</h1>,
      h2: ({ children }) => <h2 className="text-[1.3em] font-bold tracking-tight mt-6 mb-2.5">{children}</h2>,
      h3: ({ children }) => <h3 className="text-[1.12em] font-bold mt-5 mb-2">{children}</h3>,
      h4: ({ children }) => <h4 className="font-bold mt-4 mb-1.5">{children}</h4>,
      ul: ({ children }) => <ul className="my-3 pl-5 space-y-1.5 list-disc marker:text-y-subtle">{children}</ul>,
      ol: ({ children }) => <ol className="my-3 pl-6 space-y-1.5 list-decimal marker:text-y-subtle marker:font-bold">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      blockquote: ({ children }) => <blockquote className="border-l border-y-line-strong pl-4 my-4 text-y-muted">{children}</blockquote>,
      table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full text-[0.92em] tabular-nums">{children}</table></div>,
      th: ({ children }) => <th className="px-3 py-2 text-left font-bold border-b border-y-line-strong">{children}</th>,
      td: ({ children }) => <td className="px-3 py-2 text-y-muted border-b border-y-line">{children}</td>,
      a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-y-link underline underline-offset-[3px] decoration-1 hover:decoration-2">{children}</a>,
      hr: () => <hr className="my-6 border-y-line" />,
    }}>
      {content}
    </ReactMarkdown>
  </div>
));
MarkdownRenderer.displayName = 'MarkdownRenderer';

// ─── InkDrop (yanit beklenirken) ─────────────────────────────────────────────

const InkDrop = memo(({ label }: { label: string }) => (
  <div className="relative size-7" role="status" aria-label={label}>
    <span className="y-drop absolute inset-0 rounded-full bg-y-accent" />
    <span className="y-drop absolute inset-0 rounded-full bg-[#D9A441]" style={{ animationDelay: '500ms' }} />
  </div>
));
InkDrop.displayName = 'InkDrop';

// ─── MessageBubble ────────────────────────────────────────────────────────────

const MessageBubble = memo(({ msg, fontSize, fresh, t, onRetry, isLast, busy }: {
  msg: Message; fontSize: string; fresh: boolean; t: Strings; onRetry: () => void; isLast: boolean; busy: boolean;
}) => {
  if (msg.role === 'user') {
    return (
      <div className={`flex justify-end ${fresh ? 'y-msg-new' : ''}`}>
        <div dir="auto" className={`max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 bg-y-bubble text-y-bubble-ink whitespace-pre-wrap break-words leading-[1.55] ${fontSize}`}>
          {msg.text}
        </div>
      </div>
    );
  }
  const failed = msg.status && msg.status !== 'stopped';
  const waiting = !msg.text && !msg.status;
  return (
    <div className={`group ${fresh ? 'y-msg-new' : ''}`}>
      {waiting ? <InkDrop label={t.typing} /> : msg.text ? <MarkdownRenderer content={msg.text} fontSize={fontSize} t={t} /> : null}

      {msg.status === 'stopped' && <p className="mt-2 text-sm text-y-subtle">{t.stopped}</p>}
      {failed && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-y-danger">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="text-[15px]">{t.errors[msg.status as keyof Strings['errors']]}</span>
          {isLast && msg.status !== 'daily_limit' && (
            <button type="button" onClick={onRetry} disabled={busy}
              className="y-hit inline-flex items-center gap-1.5 text-[15px] font-semibold underline underline-offset-[3px] disabled:opacity-50">
              {t.retry}
            </button>
          )}
        </div>
      )}

      {msg.text && !failed && (
        <div className={`mt-2 flex items-center gap-1 transition-opacity duration-150 ${isLast ? '' : 'pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100'}`}>
          <CopyButton text={msg.text} showLabel={false} t={t} className="size-8 rounded-full text-y-subtle hover:text-y-ink hover:bg-y-surface2" />
          {isLast && !busy && (
            <button type="button" onClick={onRetry} title={t.regenerate} aria-label={t.regenerate}
              className="y-hit size-8 inline-flex items-center justify-center rounded-full text-y-subtle hover:text-y-ink hover:bg-y-surface2 transition-colors duration-150">
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

// ─── WelcomeScreen ───────────────────────────────────────────────────────────

const WelcomeScreen = memo(({ onPromptClick, name, t }: { onPromptClick: (p: string) => void; name?: string; t: Strings }) => (
  <div className="min-h-full flex flex-col justify-center max-w-[760px] mx-auto px-4 md:px-6 pt-8 pb-6">
    <h1 className="text-[32px] md:text-[44px] font-bold tracking-[-0.02em] leading-[1.1] text-balance">
      {name ? t.greetingName(name) : t.greeting}
    </h1>
    <p className="text-y-muted mt-3 text-[17px] leading-relaxed max-w-[52ch]">{t.greetingSub}</p>

    <section aria-labelledby="prompt-title" className="mt-8">
      <h2 id="prompt-title" className="sr-only">{t.starters}</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8 border-t border-y-line">
        {t.prompts.map(({ label, prompt }) => (
          <li key={label} className="border-b border-y-line">
            <button type="button" onClick={() => onPromptClick(prompt)}
              className="group w-full min-h-[68px] py-3 text-left rounded-lg">
              <span className="block font-bold group-hover:underline underline-offset-[3px]">{label}</span>
              <span className="block text-[15px] text-y-muted mt-0.5 line-clamp-1">{prompt}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  </div>
));
WelcomeScreen.displayName = 'WelcomeScreen';

// ─── SidebarGroup ────────────────────────────────────────────────────────────

const SidebarGroup = memo(({ label, convs, activeId, onSelect, onDelete, t }: {
  label: string; convs: Conversation[]; activeId: string;
  onSelect: (id: string) => void; onDelete: (id: string) => void; t: Strings;
}) => {
  if (!convs.length) return null;
  return (
    <div className="mb-2">
      <p className="text-[13px] font-bold text-y-side-muted mt-4 mb-1.5 px-3">{label}</p>
      <ul className="space-y-0.5">
        {convs.map(c => {
          const isActive = c.id === activeId;
          return (
            <li key={c.id} className={`group relative flex items-center h-10 w-full rounded-xl transition-colors duration-150 ${isActive ? 'bg-y-side-active' : 'hover:bg-y-side-hover'}`}>
              <button type="button" onClick={() => onSelect(c.id)} aria-current={isActive ? 'true' : undefined}
                className={`flex-1 h-full flex items-center gap-2.5 pl-3 pr-1 text-[15px] text-left min-w-0 rounded-xl ${isActive ? 'text-y-side-ink font-bold' : 'text-y-side-ink/85'}`}>
                <ChatMark id={c.id} />
                <span className="truncate">{c.title}</span>
              </button>
              <button type="button" onClick={() => onDelete(c.id)} title={t.deleteChat} aria-label={`${t.deleteChat}: ${c.title}`}
                className="size-8 mr-1 flex items-center justify-center rounded-full flex-shrink-0 text-y-side-muted hover:text-y-side-ink hover:bg-y-side-active transition-[color,background-color,opacity] duration-150 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100 pointer-fine:group-focus-within:opacity-100">
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
SidebarGroup.displayName = 'SidebarGroup';

// ─── Segmented control ───────────────────────────────────────────────────────

function Segmented<T extends string>({ label, options, value, onChange, onLocked }: {
  label: string; value: T; onChange: (v: T) => void; onLocked?: () => void;
  options: { value: T; label: string; icon?: React.ReactNode; locked?: boolean }[];
}) {
  // Radyo grubu: Tab grubun tamamina bir kez girer, oklar secenekler arasinda gezer
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const open = options.filter(o => !o.locked);
    const next = open[(open.findIndex(o => o.value === value) + step + open.length) % open.length];
    onChange(next.value);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]');
    buttons[options.indexOf(next)]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown}
      className="grid gap-1 p-1 rounded-full bg-y-surface2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(o => {
        const selected = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={selected} tabIndex={selected || o.locked ? 0 : -1}
            onClick={() => (o.locked ? onLocked?.() : onChange(o.value))}
            className={`min-h-10 flex items-center justify-center gap-2 px-2 text-[15px] font-semibold rounded-full transition-colors duration-150 ${selected ? 'bg-y-bubble text-y-bubble-ink' : 'text-y-muted hover:text-y-ink'}`}>
            {o.locked ? <Lock size={14} className="flex-shrink-0" /> : o.icon}<span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Settings Modal ──────────────────────────────────────────────────────────

const SettingsModal = memo(({ settings, onSave, onClose, onDeleteAll, onExport, t, usage }: {
  settings: AppSettings; onSave: (s: AppSettings) => void;
  onClose: () => void; onDeleteAll: () => void; onExport: () => void; t: Strings; usage: Usage | null;
}) => {
  const ref = useDialogFocus<HTMLDivElement>();
  const { signedIn, requireLogin } = useContext(GateContext);
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const patch = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => setLocal(p => ({ ...p, [key]: val }));
  const groupLabel = 'text-sm font-bold mb-2 block';

  return (
    <div className={`${MODAL_BACKDROP} items-end sm:items-center p-0 sm:p-4`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="settings-title"
        className={`${MODAL_PANEL} max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[90dvh]`}>
        <div className="flex items-center justify-between h-16 px-5 sm:px-6 border-b border-y-line flex-shrink-0">
          <h2 id="settings-title" className="font-bold text-xl tracking-tight">{t.settings}</h2>
          <button onClick={onClose} aria-label={t.close} className={`${ICON_BTN} size-9`}><X size={20} /></button>
        </div>
        <div className="px-5 sm:px-6 py-6 space-y-6 overflow-y-auto">
          <div>
            <span className={groupLabel}>{t.theme}</span>
            <Segmented label={t.theme} value={local.theme} onChange={v => patch('theme', v)} options={[
              { value: 'light', label: t.light, icon: <Sun size={16} /> },
              { value: 'dark', label: t.dark, icon: <Moon size={16} /> },
            ]} />
          </div>
          <div>
            <span className={groupLabel}>{t.language}</span>
            <Segmented<LangPref> label={t.language} value={local.language} onChange={v => patch('language', v)} options={[
              { value: 'auto', label: t.langAuto },
              { value: 'tr', label: 'Türkçe' },
              { value: 'en', label: 'English' },
            ]} />
          </div>
          <div>
            <span className={groupLabel}>{t.textSize}</span>
            <Segmented label={t.textSize} value={local.fontSize} onChange={v => patch('fontSize', v)} options={[
              { value: 'sm' as const, label: t.small, icon: <Type size={12} /> },
              { value: 'base' as const, label: t.normal, icon: <Type size={15} /> },
              { value: 'lg' as const, label: t.large, icon: <Type size={18} /> },
            ]} />
          </div>
          <div>
            <span className={groupLabel}>{t.model}</span>
            <Segmented label={t.model} value={signedIn ? local.model : GUEST_MODEL} onChange={v => patch('model', v)} onLocked={requireLogin} options={[
              { value: 'gpt-4o' as const, label: t.modelStrong, locked: !signedIn },
              { value: 'gpt-4o-mini' as const, label: t.modelFast },
            ]} />
          </div>
          <div>
            <label htmlFor={signedIn ? 'system-prompt' : undefined} className={groupLabel}>{t.customInstr}</label>
            <p className="text-sm text-y-muted -mt-1 mb-2">{t.customHint}</p>
            {signedIn ? (
              <textarea id="system-prompt" dir="auto" rows={3} maxLength={4000} value={local.systemPrompt} onChange={e => patch('systemPrompt', e.target.value)}
                placeholder={t.customPlaceholder}
                className="w-full bg-y-surface border border-y-line-strong rounded-xl p-3 text-base text-y-ink placeholder:text-y-subtle focus:outline-none focus:border-y-ink resize-none transition-colors duration-150" />
            ) : (
              <button type="button" onClick={requireLogin} className="w-full min-h-11 flex items-center justify-center gap-2 px-4 rounded-full border border-y-line-strong text-y-ink hover:bg-y-surface2 text-[15px] font-semibold transition-colors duration-150">
                <Lock size={15} /> {t.customLocked}
              </button>
            )}
          </div>
          {usage && (
            <div>
              <span className={groupLabel}>{t.usageSection}</span>
              <p className="text-[15px] text-y-muted tabular-nums">{t.usageToday(Math.min(usage.used, usage.limit), usage.limit)}</p>
            </div>
          )}
          <div>
            <span className={groupLabel}>{t.data}</span>
            <button type="button" onClick={onExport} className="w-full min-h-11 flex items-center justify-center gap-2 px-4 rounded-full border border-y-line-strong text-y-ink hover:bg-y-surface2 text-[15px] font-semibold transition-colors duration-150">
              <Download size={16} /> {t.export}
            </button>
            {/* Yikici eylem digerlerinden ayri durur: yanlislikla tiklanmasin */}
            <div className="mt-8">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 inline-flex items-center gap-2 px-1 text-y-danger text-[15px] font-semibold rounded-lg hover:underline underline-offset-[3px]">
                  <Trash2 size={16} /> {t.deleteAll}
                </button>
              ) : (
                <button type="button" onClick={() => { onDeleteAll(); setConfirmDelete(false); onClose(); }} className="w-full min-h-11 flex items-center justify-center gap-2 px-4 rounded-full bg-y-danger text-y-canvas text-[15px] font-bold transition-colors duration-150">
                  {t.confirmDelete}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-y-line flex-shrink-0">
          <button type="button" onClick={onClose} className="min-h-11 px-4 text-[15px] font-semibold text-y-muted hover:text-y-ink rounded-full hover:bg-y-surface2 transition-colors duration-150">{t.cancel}</button>
          <button type="button" onClick={() => { onSave(local); onClose(); }} className="min-h-11 px-6 bg-y-accent hover:bg-y-accent-hover text-white text-[15px] font-bold rounded-full transition-colors duration-150">
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
});
SettingsModal.displayName = 'SettingsModal';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  const signedIn = !!session;
  const lang = useLang();
  const t = STRINGS[lang];

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string>('');
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [streamConvId, setStreamConvId]   = useState<string | null>(null);
  const [showDesktopPopup, setShowDesktopPopup] = useState(false);
  const [showLoginPopup, setShowLoginPopup]     = useState(false);
  const [showSettings, setShowSettings]         = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [settings, setSettings]                 = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated]                 = useState(false);
  const [desktopOffer, setDesktopOffer]         = useState(false);
  const [search, setSearch]                     = useState('');
  const [atBottom, setAtBottom]                 = useState(true);
  const [undo, setUndo]                         = useState<{ label: string; prev: Conversation[]; activeId: string } | null>(null);
  const [usage, setUsage]                       = useState<Usage | null>(null);
  const [storageFull, setStorageFull]           = useState(false);
  // Bu oturumda gonderilen mesajlar: yalnizca bunlar giris animasyonu alir
  const [freshIds, setFreshIds]                 = useState<Set<string>>(() => new Set());

  const scrollerRef        = useRef<HTMLDivElement>(null);
  const threadRef          = useRef<HTMLDivElement>(null);
  const stuckRef           = useRef(true);
  const inputRef           = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConv   = useMemo(() => conversations.find(c => c.id === activeId) ?? null, [conversations, activeId]);
  const messages     = useMemo(() => activeConv?.messages ?? [], [activeConv]);
  const hasThread    = messages.length > 0;
  const fontClass    = FONT_SIZE_MAP[settings.fontSize];
  const firstName    = session?.user?.name?.split(' ')[0];
  const streamingHere = loading && streamConvId === activeId;
  const lastMsgId    = messages[messages.length - 1]?.id;
  const effectiveModel = signedIn ? settings.model : GUEST_MODEL;
  const guestLimit   = usage?.guestLimit ?? DEFAULT_GUEST_LIMIT;
  const userLimit    = usage?.userLimit ?? DEFAULT_USER_LIMIT;
  const remaining    = usage ? Math.max(usage.limit - usage.used, 0) : null;
  const exhausted    = remaining === 0;
  const requireLogin = useCallback(() => { setShowSettings(false); setShowLoginPopup(true); }, []);
  const gate         = useMemo(() => ({ signedIn, requireLogin }), [signedIn, requireLogin]);
  // Plaka biten her yanitla buyur; akan yanit, bitene kadar sayilmaz
  const settledAnswers = messages.filter(m => m.role === 'ai').length - (streamingHere ? 1 : 0);

  const visible = useMemo(() => {
    // Arama kutusu gizliyken eski arama listeyi suzmeye devam etmesin
    const q = conversations.length >= SEARCH_AFTER ? search.trim().toLocaleLowerCase(lang) : '';
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(c =>
      c.title.toLocaleLowerCase(lang).includes(q) ||
      c.messages.some(m => m.text.toLocaleLowerCase(lang).includes(q)));
  }, [conversations, search, lang]);
  const { today, yesterday, older } = useMemo(() => groupByDate(visible), [visible]);

  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    setActiveId(loaded[0] ? [...loaded].sort((a, b) => b.updatedAt - a.updatedAt)[0].id : '');
    setSettings(loadSettings());
    setDesktopOffer(offersDesktopApp());
    setHydrated(true);
  }, []);

  // Yukleme bitmeden yazma: aksi halde kayitli sohbetlerin ustune bos liste yazilir.
  // Her jetonda degil, yazma durulunca kaydet.
  useEffect(() => {
    if (!hydrated) return;
    const save = () => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(conversations));
        setStorageFull(false);
      } catch { setStorageFull(true); }
    };
    const handle = setTimeout(save, 400);
    // Sayfa kapanirken bekleyen kaydi kaybetme
    window.addEventListener('pagehide', save);
    return () => { clearTimeout(handle); window.removeEventListener('pagehide', save); };
  }, [conversations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); } catch {}
    document.documentElement.dataset.theme = settings.theme;
    notifySettingsChanged();
  }, [settings, hydrated]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Limit durumunu sunucudan al; giris yapilinca limit degistigi icin oturumla birlikte yenilenir
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    let cancelled = false;
    fetch('/api/chat')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data && !cancelled) setUsage(toUsage(data)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionStatus]);

  // Masaustu teklifi: ilk yanit bittikten sonra, yalnizca Windows tarayicisinda
  useEffect(() => {
    if (!hydrated || loading || !desktopOffer || showLoginPopup) return;
    if (!conversations.some(c => c.messages.some(m => m.role === 'ai' && m.text))) return;
    if (localStorage.getItem(LS_POPUP)) return;
    const handle = setTimeout(() => setShowDesktopPopup(true), 1500);
    return () => clearTimeout(handle);
  }, [hydrated, loading, desktopOffer, conversations, showLoginPopup]);

  // Kullanici yukari kaydirdiysa akis onu asagi cekmesin
  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stuckRef.current = near;
    setAtBottom(near);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el && stuckRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // Kod renklendirici gibi gec yuklenen icerik yuksekligi degistirince de altta kal
  useEffect(() => {
    const el = scrollerRef.current;
    const content = threadRef.current;
    if (!el || !content) return;
    const ro = new ResizeObserver(() => { if (stuckRef.current) el.scrollTop = el.scrollHeight; });
    ro.observe(content);
    return () => ro.disconnect();
  }, [activeId, hasThread]);

  const jumpToBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    stuckRef.current = true;
    setAtBottom(true);
    el.scrollTo({ top: el.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Login popup: 3 mesaj sonrasi, giris yapilmamissa ve yanit bitmisse goster
  useEffect(() => {
    if (session || loading || !hydrated) return;
    const count = parseInt(localStorage.getItem(LS_MSG_COUNT) ?? '0', 10);
    if (count >= LOGIN_POPUP_AFTER && !localStorage.getItem(LS_LOGIN_SEEN)) {
      setShowLoginPopup(true);
    }
  }, [conversations, session, loading, hydrated]);

  const closeLoginPopup = useCallback(() => {
    setShowLoginPopup(false);
    localStorage.setItem(LS_LOGIN_SEEN, 'true');
  }, []);

  const resizeTextarea = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  const resetInput = useCallback(() => {
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value); resizeTextarea(e.target);
  }, [resizeTextarea]);

  const focusInput = useCallback(() => {
    // Dokunmatik ekranda klavyeyi kendiliginden acma
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const startNewChat = useCallback(() => {
    // Sohbet ilk mesajla olusur, boylece bos sohbetler birikmez
    setActiveId(''); resetInput(); setSidebarOpen(false); setFreshIds(new Set());
    stuckRef.current = true; setAtBottom(true);
    focusInput();
  }, [resetInput, focusInput]);

  const loadConversation = useCallback((id: string) => {
    setActiveId(id); setSidebarOpen(false); setFreshIds(new Set());
    stuckRef.current = true; setAtBottom(true);
    focusInput();
  }, [focusInput]);

  const offerUndo = useCallback((label: string, prev: Conversation[]) => {
    setUndo({ label, prev, activeId });
  }, [activeId]);

  useEffect(() => {
    if (!undo) return;
    const handle = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(handle);
  }, [undo]);

  const deleteConversation = useCallback((id: string) => {
    offerUndo(t.deleted, conversations);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (id === activeId) setActiveId('');
  }, [activeId, conversations, offerUndo, t.deleted]);

  const deleteAllConversations = useCallback(() => {
    offerUndo(t.deletedAll, conversations);
    setConversations([]); setActiveId('');
  }, [conversations, offerUndo, t.deletedAll]);

  const exportConversations = useCallback(() => {
    const blob = new Blob([JSON.stringify(conversations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `yamanai-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [conversations]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Yaniti akitir. `base`, modele gonderilecek mesajlardir (son mesaj kullanicinin).
  const runCompletion = useCallback(async (conv: Conversation, base: Message[]) => {
    const aiId = uid();
    const convId = conv.id;
    setFreshIds(prev => new Set(prev).add(aiId));
    setConversations(prev => {
      const next: Conversation = { ...conv, messages: [...base, { id: aiId, role: 'ai', text: '' }], updatedAt: Date.now() };
      const idx = prev.findIndex(c => c.id === convId);
      if (idx === -1) return [next, ...prev];
      const copy = [...prev]; copy[idx] = next; return copy;
    });
    setLoading(true); setStreamConvId(convId);
    stuckRef.current = true; setAtBottom(true);

    const patchAi = (patch: Partial<Message>) => {
      setConversations(prev => prev.map(c => c.id !== convId ? c : {
        ...c, updatedAt: Date.now(), messages: c.messages.map(m => m.id === aiId ? { ...m, ...patch } : m),
      }));
    };

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const history = base.filter(m => m.text).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, model: effectiveModel, customSystemPrompt: (signedIn && settings.systemPrompt) || undefined }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        const code = data?.error;
        if (code === 'daily_limit') setUsage(toUsage(data));
        patchAi({ status: code === 'rate_limited' || code === 'not_configured' || code === 'daily_limit' ? code : 'generic' });
        return;
      }
      const usedNow = Number(res.headers.get('X-Usage-Used'));
      if (usedNow) setUsage(prev => prev && { ...prev, used: usedNow });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let acc = '', buffer = '';
      const onLine = (raw: string) => {
        const line = raw.trim();
        if (!line.startsWith('data:')) return;
        const js = line.slice(5).trim();
        if (!js || js === '[DONE]') return;
        try {
          const d: string = JSON.parse(js).delta ?? '';
          if (d) { acc += d; patchAi({ text: acc }); }
        } catch {}
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) { buffer += decoder.decode(); onLine(buffer); break; }
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          onLine(buffer.slice(0, idx));
          buffer = buffer.slice(idx + 1);
        }
      }
      if (!acc) patchAi({ status: 'generic' });
    } catch (err: unknown) {
      patchAi({ status: (err as Error)?.name === 'AbortError' ? 'stopped' : 'network' });
    } finally {
      setLoading(false); setStreamConvId(null);
      abortControllerRef.current = null;
      focusInput();
    }
  }, [effectiveModel, signedIn, settings.systemPrompt, focusInput]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || exhausted) return;

    // Mesaj sayacini artir (login popup icin)
    if (!session) {
      const count = parseInt(localStorage.getItem(LS_MSG_COUNT) ?? '0', 10);
      localStorage.setItem(LS_MSG_COUNT, String(count + 1));
    }

    const conv: Conversation = conversations.find(c => c.id === activeId)
      ?? { id: uid(), title: trimmed.slice(0, 50), messages: [], updatedAt: Date.now() };
    const userMsg: Message = { id: uid(), role: 'user', text: trimmed };
    setFreshIds(prev => new Set(prev).add(userMsg.id));
    setActiveId(conv.id);
    resetInput();
    void runCompletion(conv, [...conv.messages, userMsg]);
  }, [loading, exhausted, activeId, conversations, resetInput, runCompletion, session]);

  // Son yaniti at ve ayni soruyu tekrar sor (hata sonrasi da bunu kullanir)
  const retryLast = useCallback(() => {
    if (loading || exhausted || !activeConv) return;
    const msgs = activeConv.messages;
    if (msgs[msgs.length - 1]?.role !== 'ai') return;
    void runCompletion(activeConv, msgs.slice(0, -1));
  }, [loading, exhausted, activeConv, runCompletion]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: Japonca, Cince gibi dillerde Enter secimi onaylar, mesaji gondermez
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendMessage(input); }
  }, [sendMessage, input]);

  const usePrompt = useCallback((p: string) => {
    setInput(p);
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    requestAnimationFrame(() => resizeTextarea(el));
  }, [resizeTextarea]);

  const closeDesktopPopup = useCallback(() => {
    setShowDesktopPopup(false); localStorage.setItem(LS_POPUP, 'true');
  }, []);

  // Escape: acik modal ya da mobil cekmeceyi kapat (onizleme kendi dinleyicisini kullanir)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showSettings) setShowSettings(false);
      else if (showLoginPopup) closeLoginPopup();
      else if (showDesktopPopup) closeDesktopPopup();
      else if (sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSettings, showLoginPopup, showDesktopPopup, sidebarOpen, closeLoginPopup, closeDesktopPopup]);

  const modelShort = MODEL_SHORT_MAP[effectiveModel];
  const toggleTheme = () => setSettings(s => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }));
  const isEmpty = messages.length === 0;
  const hasChats = conversations.length > 0;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <GateContext.Provider value={gate}>
    <div className="flex h-dvh bg-y-canvas text-y-ink font-sans overflow-hidden relative">
      {showLoginPopup && !session && <LoginPopup onClose={closeLoginPopup} t={t} guestLimit={guestLimit} userLimit={userLimit} />}

      {showSettings && (
        <SettingsModal settings={settings} onSave={setSettings} onClose={() => setShowSettings(false)}
          onDeleteAll={deleteAllConversations} onExport={exportConversations} t={t} usage={usage} />
      )}

      {showDesktopPopup && <DesktopPopup onClose={closeDesktopPopup} t={t} />}

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="y-backdrop fixed inset-0 z-30 bg-[#070C1E]/60 md:hidden" aria-hidden="true" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside aria-label={t.chats}
        className={`y-on-side fixed md:relative z-40 md:z-auto top-0 left-0 h-full flex flex-col w-[288px] max-w-[85vw] bg-y-side text-y-side-ink flex-shrink-0 transition-[transform,visibility] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 max-md:invisible'}`}>
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-extrabold text-xl tracking-tight">YamanAI</span>
            <span className="text-xs font-semibold text-y-side-muted border border-y-side-line px-1.5 rounded-md">{t.beta}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} aria-label={t.closeMenu} className={`md:hidden ${SIDE_ICON_BTN}`}><X size={18} /></button>
        </div>

        <div className="px-3 pt-1 pb-2">
          <button onClick={startNewChat}
            className="flex items-center justify-center gap-2 px-3 h-11 w-full font-bold text-white bg-y-accent hover:bg-y-accent-hover rounded-full transition-colors duration-150">
            <Plus size={18} /><span>{t.newChat}</span>
          </button>
        </div>

        {conversations.length >= SEARCH_AFTER && (
          <div className="relative px-3 pt-1">
            <label htmlFor="chat-search" className="sr-only">{t.searchChats}</label>
            <Search size={15} aria-hidden="true" className="absolute left-6 top-1/2 translate-y-[-30%] text-y-side-muted pointer-events-none" />
            <input id="chat-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchChats}
              className="w-full h-10 pl-9 pr-3 rounded-full bg-y-side-hover text-y-side-ink placeholder:text-y-side-muted text-[15px] outline-none [&::-webkit-search-cancel-button]:appearance-none" />
          </div>
        )}

        <nav aria-label={t.history} className="flex-1 overflow-y-auto px-2 pb-3">
          <SidebarGroup label={t.today}     convs={today}     activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} t={t} />
          <SidebarGroup label={t.yesterday} convs={yesterday} activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} t={t} />
          <SidebarGroup label={t.older}     convs={older}     activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} t={t} />
          {!hasChats && <p className="text-[15px] leading-relaxed text-y-side-muted px-3 pt-5">{t.emptyHistory}</p>}
          {hasChats && visible.length === 0 && <p className="text-[15px] text-y-side-muted px-3 pt-5">{t.noMatches}</p>}
        </nav>

        <div className="border-t border-y-side-line p-3 space-y-1">
          {desktopOffer && (
            <a href={DOWNLOAD_URL} download
              className="flex items-center gap-3 px-3 min-h-11 rounded-xl text-[15px] font-medium hover:bg-y-side-hover transition-colors duration-150">
              <MonitorDown size={17} className="text-y-side-muted flex-shrink-0" /> {t.downloadApp}
            </a>
          )}

          {session ? (
            <div className="flex items-center gap-3 p-2 rounded-xl">
              {session.user?.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={session.user.image} alt="" className="size-8 rounded-full flex-shrink-0" />
                : <div className="size-8 rounded-full bg-y-side-active flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {session.user?.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
              }
              <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                <span className="text-sm font-semibold truncate">{session.user?.name ?? t.user}</span>
                <span className="text-xs text-y-side-muted truncate">{session.user?.email}</span>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/' })} title={t.signOut} aria-label={t.signOut} className={`${SIDE_ICON_BTN} size-8 flex-shrink-0`}>
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLoginPopup(true)}
              className="w-full flex items-center gap-3 px-3 min-h-12 rounded-xl hover:bg-y-side-hover text-left transition-colors duration-150">
              <LogIn size={17} className="text-y-side-muted flex-shrink-0" />
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">{t.signIn}</span>
                <span className="block text-xs text-y-side-muted">{t.signInSub(userLimit)}</span>
              </span>
            </button>
          )}
          {usage && (
            <p className="px-3 pt-1 text-xs text-y-side-muted tabular-nums">{t.usageToday(Math.min(usage.used, usage.limit), usage.limit)}</p>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Mobile header */}
        <header className="flex items-center justify-between h-[52px] px-1.5 md:hidden border-b border-y-line">
          <div className="flex items-center gap-1 min-w-0">
            <button onClick={() => setSidebarOpen(true)} aria-label={t.openMenu} className={ICON_BTN}><Menu size={20} /></button>
            <span className="font-bold text-[15px] truncate">{activeConv?.title ?? 'YamanAI'}</span>
          </div>
          <div className="flex items-center flex-shrink-0">
            <Link href="/sss" aria-label={t.faq} className={ICON_BTN}><HelpCircle size={18} /></Link>
            <button onClick={() => setShowSettings(true)} aria-label={t.settings} className={ICON_BTN}><Settings size={18} /></button>
            <button onClick={startNewChat} aria-label={t.newChat} className={ICON_BTN}><Plus size={18} /></button>
          </div>
        </header>

        {/* Desktop header bar */}
        <div className={`hidden md:flex items-center justify-between gap-4 h-14 pl-8 pr-5 flex-shrink-0 border-b transition-colors duration-150 ${isEmpty ? 'border-transparent' : 'border-y-line'}`}>
          <span className="font-bold truncate">{isEmpty ? '' : activeConv?.title}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-sm font-medium text-y-muted mr-2">{modelShort}</span>
            <button onClick={toggleTheme} aria-label={settings.theme === 'dark' ? t.lightTheme : t.darkTheme} className={ICON_BTN}>
              {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span className={TOOLTIP_CLS} aria-hidden="true">{settings.theme === 'dark' ? t.lightTheme : t.darkTheme}</span>
            </button>
            <Link href="/sss" aria-label={t.faq} className={ICON_BTN}>
              <HelpCircle size={18} />
              <span className={TOOLTIP_CLS} aria-hidden="true">{t.faq}</span>
            </Link>
            <button onClick={() => setShowSettings(true)} aria-label={t.settings} className={ICON_BTN}>
              <Settings size={18} />
              <span className={TOOLTIP_CLS} aria-hidden="true">{t.settings}</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollerRef} onScroll={onScroll}
          className={`flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable_both-edges] ${isEmpty ? 'pb-[min(30dvh,280px)]' : 'pb-[196px] md:pb-[204px]'}`}>
          {isEmpty
            ? <WelcomeScreen name={firstName} onPromptClick={usePrompt} t={t} />
            : (
              <div ref={threadRef} className="max-w-[808px] mx-auto px-4 md:px-6 pt-7 flex flex-col gap-7" aria-live="polite" aria-busy={streamingHere}>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} fontSize={fontClass} fresh={freshIds.has(msg.id)} t={t}
                    onRetry={retryLast} isLast={msg.id === lastMsgId} busy={loading || exhausted} />
                ))}
              </div>
            )
          }
        </div>

        {/* Ebru plate + composer */}
        <div className={`y-plate-wrap absolute bottom-0 inset-x-0 z-10 pointer-events-none ${isEmpty ? 'h-[min(34dvh,300px)]' : 'h-[164px] md:h-[150px]'}`}>
          <EbruPlate seed={activeId || 'yamanai'} settled={Math.max(settledAnswers, 0)} streaming={streamingHere} theme={settings.theme} />
        </div>

        <div className="absolute bottom-0 inset-x-0 z-20 px-3 md:px-6 pb-3 pointer-events-none">
          <div className="max-w-[760px] mx-auto pointer-events-auto">
            {!atBottom && !isEmpty && (
              <div className="flex justify-center mb-2">
                <button type="button" onClick={jumpToBottom} aria-label={t.jumpBottom} title={t.jumpBottom}
                  className="size-10 rounded-full bg-y-raised text-y-ink flex items-center justify-center shadow-[0_4px_14px_rgb(7_12_30_/_0.25)] hover:bg-y-surface2 transition-colors duration-150">
                  <ArrowDown size={18} />
                </button>
              </div>
            )}

            {(undo || storageFull) && (
              <div role="status" className="y-toast flex items-center justify-between gap-4 mb-2 pl-4 pr-1.5 min-h-11 rounded-full bg-y-bubble text-y-bubble-ink text-[15px]">
                <span className="py-2">{undo ? undo.label : t.storageFull}</span>
                {undo && (
                  <button type="button" onClick={() => { setConversations(undo.prev); setActiveId(undo.activeId); setUndo(null); }}
                    className="min-h-9 px-3 rounded-full font-bold text-[#EBCB7E] hover:bg-white/10 transition-colors duration-150">
                    {t.undo}
                  </button>
                )}
              </div>
            )}

            {remaining !== null && remaining <= 3 && (
              <div role="status" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-2 pl-4 pr-1.5 py-1 min-h-11 rounded-3xl bg-y-bubble text-y-bubble-ink text-[15px]">
                <span className="py-1">
                  {!exhausted ? t.usageLeft(remaining)
                    : signedIn ? t.limitUser(usage!.limit, usage!.resetHours)
                    : t.limitGuest(usage!.limit)}
                </span>
                {!signedIn && (
                  <button type="button" onClick={requireLogin}
                    className="min-h-9 px-3 rounded-full font-bold text-[#EBCB7E] hover:bg-white/10 transition-colors duration-150">
                    {t.usageRaise(userLimit)}
                  </button>
                )}
              </div>
            )}

            <div className="relative flex items-end bg-y-surface rounded-[28px] border border-y-line-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-y-focus">
              <textarea ref={inputRef}
                aria-label={t.placeholder}
                dir="auto"
                disabled={exhausted}
                className="y-composer-input disabled:cursor-not-allowed block w-full bg-transparent text-y-ink pl-5 md:pl-6 pr-16 py-[18px] max-h-[240px] resize-none placeholder:text-y-subtle text-[16px] md:text-[17px] leading-[1.5]"
                placeholder={exhausted ? t.limitPlaceholder : t.placeholder}
                rows={1} value={input} onChange={handleInput} onKeyDown={handleKeyDown}
              />
              <button
                onClick={loading ? stopGeneration : () => sendMessage(input)}
                disabled={!loading && (!input.trim() || exhausted)}
                title={loading ? t.stop : t.send}
                aria-label={loading ? t.stop : t.send}
                className={`y-hit absolute right-2 bottom-2 size-11 flex items-center justify-center rounded-full transition-colors duration-150 ${
                  loading ? 'bg-y-bubble text-y-bubble-ink'
                  : input.trim() && !exhausted ? 'bg-y-accent hover:bg-y-accent-hover text-white'
                  : 'bg-y-surface2 text-y-subtle cursor-not-allowed'}`}>
                {loading ? <Square size={14} fill="currentColor" /> : <ArrowUp size={20} strokeWidth={2.5} />}
              </button>
            </div>

            <p className="mx-auto mt-2 w-fit max-w-full px-3 py-0.5 rounded-2xl bg-y-canvas text-center text-xs leading-snug text-y-muted">
              <span className="hidden sm:inline"><kbd className="font-sans font-bold">Enter</kbd> {t.hintSend} · <kbd className="font-sans font-bold">Shift + Enter</kbd> {t.hintLine} · </span>
              {t.disclosure}
            </p>
          </div>
        </div>
      </main>
    </div>
    </GateContext.Provider>
  );
}
