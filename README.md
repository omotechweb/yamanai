# YamanAI

Ücretsiz yapay zekâ sohbet asistanı: [yamanai.net](https://yamanai.net). Hesap açmadan sorulabilir; giriş yapınca günlük limit artar, GPT-4o, özel talimat, canlı önizleme ve sesli sohbet açılır. Sohbetler sunucuda değil, kullanıcının tarayıcısında (localStorage) durur.

Ürün kuralları `PRODUCT.md`, tasarım sistemi `DESIGN.md` içindedir.

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` içinde gereken değişkenler:

| Değişken | Ne için |
| --- | --- |
| `OPENAI_API_KEY` | Sohbet ve ses (zorunlu) |
| `NEXTAUTH_SECRET` | Oturum imzası (zorunlu) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google ile giriş |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub ile giriş |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Günlük limitin sunucular arasında kalıcı sayılması |
| `GUEST_DAILY_LIMIT`, `USER_DAILY_LIMIT`, `VOICE_DAILY_LIMIT` | Günlük limitler (varsayılan 10, 50, 300) |

## Kontroller

```bash
npx tsc --noEmit   # tipler
npm run lint       # ESLint
npm test           # birim testleri (src/lib/chat.ts), ek paket gerektirmez
npm run e2e        # tarayıcı testleri: önce `npm run dev` çalışmalı
npm run build      # üretim derlemesi
```

`npm run e2e`, Edge ya da Chrome'u başsız modda açar ve sohbet akışını gerçek sayfada dener: yeniden adlandırma, sabitleme, yanıt akışı, kesilen yanıtı sürdürme, mesaj düzenleme, taslak, içe aktarma ve telefon genişliğinde taşma. `/api/chat` sayfa içinde sahte bir akışla yanıtlanır, yani OpenAI kotası harcanmaz. Başka bir adres için `npm run e2e -- http://localhost:3123`, başka bir tarayıcı için `BROWSER` ortam değişkeni.

## Yapı

- `src/app/page.tsx`: sohbet ekranı
- İki tasarım: **Ebru** (varsayılan, `src/components/EbruPlate.tsx`) ve **Gece Boğazı** (yalnızca giriş yapanlar Ayarlar → Tasarım'dan seçer; `html[data-design="bogaz"]` renk tokenları `src/app/globals.css`, su yansıması `src/components/BogazWater.tsx`). Tasarım kuralları `DESIGN.md`'de.
- `src/lib/chat.ts`: sohbet verisi, içe aktarma, geçmiş kırpma gibi React'ten bağımsız yardımcılar (testli)
- `src/lib/strings.ts`: Türkçe ve İngilizce arayüz metinleri; `src/lib/i18n.ts` dil seçimini yapar
- `src/app/api/chat/route.ts`: OpenAI akışı, günlük limit ve hız sınırı
- `src/app/sss`: sıkça sorulan sorular (Google için FAQPage yapısal verisiyle)
- `public/hakkinda`: Hakkında sayfası (düz HTML, `npm run sync:hakkinda`)

## Masaüstü uygulaması (Windows)

Uygulama `electron/` altındadır ve canlı siteyi (`https://yamanai.net`) kendi penceresinde açar. Pakete API anahtarı veya sunucu kodu girmez; sitedeki güncellemeler yeniden kurulum gerektirmez. Giriş, kullanıcının kendi tarayıcısında yapılır ve oturum uygulamaya aktarılır (`src/lib/desktopAuth.ts`).

```bash
npm run electron:start   # canlı siteye bağlanır
npm run electron:dev     # yerel next dev sunucusuna bağlanır
npm run electron:icon    # src/app/icon.svg dosyasından electron/icon.ico üretir
npm run electron:build   # dist/YamanAISetup.exe üretir
```

Sitedeki indirme düğmesi `public/download/YamanAISetup.exe` dosyasını sunar; yeni sürümü yayınlamak için `dist/YamanAISetup.exe` dosyasını oraya kopyala.

Derleme `Cannot create symbolic link` hatasıyla durursa Windows Ayarları'ndan Geliştirici Modu'nu aç veya `winCodeSign` paketini macOS dosyaları hariç `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0` klasörüne aç.
