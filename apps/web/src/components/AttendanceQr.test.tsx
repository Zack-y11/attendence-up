import jsQR from 'jsqr';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { describe, expect, it } from 'vitest';
import { publicAttendanceUrl } from '../lib/publicAttendanceUrl';
import { AttendanceQr, attendanceQrOptions } from './AttendanceQr';

function qrPaths(value: string) {
  const html = renderToStaticMarkup(
    <QRCodeSVG
      value={value}
      size={176}
      title="QR code for the public attendance page"
      {...attendanceQrOptions}
    />,
  );
  return [...html.matchAll(/d="([^"]+)"/g)].map((match) => match[1]);
}

/** Paint the dark SVG modules and read them back the way a camera would. */
function scan(html: string) {
  const viewBox = html.match(/viewBox="0 0 (\d+) (\d+)"/);
  const dark = html.match(/fill="#131b2e" d="([^"]+)"/);
  if (!viewBox || !dark) throw new Error('QR svg is missing modules');
  const size = Number(viewBox[1]);
  const scale = 8;
  const width = size * scale;
  const data = new Uint8ClampedArray(width * width * 4);
  data.fill(255);
  for (const rect of dark[1].matchAll(/M(\d+)[ ,]+(\d+)\s*h(\d+)v(\d+)H\d+z/g)) {
    const x = Number(rect[1]);
    const y = Number(rect[2]);
    const w = Number(rect[3]);
    const h = Number(rect[4]);
    for (let py = y; py < y + h; py += 1) {
      for (let px = x; px < x + w; px += 1) {
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            const index = ((py * scale + sy) * width + (px * scale + sx)) * 4;
            data[index] = 0x13;
            data[index + 1] = 0x1b;
            data[index + 2] = 0x2e;
            data[index + 3] = 255;
          }
        }
      }
    }
  }
  return jsQR(data, width, width)?.data ?? null;
}

describe('public attendance QR', () => {
  it('encodes the same /attendance/{token} URL that Copy link uses', () => {
    const url = publicAttendanceUrl('https://class.example', '/attendance/token-123');
    expect(url).toBe('https://class.example/attendance/token-123');

    const html = renderToStaticMarkup(<AttendanceQr url={url} />);
    const paths = [...html.matchAll(/d="([^"]+)"/g)].map((match) => match[1]);

    expect(paths).toEqual(qrPaths(url));
    expect(paths).not.toEqual(qrPaths('https://class.example/sessions/internal-id'));
    expect(scan(html)).toBe(url);
    expect(html).toContain('same check-in page as Copy link');
  });

  it('changes the encoded check-in URL when the short-lived code changes', () => {
    const current = publicAttendanceUrl(
      'https://class.example',
      '/attendance/token-123?c=code-current',
    );
    const next = publicAttendanceUrl('https://class.example', '/attendance/token-123?c=code-next');

    expect(current).toBe('https://class.example/attendance/token-123?c=code-current');
    expect(scan(renderToStaticMarkup(<AttendanceQr url={current} />))).toBe(current);
    expect(scan(renderToStaticMarkup(<AttendanceQr url={next} />))).toBe(next);
    expect(current).not.toBe(next);
  });
});
