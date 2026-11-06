// Tarayici ici uctan uca testler. Paket gerektirmez: Edge/Chrome'u DevTools protokoluyle surer.
// Once `npm run dev` calissin, sonra: npm run e2e  (adres icin: npm run e2e -- http://localhost:3123)
// OpenAI'a istek gitmez: /api/chat sayfanin icinde sahte bir akisla yanitlanir.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const BROWSERS = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean);
const browser = BROWSERS.find(p => existsSync(p));
if (!browser) { console.error('Edge ya da Chrome bulunamadi. BROWSER ortam degiskeniyle yolu ver.'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'yamanai-e2e-'));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(browser, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Tarayiciya baglanilamadi');
}
const ws = new WebSocket(await connect());
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); });
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (fn) => {
  const res = await send('Runtime.evaluate', { expression: `(${fn})()`, awaitPromise: true, returnByValue: true });
  if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description ?? 'sayfa hatasi');
  return res.result?.result?.value;
};

/** Her test temiz bir sayfayla, verilen localStorage ile baslar. */
async function openWith(storage, width = 1366) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 860, deviceScaleFactor: 1, mobile: width < 768 });
  await send('Page.navigate', { url: `${BASE}/robots.txt` });
  await sleep(500);
  await evaluate(`() => { localStorage.clear(); const s = ${JSON.stringify(storage)}; for (const k in s) localStorage.setItem(k, s[k]); }`);
  await send('Page.navigate', { url: `${BASE}/` });
  for (let i = 0; i < 50; i++) { if (await evaluate('() => !!document.getElementById("composer")')) break; await sleep(200); }
  await sleep(500);
}

// Sayfaya enjekte edilen ortak yardimcilar
const HELPERS = `
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const setVal = (el, v) => { const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const byText = t => [...document.querySelectorAll('button')].find(b => b.textContent === t);
  const stored = () => JSON.parse(localStorage.getItem('yamanai_conversations') || '[]');
`;
const now = Date.now();
const SEEN = { yamanai_login_popup_seen: 'true', hasSeenDesktopPopup: 'true', yamanai_settings: JSON.stringify({ language: 'tr' }) };
const SEED = {
  ...SEEN,
  yamanai_conversations: JSON.stringify([
    { id: 'c1', title: 'Python ile web scraper', updatedAt: now, messages: [{ id: 'm1', role: 'user', text: 'Python ile scraper?' }, { id: 'm2', role: 'ai', text: 'Elbette.' }] },
    { id: 'c2', title: 'Kuantum', updatedAt: now - 3600e3, messages: [{ id: 'x', role: 'user', text: 'a' }, { id: 'y', role: 'ai', text: 'b' }] },
  ]),
};
const FAKE_STREAM = `
  window.__sent = [];
  const realFetch = window.fetch;
  window.fetch = async (url, opts) => {
    if (!String(url).includes('/api/chat') || opts?.method !== 'POST') return realFetch(url, opts);
    window.__sent.push(JSON.parse(opts.body).messages);
    const n = window.__sent.length, enc = new TextEncoder();
    return new Response(new ReadableStream({ async start(c) {
      for (const w of ['Yanit ' + n + ': ', 'tamam']) { c.enqueue(enc.encode('data: ' + JSON.stringify({ delta: w }) + '\\n\\n')); await wait(40); }
      if (n === 1) c.enqueue(enc.encode('data: ' + JSON.stringify({ finish: 'length' }) + '\\n\\n'));
      c.close();
    } }), { headers: { 'Content-Type': 'text/event-stream' } });
  };`;

