"use client";

import { useState, useMemo, useCallback, memo } from 'react';
import { ChevronDown, ArrowLeft, ArrowRight, Search, X, MonitorDown } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/Mark';
import { useIsDesktopApp } from '@/lib/desktop';
import { STRINGS, useLang, type FaqCategory, type Strings } from '@/lib/i18n';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DOWNLOAD_URL = '/download/YamanAISetup.exe';
const CATEGORY_KEYS: FaqCategory[] = ['genel', 'modeller', 'gizlilik', 'uygulama'];

const TR_MAP: Record<string, string> = { 'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c', 'â': 'a' };
const normalize = (s: string) => s.replace(/[ıİşŞğĞüÜöÖçÇâ]/g, ch => TR_MAP[ch]).toLowerCase();

type FaqItem = Strings['faqItems'][number];

// ─── FAQ row ─────────────────────────────────────────────────────────────────

const FaqRow = memo(({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: (id: number) => void }) => {
  const btnId = `faq-q-${item.id}`;
  const panelId = `faq-a-${item.id}`;
  return (
    <li className="border-b border-y-line">
      <h2>
        <button id={btnId} type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => onToggle(item.id)}
          className="w-full flex items-center gap-4 py-5 text-left rounded-lg">
          <span className={`flex-1 min-w-0 text-lg font-semibold leading-snug transition-colors duration-150 text-y-ink`}>
            {item.q}
          </span>
          <ChevronDown size={20} aria-hidden="true" className={`flex-shrink-0 text-y-muted transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div id={panelId} role="region" aria-labelledby={btnId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden" inert={!isOpen}>
          <p className="pb-6 pr-9 leading-[1.65] max-w-[65ch] text-y-muted">{item.a}</p>
        </div>
      </div>
    </li>
  );
});
FaqRow.displayName = 'FaqRow';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SSSPage() {
  const t = STRINGS[useLang()];
  const isDesktopApp = useIsDesktopApp();
  const [query, setQuery]       = useState('');
  const [category, setCategory] = useState<'all' | FaqCategory>('all');
  const [openId, setOpenId]     = useState<number | null>(1);

  // Uygulamanin icindeyken uygulamayi indirmeyi anlatan soru gosterilmez
  const items = useMemo(
    () => (isDesktopApp ? t.faqItems.filter(item => item.cat !== 'uygulama') : t.faqItems),
    [t, isDesktopApp],
  );
  const categories = isDesktopApp ? CATEGORY_KEYS.filter(key => key !== 'uygulama') : CATEGORY_KEYS;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter(item =>
      (category === 'all' || item.cat === category) &&
      (!q || normalize(item.q).includes(q) || normalize(item.a).includes(q)));
  }, [items, query, category]);

  const toggle = useCallback((id: number) => setOpenId(prev => (prev === id ? null : id)), []);
  const reset = () => { setQuery(''); setCategory('all'); };
  // Tek sonuc kaldiysa acik goster
  const effectiveOpen = filtered.length === 1 ? filtered[0].id : openId;
  const hasFilter = query.trim() !== '' || category !== 'all';

  return (
    <div className="min-h-dvh bg-y-canvas text-y-ink font-sans">
      <header className="y-on-side bg-y-side text-y-side-ink">
        <div className="max-w-[1120px] mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2.5 min-h-11 rounded-lg">
            <LogoMark size={26} />
            <span className="y-display font-extrabold text-lg tracking-tight">YamanAI</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 min-h-11 px-3 text-sm font-semibold rounded-full hover:bg-y-side-hover transition-colors duration-150">
            <ArrowLeft size={16} /> {t.sssBack}
          </Link>
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-10 lg:pt-16 lg:grid lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5 lg:self-start lg:sticky lg:top-10">
          <h1 className="y-display text-4xl lg:text-5xl font-bold tracking-[-0.02em] leading-[1.08] text-balance">{t.sssHeading}</h1>
          <p className="mt-4 leading-relaxed max-w-[42ch] text-y-muted">{t.sssSub}</p>

          <div className="relative mt-7">
            <label htmlFor="faq-search" className="sr-only">{t.sssSearch}</label>
            <Search aria-hidden size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-y-subtle" />
            <input id="faq-search" type="search" value={query} autoComplete="off"
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setQuery(''); }}
              placeholder={t.sssSearchPlaceholder}
              className="w-full h-12 pl-11 pr-12 rounded-full border border-y-line-strong bg-y-surface text-y-ink placeholder:text-y-subtle outline-none focus:border-y-ink transition-colors duration-150 [&::-webkit-search-cancel-button]:appearance-none" />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label={t.sssClear}
                className="absolute right-1 top-1/2 -translate-y-1/2 size-10 rounded-full flex items-center justify-center text-y-muted hover:bg-y-surface2 transition-colors duration-150">
                <X size={16} />
              </button>
            )}
          </div>

          <div role="group" aria-label={t.sssCategory} className="mt-4 flex flex-wrap gap-2">
            {(['all', ...categories] as const).map(key => {
              const active = category === key;
              return (
                <button key={key} type="button" aria-pressed={active} onClick={() => setCategory(key)}
                  className={`min-h-10 px-4 rounded-full border text-sm font-semibold transition-colors duration-150 ${
                    active ? 'bg-y-selected border-y-selected text-y-selected-ink' : 'border-y-line-strong text-y-ink hover:bg-y-surface2'}`}>
                  {key === 'all' ? t.sssAll : t.sssCategories[key]}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-y-subtle" aria-live="polite">
            {hasFilter ? t.sssResults(filtered.length) : t.sssCount(items.length)}
          </p>
        </div>

        <div className="lg:col-span-7 mt-6 lg:mt-0">
          {filtered.length > 0 ? (
            <ul className="border-t border-y-line">
              {filtered.map(item => (
                <FaqRow key={item.id} item={item} isOpen={effectiveOpen === item.id} onToggle={toggle} />
              ))}
            </ul>
          ) : (
            <div className="py-16 text-center border-y border-y-line">
              <p className="text-y-muted">{t.sssNone(query.trim() || (category === 'all' ? t.sssAll : t.sssCategories[category]))}</p>
              <button type="button" onClick={reset}
                className="mt-4 min-h-11 px-5 rounded-full text-sm font-semibold bg-y-accent hover:bg-y-accent-hover text-y-on-accent transition-colors duration-150">
                {t.sssClear}
              </button>
            </div>
          )}

          <Link href="/" className="group mt-8 flex items-center justify-between gap-4 py-2 rounded-lg">
            <span>
              <span className="block text-lg font-semibold">{t.sssStillTitle}</span>
              <span className="block text-y-muted mt-0.5">{t.sssStillBody}</span>
            </span>
            <span aria-hidden className="size-11 rounded-full bg-y-accent group-hover:bg-y-accent-hover text-y-on-accent flex items-center justify-center flex-shrink-0 transition-colors duration-150">
              <ArrowRight size={18} />
            </span>
          </Link>
        </div>
      </main>

      {isDesktopApp ? <div className="h-16" /> : (
        <section aria-labelledby="desktop-title" className="y-on-side mt-20 lg:mt-28 bg-y-side text-y-side-ink">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-14 lg:py-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <h2 id="desktop-title" className="text-3xl lg:text-4xl font-bold tracking-[-0.02em] text-balance">{t.sssDesktopTitle}</h2>
              <p className="mt-3 max-w-[55ch] leading-relaxed text-y-side-muted">{t.sssDesktopBody}</p>
            </div>
            <a href={DOWNLOAD_URL} download
              className="inline-flex items-center justify-center gap-2.5 min-h-12 px-6 self-start lg:self-auto flex-shrink-0 rounded-full bg-y-accent hover:bg-y-accent-hover text-y-on-accent font-semibold transition-colors duration-150">
              <MonitorDown size={18} /> {t.desktopDownload}
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
