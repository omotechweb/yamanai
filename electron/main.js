// YamanAI masaustu uygulamasi: canli siteyi (yamanai.net) kendi penceresinde acar.
// API anahtarlari sunucuda kalir, pakete hicbir gizli bilgi girmez ve sitedeki
// her guncelleme uygulamaya yeniden kurulum gerektirmeden yansir.
const { app, BrowserWindow, Menu, clipboard, nativeTheme, screen, session, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const DEFAULT_URL = 'https://yamanai.net/';
const ICON = path.join(__dirname, 'icon.ico');
const OFFLINE_PAGE = path.join(__dirname, 'offline.html');
const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write', 'fullscreen', 'media']);
const DEFAULT_BOUNDS = { width: 1280, height: 850 };

let mainWindow = null;

// Yerel gelistirme icin: electron . --url=http://localhost:3000 (paketli uygulamada yok sayilir)
function resolveAppUrl() {
  if (app.isPackaged) return DEFAULT_URL;
  const arg = process.argv.find((a) => a.startsWith('--url='));
  return arg ? arg.slice('--url='.length) : DEFAULT_URL;
}
const APP_URL = resolveAppUrl();
const APP_ORIGIN = new URL(APP_URL).origin;

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isAppUrl(url) {
  return parseUrl(url)?.origin === APP_ORIGIN;
}

function authProviderFor(url) {
  const u = parseUrl(url);
  if (!u || u.protocol !== 'https:') return null;
  if (u.hostname === 'accounts.google.com') return 'google';
  if (u.hostname === 'github.com' && u.pathname.startsWith('/login')) return 'github';
  return null;
}

function openExternal(url) {
  const u = parseUrl(url);
  if (u && ['http:', 'https:', 'mailto:'].includes(u.protocol)) shell.openExternal(url);
}

// ─── Pencere konumu ──────────────────────────────────────────────────────────

const statePath = () => path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    // Kayitli konum artik bagli olmayan bir ekranda kaldiysa varsayilana don
    const area = screen.getDisplayMatching(s.bounds).workArea;
    const visible = s.bounds.x < area.x + area.width && s.bounds.x + s.bounds.width > area.x
      && s.bounds.y < area.y + area.height && s.bounds.y + s.bounds.height > area.y;
    return visible ? s : { bounds: DEFAULT_BOUNDS, maximized: Boolean(s.maximized) };
  } catch {
    return { bounds: DEFAULT_BOUNDS, maximized: false };
  }
}

function saveWindowState(win) {
  try {
    fs.writeFileSync(statePath(), JSON.stringify({ bounds: win.getNormalBounds(), maximized: win.isMaximized() }));
  } catch (err) {
    console.error('Pencere konumu kaydedilemedi:', err);
  }
}

// ─── Tarayicida hazir gelen, Electron'da eksik olan davranislar ──────────────

