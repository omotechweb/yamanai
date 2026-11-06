import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// Android kurulum simgesi (manifest): kenarlarda bosluk birakir, "maskable" kirpmasina dayanir
export const dynamic = 'force-static';

export async function GET() {
  const icon = await readFile(join(process.cwd(), 'src/app/icon.svg'));
  const iconSrc = `data:image/svg+xml;base64,${icon.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F1EA' }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={iconSrc} width={300} height={300} />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
