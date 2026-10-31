import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// latin-ext zorunlu: Turkce ş, ğ, ı, İ bu alt kumede
const uiFont = Atkinson_Hyperlegible_Next({
  variable: '--font-ui',
  subsets: ['latin', 'latin-ext'],
});

const codeFont = JetBrains_Mono({
  variable: '--font-code',
  subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
  title: 'YamanAI',
  description: 'YamanAI: ücretsiz yapay zekâ asistanı. Free AI assistant, no account needed.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E9E4D8' },
    { media: '(prefers-color-scheme: dark)', color: '#101B3D' },
  ],
};

// Ilk boyamadan once tema ve dili ayarla, boylece ekran yanip sonmez
const PREFS_SCRIPT = `(function(){var s={};try{s=JSON.parse(localStorage.getItem('yamanai_settings')||'{}')}catch(e){}
var d=document.documentElement;d.dataset.theme=s.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
var l=s.language;if(!l||l==='auto')l=(navigator.language||'').toLowerCase().indexOf('tr')===0?'tr':'en';d.lang=l})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className={`${uiFont.variable} ${codeFont.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
