import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/site';

export const alt = 'YamanAI: Ücretsiz Türkçe yapay zekâ asistanı';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const icon = await readFile(join(process.cwd(), 'src/app/icon.svg'));
  const iconSrc = `data:image/svg+xml;base64,${icon.toString('base64')}`;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 96, background: '#101B3D', color: '#F4F1EA' }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={iconSrc} width={112} height={112} />
        <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -3, marginTop: 36 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 48, marginTop: 16, color: '#D9A441' }}>Ücretsiz Türkçe yapay zekâ asistanı</div>
      </div>
    ),
    size,
  );
}
