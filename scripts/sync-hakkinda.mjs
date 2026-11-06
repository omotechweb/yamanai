// C:\omotech landing page'ini yamanai.net/hakkinda altina kopyalar.
// Kullanim: npm run sync:hakkinda  (kaynak klasor icin: OMOTECH_DIR=C:\baska\yol)
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SRC = process.env.OMOTECH_DIR ?? 'C:/omotech';
const OUT = join(process.cwd(), 'public', 'hakkinda');
const BASE = '/hakkinda/';

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const file of ['styles.css', 'main.js']) await cp(join(SRC, file), join(OUT, file));
await cp(join(SRC, 'assets', 'img'), join(OUT, 'assets', 'img'), { recursive: true });

let html = await readFile(join(SRC, 'index.html'), 'utf8');
// Sayfa /hakkinda adresinde (sonda / olmadan) acildigi icin goreli yollar mutlak yapilir
html = html.replace(/(src|href)="(styles\.css|main\.js|assets\/[^"]+)"/g, `$1="${BASE}$2"`);
// omotech sayfasi dili ?lang= ile istemcide degistirir; burada tek bir statik dosya ve tek canonical var.
// Goreli ve kendi canonical'i olmayan hreflang baglantilari Google'da yok sayilir ya da cakisir, kaldirilir.
html = html.replace(/[ \t]*<link rel="alternate" hreflang="[^"]*" href="\?lang=[^"]*">\r?\n?/g, '');
if (!html.includes('rel="canonical"')) {
  html = html.replace('</head>', '<link rel="canonical" href="https://yamanai.net/hakkinda">\n</head>');
}
await writeFile(join(OUT, 'index.html'), html);

console.log(`hakkinda: ${SRC} -> public/hakkinda`);