function attachContextMenu(win) {
  const tr = app.getLocale().toLowerCase().startsWith('tr');
  const L = tr
    ? { cut: 'Kes', copy: 'Kopyala', paste: 'Yapıştır', selectAll: 'Tümünü seç', copyLink: 'Bağlantıyı kopyala', openLink: 'Bağlantıyı tarayıcıda aç' }
    : { cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select all', copyLink: 'Copy link', openLink: 'Open link in browser' };

  win.webContents.on('context-menu', (_event, p) => {
    const items = [];
    for (const word of p.dictionarySuggestions) {
      items.push({ label: word, click: () => win.webContents.replaceMisspelling(word) });
    }
    if (items.length) items.push({ type: 'separator' });
    if (p.linkURL) {
      items.push({ label: L.openLink, click: () => openExternal(p.linkURL) });
      items.push({ label: L.copyLink, click: () => clipboard.writeText(p.linkURL) });
      items.push({ type: 'separator' });
    }
    if (p.isEditable) items.push({ label: L.cut, role: 'cut', enabled: p.editFlags.canCut });
    if (p.isEditable || p.selectionText) items.push({ label: L.copy, role: 'copy', enabled: p.editFlags.canCopy });
    if (p.isEditable) items.push({ label: L.paste, role: 'paste', enabled: p.editFlags.canPaste });
    if (p.isEditable) items.push({ label: L.selectAll, role: 'selectAll' });
    while (items.length && items[items.length - 1].type === 'separator') items.pop();
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });
}

// Menu cubugu olmadigi icin kisayollari burada tanimliyoruz
function attachShortcuts(win) {
  const wc = win.webContents;
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const key = input.key.toLowerCase();
    const ctrl = input.control && !input.alt;
    let handled = true;

    if (key === 'f5' || (ctrl && key === 'r')) wc.reload();
    else if (key === 'f11') win.setFullScreen(!win.isFullScreen());
    else if (ctrl && (key === '=' || key === '+')) wc.setZoomLevel(Math.min(wc.getZoomLevel() + 0.5, 4));
    else if (ctrl && key === '-') wc.setZoomLevel(Math.max(wc.getZoomLevel() - 0.5, -3));
    else if (ctrl && key === '0') wc.setZoomLevel(0);
    else if (input.alt && key === 'arrowleft' && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
    else if (input.alt && key === 'arrowright' && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
    else if (!app.isPackaged && key === 'f12') wc.toggleDevTools();
    else handled = false;

    if (handled) event.preventDefault();
  });
}

// ─── Google / GitHub girisi ──────────────────────────────────────────────────

// Google gomulu pencerelerde girisi reddeder ("Bu tarayici guvenli olmayabilir"). Bu yuzden
// giris kullanicinin kendi tarayicisinda yapilir, oturum 127.0.0.1 uzerinden uygulamaya
// aktarilir (RFC 8252). Sunucu tarafi: src/lib/desktopAuth.ts
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;
const LOGIN_DONE_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>YamanAI</title></head>
<body style="font-family:'Segoe UI',system-ui,sans-serif;background:#F4F1EA;color:#101B3D;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px">
<div><h1 style="font-size:1.5rem">YamanAI'ya dönebilirsin</h1><p>Giriş tamamlandı, bu sekmeyi kapatabilirsin.</p>
<p lang="en" style="color:#5A6178">Signed in. You can close this tab and return to YamanAI.</p></div></body></html>`;

let stopPendingLogin = null;

function startBrowserLogin(provider) {
  stopPendingLogin?.();

  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const token = url.searchParams.get('token');
    if (url.pathname !== '/callback' || !token) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' });
    res.end(LOGIN_DONE_PAGE);
    stopPendingLogin?.();

    if (!mainWindow) return;
    const exchange = new URL('/api/desktop/exchange', APP_ORIGIN);
    exchange.search = new URLSearchParams({ token, verifier }).toString();
    mainWindow.loadURL(exchange.toString());
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  const timeout = setTimeout(() => stopPendingLogin?.(), LOGIN_TIMEOUT_MS);
  stopPendingLogin = () => {
    clearTimeout(timeout);
    server.close();
    stopPendingLogin = null;
  };

  server.listen(0, '127.0.0.1', () => {
    const login = new URL('/masaustu-giris', APP_ORIGIN);
    login.search = new URLSearchParams({ provider, port: server.address().port, challenge }).toString();
    shell.openExternal(login.toString());
  });
}

// ─── Ana pencere ─────────────────────────────────────────────────────────────

function routeExternalUrl(url) {
  const provider = authProviderFor(url);
  if (provider) {
    startBrowserLogin(provider);
    // Giris sayfasindaki "yonlendiriliyor" durumu tarayiciya gecince sifirlansin
    mainWindow?.webContents.reload();
  } else {
    openExternal(url);
  }
}

function guardNavigation(event, url) {
  if (isAppUrl(url)) return;
  event.preventDefault();
  routeExternalUrl(url);
}

function showOffline() {
  mainWindow?.loadFile(OFFLINE_PAGE, { query: { target: APP_URL } });
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    ...state.bounds,
    minWidth: 480,
    minHeight: 600,
    icon: ICON,
    autoHideMenuBar: true,
    title: 'YamanAI',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0B1228' : '#F4F1EA',
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.removeMenu();

  const win = mainWindow;
  const wc = win.webContents;
  attachContextMenu(win);
  attachShortcuts(win);

  wc.on('will-navigate', guardNavigation);
  wc.on('will-redirect', guardNavigation);
  wc.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) win.loadURL(url);
    else routeExternalUrl(url);
    return { action: 'deny' };
  });

  wc.on('did-fail-load', (_event, code, _desc, url, isMainFrame) => {
    // -3 (ERR_ABORTED): gezinme iptal edildi, gercek bir baglanti hatasi degil
    if (isMainFrame && code !== -3 && !url.startsWith('file:')) showOffline();
  });

  // Yavas baglantida bos ekranda beklemek yerine pencere kisa surede acilsin
  const reveal = () => {
    if (win.isDestroyed() || win.isVisible()) return;
    if (state.maximized) win.maximize();
    win.show();
  };
  win.once('ready-to-show', reveal);
  setTimeout(reveal, 1500);

  win.on('close', () => saveWindowState(win));
  win.on('closed', () => {
    mainWindow = null;
  });

  resolveStartUrl().then((url) => {
    if (!win.isDestroyed()) win.loadURL(url);
  });
}

// Uygulama giris olmadan kullanilamaz: oturum yoksa sohbet hic acilmadan giris sayfasi gelir.
// Oturum sonradan biterse sitedeki ayni kural (src/app/page.tsx) giris sayfasina yonlendirir.
async function resolveStartUrl() {
  try {
    const res = await session.defaultSession.fetch(new URL('/api/auth/session', APP_ORIGIN).toString(), { credentials: 'include' });
    const data = await res.json();
    return data?.user ? APP_URL : new URL('/giris', APP_ORIGIN).toString();
  } catch {
    return APP_URL; // baglanti yoksa yukleme hatasi cevrimdisi sayfasini acar
  }
}

function configurePermissions() {
  const allowed = (permission, url) => ALLOWED_PERMISSIONS.has(permission) && isAppUrl(url);
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
    callback(allowed(permission, details.requestingUrl));
  });
  ses.setPermissionCheckHandler((_wc, permission, origin) => allowed(permission, origin));
}

// ─── Uygulama yasam dongusu ──────────────────────────────────────────────────

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId('com.yamanai.app');

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    configurePermissions();
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
