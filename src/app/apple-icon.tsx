import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// iOS ana ekran simgesi: SVG kabul etmez, PNG ister
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  const icon = await readFile(join(process.cwd(), 'src/app/icon.svg'));
  const iconSrc = `data:image/svg+xml;base64,${icon.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F1EA' }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={iconSrc} width={128} height={128} />
      </div>
    ),
    size,
  );
}
