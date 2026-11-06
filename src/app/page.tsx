"use client";

import {
  useState, useRef, useEffect, useCallback, useMemo, memo, createContext, useContext, useSyncExternalStore, lazy, Suspense,
} from 'react';
import {
  Plus, Menu, X, MonitorDown, Copy, Check, Trash2, Play, Search,
  Settings, HelpCircle, Info, Sun, Moon, Download, Type, LogIn, LogOut,
  ArrowUp, ArrowDown, Square, RotateCcw, AlertCircle, Lock, Mic, Pencil, Upload, FileDown, WrapText, Pin, PinOff, WifiOff, Monitor, ChevronLeft, ChevronRight, ChevronsUpDown,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import EbruPlate from '@/components/EbruPlate';
import { LogoMark, ChatMark } from '@/components/Mark';
import { VoiceBar } from '@/components/VoiceBar';
import { useIsDesktopApp } from '@/lib/desktop';
import {
  type Message, type Conversation, type ConvMeta, LS_KEY, MAX_INPUT_CHARS, CODE_EXT, CODE_THEME, toApiHistory,
  uid, loadConversations, parseImport, groupByDate, reactPreviewDoc,
} from '@/lib/chat';
import { unlockAudio, voiceSupported, type TurnResult, type VoiceError } from '@/lib/voiceSession';
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

interface Usage {
  used: number;
  limit: number;
  guestLimit: number;
  userLimit: number;
  resetHours: number;
}

// Giris gerektiren ozellikler: sunucu da ayrica uygular, bu yalnizca arayuz icin
const GateContext = createContext<{ signedIn: boolean; requireLogin: () => void }>({ signedIn: false, requireLogin: () => {} });

export interface AppSettings {
  theme: 'system' | 'dark' | 'light';
  fontSize: 'sm' | 'base' | 'lg';
  model: 'gpt-4o' | 'gpt-4o-mini';
  systemPrompt: string;
  language: LangPref;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_POPUP      = 'hasSeenDesktopPopup';
const LS_MSG_COUNT  = 'yamanai_msg_count';
const LS_LOGIN_SEEN = 'yamanai_login_popup_seen';
const LS_DRAFT      = 'yamanai_draft';
const LOGIN_POPUP_AFTER = 3; // kac mesaj sonra login popup ciksin
const SEARCH_AFTER  = 6;     // kac sohbetten sonra arama kutusu gorunsun
const UNDO_MS       = 6000;
const PREVIEW_LANGS = new Set(['html', 'css', 'javascript', 'js', 'jsx', 'tsx']);
const DOWNLOAD_URL  = '/download/YamanAISetup.exe';
const GUEST_MODEL   = 'gpt-4o-mini';
const DEFAULT_GUEST_LIMIT = 10;
const DEFAULT_USER_LIMIT  = 50;

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
function toUsage(data: Omit<Usage, 'resetHours'> & { resetAt: number }): Usage {
  return {
    used: data.used, limit: data.limit, guestLimit: data.guestLimit, userLimit: data.userLimit,
    resetHours: Math.max(1, Math.ceil((data.resetAt - Date.now()) / 3_600_000)),
  };
}
const DARK_QUERY = '(prefers-color-scheme: dark)';
function subscribeScheme(cb: () => void) {
  const mq = matchMedia(DARK_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb); window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
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
    // Gizli (ornegin dosya secici) ya da tabIndex=-1 ogeler sayilmaz, yoksa Tab pencereden kacar
    const focusables = () => [...root.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),iframe')]
      .filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0);
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
  const [wrap, setWrap] = useState(false);
  const download = () => {
    const ext = CODE_EXT[language.toLowerCase()] ?? (/^\w{1,8}$/.test(language) ? language.toLowerCase() : 'txt');
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `yamanai.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };
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
            <button type="button" onClick={() => setWrap(w => !w)} aria-pressed={wrap} aria-label={t.wrapLines} title={t.wrapLines}
              className={`y-hit inline-flex items-center justify-center transition-colors duration-150 ${headerBtn} ${wrap ? 'text-white bg-white/10' : 'text-[#C4CBE4] hover:text-white'}`}>
              <WrapText size={14} />
            </button>
            <button type="button" onClick={download} aria-label={t.downloadCode} title={t.downloadCode}
              className={`y-hit inline-flex items-center justify-center text-[#C4CBE4] hover:text-white transition-colors duration-150 ${headerBtn}`}>
              <Download size={14} />
            </button>
            <CopyButton text={code} t={t} className={`text-[#C4CBE4] hover:text-white ${headerBtn}`} />
          </div>
        </div>
        <SyntaxHighlighter style={CODE_THEME} language={language || 'text'} PreTag="div" wrapLongLines={wrap}
          codeTagProps={{ style: { fontFamily: 'inherit', ...(wrap ? { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } : {}) } }}
          customStyle={{ margin: 0, padding: '1rem', fontSize: '13.5px', lineHeight: '1.65', borderRadius: 0, background: 'transparent', overflowX: wrap ? 'hidden' : 'auto', fontFamily: 'var(--font-code), ui-monospace, monospace' }}>
          {code}
        </SyntaxHighlighter>
      </div>
    </>
  );
});
CodeBlock.displayName = 'CodeBlock';

// ─── MarkdownRenderer ─────────────────────────────────────────────────────────

// Markdown kutuphanesi (~66 KB sikistirilmis) bos karsilama ekraninda gerekmez: yalnizca bir yanit
// gosterilecekken yuklenir. Yazi kutusuna odaklaninca onceden indirilmeye baslar.
let markdownModule: Promise<{ default: React.ComponentType<React.ComponentProps<typeof import('react-markdown').default>> }> | null = null;
function loadMarkdown() {
  markdownModule ??= Promise.all([import('react-markdown'), import('remark-gfm')]).then(([md, gfm]) => {
    const Markdown = md.default;
    const plugins = [gfm.default];
    const WithGfm = (props: React.ComponentProps<typeof Markdown>) => <Markdown remarkPlugins={plugins} {...props} />;
    return { default: WithGfm };
  });
  return markdownModule;
}
const ReactMarkdown = lazy(loadMarkdown);

const MarkdownRenderer = memo(({ content, fontSize, t }: { content: string; fontSize: string; t: Strings }) => (
  <div dir="auto" className={`y-prose text-y-ink ${fontSize} leading-[1.65] break-words`}>
    {/* Kutuphane gelene kadar metin duz gorunur, bos kalmaz */}
    <Suspense fallback={<p className="whitespace-pre-wrap">{content}</p>}>
    <ReactMarkdown components={{
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
    </Suspense>
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

const UserEditor = memo(({ initial, fontSize, t, onSubmit, onCancel }: {
  initial: string; fontSize: string; t: Strings; onSubmit: (text: string) => void; onCancel: () => void;
}) => {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const grow = (el: HTMLTextAreaElement) => { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 320)}px`; };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    grow(el); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const submit = () => { if (value.trim() && value.length <= MAX_INPUT_CHARS) onSubmit(value); };
  return (
    <div className="w-full md:max-w-[85%] ml-auto rounded-2xl bg-y-surface border border-y-line-strong p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-y-focus">
      <textarea ref={ref} dir="auto" value={value} aria-label={t.editMsg}
        onChange={e => { setValue(e.target.value); grow(e.target); }}
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
          else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
        }}
        className={`y-composer-input block w-full bg-transparent text-y-ink resize-none leading-[1.55] px-1 ${fontSize}`} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-y-muted px-1">{t.editHint}</span>
        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={onCancel} className="min-h-9 px-3.5 text-sm font-semibold text-y-muted hover:text-y-ink rounded-full hover:bg-y-surface2 transition-colors duration-150">{t.cancel}</button>
          <button type="button" onClick={submit} disabled={!value.trim() || value.length > MAX_INPUT_CHARS} className="min-h-9 px-4 text-sm font-bold text-white bg-y-accent hover:bg-y-accent-hover disabled:opacity-50 rounded-full transition-colors duration-150">{t.editSave}</button>
        </div>
      </div>
    </div>
  );
});
UserEditor.displayName = 'UserEditor';

/** Bugun yazildiysa yalnizca saat, daha eskiyse tarih ve saat */
const MsgTime = ({ at, lang }: { at?: number; lang: string }) => {
  if (!at) return null;
  const d = new Date(at);
  const sameDay = d.toDateString() === new Date().toDateString();
  const label = new Intl.DateTimeFormat(lang, sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  const full = new Intl.DateTimeFormat(lang, { dateStyle: 'full', timeStyle: 'short' }).format(d);
  return <time dateTime={d.toISOString()} title={full} className="px-1.5 text-xs text-y-subtle tabular-nums">{label}</time>;
};

const MessageBubble = memo(({ msg, fontSize, fresh, t, lang, onRetry, onEdit, onContinue, onVariant, isLast, busy }: {
  msg: Message; fontSize: string; fresh: boolean; t: Strings; lang: string; onRetry: () => void;
  onEdit: (id: string, text: string) => void; onContinue: () => void; onVariant: (id: string, index: number) => void; isLast: boolean; busy: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  if (msg.role === 'user') {
    if (editing) {
      return <UserEditor initial={msg.text} fontSize={fontSize} t={t} onCancel={() => setEditing(false)}
        onSubmit={text => { setEditing(false); onEdit(msg.id, text); }} />;
    }
    return (
      <div className={`group flex flex-col items-end ${fresh ? 'y-msg-new' : ''}`}>
        <div dir="auto" className={`max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 bg-y-bubble text-y-bubble-ink whitespace-pre-wrap break-words leading-[1.55] ${fontSize}`}>
          {msg.text}
        </div>
        <div className="mt-1 flex items-center gap-1 transition-opacity duration-150 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100">
          <MsgTime at={msg.at} lang={lang} />
          <CopyButton text={msg.text} showLabel={false} t={t} className="size-8 rounded-full text-y-subtle hover:text-y-ink hover:bg-y-surface2" />
          {!busy && (
            <button type="button" onClick={() => setEditing(true)} title={t.editMsg} aria-label={t.editMsg}
              className="y-hit size-8 inline-flex items-center justify-center rounded-full text-y-subtle hover:text-y-ink hover:bg-y-surface2 transition-colors duration-150">
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }
  const failed = msg.status && msg.status !== 'stopped';
  const waiting = !msg.text && !msg.status;
  // Surum gezgini: yeniden yanitlanmis yanitlarda onceki yanitlara donmeyi saglar
  const variants = msg.variants ?? [];
  const vi = msg.vi ?? variants.length - 1;
  const slots = variants.length + (vi >= variants.length ? 1 : 0); // basarisiz/akan yeni deneme de bir yer tutar
  const navBtn = 'y-hit size-8 inline-flex items-center justify-center rounded-full text-y-subtle hover:text-y-ink hover:bg-y-surface2 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-150';
  const variantNav = variants.length > 0 && slots > 1 && !waiting && (
    <div role="group" aria-label={t.versions} className="inline-flex items-center">
      <button type="button" onClick={() => onVariant(msg.id, vi - 1)} disabled={busy || vi <= 0} aria-label={t.prevVersion} title={t.prevVersion} className={navBtn}>
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-9 text-center text-xs font-semibold text-y-muted tabular-nums">{vi + 1}/{slots}</span>
      <button type="button" onClick={() => onVariant(msg.id, vi + 1)} disabled={busy || vi + 1 >= variants.length} aria-label={t.nextVersion} title={t.nextVersion} className={navBtn}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
  return (
    <div className={`group ${fresh ? 'y-msg-new' : ''}`}>
      {waiting ? <InkDrop label={t.typing} /> : msg.text ? <MarkdownRenderer content={msg.text} fontSize={fontSize} t={t} /> : null}

      {msg.status === 'stopped' && <p className="mt-2 text-sm text-y-subtle">{t.stopped}</p>}
      {msg.truncated && !msg.status && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-sm text-y-muted">{t.truncated}</span>
          {isLast && !busy && (
            <button type="button" onClick={onContinue}
              className="min-h-9 px-4 rounded-full border border-y-line-strong text-[15px] font-semibold hover:bg-y-surface2 transition-colors duration-150">
              {t.continueAnswer}
            </button>
          )}
        </div>
      )}
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
      {failed && variantNav && <div className="mt-1">{variantNav}</div>}

      {msg.text && !failed && (
        <div className={`mt-2 flex items-center gap-1 transition-opacity duration-150 ${isLast || variantNav ? '' : 'pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100'}`}>
          {variantNav}
          <CopyButton text={msg.text} showLabel={false} t={t} className="size-8 rounded-full text-y-subtle hover:text-y-ink hover:bg-y-surface2" />
          {isLast && !busy && (
            <button type="button" onClick={onRetry} title={t.regenerate} aria-label={t.regenerate}
              className="y-hit size-8 inline-flex items-center justify-center rounded-full text-y-subtle hover:text-y-ink hover:bg-y-surface2 transition-colors duration-150">
              <RotateCcw size={14} />
            </button>
          )}
          <MsgTime at={msg.at} lang={lang} />
        </div>
      )}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

// ─── WelcomeScreen ───────────────────────────────────────────────────────────

const WelcomeScreen = memo(({ onPromptClick, name, t }: { onPromptClick: (p: string) => void; name?: string; t: Strings }) => (
  <div className="min-h-full flex flex-col justify-center max-w-[760px] mx-auto px-4 md:px-6 pt-8 pb-6">
    <h1 className="text-[15px] font-bold text-y-muted mb-3">{t.brandLine}</h1>
    <p className="text-[32px] md:text-[44px] font-bold tracking-[-0.02em] leading-[1.1] text-balance">
      {name ? t.greetingName(name) : t.greeting}
    </p>
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

    {!name && (
      <section aria-labelledby="about-title" className="mt-8">
        <h2 id="about-title" className="font-bold">{t.aboutTitle}</h2>
        <p className="text-[15px] text-y-muted mt-1.5 leading-relaxed max-w-[65ch]">{t.aboutBody}</p>
      </section>
    )}
  </div>
));
WelcomeScreen.displayName = 'WelcomeScreen';

// ─── SidebarGroup ────────────────────────────────────────────────────────────

const RenameField = ({ initial, label, onDone }: { initial: string; label: string; onDone: (title: string | null) => void }) => {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = (v: string | null) => { if (done.current) return; done.current = true; onDone(v); };
  return (
    <li className="flex items-center h-10 w-full rounded-xl bg-y-side-active px-2">
      <input autoFocus aria-label={label} value={value} maxLength={80} dir="auto"
        onFocus={e => e.currentTarget.select()}
        onChange={e => setValue(e.target.value)}
        onBlur={() => finish(value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); finish(value); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); }
        }}
        className="w-full h-8 px-2 rounded-lg bg-y-side text-y-side-ink text-[15px] outline-2 outline-y-focus" />
    </li>
  );
};

const SidebarGroup = memo(({ label, convs, activeId, onSelect, onDelete, onRename, onPin, t }: {
  label: string; convs: ConvMeta[]; activeId: string;
  onSelect: (id: string) => void; onDelete: (id: string) => void; onRename: (id: string, title: string) => void;
  onPin: (id: string) => void; t: Strings;
}) => {
  const [renaming, setRenaming] = useState<string | null>(null);
  if (!convs.length) return null;
  return (
    <div className="mb-2">
      <p className="text-[13px] font-bold text-y-side-muted mt-4 mb-1.5 px-3">{label}</p>
      <ul className="space-y-0.5">
        {convs.map(c => {
          const isActive = c.id === activeId;
          if (renaming === c.id) {
            return <RenameField key={c.id} initial={c.title} label={t.renameChat}
              onDone={title => { setRenaming(null); if (title?.trim() && title.trim() !== c.title) onRename(c.id, title.trim()); }} />;
          }
          // Dugmeler satirin sagina biner, yer kaplamaz: fareyle uzerine gelince ya da klavyeyle odaklaninca,
          // dokunmatik ekranda yalnizca secili sohbette gorunur. Boylece basliklar tam genislikte okunur.
          const reveal = isActive
            ? 'pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100'
            : 'pointer-coarse:hidden opacity-0 group-hover:opacity-100 group-focus-within:opacity-100';
          const btn = `size-8 flex items-center justify-center rounded-full text-y-side-muted hover:text-y-side-ink transition-colors duration-150 ${isActive ? 'hover:bg-y-side-hover' : 'hover:bg-y-side-active'}`;
          return (
            <li key={c.id} className={`group relative flex items-center h-10 w-full rounded-xl transition-colors duration-150 ${isActive ? 'bg-y-side-active' : 'hover:bg-y-side-hover'}`}>
              <button type="button" onClick={() => onSelect(c.id)} aria-current={isActive ? 'true' : undefined}
                className={`flex-1 h-full flex items-center gap-2.5 pl-3 pr-2 text-[15px] text-left min-w-0 rounded-xl ${isActive ? 'text-y-side-ink font-bold' : 'text-y-side-ink/85'}`}>
                <ChatMark id={c.id} />
                <span className="truncate">{c.title}</span>
              </button>
              <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center rounded-full transition-opacity duration-150 ${isActive ? 'bg-y-side-active' : 'bg-y-side-hover'} ${reveal}`}>
                <button type="button" onClick={() => onPin(c.id)} aria-pressed={!!c.pinned}
                  title={c.pinned ? t.unpinChat : t.pinChat} aria-label={`${c.pinned ? t.unpinChat : t.pinChat}: ${c.title}`} className={btn}>
                  {c.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
                <button type="button" onClick={() => setRenaming(c.id)} title={t.renameChat} aria-label={`${t.renameChat}: ${c.title}`} className={btn}>
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => onDelete(c.id)} title={t.deleteChat} aria-label={`${t.deleteChat}: ${c.title}`} className={btn}>
                  <Trash2 size={14} />
                </button>
              </div>
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

const SettingsModal = memo(({ settings, onSave, onClose, onDeleteAll, onExport, onImport, t, usage }: {
  settings: AppSettings; onSave: (s: AppSettings) => void;
  onClose: () => void; onDeleteAll: () => void; onExport: () => void; onImport: (file: File) => void; t: Strings; usage: Usage | null;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
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
        <div className="px-5 sm:px-6 py-6 space-y-6 overflow-y-auto overscroll-contain">
          <div>
            <span className={groupLabel}>{t.theme}</span>
            <Segmented label={t.theme} value={local.theme} onChange={v => patch('theme', v)} options={[
              { value: 'system', label: t.system, icon: <Monitor size={16} /> },
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
                className="w-full bg-y-surface border border-y-line-strong rounded-xl p-3 text-base text-y-ink placeholder:text-y-subtle focus:border-y-ink resize-none transition-colors duration-150" />
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
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 w-full min-h-11 flex items-center justify-center gap-2 px-4 rounded-full border border-y-line-strong text-y-ink hover:bg-y-surface2 text-[15px] font-semibold transition-colors duration-150">
              <Upload size={16} /> {t.importChats}
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" tabIndex={-1} aria-hidden="true"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { onImport(f); onClose(); } }} />
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
  const isDesktopApp = useIsDesktopApp();
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
  const [canUseVoice, setCanUseVoice]           = useState(false);
  // Sesli sohbet aciksa, tiklamayla acilmis ses ogesini tutar
  const [voiceAudio, setVoiceAudio]             = useState<HTMLAudioElement | null>(null);
  const [voiceNotice, setVoiceNotice]           = useState<VoiceError | null>(null);
  const [notice, setNotice]                     = useState<string | null>(null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const systemDark = useSyncExternalStore(subscribeScheme, () => matchMedia(DARK_QUERY).matches, () => false);
  // "Sistem" secildiyse isletim sisteminin temasini anlik izler
  const theme: 'dark' | 'light' = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;
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
  const tooLong      = input.length > MAX_INPUT_CHARS;
  const requireLogin = useCallback(() => { setShowSettings(false); setShowLoginPopup(true); }, []);
  const gate         = useMemo(() => ({ signedIn, requireLogin }), [signedIn, requireLogin]);
  // Plaka biten her yanitla buyur; akan yanit, bitene kadar sayilmaz
  const settledAnswers = messages.filter(m => m.role === 'ai').length - (streamingHere ? 1 : 0);

  // Kenar cubugu yalnizca baslik, tarih ve sabitleme bilgisini kullanir. Akan yanit her jetonda
  // sohbet nesnesini yeniler; imza degismedikce liste ayni dizi kalir ve yeniden cizilmez.
  const listSig = JSON.stringify(conversations.map(c => [c.id, c.title, c.updatedAt, c.pinned ? 1 : 0]));
  const listMeta = useMemo<ConvMeta[]>(() => (JSON.parse(listSig) as [string, string, number, number][])
    .map(([id, title, updatedAt, pin]) => ({ id, title, updatedAt, pinned: !!pin })), [listSig]);
  // Arama kutusu gizliyken eski arama listeyi suzmeye devam etmesin
  const query = conversations.length >= SEARCH_AFTER ? search.trim().toLocaleLowerCase(lang) : '';
  const matchIds = useMemo(() => (!query ? null : new Set(conversations
    .filter(c => c.title.toLocaleLowerCase(lang).includes(query) || c.messages.some(m => m.text.toLocaleLowerCase(lang).includes(query)))
    .map(c => c.id))), [conversations, query, lang]);
  const visible = useMemo(() => {
    const sorted = [...listMeta].sort((a, b) => b.updatedAt - a.updatedAt);
    return matchIds ? sorted.filter(c => matchIds.has(c.id)) : sorted;
  }, [listMeta, matchIds]);
  const { pinned, today, yesterday, older } = useMemo(() => groupByDate(visible), [visible]);

  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    setActiveId(loaded[0] ? [...loaded].sort((a, b) => b.updatedAt - a.updatedAt)[0].id : '');
    setSettings(loadSettings());
    setDesktopOffer(offersDesktopApp());
    setCanUseVoice(voiceSupported());
    try {
      const draft = localStorage.getItem(LS_DRAFT);
      if (draft) {
        setInput(draft);
        requestAnimationFrame(() => { const el = inputRef.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 240)}px`; } });
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Gonderilmemis metin sayfa yenilense de kaybolmasin
  useEffect(() => {
    if (!hydrated) return;
    const handle = setTimeout(() => {
      try { if (input.trim()) localStorage.setItem(LS_DRAFT, input); else localStorage.removeItem(LS_DRAFT); } catch {}
    }, 300);
    return () => clearTimeout(handle);
  }, [input, hydrated]);

  // Masaustu uygulamasi girissiz kullanilamaz (cikis yapilinca ya da oturum dolunca da gecerli)
  useEffect(() => {
    if (isDesktopApp && sessionStatus === 'unauthenticated') window.location.replace('/giris');
  }, [isDesktopApp, sessionStatus]);

  // Yukleme bitmeden yazma: aksi halde kayitli sohbetlerin ustune bos liste yazilir.
  // Her jetonda degil, yazma durulunca kaydet.
  useEffect(() => {
    if (!hydrated) return;
    let pending = true;
    const save = () => {
      // Yalnizca bekleyen degisikligi yaz: kapanan eski sekme diger sekmenin kaydini ezmesin
      if (!pending) return;
      pending = false;
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
    notifySettingsChanged();
  }, [settings, hydrated]);

  useEffect(() => {
    if (hydrated) document.documentElement.dataset.theme = theme;
  }, [theme, hydrated]);

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
    if (!el) return;
    // Karsilama ekrani uzun olabilir, her zaman en ustten baslasin
    if (messages.length === 0) el.scrollTop = 0;
    else if (stuckRef.current) el.scrollTop = el.scrollHeight;
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

  // Son listeyi ref'ten okur: boylece her jetonda yeni bir fonksiyon olusup kenar cubugunu cizdirmez
  const convsRef = useRef(conversations);
  useEffect(() => { convsRef.current = conversations; }, [conversations]);
  const deleteConversation = useCallback((id: string) => {
    offerUndo(t.deleted, convsRef.current);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (id === activeId) setActiveId('');
  }, [activeId, offerUndo, t.deleted]);

  const togglePin = useCallback((id: string) => {
    setConversations(prev => prev.map(c => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    // updatedAt degismez: yeniden adlandirmak sohbeti listenin basina tasimasin
    setConversations(prev => prev.map(c => (c.id === id ? { ...c, title, renamed: true } : c)));
  }, []);

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

  const exportActiveChat = useCallback(() => {
    if (!activeConv) return;
    const body = activeConv.messages
      .filter(m => m.text)
      .map(m => (m.role === 'user' ? `### ${t.you}\n\n${m.text}` : `### YamanAI\n\n${m.text}`))
      .join('\n\n---\n\n');
    const md = `# ${activeConv.title}\n\n${body}\n`;
    const slug = activeConv.title.toLocaleLowerCase(lang).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sohbet';
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `yamanai-${slug}.md`; a.click();
    URL.revokeObjectURL(url);
  }, [activeConv, t.you, lang]);

  // Ayni kimlikli sohbet varsa yerel olan korunur; yalnizca yeni olanlar eklenir
  const importConversations = useCallback(async (file: File) => {
    const parsed = file.size > 20_000_000 ? null : parseImport(await file.text().catch(() => ''));
    if (!parsed) { setNotice(t.importFailed); return; }
    const known = new Set(conversations.map(c => c.id));
    const fresh = parsed.filter(c => !known.has(c.id));
    if (fresh.length) setConversations(prev => [...prev, ...fresh.filter(c => !prev.some(p => p.id === c.id))]);
    setNotice(t.imported(fresh.length));
  }, [t, conversations]);

  useEffect(() => {
    if (!notice) return;
    const handle = setTimeout(() => setNotice(null), UNDO_MS);
    return () => clearTimeout(handle);
  }, [notice]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Yaniti akitir. `base`, modele gonderilecek mesajlardir (son mesaj kullanicinin).
  const runCompletion = useCallback(async (conv: Conversation, base: Message[], onVoiceDelta?: (delta: string) => void, earlier?: string[]): Promise<TurnResult> => {
    let result: TurnResult = 'ok';
    const aiId = uid();
    const convId = conv.id;
    setFreshIds(prev => new Set(prev).add(aiId));
    setConversations(prev => {
      const next: Conversation = { ...conv, messages: [...base, { id: aiId, role: 'ai', text: '', at: Date.now(), ...(earlier?.length ? { variants: earlier, vi: earlier.length } : {}) }], updatedAt: Date.now() };
      const idx = prev.findIndex(c => c.id === convId);
      if (idx === -1) return [next, ...prev];
      const copy = [...prev]; copy[idx] = next; return copy;
    });
    setLoading(true); setStreamConvId(convId);
    stuckRef.current = true; setAtBottom(true);

    const patchAi = (patch: Partial<Message>) => {
      setConversations(prev => prev.map(c => c.id !== convId ? c : {
        // updatedAt yanit basinda ayarlandi: her jetonda degistirmek kenar cubugunu bosuna cizdirir
        ...c, messages: c.messages.map(m => m.id === aiId ? { ...m, ...patch } : m),
      }));
    };

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const history = toApiHistory(base);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, model: effectiveModel, customSystemPrompt: (signedIn && settings.systemPrompt) || undefined, voice: !!onVoiceDelta }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        const code = data?.error;
        if (code === 'daily_limit') setUsage(toUsage(data));
        const known = ['rate_limited', 'not_configured', 'daily_limit', 'upstream_failed'] as const;
        patchAi({ status: (known as readonly string[]).includes(code) ? code : 'generic' });
        return code === 'daily_limit' ? 'daily_limit' : 'failed';
      }
      const usedNow = Number(res.headers.get('X-Usage-Used'));
      if (usedNow) setUsage(prev => prev && { ...prev, used: usedNow });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let acc = '', buffer = '', truncated = false;
      const onLine = (raw: string) => {
        const line = raw.trim();
        if (!line.startsWith('data:')) return;
        const js = line.slice(5).trim();
        if (!js || js === '[DONE]') return;
        try {
          const data = JSON.parse(js);
          if (data.finish === 'length') { truncated = true; return; }
          const d: string = data.delta ?? '';
          if (d) { acc += d; patchAi({ text: acc }); onVoiceDelta?.(d); }
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
      if (!acc) { patchAi({ status: 'generic' }); result = 'failed'; }
      else {
        // Yeniden yanitlandiysa onceki yanitlar kaybolmaz: hepsi surum olarak saklanir
        if (earlier?.length) patchAi({ variants: [...earlier, acc], vi: earlier.length });
        if (truncated) patchAi({ truncated: true });
      }
    } catch (err: unknown) {
      const aborted = (err as Error)?.name === 'AbortError';
      patchAi({ status: aborted ? 'stopped' : 'network' });
      result = aborted ? 'stopped' : 'failed';
    } finally {
      setLoading(false); setStreamConvId(null);
      abortControllerRef.current = null;
      if (!onVoiceDelta) focusInput();
    }
    return result;
  }, [effectiveModel, signedIn, settings.systemPrompt, focusInput]);

  const sendMessage = useCallback((text: string, onVoiceDelta?: (delta: string) => void): Promise<TurnResult> => {
    const trimmed = text.trim();
    if (exhausted) return Promise.resolve('daily_limit');
    if (!trimmed || loading || trimmed.length > MAX_INPUT_CHARS) return Promise.resolve('failed');

    // Mesaj sayacini artir (login popup icin)
    if (!session) {
      const count = parseInt(localStorage.getItem(LS_MSG_COUNT) ?? '0', 10);
      localStorage.setItem(LS_MSG_COUNT, String(count + 1));
    }

    const conv: Conversation = conversations.find(c => c.id === activeId)
      ?? { id: uid(), title: trimmed.slice(0, 50), messages: [], updatedAt: Date.now() };
    const userMsg: Message = { id: uid(), role: 'user', text: trimmed, at: Date.now() };
    setFreshIds(prev => new Set(prev).add(userMsg.id));
    setActiveId(conv.id);
    resetInput();
    return runCompletion(conv, [...conv.messages, userMsg], onVoiceDelta);
  }, [loading, exhausted, activeId, conversations, resetInput, runCompletion, session]);

  // Mikrofon dugmesi: giris yoksa giris penceresi acilir, sunucu da ayrica giris ister
  const startVoice = useCallback(() => {
    if (!signedIn) { requireLogin(); return; }
    setVoiceNotice(null);
    setVoiceAudio(unlockAudio());
  }, [signedIn, requireLogin]);

  const endVoice = useCallback((error?: VoiceError) => {
    setVoiceAudio(null);
    setVoiceNotice(error ?? null);
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (!voiceNotice) return;
    const handle = setTimeout(() => setVoiceNotice(null), UNDO_MS);
    return () => clearTimeout(handle);
  }, [voiceNotice]);

  // Oturum kapanirsa mikrofon acik kalmasin
  useEffect(() => {
    if (!signedIn) setVoiceAudio(null);
  }, [signedIn]);

  // Son yaniti at ve ayni soruyu tekrar sor (hata sonrasi da bunu kullanir)
  const retryLast = useCallback(() => {
    if (loading || exhausted || !activeConv) return;
    const msgs = activeConv.messages;
    if (msgs[msgs.length - 1]?.role !== 'ai') return;
    const last = msgs[msgs.length - 1];
    const prev = last.variants?.length ? last.variants : last.text && !last.status ? [last.text] : [];
    void runCompletion(activeConv, msgs.slice(0, -1), undefined, prev);
  }, [loading, exhausted, activeConv, runCompletion]);

  // Yanit surumleri arasinda gecis: gosterilen surum modele giden gecmise de o haliyle girer
  const selectVariant = useCallback((id: string, index: number) => {
    setConversations(prev => prev.map(c => c.id !== activeId ? c : {
      ...c, messages: c.messages.map(m => {
        if (m.id !== id || m.variants?.[index] === undefined) return m;
        // Secilen surum tamamlanmis bir yanittir: hata ve kesilme isaretleri o surume ait degil
        return { ...m, text: m.variants[index], vi: index, status: undefined, truncated: undefined };
      }),
    }));
  }, [activeId]);

  // Kesilen yanit: gorunur bir "devam et" mesajiyla model kaldigi yerden surdurur
  const continueAnswer = useCallback(() => { void sendMessage(t.continuePrompt); }, [sendMessage, t.continuePrompt]);

  // Bir kullanici mesajini duzenle: ondan sonraki her sey atilir, yanit yeniden uretilir
  const editMessage = useCallback((id: string, text: string) => {
    const trimmed = text.trim();
    if (loading || exhausted || !activeConv || !trimmed) return;
    const idx = activeConv.messages.findIndex(m => m.id === id);
    if (idx === -1) return;
    const edited: Message = { id: uid(), role: 'user', text: trimmed, at: Date.now() };
    setFreshIds(prev => new Set(prev).add(edited.id));
    const title = idx === 0 && !activeConv.renamed ? trimmed.slice(0, 50) : activeConv.title;
    void runCompletion({ ...activeConv, title }, [...activeConv.messages.slice(0, idx), edited]);
  }, [loading, exhausted, activeConv, runCompletion]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: Japonca, Cince gibi dillerde Enter secimi onaylar, mesaji gondermez
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void sendMessage(input); }
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
      // Sesli sohbette Escape sesli sohbeti kapatir, bu yuzden orada yaniti durdurmaz
      else if (loading && !voiceAudio && !e.defaultPrevented) stopGeneration();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSettings, showLoginPopup, showDesktopPopup, sidebarOpen, closeLoginPopup, closeDesktopPopup, loading, voiceAudio, stopGeneration]);

  // Kisayollar: Ctrl/Cmd+Shift+O yeni sohbet, "/" yazi kutusuna odaklanir
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); startNewChat(); return; }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        // Arama kutusu yalnizca yeterince sohbet varken gorunur; yoksa tarayicinin kisayolu calissin
        const box = document.getElementById('chat-search') as HTMLInputElement | null;
        if (!box) return;
        e.preventDefault();
        // Cekmece yalnizca dar ekranda vardir; genis ekranda acik isaretlemek daraltinca kendiliginden acar
        if (matchMedia('(max-width: 767px)').matches) setSidebarOpen(true);
        requestAnimationFrame(() => { box.focus(); box.select(); });
        return;
      }
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startNewChat]);

  // Baska sekmede yapilan degisiklikleri al; akan yanit varken bu sekmenin hali korunur
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_KEY || loading) return;
      const next = loadConversations();
      setConversations(next);
      setActiveId(id => (id && !next.some(c => c.id === id) ? '' : id));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loading]);

  const modelShort = MODEL_SHORT_MAP[effectiveModel];
  const toggleTheme = () => setSettings(s => ({ ...s, theme: theme === 'dark' ? 'light' : 'dark' }));
  const isEmpty = messages.length === 0;
  const hasChats = conversations.length > 0;

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Masaustunde oturum dogrulanana kadar sohbet gosterilmez
  if (isDesktopApp && sessionStatus !== 'authenticated') return <div className="h-dvh bg-y-canvas" />;

  return (
    <GateContext.Provider value={gate}>
    <div className="flex h-dvh bg-y-canvas text-y-ink font-sans overflow-hidden relative">
      <a href="#composer" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2.5 focus:rounded-full focus:bg-y-bubble focus:text-y-bubble-ink focus:font-bold">{t.skipToInput}</a>
      {showLoginPopup && !session && <LoginPopup onClose={closeLoginPopup} t={t} guestLimit={guestLimit} userLimit={userLimit} />}

      {showSettings && (
        <SettingsModal settings={settings} onSave={setSettings} onClose={() => setShowSettings(false)}
          onDeleteAll={deleteAllConversations} onExport={exportConversations} onImport={importConversations} t={t} usage={usage} />
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
            <span translate="no" className="font-extrabold text-xl tracking-tight">YamanAI</span>
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
              className="w-full h-10 pl-9 pr-3 rounded-full bg-y-side-hover text-y-side-ink placeholder:text-y-side-muted text-[15px] [&::-webkit-search-cancel-button]:appearance-none" />
          </div>
        )}

        <nav aria-label={t.history} className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          <SidebarGroup label={t.pinned}    convs={pinned}    activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} onRename={renameConversation} onPin={togglePin} t={t} />
          <SidebarGroup label={t.today}     convs={today}     activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} onRename={renameConversation} onPin={togglePin} t={t} />
          <SidebarGroup label={t.yesterday} convs={yesterday} activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} onRename={renameConversation} onPin={togglePin} t={t} />
          <SidebarGroup label={t.older}     convs={older}     activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} onRename={renameConversation} onPin={togglePin} t={t} />
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
                ? <img src={session.user.image} alt="" width={32} height={32} referrerPolicy="no-referrer" className="size-8 rounded-full flex-shrink-0" />
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
            <a href="/hakkinda" aria-label={t.about} className={ICON_BTN}><Info size={18} /></a>
            <Link href="/sss" aria-label={t.faq} className={ICON_BTN}><HelpCircle size={18} /></Link>
            <button onClick={() => setShowSettings(true)} aria-label={t.settings} className={ICON_BTN}><Settings size={18} /></button>
            <button onClick={startNewChat} aria-label={t.newChat} className={ICON_BTN}><Plus size={18} /></button>
          </div>
        </header>

        {/* Desktop header bar */}
        <div className={`hidden md:flex items-center justify-between gap-4 h-14 pl-8 pr-5 flex-shrink-0 border-b transition-colors duration-150 ${isEmpty ? 'border-transparent' : 'border-y-line'}`}>
          <span className="font-bold truncate">{isEmpty ? '' : activeConv?.title}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Model degistirici: girisliyse iki model arasinda gecer, degilse giris penceresini acar (GPT-4o giris ister) */}
            <button type="button" onClick={signedIn ? () => setSettings(s => ({ ...s, model: s.model === 'gpt-4o' ? 'gpt-4o-mini' : 'gpt-4o' })) : requireLogin}
              title={signedIn ? t.switchModel(MODEL_SHORT_MAP[effectiveModel === 'gpt-4o' ? 'gpt-4o-mini' : 'gpt-4o']) : t.modelLocked}
              aria-label={`${modelShort}. ${signedIn ? t.switchModel(MODEL_SHORT_MAP[effectiveModel === 'gpt-4o' ? 'gpt-4o-mini' : 'gpt-4o']) : t.modelLocked}`}
              className="mr-1 min-h-9 px-3 inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-y-muted hover:text-y-ink hover:bg-y-surface2 transition-colors duration-150">
              {modelShort}
              {signedIn ? <ChevronsUpDown size={14} aria-hidden="true" /> : <Lock size={12} aria-hidden="true" />}
            </button>
            {!isEmpty && (
              <button onClick={exportActiveChat} aria-label={t.exportChat} className={ICON_BTN}>
                <FileDown size={18} />
                <span className={TOOLTIP_CLS} aria-hidden="true">{t.exportChat}</span>
              </button>
            )}
            <button onClick={toggleTheme} aria-label={theme === 'dark' ? t.lightTheme : t.darkTheme} className={ICON_BTN}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span className={TOOLTIP_CLS} aria-hidden="true">{theme === 'dark' ? t.lightTheme : t.darkTheme}</span>
            </button>
            {/* Duz HTML sayfasi oldugu icin Link degil, normal baglanti */}
            <a href="/hakkinda" aria-label={t.about} className={ICON_BTN}>
              <Info size={18} />
              <span className={TOOLTIP_CLS} aria-hidden="true">{t.about}</span>
            </a>
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
                  <MessageBubble key={msg.id} msg={msg} fontSize={fontClass} fresh={freshIds.has(msg.id)} t={t} lang={lang}
                    onRetry={retryLast} onEdit={editMessage} onContinue={continueAnswer} onVariant={selectVariant} isLast={msg.id === lastMsgId} busy={loading || exhausted} />
                ))}
              </div>
            )
          }
        </div>

        {/* Ebru plate + composer */}
        <div className={`y-plate-wrap absolute bottom-0 inset-x-0 z-10 pointer-events-none ${isEmpty ? 'h-[min(34dvh,300px)]' : 'h-[164px] md:h-[150px]'}`}>
          <EbruPlate seed={activeId || 'yamanai'} settled={Math.max(settledAnswers, 0)} streaming={streamingHere} theme={theme} />
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

            {(undo || storageFull || voiceNotice || notice) && (
              <div role="status" className="y-toast flex items-center justify-between gap-4 mb-2 pl-4 pr-1.5 min-h-11 rounded-3xl bg-y-bubble text-y-bubble-ink text-[15px]">
                <span className="py-2">{undo ? undo.label : voiceNotice ? t.voiceErrors[voiceNotice] : notice ?? t.storageFull}</span>
                {undo && (
                  <button type="button" onClick={() => { setConversations(undo.prev); setActiveId(undo.activeId); setUndo(null); }}
                    className="min-h-9 px-3 rounded-full font-bold text-[#EBCB7E] hover:bg-white/10 transition-colors duration-150">
                    {t.undo}
                  </button>
                )}
              </div>
            )}

            {!online && (
              <div role="status" className="flex items-center gap-2.5 mb-2 pl-4 pr-4 py-1 min-h-11 rounded-3xl bg-y-bubble text-y-bubble-ink text-[15px]">
                <WifiOff size={16} aria-hidden="true" className="flex-shrink-0 text-[#EBCB7E]" />
                <span className="py-1">{t.offline}</span>
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

            {voiceAudio ? (
              <VoiceBar audio={voiceAudio} t={t} onTurn={sendMessage} stopTurn={stopGeneration} onEnd={endVoice} />
            ) : (
            <div className="relative flex items-end bg-y-surface rounded-[28px] border border-y-line-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-y-focus">
              <textarea ref={inputRef} id="composer"
                aria-label={t.placeholder}
                dir="auto"
                disabled={exhausted}
                className={`y-composer-input disabled:cursor-not-allowed block w-full bg-transparent text-y-ink pl-5 md:pl-6 ${canUseVoice ? 'pr-[108px]' : 'pr-16'} py-[18px] max-h-[240px] resize-none placeholder:text-y-subtle text-[16px] md:text-[17px] leading-[1.5]`}
                placeholder={exhausted ? t.limitPlaceholder : t.placeholder}
                rows={1} value={input} onChange={handleInput} onKeyDown={handleKeyDown} onFocus={() => void loadMarkdown()}
              />
              {canUseVoice && (
                <button type="button" onClick={startVoice} disabled={loading || exhausted}
                  title={signedIn ? t.voiceStart : t.voiceLocked} aria-label={signedIn ? t.voiceStart : t.voiceLocked}
                  className="y-hit absolute right-[60px] bottom-2 size-11 flex items-center justify-center rounded-full text-y-muted hover:text-y-ink hover:bg-y-surface2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150">
                  <Mic size={20} />
                  {!signedIn && <Lock size={11} strokeWidth={2.5} aria-hidden="true" className="absolute right-1.5 bottom-1.5" />}
                </button>
              )}
              <button
                onClick={loading ? stopGeneration : () => void sendMessage(input)}
                disabled={!loading && (!input.trim() || exhausted || tooLong)}
                title={loading ? t.stop : t.send}
                aria-label={loading ? t.stop : t.send}
                className={`y-hit absolute right-2 bottom-2 size-11 flex items-center justify-center rounded-full transition-colors duration-150 ${
                  loading ? 'bg-y-bubble text-y-bubble-ink'
                  : input.trim() && !exhausted && !tooLong ? 'bg-y-accent hover:bg-y-accent-hover text-white'
                  : 'bg-y-surface2 text-y-subtle cursor-not-allowed'}`}>
                {loading ? <Square size={14} fill="currentColor" /> : <ArrowUp size={20} strokeWidth={2.5} />}
              </button>
            </div>
            )}

            <p aria-live="polite" className={`mx-auto mt-2 w-fit max-w-full px-3 py-0.5 rounded-2xl bg-y-canvas text-center text-xs leading-snug ${tooLong ? 'text-y-danger font-semibold' : 'text-y-muted'}`}>
              {!voiceAudio && input.length > MAX_INPUT_CHARS * 0.85 ? (
                <span className="tabular-nums">{tooLong ? t.tooLong(input.length - MAX_INPUT_CHARS) : t.charCount(input.length, MAX_INPUT_CHARS)}</span>
              ) : voiceAudio ? t.voiceDisclosure : (
                <>
                  <span className="hidden sm:inline"><kbd className="font-sans font-bold">Enter</kbd> {t.hintSend} · <kbd className="font-sans font-bold">Shift + Enter</kbd> {t.hintLine} · </span>
                  {t.disclosure}
                </>
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
    </GateContext.Provider>
  );
}
