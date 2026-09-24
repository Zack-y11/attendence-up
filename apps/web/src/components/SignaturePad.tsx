import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedTabs } from './ui';

const PAD_WIDTH = 640;
const PAD_HEIGHT = 200;
const SCRIPT_FONT = '"Great Vibes", cursive';

type Mode = 'draw' | 'type';

export function SignaturePad({
  suggestedName,
  onChange,
}: {
  suggestedName: string;
  onChange: (signature: string | null) => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('draw');
  const [written, setWritten] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PAD_WIDTH * ratio;
    canvas.height = PAD_HEIGHT * ratio;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineWidth = 2.4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#131b2e';
    contextRef.current = context;
  }, []);

  useEffect(() => {
    if (mode !== 'type') return;
    let cancelled = false;
    void renderWrittenSignature(written).then((image) => {
      if (!cancelled) onChangeRef.current(image);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, written]);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * PAD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * PAD_HEIGHT,
    };
  }

  function publishDrawing() {
    const canvas = canvasRef.current;
    onChangeRef.current(canvas && hasInkRef.current ? canvas.toDataURL('image/png') : null);
  }

  function clear() {
    if (mode === 'type') {
      setWritten('');
      return;
    }
    contextRef.current?.clearRect(0, 0, PAD_WIDTH, PAD_HEIGHT);
    hasInkRef.current = false;
    onChangeRef.current(null);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">{t('signature.label')}</span>
        <button type="button" onClick={clear} className="text-xs font-medium text-muted hover:text-ink">
          {t('signature.clear')}
        </button>
      </div>
      <SegmentedTabs
        value={mode}
        onChange={(next) => {
          setMode(next);
          if (next === 'type') {
            setWritten((current) => (current.trim() ? current : suggestedName.trim()));
          } else {
            publishDrawing();
          }
        }}
        options={[
          { value: 'draw', label: t('signature.draw') },
          { value: 'type', label: t('signature.write') },
        ]}
      />
      <div className="relative mt-2 h-36 overflow-hidden rounded-lg border border-line bg-white">
        <canvas
          ref={canvasRef}
          aria-label={t('signature.drawLabel')}
          className={`absolute inset-0 h-full w-full touch-none ${mode === 'draw' ? 'cursor-crosshair' : 'invisible'}`}
          onPointerDown={(event) => {
            if (mode !== 'draw') return;
            const context = contextRef.current;
            if (!context) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drawingRef.current = true;
            const next = point(event);
            context.beginPath();
            context.moveTo(next.x, next.y);
            context.lineTo(next.x + 0.1, next.y);
            context.stroke();
            hasInkRef.current = true;
          }}
          onPointerMove={(event) => {
            if (!drawingRef.current || mode !== 'draw') return;
            const context = contextRef.current;
            if (!context) return;
            const next = point(event);
            context.lineTo(next.x, next.y);
            context.stroke();
            hasInkRef.current = true;
          }}
          onPointerUp={() => {
            if (!drawingRef.current) return;
            drawingRef.current = false;
            publishDrawing();
          }}
          onPointerCancel={() => {
            drawingRef.current = false;
            publishDrawing();
          }}
        />
        {mode === 'type' && (
          <input
            aria-label={t('signature.writeLabel')}
            value={written}
            onChange={(event) => setWritten(event.target.value)}
            placeholder={t('signature.placeholder')}
            maxLength={80}
            className="absolute inset-x-6 bottom-6 bg-transparent text-center leading-none text-ink outline-none placeholder:text-[#cbd5e1]"
            style={{ fontFamily: SCRIPT_FONT, fontSize: '42px' }}
          />
        )}
        <div className="pointer-events-none absolute right-6 bottom-7 left-6 border-b border-line" />
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {mode === 'draw' ? t('signature.drawHint') : t('signature.writeHint')}
      </p>
    </div>
  );
}

async function renderWrittenSignature(value: string): Promise<string | null> {
  const text = value.trim();
  if (!text) return null;
  try {
    await document.fonts.load(`64px ${SCRIPT_FONT}`);
  } catch {
    // The browser falls back to cursive if the script face is unavailable.
  }
  const canvas = document.createElement('canvas');
  const ratio = 2;
  canvas.width = PAD_WIDTH * ratio;
  canvas.height = PAD_HEIGHT * ratio;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = '#131b2e';
  context.textBaseline = 'alphabetic';
  context.textAlign = 'center';
  let size = 64;
  context.font = `${size}px ${SCRIPT_FONT}`;
  const maxWidth = PAD_WIDTH - 48;
  const measured = context.measureText(text).width;
  if (measured > maxWidth) {
    size = Math.max(28, Math.floor((size * maxWidth) / measured));
    context.font = `${size}px ${SCRIPT_FONT}`;
  }
  context.fillText(text, PAD_WIDTH / 2, PAD_HEIGHT - 52);
  return canvas.toDataURL('image/png');
}
