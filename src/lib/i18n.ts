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

export type FaqCategory = 'genel' | 'modeller' | 'gizlilik' | 'uygulama';

const tr = {
  newChat: 'Yeni Sohbet',
  beta: 'Beta',
  chats: 'Sohbetler',
  history: 'Sohbet geçmişi',
  searchChats: 'Sohbetlerde ara',
  noMatches: 'Eşleşen sohbet yok',
  today: 'Bugün', yesterday: 'Dün', older: 'Daha eski',
  emptyHistory: 'Sorduğun her şey burada, bu tarayıcıda durur.',
  deleteChat: 'Sohbeti sil',
  downloadApp: 'Uygulamayı indir',
  downloadAppSub: 'Windows için masaüstü',
  signIn: 'Giriş yap',
  signInSub: (n: number) => `Günde ${n} mesaj ve daha fazlası`,
  signOut: 'Çıkış yap',
  usageToday: (used: number, limit: number) => `Bugün ${used}/${limit} mesaj`,
  usageLeft: (n: number) => `Bugün ${n} mesaj hakkın kaldı.`,
  usageRaise: (n: number) => `Giriş yap, ${n} mesaja çıkar`,
  limitGuest: (limit: number) => `Bugünkü ${limit} mesaj hakkın doldu.`,
  limitUser: (limit: number, hours: number) => `Bugünkü ${limit} mesaj hakkın doldu. Yaklaşık ${hours} saat sonra yenilenir.`,
  limitPlaceholder: 'Günlük mesaj hakkın doldu',
  usageSection: 'Günlük kullanım',
  requiresLogin: 'Giriş gerektirir',
  customLocked: 'Özel talimat için giriş yap',
  user: 'Kullanıcı',
  openMenu: 'Menüyü aç', closeMenu: 'Menüyü kapat', close: 'Kapat',
  faq: 'Sıkça Sorulan Sorular', settings: 'Ayarlar',
  lightTheme: 'Açık tema', darkTheme: 'Koyu tema',
  greeting: 'Nasıl yardımcı olabilirim?',
  greetingName: (n: string) => `Merhaba, ${n}`,
  greetingSub: 'Kod yaz, çeviri yap, bir konuyu anla ya da sadece sohbet et.',
  starters: 'Örnek istekler',
  prompts: [
    { label: 'Kod yaz', prompt: 'Python ile basit bir web scraper yazar mısın?' },
    { label: 'Açıkla', prompt: 'Kuantum bilgisayarlar nasıl çalışır?' },
    { label: 'Çevir', prompt: 'Şu metni İngilizceye çevir: "Merhaba dünya!"' },
    { label: 'Fikir üret', prompt: 'Bir mobil uygulama için 5 yaratıcı isim öner.' },
  ],
  placeholder: "YamanAI'a bir şey sor…",
  send: 'Gönder', stop: 'Durdur',
  hintSend: 'gönder', hintLine: 'yeni satır',
  disclosure: "Ücretsiz. Sohbetlerin bu tarayıcıda kalır; mesajların yanıt için OpenAI'a gönderilir.",
  typing: 'YamanAI yazıyor',
  copy: 'Kopyala', copied: 'Kopyalandı',
  regenerate: 'Yeniden yanıtla',
  preview: 'Önizle', livePreview: 'Canlı Önizleme', cssPreview: 'CSS önizleme',
  saveHtml: 'HTML olarak indir',
  stopped: 'Yanıtı durdurdun.',
  retry: 'Tekrar dene',
  errors: {
    network: 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.',
    rate_limited: 'Şu anda çok fazla istek var. Bir dakika bekleyip tekrar dene.',
    not_configured: 'YamanAI şu anda yapılandırılmamış, bu yüzden yanıt veremiyor.',
    daily_limit: 'Bugünkü mesaj hakkın doldu.',
    generic: 'Yanıt alınamadı. Tekrar deneyebilirsin.',
  },
  jumpBottom: 'En alta git',
  deleted: 'Sohbet silindi', deletedAll: 'Tüm sohbetler silindi', undo: 'Geri al',
  storageFull: 'Tarayıcı depolaması dolu. Yeni mesajlar kaydedilemiyor; eski sohbetleri silebilirsin.',
  theme: 'Tema', dark: 'Koyu', light: 'Açık',
  language: 'Dil', langAuto: 'Otomatik',
  textSize: 'Yazı boyutu', small: 'Küçük', normal: 'Normal', large: 'Büyük',
  model: 'Model', modelStrong: 'GPT-4o (Güçlü)', modelFast: 'GPT-4o Mini (Hızlı)',
  customInstr: 'Özel talimat (isteğe bağlı)',
  customHint: "YamanAI'ın her yanıtta uymasını istediğin bir şey yaz.",
  customPlaceholder: 'Örneğin: "Kısa yanıtla ve örnek ver."',
  data: 'Verilerin',
  export: 'Sohbetleri dışa aktar',
  deleteAll: 'Tüm sohbetleri sil',
  confirmDelete: 'Emin misin? Tekrar tıkla',
  cancel: 'İptal', save: 'Kaydet',
  loginTitle: 'Giriş yap, daha fazlasını aç',
  loginBenefits: (guest: number, user: number) => [
    `Günde ${guest} yerine ${user} mesaj`,
    'Daha güçlü GPT-4o modeli',
    'Özel talimatlar',
    'Kodlar için canlı önizleme',
  ],
  google: 'Google ile devam et', github: 'GitHub ile devam et', later: 'Şimdilik devam et',
  desktopTitle: 'Masaüstü uygulaması',
  desktopBody: "YamanAI'ı tarayıcı sekmesi açmadan kullanmak için Windows uygulamasını indirebilirsin.",
  desktopDownload: 'Windows için indir',
  desktopLater: 'Tarayıcıda devam et',
  // /giris
  loginHeading: 'Giriş yap',
  loginSub: 'Daha yüksek günlük limit, GPT-4o, özel talimatlar ve canlı önizleme için giriş yap.',
  redirecting: 'Yönlendiriliyor…',
  backToChat: 'Giriş yapmadan sohbete dön',
  authErrors: {
    OAuthSignin: 'Giriş başlatılamadı. Tekrar dene.',
    OAuthCallback: 'Giriş tamamlanamadı. Tekrar dene.',
    OAuthCreateAccount: 'Hesap oluşturulamadı. Diğer yöntemi deneyebilirsin.',
    Callback: 'Giriş başarısız oldu. Tekrar dene.',
    Default: 'Giriş sırasında bir sorun oluştu. Tekrar dene.',
  } as Record<string, string>,
  // /sss
  sssHeading: 'Sıkça sorulan sorular',
  sssSub: "Aradığını bulamazsan sohbet ekranından YamanAI'a sorabilirsin.",
  sssSearch: 'Sorularda ara', sssSearchPlaceholder: 'Soru veya kelime ara…',
  sssClear: 'Aramayı temizle',
  sssAll: 'Tümü',
  sssCategories: { genel: 'Genel', modeller: 'Modeller ve Ayarlar', gizlilik: 'Gizlilik ve Veri', uygulama: 'Uygulama' } as Record<FaqCategory, string>,
  sssCategory: 'Kategori',
  sssCount: (n: number) => `${n} soru`,
  sssResults: (n: number) => `${n} sonuç`,
  sssNone: (q: string) => `"${q}" için sonuç bulunamadı.`,
  sssStillTitle: 'Yanıtını bulamadın mı?',
  sssStillBody: "Sorunu sohbet ekranında YamanAI'a yaz.",
  sssBack: 'Sohbete dön',
  sssDesktopTitle: "YamanAI'ı masaüstünde kullan",
  sssDesktopBody: 'Windows uygulamasını indir, kur ve sohbetlerine tarayıcı sekmesi açmadan ulaş.',
  faqItems: [
    { id: 1, cat: 'genel', q: 'YamanAI nedir?', a: 'YamanAI, yapay zekâ destekli bir sohbet asistanıdır. Kod yazma, çeviri, açıklama ve fikir üretme gibi birçok alanda yardımcı olabilir. Yanıtlarını GPT-4o ve GPT-4o Mini modelleriyle üretir.' },
    { id: 2, cat: 'genel', q: 'YamanAI ücretsiz mi?', a: 'Evet, YamanAI şu an için ücretsiz olarak kullanılabilir. İlerleyen dönemlerde premium özellikler eklenebilir ancak temel sohbet özellikleri her zaman ücretsiz kalacaktır.' },
    { id: 3, cat: 'modeller', q: 'Hangi yapay zekâ modellerini destekliyor?', a: 'Şu anda GPT-4o ve GPT-4o Mini modellerini destekliyoruz. GPT-4o Mini herkese açıktır ve daha hızlıdır. Daha ayrıntılı yanıtlar veren GPT-4o için giriş yapman gerekir; giriş yaptıktan sonra modeli Ayarlar bölümünden seçebilirsin.' },
    { id: 9, cat: 'genel', q: 'Günlük mesaj limiti var mı?', a: 'Evet. Giriş yapmadan günde 10, giriş yaparak günde 50 mesaj gönderebilirsin. Limit her gün UTC gece yarısında (Türkiye saatiyle 03.00) yenilenir. Yanıt üretilemezse o mesaj limitten düşülmez.' },
    { id: 10, cat: 'genel', q: 'Giriş yapınca neler değişir?', a: 'Günlük mesaj limitin artar; GPT-4o modelini, özel talimatları ve kodlar için canlı önizlemeyi kullanabilirsin. Sohbetlerin yine yalnızca bu tarayıcıda saklanır, hesabınla senkronize edilmez.' },
    { id: 4, cat: 'gizlilik', q: 'Sohbet geçmişim kaydediliyor mu?', a: 'Sohbet geçmişin tarayıcının yerel depolamasında (localStorage) saklanır. Tarayıcı verilerini temizlersen sohbet geçmişin de silinir. Ayarlar bölümünden sohbetlerini JSON biçiminde dışa aktarabilirsin.' },
    { id: 5, cat: 'modeller', q: 'Kod blokları neden bazen bozuk görünüyor?', a: 'Yanıtlar akış hâlinde geldiği için kod blokları yanıt tamamlanana kadar eksik görünebilir. Yanıt tamamlandığında kod bloğu düzgün görüntülenir.' },
    { id: 6, cat: 'modeller', q: 'Özel talimat ne işe yarar?', a: 'Özel talimat, YamanAI\'ın her yanıtta uymasını istediğin bir kuraldır. Örneğin "Sen bir Python uzmanısın" yazarsan yanıtlar buna göre şekillenir. Giriş yaptıktan sonra Ayarlar bölümünden tanımlayabilirsin.' },
    { id: 7, cat: 'uygulama', q: 'Masaüstü uygulaması var mı?', a: 'Evet. YamanAI\'ın Windows için masaüstü uygulaması var. Kenar çubuğundaki "Uygulamayı indir" bağlantısından indirebilirsin.' },
    { id: 8, cat: 'gizlilik', q: 'Verilerim güvende mi?', a: 'Sohbet geçmişin yalnızca tarayıcında saklanır, sunucularımızda tutulmaz. Ancak yazdığın mesajlar yanıt üretilebilmesi için OpenAI\'a gönderilir. Bu yüzden sohbetlerde hassas bilgi paylaşmamanı öneririz.' },
  ],
};

