const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let nextServer;

// Next.js sunucusunun hazir olup olmadigini kontrol eder
function waitForServer(url, retries, delay) {
  return new Promise((resolve, reject) => {
    function attempt(remaining) {
      http.get(url, (res) => {
        resolve();
      }).on('error', () => {
        if (remaining <= 0) {
          reject(new Error('Server did not start in time'));
          return;
        }
        setTimeout(() => attempt(remaining - 1), delay);
      });
    }
    attempt(retries);
  });
}

function startNextServer() {
  if (!app.isPackaged) return; // Dev modda zaten next dev calisiyor

  const appDir = path.join(__dirname, '..');

  // Windows icin dogru spawn
  nextServer = spawn(
    'node',
    [
      path.join(appDir, 'node_modules', 'next', 'dist', 'bin', 'next'),
      'start',
      '--port', '3000',
    ],
    {
      cwd: appDir,
      env: { ...process.env },
      stdio: 'pipe',
      windowsHide: true,
    }
  );

  nextServer.stdout.on('data', (d) => console.log('[Next]', d.toString().trim()));
  nextServer.stderr.on('data', (d) => console.error('[Next]', d.toString().trim()));

  nextServer.on('error', (err) => {
    console.error('Next.js server error:', err);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    title: 'YamanAI',
    backgroundColor: '#101B3D',
    show: false,
  });

  // Dis linkleri tarayicide ac
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  try {
    // Production modda sunucuyu bekle (max 30sn, her 500ms'de bir dene)
    if (app.isPackaged) {
      console.log('Waiting for Next.js server...');
      await waitForServer('http://localhost:3000', 60, 500);
    }
    mainWindow.loadURL('http://localhost:3000');
  } catch (err) {
    console.error('Could not connect to server:', err);
    // Hata sayfasi goster
    mainWindow.loadURL(`data:text/html,<h2 style="font-family:sans-serif;color:#F4F1EA;background:#101B3D;height:100vh;margin:0;display:flex;align-items:center;justify-content:center;">YamanAI baslatiliyor... Lutfen bekleyin.</h2>`);
    // 5 saniye sonra tekrar dene
    setTimeout(() => mainWindow?.loadURL('http://localhost:3000'), 5000);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startNextServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});