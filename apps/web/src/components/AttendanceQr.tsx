import { QRCodeSVG } from 'qrcode.react';

/** Shared with the unit test so the rendered modules are compared against this exact encoding. */
export const attendanceQrOptions = {
  level: 'M' as const,
  marginSize: 2,
  bgColor: '#ffffff',
  fgColor: '#131b2e',
};

export function AttendanceQr({ url }: { url: string }) {
  return (
    <figure className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="rounded-lg border border-line bg-white p-2">
        <QRCodeSVG
          value={url}
          size={176}
          title="QR code for the public attendance page"
          {...attendanceQrOptions}
        />
      </div>
      <figcaption className="max-w-44 text-center text-[11px] leading-snug text-muted">
        Scan to open the same check-in page as Copy link.
      </figcaption>
    </figure>
  );
}
