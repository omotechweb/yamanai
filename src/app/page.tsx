"use client";

import {
  useState, useRef, useEffect, useCallback, useMemo, memo,
} from 'react';
import {
  Send, User, Bot, Plus, StopCircle, Menu, X,
  Monitor, MonitorDown, Copy, Check, ChevronRight, ChevronDown,
  Sparkles, Trash2, MessageSquare, Play, ExternalLink,
  Settings, HelpCircle, Sun, Moon, Download, Type,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

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
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_KEY      = 'yamanai_conversations';
const LS_POPUP    = 'hasSeenDesktopPopup';
const LS_SETTINGS = 'yamanai_settings';
const PREVIEW_LANGS = new Set(['html', 'css', 'javascript', 'js', 'jsx', 'tsx']);

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 'sm',
  model: 'gpt-4o',
  systemPrompt: '',
};

const SUGGESTED_PROMPTS = [
  { label: 'Kod yaz',    prompt: 'Python ile basit bir web scraper yazar misin?' },
  { label: 'Acikla',     prompt: 'Kuantum bilgisayarlari nasil calisir?' },
  { label: 'Cevir',      prompt: 'Su metni Ingilizceye cevir: "Merhaba dunya!"' },
  { label: 'Fikir uret', prompt: 'Bir mobil uygulama icin 5 yaratici isim oner.' },
];

const FONT_SIZE_MAP = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' };
const FONT_LABEL_MAP = { sm: 'Kucuk', base: 'Normal', lg: 'Buyuk' };
const MODEL_LABEL_MAP = { 'gpt-4o': 'GPT-4o (Guclu)', 'gpt-4o-mini': 'GPT-4o Mini (Hizli)' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); }
  catch { return []; }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(convs));
}

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
}

function groupByDate(convs: Conversation[]) {
  const now = Date.now();
  const DAY = 86_400_000;
  return {
    today:     convs.filter(c => now - c.updatedAt < DAY),
    yesterday: convs.filter(c => now - c.updatedAt >= DAY && now - c.updatedAt < 2 * DAY),
    older:     convs.filter(c => now - c.updatedAt >= 2 * DAY),
  };
}

// ─── Theme helpers ───────────────────────────────────────────────────────────

function themeClasses(theme: 'dark' | 'light') {
  return theme === 'dark'
    ? { bg: 'bg-[#212121]', sidebar: 'bg-[#171717]', input: 'bg-[#2f2f2f]', text: 'text-gray-100', textMuted: 'text-gray-400', border: 'border-gray-800', msgAlt: 'bg-white/[0.03]' }
    : { bg: 'bg-[#f5f5f5]', sidebar: 'bg-white', input: 'bg-white', text: 'text-gray-900', textMuted: 'text-gray-500', border: 'border-gray-200', msgAlt: 'bg-gray-100' };
}

// ─── CopyButton ──────────────────────────────────────────────────────────────

const CopyButton = memo(({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch {}
  }, [text]);
  return (
    <button onClick={handle} className="flex items-center gap-1 text-gray-500 hover:text-gray-200 transition-colors text-[10px] uppercase tracking-widest font-bold" aria-label="Kodu kopyala">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      {copied ? 'Kopyalandi' : 'Kopyala'}
    </button>
  );
});
CopyButton.displayName = 'CopyButton';

// ─── LivePreviewModal ─────────────────────────────────────────────────────────

