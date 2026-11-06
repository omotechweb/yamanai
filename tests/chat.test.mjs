// Calistir: npm test  (Node 24 TypeScript dosyalarini dogrudan okur, ek paket gerekmez)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImport, groupByDate, toApiHistory, reactPreviewDoc, MAX_HISTORY, MAX_INPUT_CHARS } from '../src/lib/chat.ts';

const msg = (role, text, extra = {}) => ({ id: Math.random().toString(36).slice(2), role, text, ...extra });

test('parseImport: bozuk JSON ve dizi olmayan veri reddedilir', () => {
  assert.equal(parseImport('{bozuk'), null);
  assert.equal(parseImport('{"a":1}'), null);
  assert.deepEqual(parseImport('[]'), []);
});

test('parseImport: gecersiz sohbet ve mesajlar atlanir, gecerliler korunur', () => {
  const raw = JSON.stringify([
    { id: 'a', title: 'Merhaba', updatedAt: 5, pinned: true, messages: [msg('user', 'selam', { at: 1 }), { role: 'hacker', text: 'x' }, msg('ai', 'Selam!')] },
    { id: 'b', title: 'Bos', messages: [] },
    { title: 'kimliksiz', messages: [msg('user', 'x')] },
    null,
  ]);
  const out = parseImport(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'a');
  assert.equal(out[0].pinned, true);
  assert.equal(out[0].messages.length, 2);
  assert.equal(out[0].messages[0].at, 1);
});

test('parseImport: cok uzun baslik kisaltilir, eksik tarih doldurulur', () => {
  const out = parseImport(JSON.stringify([{ id: 'x', title: 'a'.repeat(500), messages: [msg('user', 'hi')] }]));
  assert.equal(out[0].title.length, 80);
  assert.ok(out[0].updatedAt > 0);
});

test('groupByDate: sabitlenenler ayri, digerleri gune gore', () => {
  const now = Date.now();
  const twoDaysAgo = now - 2 * 86_400_000;
  const groups = groupByDate([
    { id: '1', title: 'bugun', updatedAt: now },
    { id: '2', title: 'eski', updatedAt: twoDaysAgo },
    { id: '3', title: 'sabit', updatedAt: twoDaysAgo, pinned: true },
  ]);
  assert.deepEqual(groups.pinned.map(c => c.id), ['3']);
  assert.deepEqual(groups.today.map(c => c.id), ['1']);
  assert.deepEqual(groups.older.map(c => c.id), ['2']);
  assert.equal(groups.yesterday.length, 0);
});

test('toApiHistory: bos mesajlar atilir, roller cevrilir', () => {
  const h = toApiHistory([msg('user', 'soru'), msg('ai', '   '), msg('ai', 'yanit')]);
  assert.deepEqual(h, [{ role: 'user', content: 'soru' }, { role: 'assistant', content: 'yanit' }]);
});

test('toApiHistory: uzun sohbet sunucu sinirini asmaz ve kullaniciyla baslar', () => {
  const long = [];
  for (let i = 0; i < 100; i++) long.push(msg(i % 2 ? 'ai' : 'user', `m${i}`));
  const h = toApiHistory(long);
  assert.ok(h.length <= MAX_HISTORY);
  assert.equal(h[0].role, 'user');
  assert.equal(h.at(-1).content, 'm99');
});

test('toApiHistory: tek mesaj sunucu karakter sinirina kirpilir', () => {
  const h = toApiHistory([msg('ai', 'x'.repeat(MAX_INPUT_CHARS + 50)), msg('user', 'devam')]);
  assert.equal(h[0].content.length, MAX_INPUT_CHARS);
});

test('reactPreviewDoc: bilesen bulunur, import satirlari ve </script> etkisizlesir', () => {
  const doc = reactPreviewDoc("import React from 'react';\nexport default function App() { return <p>{'</script>'}</p>; }");
  assert.match(doc, /React\.createElement\(App\)/);
  assert.doesNotMatch(doc, /import React from/);
  assert.doesNotMatch(doc, /\{'<\/script>'\}/);
});

test('parseImport: yanit surumleri korunur, bozuk surum listesi atlanir', () => {
  const out = parseImport(JSON.stringify([{ id: 'v', title: 't', messages: [
    msg('user', 'soru'),
    msg('ai', 'ikinci', { variants: ['birinci', 'ikinci'], vi: 1 }),
    msg('ai', 'bozuk', { variants: ['a', 5] }),
  ] }]));
  assert.deepEqual(out[0].messages[1].variants, ['birinci', 'ikinci']);
  assert.equal(out[0].messages[1].vi, 1);
  assert.equal(out[0].messages[2].variants, undefined);
});
