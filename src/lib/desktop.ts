"use client";

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** Sayfa YamanAI masaustu uygulamasinda mi acik? Sunucuda ve ilk boyamada false'tur. */
export function useIsDesktopApp() {
  return useSyncExternalStore(subscribe, () => /Electron/.test(navigator.userAgent), () => false);
}
