"use client";

import { useSyncExternalStore } from 'react';

export type Lang = 'tr' | 'en';
export type LangPref = 'auto' | Lang;

export const LS_SETTINGS = 'yamanai_settings';
const SETTINGS_EVENT = 'yamanai:settings';

export function resolveLang(pref?: string): Lang {
  if (pref === 'tr' || pref === 'en') return pref;
  return (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

function readLang(): Lang {
  try {
    return resolveLang(JSON.parse(localStorage.getItem(LS_SETTINGS) ?? '{}')?.language);
  } catch { return resolveLang(); }
}

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener(SETTINGS_EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(SETTINGS_EVENT, cb);
  };
}

export const notifySettingsChanged = () => window.dispatchEvent(new Event(SETTINGS_EVENT));

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, readLang, () => 'tr' as const);
}

export { STRINGS, type Strings, type FaqCategory } from './strings';