const tests = {
  async 'sohbet yeniden adlandirilir ve sabitlenir'() {
    await openWith(SEED);
    return evaluate(`async () => { ${HELPERS}
      document.querySelector('nav [aria-label^="Yeniden adlandır: Kuantum"]').click(); await wait(200);
      const f = document.querySelector('nav input'); setVal(f, 'Kuantum notlarım'); key(f, 'Enter'); await wait(300);
      document.querySelector('nav [aria-label^="Sabitle: Kuantum"]').click(); await wait(700);
      const c = stored().find(c => c.id === 'c2');
      const firstGroup = document.querySelector('nav > div p').textContent;
      if (c.title !== 'Kuantum notlarım' || !c.renamed) throw new Error('baslik kaydedilmedi');
      if (!c.pinned || firstGroup !== 'Sabitlenenler') throw new Error('sabitleme calismadi');
    }`);
  },
  async 'yanit akar, kesilince devam edilir, duzenleme sonrasini siler'() {
    await openWith(SEEN);
    return evaluate(`async () => { ${HELPERS} ${FAKE_STREAM}
      const box = document.getElementById('composer');
      setVal(box, 'İlk soru'); await wait(50); document.querySelector('[aria-label="Gönder"]').click(); await wait(800);
      if (!byText('Devam et')) throw new Error('Devam et dugmesi yok');
      byText('Devam et').click(); await wait(800);
      if (window.__sent[1].length !== 3) throw new Error('devam istegi gecmisi eksik');
      document.querySelector('[aria-label="Düzenle"]').click(); await wait(200);
      setVal(document.querySelector('textarea[aria-label="Düzenle"]'), 'Yeni soru'); byText('Gönder').click(); await wait(1500);
      const msgs = stored()[0].messages.map(m => m.text);
      if (JSON.stringify(msgs) !== JSON.stringify(['Yeni soru', 'Yanit 3: tamam'])) throw new Error('duzenleme sonrasi: ' + JSON.stringify(msgs));
    }`);
  },
  async 'yeniden yanitlama onceki yaniti surum olarak saklar'() {
    await openWith(SEEN);
    return evaluate(`async () => { ${HELPERS} ${FAKE_STREAM}
      const box = document.getElementById('composer');
      setVal(box, 'Soru'); await wait(50); document.querySelector('[aria-label="Gönder"]').click();
      for (let i = 0; i < 40 && !document.querySelector('[aria-label="Yeniden yanıtla"]'); i++) await wait(100);
      const regen = document.querySelector('[aria-label="Yeniden yanıtla"]');
      if (!regen) throw new Error('yeniden yanitla yok; dugmeler: ' + [...document.querySelectorAll('main button')].map(b => b.getAttribute('aria-label') || b.textContent).join(', '));
      regen.click(); await wait(100);
      for (let i = 0; i < 40 && !document.querySelector('[aria-label="Yeniden yanıtla"]'); i++) await wait(100);
      const counter = () => document.querySelector('[role=group][aria-label="Yanıt sürümleri"] span')?.textContent;
      if (counter() !== '2/2') throw new Error('sayac: ' + counter());
      document.querySelector('[aria-label="Önceki sürüm"]').click(); await wait(200);
      const shown = [...document.querySelectorAll('.y-prose')].at(-1).textContent;
      if (!shown.includes('Yanit 1')) throw new Error('onceki surum gosterilmedi: ' + shown);
      if (counter() !== '1/2') throw new Error('sayac: ' + counter());
    }`);
  },
  async 'taslak kaydedilir, uzun mesaj engellenir'() {
    await openWith(SEEN);
    return evaluate(`async () => { ${HELPERS}
      const box = document.getElementById('composer');
      setVal(box, 'yarım taslak'); await wait(600);
      if (localStorage.getItem('yamanai_draft') !== 'yarım taslak') throw new Error('taslak kaydedilmedi');
      setVal(box, 'x'.repeat(32100)); await wait(200);
      if (!document.querySelector('[aria-label="Gönder"]').disabled) throw new Error('uzun mesaj gonderilebiliyor');
    }`);
  },
  async 'ice aktarma yerel sohbeti korur, bozuk dosyayi reddeder'() {
    await openWith(SEED);
    return evaluate(`async () => { ${HELPERS}
      const load = async (text) => {
        document.querySelector('[aria-label="Ayarlar"]').click(); await wait(300);
        const input = document.querySelector('input[type=file]'); const dt = new DataTransfer();
        dt.items.add(new File([text], 'y.json')); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); await wait(700);
      };
      await load(JSON.stringify([{ id: 'c1', title: 'EZMEMELI', updatedAt: 1, messages: [{ id: 'q', role: 'user', text: 'x' }] }, { id: 'n1', title: 'Yeni', updatedAt: 2, messages: [{ id: 'q', role: 'user', text: 'x' }] }]));
      const titles = stored().map(c => c.title);
      if (titles.includes('EZMEMELI') || !titles.includes('Yeni')) throw new Error('ice aktarma: ' + titles);
    }`);
  },
  async 'Ayarlar penceresinde Tab disari kacmaz'() {
    await openWith(SEED);
    return evaluate(`async () => { ${HELPERS}
      document.querySelector('[aria-label="Ayarlar"]').click(); await wait(300);
      const dialog = document.querySelector('[role=dialog]');
      byText('Kaydet').focus();
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      if (!dialog.contains(document.activeElement) || document.activeElement === byText('Kaydet')) throw new Error('odak basa donmedi: ' + document.activeElement?.outerHTML.slice(0, 80));
    }`);
  },
  async 'girissiz kullanicida model dugmesi giris penceresini acar'() {
    await openWith(SEED);
    return evaluate(`async () => { ${HELPERS}
      document.querySelector('[aria-label^="GPT-4o Mini."]').click(); await wait(300);
      const title = document.querySelector('[role=dialog] h2')?.textContent;
      if (title !== 'Giriş yap, daha fazlasını aç') throw new Error('giris penceresi acilmadi: ' + title);
    }`);
  },
  async 'telefonda yatay tasma yok'() {
    await openWith(SEED, 390);
    const w = await evaluate('() => document.documentElement.scrollWidth');
    if (w > 390) throw new Error(`sayfa ${w}px genislikte`);
  },
};

let failed = 0;
for (const [name, run] of Object.entries(tests)) {
  try { await run(); console.log(`✔ ${name}`); }
  catch (e) { failed++; console.log(`✖ ${name}\n    ${e.message}`); }
}
ws.close(); proc.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log(failed ? `\n${failed} test basarisiz` : '\nTum testler gecti');
process.exit(failed ? 1 : 0);
