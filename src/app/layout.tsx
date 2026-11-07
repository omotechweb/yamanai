import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next, Bodoni_Moda, JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';

// latin-ext zorunlu: Turkce ş, ğ, ı, İ bu alt kumede
const uiFont = Atkinson_Hyperlegible_Next({
  variable: '--font-ui',
  subsets: ['latin', 'latin-ext'],
});

// Tasarim 2 (Gece Bogaz'i) yuzleri; yalnizca o tasarim secilince kullanilir, preload edilmez
const bogazDisplay = Bodoni_Moda({
  variable: '--font-bogaz-display',
  subsets: ['latin', 'latin-ext'],
  weight: '500',
  preload: false,
});

const bogazUi = Manrope({
  variable: '--font-bogaz-ui',
  subsets: ['latin', 'latin-ext'],
  preload: false,
});

const codeFont = JetBrains_Mono({
  variable: '--font-code',
  subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Alt sayfalar kendi layout dosyalarinda bunu ezer
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    locale: 'tr_TR',
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
};

// Google'in site adini ve kurulusu tanimasi icin
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: ['Yaman AI'],
      inLanguage: 'tr',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      logo: `${SITE_URL}/icon.svg`,
    },
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E9E4D8' },
    { media: '(prefers-color-scheme: dark)', color: '#101B3D' },
  ],
};

// Ilk boyamadan once tema, tasarim ve dili ayarla, boylece ekran yanip sonmez.
// Gece Bogaz'i yalnizca girisli kullanicilar icin: giris durumu sayfa tarafindan yamanai_signed_in ile tutulur.
const PREFS_SCRIPT = `(function(){var s={};try{s=JSON.parse(localStorage.getItem('yamanai_settings')||'{}')}catch(e){}
var d=document.documentElement;d.dataset.theme=(s.theme==='dark'||s.theme==='light')?s.theme:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
var g=false;try{g=localStorage.getItem('yamanai_signed_in')==='1'}catch(e){}d.dataset.design=(g&&s.design==='bogaz')?'bogaz':'ebru';
var l=s.language;if(!l||l==='auto')l=(navigator.language||'').toLowerCase().indexOf('tr')===0?'tr':'en';d.lang=l})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" data-theme="light" data-design="ebru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      </head>
      <body className={`${uiFont.variable} ${codeFont.variable} ${bogazDisplay.variable} ${bogazUi.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