const en: typeof tr = {
  newChat: 'New chat',
  beta: 'Beta',
  chats: 'Chats',
  history: 'Chat history',
  searchChats: 'Search chats',
  noMatches: 'No matching chats',
  today: 'Today', yesterday: 'Yesterday', older: 'Older',
  emptyHistory: 'Everything you ask stays here, in this browser.',
  deleteChat: 'Delete chat',
  downloadApp: 'Download the app',
  downloadAppSub: 'Desktop for Windows',
  signIn: 'Sign in',
  signInSub: (n: number) => `${n} messages a day and more`,
  signOut: 'Sign out',
  usageToday: (used: number, limit: number) => `${used}/${limit} messages today`,
  usageLeft: (n: number) => (n === 1 ? '1 message left today.' : `${n} messages left today.`),
  usageRaise: (n: number) => `Sign in to get ${n}`,
  limitGuest: (limit: number) => `You've used your ${limit} messages for today.`,
  limitUser: (limit: number, hours: number) => `You've used your ${limit} messages for today. They renew in about ${hours} ${hours === 1 ? 'hour' : 'hours'}.`,
  limitPlaceholder: 'Daily message limit reached',
  usageSection: 'Daily usage',
  requiresLogin: 'Requires sign-in',
  customLocked: 'Sign in for custom instructions',
  user: 'User',
  openMenu: 'Open menu', closeMenu: 'Close menu', close: 'Close',
  faq: 'Frequently asked questions', settings: 'Settings',
  lightTheme: 'Light theme', darkTheme: 'Dark theme',
  greeting: 'How can I help?',
  greetingName: (n: string) => `Hello, ${n}`,
  greetingSub: 'Write code, translate, understand a topic, or just talk.',
  starters: 'Example requests',
  prompts: [
    { label: 'Write code', prompt: 'Can you write a simple web scraper in Python?' },
    { label: 'Explain', prompt: 'How do quantum computers work?' },
    { label: 'Translate', prompt: 'Translate this into Spanish: "Hello, world!"' },
    { label: 'Get ideas', prompt: 'Suggest 5 creative names for a mobile app.' },
  ],
  placeholder: 'Ask YamanAI anything…',
  send: 'Send', stop: 'Stop',
  hintSend: 'to send', hintLine: 'for a new line',
  disclosure: 'Free. Chats stay in this browser; your messages are sent to OpenAI to get a reply.',
  typing: 'YamanAI is writing',
  copy: 'Copy', copied: 'Copied',
  regenerate: 'Answer again',
  preview: 'Preview', livePreview: 'Live preview', cssPreview: 'CSS preview',
  saveHtml: 'Download as HTML',
  stopped: 'You stopped this answer.',
  retry: 'Try again',
  errors: {
    network: "Couldn't connect. Check your internet and try again.",
    rate_limited: 'Too many requests right now. Wait a minute and try again.',
    not_configured: "YamanAI isn't configured right now, so it can't answer.",
    daily_limit: "You've reached today's message limit.",
    generic: "Couldn't get an answer. You can try again.",
  },
  jumpBottom: 'Jump to the latest',
  deleted: 'Chat deleted', deletedAll: 'All chats deleted', undo: 'Undo',
  storageFull: "Browser storage is full, so new messages can't be saved. Deleting old chats will free up space.",
  theme: 'Theme', dark: 'Dark', light: 'Light',
  language: 'Language', langAuto: 'Automatic',
  textSize: 'Text size', small: 'Small', normal: 'Normal', large: 'Large',
  model: 'Model', modelStrong: 'GPT-4o (Stronger)', modelFast: 'GPT-4o Mini (Faster)',
  customInstr: 'Custom instructions (optional)',
  customHint: 'Anything YamanAI should follow in every answer.',
  customPlaceholder: 'For example: "Keep answers short and give an example."',
  data: 'Your data',
  export: 'Export chats',
  deleteAll: 'Delete all chats',
  confirmDelete: 'Are you sure? Click again',
  cancel: 'Cancel', save: 'Save',
  loginTitle: 'Sign in to unlock more',
  loginBenefits: (guest: number, user: number) => [
    `${user} messages a day instead of ${guest}`,
    'The stronger GPT-4o model',
    'Custom instructions',
    'Live preview for code',
  ],
  google: 'Continue with Google', github: 'Continue with GitHub', later: 'Continue for now',
  desktopTitle: 'Desktop app',
  desktopBody: 'Download the Windows app to use YamanAI without opening a browser tab.',
  desktopDownload: 'Download for Windows',
  desktopLater: 'Stay in the browser',
  loginHeading: 'Sign in',
  loginSub: 'Sign in for a higher daily limit, GPT-4o, custom instructions and live preview.',
  redirecting: 'Redirecting…',
  backToChat: 'Back to chat without signing in',
  authErrors: {
    OAuthSignin: "Couldn't start sign-in. Try again.",
    OAuthCallback: "Couldn't finish sign-in. Try again.",
    OAuthCreateAccount: "Couldn't create the account. You can try the other option.",
    Callback: 'Sign-in failed. Try again.',
    Default: 'Something went wrong during sign-in. Try again.',
  },
  sssHeading: 'Frequently asked questions',
  sssSub: "If you can't find it here, ask YamanAI in the chat.",
  sssSearch: 'Search questions', sssSearchPlaceholder: 'Search a question or word…',
  sssClear: 'Clear search',
  sssAll: 'All',
  sssCategories: { genel: 'General', modeller: 'Models and settings', gizlilik: 'Privacy and data', uygulama: 'App' },
  sssCategory: 'Category',
  sssCount: (n: number) => `${n} questions`,
  sssResults: (n: number) => (n === 1 ? '1 result' : `${n} results`),
  sssNone: (q: string) => `No results for "${q}".`,
  sssStillTitle: "Didn't find your answer?",
  sssStillBody: 'Ask YamanAI in the chat.',
  sssBack: 'Back to chat',
  sssDesktopTitle: 'Use YamanAI on your desktop',
  sssDesktopBody: 'Download and install the Windows app to reach your chats without opening a browser tab.',
  faqItems: [
    { id: 1, cat: 'genel', q: 'What is YamanAI?', a: 'YamanAI is an AI chat assistant. It can help with writing code, translating, explaining things, and coming up with ideas. Its answers are generated with the GPT-4o and GPT-4o Mini models.' },
    { id: 2, cat: 'genel', q: 'Is YamanAI free?', a: 'Yes, YamanAI is free to use right now. Premium features may be added later, but the core chat features will always stay free.' },
    { id: 3, cat: 'modeller', q: 'Which AI models does it support?', a: 'GPT-4o and GPT-4o Mini. GPT-4o Mini is open to everyone and faster. GPT-4o, which gives more detailed answers, requires signing in; after that you can choose the model in Settings.' },
    { id: 9, cat: 'genel', q: 'Is there a daily message limit?', a: "Yes. You can send 10 messages a day without signing in and 50 when signed in. The limit renews every day at midnight UTC. If a reply can't be generated, that message doesn't count." },
    { id: 10, cat: 'genel', q: 'What changes when I sign in?', a: "Your daily limit goes up, and you can use GPT-4o, custom instructions and live preview for code. Your chats are still stored only in this browser and aren't synced to your account." },
    { id: 4, cat: 'gizlilik', q: 'Is my chat history saved?', a: "Your chat history is stored in your browser's local storage (localStorage). If you clear your browser data, your history is deleted too. You can export your chats as JSON in Settings." },
    { id: 5, cat: 'modeller', q: 'Why do code blocks sometimes look broken?', a: 'Answers arrive as a stream, so a code block can look incomplete until the answer finishes. It displays properly once the answer is complete.' },
    { id: 6, cat: 'modeller', q: 'What are custom instructions for?', a: 'Custom instructions are a rule YamanAI follows in every answer. For example, if you write "You are a Python expert", answers are shaped accordingly. You can set them in Settings after signing in.' },
    { id: 7, cat: 'uygulama', q: 'Is there a desktop app?', a: 'Yes. YamanAI has a desktop app for Windows. You can get it from the "Download the app" link in the sidebar.' },
    { id: 8, cat: 'gizlilik', q: 'Is my data safe?', a: "Your chat history is stored only in your browser, not on our servers. However, the messages you write are sent to OpenAI to generate a reply, so we recommend not sharing sensitive information in chats." },
  ],
};

export const STRINGS = { tr, en };
export type Strings = typeof tr;
