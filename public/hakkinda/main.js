(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const USER = 'omotechweb';

  /* ==================================================================
     DİL / LANGUAGE
     Türkçe metin index.html'de durur; sayfa açılınca yakalanır.
     İngilizce karşılıklar aşağıdaki EN sözlüğündedir.
     HTML'de:  data-i="anahtar"            → innerHTML değişir
               data-ia="öznitelik|anahtar" → öznitelik değişir (; ile birden fazla)
  ================================================================== */
  const EN = {
    'meta.desc': 'omotech: an open-source studio making games, AI assistants and Windows tools.',
    'nav.label': 'Main menu',
    'nav.home': 'omotech home',
    'nav.lang': 'Language',
    'nav.featured': 'Featured',
    'nav.projects': 'All projects',
    'nav.langs': 'Code map',
    'nav.contribute': 'Contribute',

    'hero.eyebrow': 'Open-source studio',
    'hero.h1label': 'Code written at night, open to everyone.',
    'hero.h1': '<span aria-hidden="true"><span class="w" style="--i:0">Code</span> <span class="w thin" style="--i:1">written</span> <span class="w" style="--i:2">at night,</span><br><span class="w thin" style="--i:3">open to</span> <span class="w glow" style="--i:4">everyone.</span></span>',
    'hero.lede': 'omotech makes a train game set on snowbound railways, a lighthouse mystery on a fog-bound island, AI assistants and Windows tools. Every line is on GitHub, and all of it is free to download.',
    'hero.cta': 'Explore the projects',
    'hero.term': 'Sample terminal: cloning a repo',
    'stats.label': 'GitHub stats',
    'stats.repos': 'public repos',
    'stats.code': 'source code',
    'stats.langs': 'main languages: C#, Python, C++, TS',
    'stats.last': 'last commit',

    'feat.h2': 'Two games, two nights.',
    'feat.lede': 'One is set on a lighthouse island in the North Atlantic in 1974. The other runs along a single railway line twenty years after the Great Freeze.',

    'tlw.alt1': 'The Last Watch title screen: a red and white lighthouse over the night sea',
    'tlw.alt2': "Tuning the radio in the keeper's cottage",
    'tlw.alt3': "Reading Elias Marr's journal",
    'tlw.alt4': 'The cliffs of Skerrow Rock at night',
    'tlw.alt5': 'Climbing the path to the lighthouse in the rain',
    'tlw.alt6': 'A figure at the top of the path',
    'tlw.thumbs': 'Screenshots',
    'tlw.quote': '"Never miss the 3 AM check."',
    'tlw.lede': "You are the new keeper of Skerrow Rock. The supply boat won't be back for a month, and your predecessor, Elias Marr, is missing. Every night you wind the clockwork, keep the beam turning and report in to Margaret on the mainland. And every night the island gives up a little more.",
    'tlw.f1': '5 nights, 2 endings',
    'tlw.f2': 'No combat. The tension comes from light, sound and fog.',
    'tlw.f3': 'A 94-step tower, a tunable radio, a real beam cutting through the fog',
    'tlw.f4': 'English · Turkish',

    'f.story': 'Story',
    'f.play': 'Gameplay',
    'f.light': 'Lighthouse',
    'f.lang': 'Language',
    'f.people': 'People',
    'f.gfx': 'Graphics',
    'dl.windows': 'Download for Windows',
    'dl.source': 'Source code',

    'tld.alt': 'The Last Delivery logo: a steam train crossing snowy mountains under the moon',
    'tld.quote': "Don't open it, don't ask, don't stop.",
    'tld.lede': 'Twenty years after the Great Freeze, heat is worth more than money. Courier Arthur Hale is handed a sealed package that is strangely warm, and has to carry it to Shelter-0, two thousand kilometres away.',
    'tld.f1': '2 parts, 80 chapters in total. Your choices in part one carry over into part two (Project AURA).',
    'tld.f2': 'Everyone remembers what you did. A passenger who loses trust in you may slip off the train at night.',
    'tld.f3': 'No external image files at all. Everything is drawn in code.',
    'tld.f4': 'Turkish · English, plus 4 interface languages',
    'tld.keys': 'Controls',
    'tld.k1': 'speed up / slow down',
    'tld.k2': 'switch tracks',
    'tld.k3': 'light the stove',
    'tld.k4': 'radio',
    'tld.k5': 'archive',
    'copy': 'Copy',

    'ya.b1': 'Can you convert this function to Python?',
    'ya.b2': "Sure. Here's the same logic in Python, with type hints:",
    'ya.desk': 'YamanAI Desktop',
    'ya.b3': 'Opening Spotify ✓',
    'ya.b4': "🎙 What's the weather tomorrow?",
    'ya.lede': 'A free AI chat assistant. Use it without an account to write code, translate or get explanations. Your chats stay in your browser. It also runs on Windows as a desktop app.',
    'ya.f1': 'Streaming chat, live preview for code blocks, voice chat',
    'ya.fdesk': 'Desktop',
    'ya.f2': 'Open apps by voice or a plain sentence, have replies read aloud',
    'ya.f3': 'Turkish · English',
    'ya.open': 'Open yamanai.net',
    'ya.setup': 'Windows installer',

    'proj.h2': 'Six repos, all open.',
    'proj.filter': 'Filter by category',
    'cat.all': 'All',
    'cat.oyun': 'Games',
    'cat.ai': 'AI',
    'cat.arac': 'Tools',
    'cat.dil': 'Language',

    'map.h2': 'Where 4.5 MB<br>of code comes from.',
    'map.lede': "GitHub's language stats, summed across all six repos. Most of it is The Last Delivery's world, drawn entirely in code.",
    'map.bar': 'Language breakdown: C# 72%, Python 14.7%, C++ 8.3%, TypeScript 3.9%, other 1.1%',
    'map.p1': '72.1%', 'map.p2': '14.7%', 'map.p3': '8.3%', 'map.p4': '3.9%', 'map.p5': '1.1%',
    'map.l2': 'Python · YamanAI, tools',

    'con.h2': 'The next commit<br>could be yours.',
    'con.lede': "Translations are what's needed most. The newer chapters of The Last Delivery still show up in English in Spanish, Chinese, Hindi and Arabic.",
    'con.s1': 'Fork',
    'con.s1p': 'Open any repo on GitHub and press the Fork button in the top right.',
    'con.s2': 'Clone and branch',
    'con.s2p': 'Download your copy and create a new branch for your change.',
    'con.s3': 'Open a pull request',
    'con.s3p': 'Push your change and open a PR that explains what you did in two sentences.',

    'fin.h2': 'The lights are on.<br>The code is open.',
    'fin.lede': 'New projects land on GitHub first. Follow along, leave a star, and open an issue if you find a bug.',
    'fin.cta': 'Follow on GitHub',
    'foot.copy': '© 2026 omotech · All projects are open source.',
    'foot.top': 'Back to top ↑'
  };

  /* Galeri altyazıları ve JS'in ürettiği metinler (iki dil) */
  const CAPS = {
    tr: {
      'tlw.cap1': '<b>Skerrow Rock.</b> Ekim 1974.',
      'tlw.cap2': '<b>1975 kHz.</b> Hatta hâlâ biri var.',
      'tlw.cap3': "<b>Elias'ın günlüğü.</b> Her sayfa toplanıp yeniden okunabilir.",
      'tlw.cap4': '<b>Kuzey Atlantik.</b> Orada hiçbir şey yok. Muhtemelen.',
      'tlw.cap5': '<b>Fırtına geceleri.</b> Yağmur, rüzgâr ve tepende dönen ışık.',
      'tlw.cap6': '<b>Bir daha bak.</b> Bu daha önce orada mıydı?'
    },
    en: {
      'tlw.cap1': '<b>Skerrow Rock.</b> October 1974.',
      'tlw.cap2': '<b>1975 kHz.</b> Someone is still on the line.',
      'tlw.cap3': "<b>Elias's journal.</b> Every page is collected and re-readable.",
      'tlw.cap4': '<b>The North Atlantic.</b> Nothing out there. Probably.',
      'tlw.cap5': '<b>Storm nights.</b> Rain, wind, and the beam above you.',
      'tlw.cap6': '<b>Look again.</b> Was that there before?'
    }
  };
  const UI = {
    tr: { copied: 'Kopyalandı', copy: 'Kopyala', locale: 'tr-TR', zip: 'ZIP indir', download: 'İndir' },
    en: { copied: 'Copied', copy: 'Copy', locale: 'en-GB', zip: 'Download ZIP', download: 'Download' }
  };

  /* Türkçe orijinalleri yakala */
  const TR = {};
  document.querySelectorAll('[data-i]').forEach(el => { TR[el.dataset.i] ??= el.innerHTML; });
  document.querySelectorAll('[data-ia]').forEach(el => el.dataset.ia.split(';').forEach(pair => {
    const [attr, key] = pair.split('|'); TR[key] ??= el.getAttribute(attr);
  }));

  let lang = 'tr';
  const t = key => (lang === 'en' ? EN[key] : TR[key]) ?? TR[key] ?? key;

  function pickInitialLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'tr' || q === 'en') return q;
    try { const s = localStorage.getItem('omotech-lang'); if (s === 'tr' || s === 'en') return s; } catch (e) {}
    return (navigator.language || 'tr').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }

  function applyLang(next, save) {
    lang = next;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i]').forEach(el => { el.innerHTML = t(el.dataset.i); });
    document.querySelectorAll('[data-ia]').forEach(el => el.dataset.ia.split(';').forEach(pair => {
      const [attr, key] = pair.split('|'); el.setAttribute(attr, t(key));
    }));
    document.querySelectorAll('.lang-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    if (save) { try { localStorage.setItem('omotech-lang', lang); } catch (e) {} }
    renderGrid();
    applyFilter(currentFilter, false);
    updateGalleryLang();
    updateTldMeta();
    updateLiveStats();
  }
  document.querySelectorAll('.lang-switch button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang, true)));

  /* ------------------------------------------------------------------
     Proje verisi (GitHub'dan alındı). Sayfa açılınca yıldız ve tarih
     GitHub API'den güncellenir.
  ------------------------------------------------------------------ */
  const PROJECTS = [
    {
      repo: 'TheLastWatch', name: 'The Last Watch', cat: 'oyun',
      desc: { tr: '1974, Kuzey Atlantik. Birinci şahıs, hikâye odaklı bir deniz feneri gizemi. 5 gece, 2 son.', en: 'The North Atlantic, 1974. A first-person, story-driven lighthouse mystery. 5 nights, 2 endings.' },
      lang: 'C++', color: 'var(--lang-cpp)', stars: 0, pushed: '2026-10-29T10:15:21Z',
      download: { href: 'https://github.com/omotechweb/TheLastWatch/releases/download/v0.1.0/TheLastWatch-Setup-0.1.0.exe', label: { tr: 'İndir · 1,2 GB', en: 'Download · 1.2 GB' } },
      status: { tr: 'v0.1.0', en: 'v0.1.0' }
    },
    {
      repo: 'TheLastDelivery', name: 'The Last Delivery', cat: 'oyun',
      desc: { tr: 'Karlarla kaplı bir dünyada buharlı tren süren bir kuryenin 80 bölümlük hikâyesi.', en: 'An 80-chapter story about a courier driving a steam train across a frozen world.' },
      lang: 'C#', color: 'var(--lang-cs)', stars: 0, pushed: '2026-11-04T17:00:14Z',
      download: { href: 'https://github.com/omotechweb/TheLastDelivery/releases/download/v2.7.0/TheLastDelivery-Setup-2.7.0.exe', label: { tr: 'İndir · 25 MB', en: 'Download · 25 MB' }, tld: true },
      status: { tr: 'v2.7.0', en: 'v2.7.0' }
    },
    {
      repo: 'yamanai', name: 'YamanAI', cat: 'ai',
      desc: { tr: 'Ücretsiz yapay zekâ sohbet asistanı. Web sitesi ve Windows masaüstü uygulaması.', en: 'A free AI chat assistant. Website and Windows desktop app.' },
      lang: 'Python · TS', color: 'var(--lang-ts)', stars: 1, pushed: '2026-11-01T09:26:14Z',
      download: { href: 'https://yamanai.net/', label: { tr: 'yamanai.net', en: 'yamanai.net' }, external: true },
      status: { tr: 'Yayında', en: 'Live' }
    },
    {
      repo: 'ai_assistant', name: 'YamanAI Desktop', cat: 'ai',
      desc: { tr: 'PyQt6 ile yazılmış Windows asistanı. Sohbet et, uygulamaları cümleyle aç, mikrofonla konuş.', en: 'A Windows assistant built with PyQt6. Chat, open apps with a sentence, talk through your mic.' },
      lang: 'Python', color: 'var(--lang-py)', stars: 0, pushed: '2026-10-10T10:52:33Z',
      download: { href: 'https://github.com/omotechweb/ai_assistant/archive/refs/heads/main.zip', zip: true },
      status: { tr: 'Kararlı', en: 'Stable' }
    },
    {
      repo: 'WinTool', name: 'WinTool Ultimate', cat: 'arac',
      desc: { tr: 'Çok iş parçacıklı Windows bakım aracı. SFC/DISM onarımı, sürücü yedeği, gizlilik ve ağ ayarları.', en: 'A multithreaded Windows maintenance toolkit. SFC/DISM repair, driver backup, privacy and network tweaks.' },
      lang: 'C++17', color: 'var(--lang-cpp)', stars: 0, pushed: '2026-02-02T14:38:57Z',
      download: { href: 'https://github.com/omotechweb/WinTool/archive/refs/heads/main.zip', zip: true },
      status: { tr: 'v6.0 · MIT', en: 'v6.0 · MIT' }
    },
    {
      repo: 'ReGenerated-Python', name: 'ReGenerated Python', cat: 'dil',
      desc: { tr: 'İki nokta, katı girinti ve tip dönüşümü yükünü kaldıran, Python ruhlu yorumlanan bir dil.', en: 'An interpreted, Python-inspired language that drops colons, strict indentation and type-casting overhead.' },
      lang: 'RGP', color: 'var(--lang-other)', stars: 0, pushed: '2026-02-03T18:48:37Z',
      download: null, status: { tr: 'Yakında', en: 'Coming soon' }, soon: true
    }
  ];
  const CAT_LABEL = { oyun: 'cat.oyun', ai: 'cat.ai', arac: 'cat.arac', dil: 'cat.dil' };

  const live = { stars: {}, pushed: {}, latest: 0, count: null, tld: null };
  const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(iso).toLocaleDateString(UI[lang].locale, opts);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtSize = bytes => {
    const mb = bytes / 1048576;
    const n = mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : Math.round(mb) + ' MB';
    return lang === 'tr' ? n.replace('.', ',') : n;
  };

  /* ---------- proje kartları ---------- */
  const grid = document.getElementById('grid');
  function renderGrid() {
    grid.innerHTML = PROJECTS.map(p => {
      let dl = '';
      if (p.download) {
        let href = p.download.href, label = p.download.zip ? UI[lang].zip : p.download.label[lang];
        if (p.download.tld && live.tld) { href = live.tld.url; label = `${UI[lang].download} · ${fmtSize(live.tld.size)}`; }
        dl = `<a class="btn btn-sm btn-ember" href="${href}"${p.download.external ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a>`;
      }
      const stars = live.stars[p.repo] ?? p.stars, pushed = live.pushed[p.repo] ?? p.pushed;
      return `
      <article class="card reveal${p.soon ? ' soon' : ''}" data-cat="${p.cat}" data-repo="${p.repo}">
        <div class="card-top"><span class="cat">${esc(t(CAT_LABEL[p.cat]))}</span><span class="badge${p.soon ? ' wait' : ''}">${esc(p.status[lang])}</span></div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.desc[lang])}</p>
        <div class="meta">
          <span><span class="dot" style="background:${p.color}"></span>${esc(p.lang)}</span>
          <span>★ ${stars}</span>
          <span>${fmtDate(pushed)}</span>
        </div>
        <div class="actions">
          ${dl}
          <a class="btn btn-sm" href="https://github.com/${USER}/${p.repo}" target="_blank" rel="noopener">GitHub</a>
        </div>
      </article>`;
    }).join('');
    grid.querySelectorAll('.card').forEach(spotlight);
  }

  /* filtreler */
  let currentFilter = 'all';
  function applyFilter(f, animate) {
    currentFilter = f;
    document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.f === f)));
    grid.querySelectorAll('.card').forEach(card => {
      const show = f === 'all' || card.dataset.cat === f;
      card.classList.toggle('hide', !show);
      if (show && animate && !reduce) card.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' });
    });
  }
  document.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => applyFilter(chip.dataset.f, true)));

  /* ---------- canlı GitHub verisi ---------- */
  function updateLiveStats() {
    if (live.count != null) document.getElementById('st-repos').textContent = live.count;
    const last = live.latest || Date.parse('2026-11-04T17:00:14Z');
    document.getElementById('st-last').textContent = fmtDate(new Date(last).toISOString(), { day: 'numeric', month: 'short' });
    document.getElementById('st-code').textContent = lang === 'tr' ? '4,5 MB' : '4.5 MB';
  }
  fetch(`https://api.github.com/users/${USER}/repos?per_page=100`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(repos => {
      repos.forEach(r => {
        live.stars[r.name] = r.stargazers_count;
        live.pushed[r.name] = r.pushed_at;
        const ts = Date.parse(r.pushed_at); if (ts > live.latest) live.latest = ts;
      });
      live.count = repos.length;
      renderGrid(); applyFilter(currentFilter, false); updateLiveStats();
    })
    .catch(() => { /* çevrimdışı ya da API limiti: gömülü veri kalır */ });

  /* ---------- The Last Delivery: son sürümün setup dosyası ---------- */
  const tldBtn = document.getElementById('tld-setup'), tldMeta = document.getElementById('tld-setup-meta');
  function updateTldMeta() {
    if (live.tld) tldMeta.textContent = `${live.tld.tag} · ${fmtSize(live.tld.size)}`;
  }
  fetch(`https://api.github.com/repos/${USER}/TheLastDelivery/releases/latest`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(rel => {
      const exe = (rel.assets || []).find(a => /setup.*\.exe$/i.test(a.name)) || (rel.assets || []).find(a => /\.exe$/i.test(a.name));
      if (!exe) return;
      live.tld = { url: exe.browser_download_url, size: exe.size, tag: rel.tag_name };
      tldBtn.href = exe.browser_download_url;
      updateTldMeta(); renderGrid(); applyFilter(currentFilter, false);
    })
    .catch(() => { /* düğme releases sayfasına gitmeye devam eder */ });

  /* ---------- scroll ilerleme çubuğu ---------- */
  const prog = document.getElementById('progress');
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- hero: yıldızlar + kor ışığı ---------- */
  const sky = document.getElementById('sky'), sx = sky.getContext('2d');
  let W, H, stars = [], dpr = 1;
  const mouse = { x: .5, y: .4, tx: .5, ty: .4 };
  function sizeSky() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = sky.clientWidth; H = sky.clientHeight;
    sky.width = W * dpr; sky.height = H * dpr; sx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(220, W * H / 6000));
    stars = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * .9 + .1, r: Math.random() * 1.3 + .2, tw: Math.random() * 6.28 }));
  }
  sizeSky(); addEventListener('resize', sizeSky);
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth; mouse.ty = e.clientY / innerHeight; }, { passive: true });

  let shoot = null;
  function drawSky(time) {
    mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
    sx.clearRect(0, 0, W, H);
    const gx = mouse.x * W, gy = mouse.y * H * .8;
    const g = sx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * .45);
    g.addColorStop(0, 'rgba(242,165,65,.13)'); g.addColorStop(1, 'rgba(242,165,65,0)');
    sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    for (const s of stars) {
      const px = s.x + (mouse.x - .5) * -60 * s.z, py = s.y + (mouse.y - .5) * -40 * s.z;
      const a = .35 + .45 * Math.sin(time * .0012 * s.z + s.tw) * .5 + .25 * s.z;
      const near = Math.hypot(px - gx, py - gy) < 180;
      sx.fillStyle = near ? `rgba(255,200,130,${a + .2})` : `rgba(200,210,235,${a})`;
      sx.beginPath(); sx.arc(px, py, s.r * (near ? 1.5 : 1), 0, 6.283); sx.fill();
    }
    if (!reduce) {
      if (!shoot && Math.random() < .004) shoot = { x: Math.random() * W * .7 + W * .2, y: Math.random() * H * .3, l: 0 };
      if (shoot) {
        shoot.l += 1;
        const x = shoot.x - shoot.l * 9, y = shoot.y + shoot.l * 4;
        const lg = sx.createLinearGradient(x, y, x + 90, y - 40);
        lg.addColorStop(0, 'rgba(255,220,170,.9)'); lg.addColorStop(1, 'rgba(255,220,170,0)');
        sx.strokeStyle = lg; sx.lineWidth = 1.4;
        sx.beginPath(); sx.moveTo(x, y); sx.lineTo(x + 90, y - 40); sx.stroke();
        if (shoot.l > 50) shoot = null;
      }
      requestAnimationFrame(drawSky);
    }
  }
  requestAnimationFrame(drawSky);

  /* terminal kartı eğimi */
  const tilt = document.getElementById('tilt');
  if (!reduce) addEventListener('pointermove', e => {
    tilt.style.setProperty('--ry', (e.clientX / innerWidth - .5) * 14 - 5 + 'deg');
    tilt.style.setProperty('--rx', (e.clientY / innerHeight - .5) * -10 + 2 + 'deg');
  }, { passive: true });

  /* ---------- terminal yazma animasyonu ---------- */
  const term = document.getElementById('term');
  const SCRIPT = [
    { cmd: 'git clone https://github.com/omotechweb/TheLastWatch', out: ["Cloning into 'TheLastWatch'...", 'Receiving objects: 100% (1284/1284), 70.6 MiB'], end: { tr: '✓ 5 gece, 2 son. İyi nöbetler.', en: '✓ 5 nights, 2 endings. Good watch.' } },
    { cmd: 'cd TheLastDelivery && dotnet run', out: ['Restoring packages for TheLastDelivery.csproj...', 'Build succeeded. 0 warning(s)'], end: { tr: '✓ Sığınak-0: 2.000 km. Kazanı sıcak tut.', en: '✓ Shelter-0: 2,000 km. Keep the boiler hot.' } },
    { cmd: 'g++ main.cpp -o WinTool.exe -static -std=c++17', out: ['[ ADMIN PRIVILEGES ACTIVE ]', '1. System Repair (SFC/DISM)'], end: { tr: '✓ WinTool Ultimate v6.0 hazır.', en: '✓ WinTool Ultimate v6.0 ready.' } },
    { cmd: 'python ai_assistant.py', out: ['GPT-4o ● Online', '> open spotify'], end: { tr: '✓ Spotify açılıyor.', en: '✓ Opening Spotify.' } }
  ];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function runTerm() {
    if (reduce) return;
    let i = 0;
    await wait(1600);
    while (true) {
      const step = SCRIPT[i % SCRIPT.length];
      let html = '<span class="pr">$</span> <span class="cmd">';
      for (let c = 0; c <= step.cmd.length; c++) {
        term.innerHTML = html + esc(step.cmd.slice(0, c)) + '</span><span class="caret"></span>';
        await wait(28 + Math.random() * 40);
      }
      html += esc(step.cmd) + '</span>\n';
      const lines = [...step.out.map(esc), `<span class="ok">${esc(step.end[lang])}</span>`];
      for (const line of lines) { await wait(420); html += line + '\n'; term.innerHTML = html + '<span class="caret"></span>'; }
      await wait(2600);
      i++;
    }
  }

  /* ---------- The Last Watch galerisi ---------- */
  const gallery = document.getElementById('gallery'), thumbs = document.getElementById('thumbs'), gcap = document.getElementById('gcap');
  const slides = [...gallery.querySelectorAll('img')];
  let cur = 0, timer;
  thumbs.innerHTML = slides.map((img, i) => `<button type="button" aria-pressed="${i === 0}"><img src="${img.getAttribute('src')}" alt="" loading="lazy"></button>`).join('');
  const tb = [...thumbs.children];
  function show(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('on', k === cur));
    tb.forEach((b, k) => b.setAttribute('aria-pressed', String(k === cur)));
    gcap.innerHTML = CAPS[lang][slides[cur].dataset.cap];
  }
  function updateGalleryLang() {
    tb.forEach((b, k) => b.setAttribute('aria-label', slides[k].alt));
    gcap.innerHTML = CAPS[lang][slides[cur].dataset.cap];
  }
  const auto = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => show(cur + 1), 4800); };
  tb.forEach((b, i) => b.addEventListener('click', () => { show(i); auto(); }));
  auto();

  /* ---------- The Last Delivery: kar ---------- */
  const snow = document.getElementById('snow'), nx = snow.getContext('2d');
  let flakes = [], SW, SH;
  function sizeSnow() {
    const d = Math.min(devicePixelRatio || 1, 2);
    SW = snow.clientWidth; SH = snow.clientHeight; snow.width = SW * d; snow.height = SH * d; nx.setTransform(d, 0, 0, d, 0, 0);
    flakes = Array.from({ length: 70 }, () => ({ x: Math.random() * SW, y: Math.random() * SH, r: Math.random() * 2 + .6, v: Math.random() * .6 + .3, o: Math.random() * 6.28 }));
  }
  sizeSnow(); addEventListener('resize', sizeSnow);
  let snowOn = false;
  new IntersectionObserver(([e]) => { snowOn = e.isIntersecting; if (snowOn && !reduce) requestAnimationFrame(drawSnow); }).observe(snow);
  function drawSnow(time) {
    nx.clearRect(0, 0, SW, SH);
    nx.fillStyle = 'rgba(230,236,250,.8)';
    for (const f of flakes) {
      f.y += f.v; f.x += Math.sin(time * .001 + f.o) * .3;
      if (f.y > SH) { f.y = -4; f.x = Math.random() * SW; }
      nx.beginPath(); nx.arc(f.x, f.y, f.r, 0, 6.283); nx.fill();
    }
    if (snowOn && !reduce) requestAnimationFrame(drawSnow);
  }
  if (reduce) drawSnow(0);

  /* ---------- kartlarda el feneri ışığı ---------- */
  function spotlight(c) {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', e.clientX - r.left + 'px');
      c.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  }

  /* ---------- dil çubuğu ---------- */
  const bar = document.getElementById('bar');
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { bar.classList.add('go'); o.disconnect(); } }, { threshold: .5 }).observe(bar);

  /* ---------- kopyala düğmeleri ---------- */
  document.querySelectorAll('.copy').forEach(btn => btn.addEventListener('click', () => {
    const code = btn.previousElementSibling;
    const done = () => {
      btn.textContent = UI[lang].copied; btn.classList.add('done');
      setTimeout(() => { btn.textContent = UI[lang].copy; btn.classList.remove('done'); }, 1800);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(code.textContent).then(done, () => selectText(code));
    else selectText(code);
  }));
  function selectText(el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

  /* ---------- başlat ---------- */
  applyLang(pickInitialLang(), false);
  runTerm();
})();
