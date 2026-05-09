"use client";

import { useState, memo } from 'react';
import { ChevronDown, ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';

const FAQ_ITEMS = [
  {
    q: 'YamanAI nedir?',
    a: 'YamanAI, yapay zeka destekli bir sohbet asistanidir. Kod yazma, cevirme, aciklama ve fikir uretme gibi bircoek alanda size yardimci olabilir. GPT-4o ve GPT-4o-mini modellerini kullanarak hizli ve dogru yanitlar sunar.',
  },
  {
    q: 'YamanAI ucretsiz mi?',
    a: 'Evet, YamanAI su an icin ucretsiz olarak kullanilabilir. Ilerleyen donemerde premium ozellikler eklenebilir ancak temel sohbet ozellikleri her zaman ucretsiz kalacaktir.',
  },
  {
    q: 'Hangi AI modellerini destekliyor?',
    a: 'Su anda GPT-4o ve GPT-4o-mini modellerini destekliyoruz. Ayarlar bolumunden istediginiz modeli secebilirsiniz. GPT-4o daha detayli ve kapsamli yanitlar verirken, GPT-4o-mini daha hizli ve ekonomik bir secenektir.',
  },
  {
    q: 'Sohbet gecmisim kaydediliyor mu?',
    a: 'Sohbet gecmisiniz tarayicinizin yerel depolamasinda (localStorage) saklanir. Bu, verilerinizin cihazinizdan cikmadigi anlamina gelir. Tarayici verilerini temizlerseniz sohbet gecmisiniz de silinir. Ayarlar bolumunden sohbetlerinizi JSON formatinda disa aktarabilirsiniz.',
  },
  {
    q: 'Kod bloklari neden bazen bozuk gorunuyor?',
    a: 'Kod bloklari yapay zekanin yaniti tamamlanana kadar stream (akis) halinde gelir. Yanit tamamlandiginda kod blogu tam olarak render edilir. Eger tamamlanmis bir yanittaki kod blogu hala bozuk gorunuyorsa, sayfayi yenileyerek sorunu cozebilirsiniz.',
  },
  {
    q: 'Sistem promptunu ozellestirmek ne ise yarar?',
    a: 'Sistem promptu, yapay zekanin nasil davranacagini belirleyen bir on komuttur. Ornegin "Sen bir Python uzmanisin" gibi bir prompt eklerseniz, AI tum yanitlarini Python odakli verir. Ayarlar bolumunden kendi sistem promptunuzu tanimlayabilirsiniz.',
  },
  {
    q: 'Masaustu uygulamasi var mi?',
    a: 'Evet! YamanAI Windows icin masaustu uygulamasi sunmaktadir. Sidebar\'daki "Uygulamayi Indir" butonuna tiklayarak veya ilk ziyaretinizde cikan popup\'tan indirebilirsiniz.',
  },
  {
    q: 'Verilerim guvenli mi?',
    a: 'Sohbet gecmisiniz sadece tarayicinizda saklanir, sunucularimizda tutulmaz. API istekleri OpenAI\'nin guvenli sunuculari uzerinden islenir. Hassas bilgilerinizi sohbetlerde paylasmamanizi oneririz.',
  },
];

const AccordionItem = memo(({ item, isOpen, onToggle }: {
  item: { q: string; a: string }; isOpen: boolean; onToggle: () => void;
}) => (
  <div className="border border-white/10 rounded-xl overflow-hidden transition-colors hover:border-white/20">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 text-left text-gray-200 hover:bg-white/5 transition-colors"
    >
      <span className="font-medium text-sm pr-4">{item.q}</span>
      <ChevronDown
        size={18}
        className={`text-gray-500 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : ''}`}
      />
    </button>
    <div
      className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
    >
      <div className="overflow-hidden">
        <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{item.a}</p>
      </div>
    </div>
  </div>
));
AccordionItem.displayName = 'AccordionItem';

export default function SSSPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#212121] text-gray-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#212121]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-4 px-6 py-4">
          <Link href="/" className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <HelpCircle size={20} className="text-blue-400" />
            <h1 className="font-bold text-lg">Sikca Sorulan Sorular</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-gray-500 text-sm mb-8">
          YamanAI hakkinda en cok sorulan sorular ve yanitlari. Aradiginiz cevabi bulamadiysa sohbet ekranindan bize sorabilirsiniz.
        </p>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              item={item}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            <ArrowLeft size={16} />
            Sohbete Don
          </Link>
        </div>
      </main>
    </div>
  );
}