const LivePreviewModal = memo(({ code, lang, onClose }: {
  code: string; lang: string; onClose: () => void;
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => {
    const l = lang.toLowerCase();
    if (l === 'css') return `<html><head><style>${code}</style></head><body style="background:#1a1a1a;padding:2rem"><p style="font-family:sans-serif;color:#888">CSS onizleme</p></body></html>`;
    if (l === 'javascript' || l === 'js') return `<html><body style="background:#111;color:#eee;font-family:monospace;padding:1rem"><script>${code}<\/script></body></html>`;
    return code;
  }, [code, lang]);
  useEffect(() => { if (iframeRef.current) iframeRef.current.srcdoc = srcDoc; }, [srcDoc]);
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-4xl h-[80vh] bg-[#111] border border-gray-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Play size={14} className="text-green-400" />
            <span className="font-semibold">Canli Onizleme</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">{lang}</span>
          </div>
          <div className="flex items-center gap-1">
            <a href={`data:text/html;charset=utf-8,${encodeURIComponent(srcDoc)}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Yeni sekmede ac"><ExternalLink size={15} /></a>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Kapat"><X size={17} /></button>
          </div>
        </div>
        <iframe ref={iframeRef} sandbox="allow-scripts allow-same-origin allow-modals" className="flex-1 w-full bg-white" title="Canli Onizleme" />
      </div>
    </div>
  );
});
LivePreviewModal.displayName = 'LivePreviewModal';

// ─── CodeBlock ───────────────────────────────────────────────────────────────

const CodeBlock = memo(({ language, children }: { language: string; children: React.ReactNode }) => {
  const [preview, setPreview] = useState(false);
  const canPreview = PREVIEW_LANGS.has(language.toLowerCase());
  const code = String(children ?? '').replace(/\n$/, '');
  return (
    <>
      {preview && <LivePreviewModal code={code} lang={language.toLowerCase()} onClose={() => setPreview(false)} />}
      <div className="rounded-xl overflow-hidden my-5 border border-white/10 shadow-2xl">
        <div className="bg-[#1a1a1a] px-4 py-2 flex justify-between items-center border-b border-white/5">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{language || 'text'}</span>
          <div className="flex items-center gap-3">
            {canPreview && (
              <button onClick={() => setPreview(true)} className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-blue-400 hover:text-blue-300 transition-colors">
                <Play size={11} /> Canli Onizleme
              </button>
            )}
            <CopyButton text={code} />
          </div>
        </div>
        <SyntaxHighlighter style={vscDarkPlus} language={language || 'text'} PreTag="div" wrapLongLines={false}
          customStyle={{ margin: 0, padding: '1.25rem 1.5rem', fontSize: '13px', lineHeight: '1.65', borderRadius: 0, backgroundColor: '#0a0a0a', overflowX: 'auto' }}>
          {code}
        </SyntaxHighlighter>
      </div>
    </>
  );
});
CodeBlock.displayName = 'CodeBlock';

// ─── MarkdownRenderer ─────────────────────────────────────────────────────────

const MarkdownRenderer = memo(({ content, fontSize }: { content: string; fontSize: string }) => (
  <div className={`text-gray-200 ${fontSize} leading-relaxed`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          if (match) return <CodeBlock language={match[1]}>{children}</CodeBlock>;
          return <code className="bg-white/10 text-blue-300 px-1.5 py-0.5 rounded text-[13px] font-mono border border-white/5" {...props}>{children}</code>;
        },
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-7">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
        h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-100 mt-5 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold text-gray-100 mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold text-gray-100 mt-3 mb-1">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-bold text-gray-200 mt-3 mb-1">{children}</h4>,
        ul: ({ children }) => <ul className="my-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="flex gap-2 leading-7"><span className="text-blue-400 flex-shrink-0 mt-0.5 select-none">&#8226;</span><span>{children}</span></li>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500/50 pl-4 my-3 text-gray-400 italic">{children}</blockquote>,
        table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full border border-white/10 rounded-lg overflow-hidden text-sm">{children}</table></div>,
        thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
        th: ({ children }) => <th className="px-4 py-2 text-left text-gray-300 font-semibold border-b border-white/10">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2 text-gray-400 border-b border-white/5">{children}</td>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors">{children}</a>,
        hr: () => <hr className="my-4 border-white/10" />,
      }}>
      {content}
    </ReactMarkdown>
  </div>
));
MarkdownRenderer.displayName = 'MarkdownRenderer';

// ─── TypingDots ──────────────────────────────────────────────────────────────

const TypingDots = memo(() => (
  <div className="flex gap-1.5 items-center h-6">
    {[0, 1, 2].map(i => (
      <span key={i} className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }} />
    ))}
  </div>
));
TypingDots.displayName = 'TypingDots';

// ─── MessageBubble ────────────────────────────────────────────────────────────

const MessageBubble = memo(({ msg, isStreaming, fontSize, theme }: {
  msg: Message; isStreaming?: boolean; fontSize: string; theme: string;
}) => (
  <div className={`py-7 px-4 md:px-12 ${msg.role === 'ai' ? '' : theme === 'dark' ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
    <div className="max-w-3xl mx-auto flex gap-4 md:gap-6">
      <div className="flex-shrink-0 mt-1">
        {msg.role === 'ai'
          ? <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20"><Bot size={16} className="text-white" /></div>
          : <div className="w-8 h-8 rounded-lg bg-gray-700 border border-gray-600 flex items-center justify-center"><User size={16} className="text-gray-300" /></div>
        }
      </div>
      <div className="flex-1 overflow-hidden min-w-0">
        {msg.text ? <MarkdownRenderer content={msg.text} fontSize={fontSize} /> : <TypingDots />}
      </div>
    </div>
  </div>
));
MessageBubble.displayName = 'MessageBubble';

// ─── WelcomeScreen ───────────────────────────────────────────────────────────

const WelcomeScreen = memo(({ onPromptClick }: { onPromptClick: (p: string) => void }) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-8">
    <div>
      <div className="w-16 h-16 bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-xl shadow-blue-500/10 rotate-3">
        <Sparkles size={28} className="text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">Nasil yardimci olabilirim?</h2>
      <p className="text-gray-500 mt-2 text-sm max-w-sm">YamanAI ile kod yazabilir, ceviri yapabilir veya sadece sohbet edebilirsin.</p>
    </div>
    <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
      {SUGGESTED_PROMPTS.map(({ label, prompt }) => (
        <button key={label} onClick={() => onPromptClick(prompt)} className="flex items-center justify-between gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-gray-300 hover:text-white transition-all group text-left">
          <span className="font-medium">{label}</span>
          <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
        </button>
      ))}
    </div>
  </div>
));
WelcomeScreen.displayName = 'WelcomeScreen';

// ─── SidebarGroup ────────────────────────────────────────────────────────────

const SidebarGroup = memo(({ label, convs, activeId, onSelect, onDelete }: {
  label: string; convs: Conversation[]; activeId: string;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
}) => {
  if (!convs.length) return null;
  return (
    <div className="mb-3">
      <p className="text-[10px] font-semibold text-gray-600 mb-1 px-2 uppercase tracking-wider">{label}</p>
      {convs.map(c => (
        <div key={c.id} className={`group flex items-center gap-1 w-full rounded-lg transition-colors mb-0.5 ${c.id === activeId ? 'bg-white/10' : 'hover:bg-white/5'}`}>
          <button onClick={() => onSelect(c.id)} className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-400 hover:text-gray-200 min-w-0">
            <MessageSquare size={13} className="flex-shrink-0 text-gray-600" />
            <span className="truncate">{c.title}</span>
          </button>
          <button onClick={() => onDelete(c.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 transition-all mr-1 rounded flex-shrink-0" aria-label="Sohbeti sil">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
});
SidebarGroup.displayName = 'SidebarGroup';

// ─── Settings Modal ──────────────────────────────────────────────────────────

const SettingsModal = memo(({ settings, onSave, onClose, onDeleteAll, onExport }: {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
  onDeleteAll: () => void;
  onExport: () => void;
}) => {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = (key: keyof AppSettings, val: any) => setLocal(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-lg bg-[#111] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-blue-400" />
            <h2 className="font-bold text-lg">Ayarlar</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Theme */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Tema</label>
            <div className="flex gap-2">
              {(['dark', 'light'] as const).map(t => (
                <button key={t} onClick={() => patch('theme', t)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    local.theme === t
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}>
                  {t === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  {t === 'dark' ? 'Koyu' : 'Acik'}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Yazi Boyutu</label>
            <div className="flex gap-2">
              {(['sm', 'base', 'lg'] as const).map(s => (
                <button key={s} onClick={() => patch('fontSize', s)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    local.fontSize === s
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}>
                  <Type size={s === 'sm' ? 12 : s === 'base' ? 16 : 20} />
                  {FONT_LABEL_MAP[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">AI Modeli</label>
            <div className="space-y-2">
              {(['gpt-4o', 'gpt-4o-mini'] as const).map(m => (
                <button key={m} onClick={() => patch('model', m)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    local.model === m
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}>
                  <span>{MODEL_LABEL_MAP[m]}</span>
                  {local.model === m && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Sistem Promptu (Opsiyonel)</label>
            <textarea
              value={local.systemPrompt}
              onChange={e => patch('systemPrompt', e.target.value)}
              placeholder='Ornegin: "Sen bir Python uzmanisin. Her zaman Turkce yanit ver."'
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none h-24"
            />
            <p className="text-[10px] text-gray-600 mt-1">Bu prompt her sohbetin basinda AI&apos;ya gonderilir.</p>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-white/10 pt-5">
            <label className="text-xs font-semibold text-red-500/80 uppercase tracking-wider mb-3 block">Tehlikeli Bolge</label>
            <div className="flex gap-2">
              <button onClick={onExport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 text-sm font-medium transition-all">
                <Download size={16} /> Disa Aktar
              </button>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-all">
                  <Trash2 size={16} /> Tum Sohbetleri Sil
                </button>
              ) : (
                <button onClick={() => { onDeleteAll(); setConfirmDelete(false); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500 bg-red-600 text-white text-sm font-bold transition-all animate-pulse">
                  Emin misin? Tikla
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Iptal</button>
          <button onClick={() => { onSave(local); onClose(); }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20">
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
});
SettingsModal.displayName = 'SettingsModal';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string>('');
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [showPopup, setShowPopup]         = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [settings, setSettings]           = useState<AppSettings>(DEFAULT_SETTINGS);

  const messagesEndRef     = useRef<HTMLDivElement>(null);
  const inputRef           = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConv = useMemo(() => conversations.find(c => c.id === activeId) ?? null, [conversations, activeId]);
  const messages: Message[] = activeConv?.messages ?? [];
  const tc = useMemo(() => themeClasses(settings.theme), [settings.theme]);
  const fontClass = FONT_SIZE_MAP[settings.fontSize];

  const { today, yesterday, older } = useMemo(
    () => groupByDate([...conversations].sort((a, b) => b.updatedAt - a.updatedAt)),
    [conversations],
  );

  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    setActiveId(loaded[0]?.id ?? '');
    setSettings(loadSettings());
  }, []);

  useEffect(() => { saveConversations(conversations); }, [conversations]);
  useEffect(() => { saveSettings(settings); }, [settings]);

  useEffect(() => {
    if (!localStorage.getItem(LS_POPUP)) {
      const t = setTimeout(() => setShowPopup(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const resizeTextarea = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const resetInput = useCallback(() => {
    setInput('');
    if (inputRef.current) inputRef.current.style.height = '56px';
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value); resizeTextarea(e.target);
  }, [resizeTextarea]);

  const upsertConv = useCallback((conv: Conversation) => {
    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === conv.id);
      if (idx === -1) return [conv, ...prev];
      const next = [...prev]; next[idx] = conv; return next;
    });
  }, []);

  const startNewChat = useCallback(() => {
    const c: Conversation = { id: uid(), title: 'Yeni Sohbet', messages: [], updatedAt: Date.now() };
    setConversations(prev => [c, ...prev]);
    setActiveId(c.id);
    resetInput();
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [resetInput]);

  const loadConversation = useCallback((id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? '');
      return next;
    });
  }, [activeId]);

  const deleteAllConversations = useCallback(() => {
    setConversations([]);
    setActiveId('');
  }, []);

  const exportConversations = useCallback(() => {
    const data = JSON.stringify(conversations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yamanai-sohbetler-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [conversations]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
  }, []);

  // ── Send message with model + custom system prompt ──
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    let convId = activeId;
    let conv   = conversations.find(c => c.id === convId);
    if (!conv) {
      conv = { id: uid(), title: text.slice(0, 50), messages: [], updatedAt: Date.now() };
      setConversations(prev => [conv!, ...prev]);
      setActiveId(conv.id);
      convId = conv.id;
    }

    const userMsg: Message = { id: uid(), role: 'user', text: text.trim() };
    const aiId = uid();
    const aiMsg: Message   = { id: aiId,  role: 'ai',   text: '' };

    const updatedConv: Conversation = {
      ...conv,
      title:     conv.messages.length === 0 ? text.slice(0, 50) : conv.title,
      messages:  [...conv.messages, userMsg, aiMsg],
      updatedAt: Date.now(),
    };
    upsertConv(updatedConv);
    resetInput();
    setLoading(true);

    const history = [...conv.messages, userMsg].map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user', content: m.text,
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const patchAi = (newText: string) => {
      setConversations(prev => prev.map(c => {
        if (c.id !== convId) return c;
        return { ...c, updatedAt: Date.now(), messages: c.messages.map(m => m.id === aiId ? { ...m, text: newText } : m) };
      }));
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          model: settings.model,
          customSystemPrompt: settings.systemPrompt || undefined,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });

      if (reader) {
        let acc    = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            buffer += decoder.decode();
            if (buffer.trim()) {
              const trimmed = buffer.trim();
              if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.slice(5).trim();
                if (jsonStr && jsonStr !== '[DONE]') {
                  try {
                    const p = JSON.parse(jsonStr);
                    const delta = p.choices?.[0]?.delta?.content ?? p.delta ?? '';
                    if (delta) { acc += delta; patchAi(acc); }
                    if (p.response) { acc = p.response; patchAi(acc); }
                  } catch {}
                }
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIdx).trim();
            buffer = buffer.slice(newlineIdx + 1);

            if (!line || !line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const p = JSON.parse(jsonStr);
              const delta: string = p.choices?.[0]?.delta?.content ?? p.delta ?? '';
              if (delta) { acc += delta; patchAi(acc); }
              if (p.response) { acc = p.response; patchAi(acc); }
            } catch {
              // Incomplete JSON - skip silently
            }
          }
        }

        if (!acc) {
          const data = await res.clone().json().catch(() => null);
          if (data?.response) patchAi(data.response);
        }
      } else {
        const data = await res.json();
        patchAi(data.response ?? 'Bir hata olustu.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setConversations(prev => prev.map(c => {
          if (c.id !== convId) return c;
          return { ...c, messages: c.messages.map(m => m.id === aiId && !m.text ? { ...m, text: '_Yanit durduruldu._' } : m) };
        }));
      } else {
        patchAi('Baglanti hatasi olustu. Lutfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, activeId, conversations, upsertConv, resetInput, settings.model, settings.systemPrompt]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }, [sendMessage, input]);

  const closePopup = useCallback(() => {
    setShowPopup(false); localStorage.setItem(LS_POPUP, 'true');
  }, []);

  const handlePromptClick = useCallback((p: string) => {
    setInput(p); inputRef.current?.focus();
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`flex h-screen ${tc.bg} ${tc.text} font-sans overflow-hidden relative transition-colors duration-300`}>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
          onDeleteAll={deleteAllConversations}
          onExport={exportConversations}
        />
      )}

      {/* Download Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && closePopup()}>
          <div className="relative w-full max-w-md bg-[#111] border border-gray-700 rounded-2xl shadow-2xl p-6 text-center">
            <button onClick={closePopup} className="absolute top-3 right-3 text-gray-400 hover:text-white p-1" aria-label="Kapat"><X size={22} /></button>
            <div className="flex justify-center mb-4"><div className="bg-blue-600/20 p-4 rounded-full border border-blue-500/20"><Monitor className="w-8 h-8 text-blue-400" /></div></div>
            <h2 className="text-xl font-bold text-white mb-2">Masaustu Uygulamasi Cikti!</h2>
            <p className="text-gray-400 mb-6 text-sm">Yaman AI&apos;yi daha hizli kullanmak icin Windows uygulamasini indir.</p>
            <div className="flex flex-col gap-3">
              <a href="/download/YamanAISetup.exe" download className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2">
                <MonitorDown size={18} /> Windows Icin Indir
              </a>
              <button onClick={closePopup} className="text-gray-500 hover:text-gray-300 text-xs underline underline-offset-4">Hayir, tarayicida devam et</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-40 md:z-auto top-0 left-0 h-full flex flex-col w-[260px] ${tc.sidebar} border-r ${tc.border} flex-shrink-0 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between p-3 md:hidden border-b border-gray-800">
          <span className="font-semibold text-sm text-gray-300">YamanAI</span>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <button onClick={startNewChat} className="flex items-center gap-3 px-3 py-2.5 w-full text-sm bg-transparent hover:bg-white/10 border border-gray-700 hover:border-gray-600 rounded-lg transition-all">
            <Plus size={16} /><span>Yeni Sohbet</span>
          </button>
          <a href="/download/YamanAISetup.exe" download className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-blue-400 hover:text-blue-300 bg-blue-900/10 hover:bg-blue-900/20 border border-blue-900/30 hover:border-blue-500/50 rounded-lg transition-all">
            <MonitorDown size={16} /><span>Uygulamayi Indir</span>
          </a>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-1">
          <SidebarGroup label="Bugun"   convs={today}     activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} />
          <SidebarGroup label="Dun"     convs={yesterday} activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} />
          <SidebarGroup label="Eskiler" convs={older}     activeId={activeId} onSelect={loadConversation} onDelete={deleteConversation} />
          {conversations.length === 0 && <p className="text-xs text-gray-600 text-center px-4 pt-8">Henuz sohbet yok</p>}
        </div>
        <div className="border-t border-gray-800 p-3">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0">YA</div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">Misafir Kullanici</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">YamanAI Free</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative min-w-0">

        {/* Mobile header */}
        <header className="flex items-center justify-between p-4 md:hidden border-b border-gray-800 sticky top-0 z-20" style={{ backgroundColor: settings.theme === 'dark' ? '#212121' : '#f5f5f5' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white" aria-label="Menu"><Menu size={20} /></button>
            <span className="font-semibold text-sm truncate max-w-[120px]">{activeConv?.title ?? 'YamanAI'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/sss" className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="SSS"><HelpCircle size={18} /></Link>
            <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Ayarlar"><Settings size={18} /></button>
            <button onClick={startNewChat} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Yeni sohbet"><Plus size={18} /></button>
          </div>
        </header>

        {/* Desktop header bar with model badge + icons */}
        <div className="hidden md:flex items-center justify-between px-6 p-3 sticky top-0 z-10 backdrop-blur-md" style={{ backgroundColor: settings.theme === 'dark' ? 'rgba(33,33,33,0.9)' : 'rgba(245,245,245,0.9)' }}>
          <div /> {/* spacer */}
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-400 font-medium flex items-center gap-2">
            <span>{settings.model === 'gpt-4o' ? 'GPT-4o' : 'GPT-4o Mini'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500">Online</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/sss" className={`${tc.textMuted} hover:text-blue-400 p-2 rounded-lg hover:bg-white/10 transition-colors`} aria-label="SSS" title="Sikca Sorulan Sorular">
              <HelpCircle size={18} />
            </Link>
            <button onClick={() => setShowSettings(true)} className={`${tc.textMuted} hover:text-blue-400 p-2 rounded-lg hover:bg-white/10 transition-colors`} aria-label="Ayarlar" title="Ayarlar">
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-48">
          {messages.length === 0
            ? <WelcomeScreen onPromptClick={handlePromptClick} />
            : (
              <div className="flex flex-col">
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isStreaming={loading && idx === messages.length - 1 && msg.role === 'ai'}
                    fontSize={fontClass}
                    theme={settings.theme}
                  />
                ))}
                {loading && messages[messages.length - 1]?.role !== 'ai' && (
                  <div className="py-7 px-4 md:px-12">
                    <div className="max-w-3xl mx-auto flex gap-6 items-center">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center animate-pulse"><Bot size={16} className="text-blue-400" /></div>
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )
          }
        </div>

        {/* Input */}
        <div className="absolute bottom-0 w-full pt-10 pb-6 px-4" style={{ background: settings.theme === 'dark' ? 'linear-gradient(to top, #212121, #212121e6, transparent)' : 'linear-gradient(to top, #f5f5f5, #f5f5f5e6, transparent)' }}>
          <div className="max-w-3xl mx-auto">
            <div className={`relative flex items-end ${tc.input} rounded-2xl border ${settings.theme === 'dark' ? 'border-white/10 focus-within:border-blue-500/40' : 'border-gray-300 focus-within:border-blue-500'} shadow-2xl transition-all duration-200`}>
              <textarea
                ref={inputRef}
                className={`w-full bg-transparent ${tc.text} p-4 pr-14 max-h-[200px] resize-none focus:outline-none placeholder-gray-500 text-[15px] leading-relaxed`}
                placeholder="YamanAI'a bir seyler sor..."
                rows={1}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                aria-label="Mesaj gir"
                style={{ minHeight: '56px' }}
              />
              <button
                onClick={loading ? stopGeneration : () => sendMessage(input)}
                disabled={!loading && !input.trim()}
                className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all duration-200 ${
                  loading
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : input.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/30 active:scale-95'
                      : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
                aria-label={loading ? 'Yaniti durdur' : 'Mesaj gonder'}
              >
                {loading ? <StopCircle size={18} /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-center mt-3 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
              YamanAI Beta 1.0 &bull; Powered by OpenAI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}