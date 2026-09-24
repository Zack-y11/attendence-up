import { useEffect, useRef, type CSSProperties } from 'react';

type Rgb = readonly [number, number, number];

const LINE_COLOR: Rgb = [37, 99, 235];
const ACCENTS: readonly Rgb[] = [
  [37, 99, 235],
  [37, 99, 235],
  [20, 184, 166],
  [13, 148, 136],
];

type Pulse = {
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
  color: Rgb;
  peak: number;
  start: number;
  duration: number;
};

type Settings = {
  cell: number;
  lineAlpha: number;
  density: number;
  maxPulses: number;
  dprCap: number;
  interactive: boolean;
};

const FRAME_MS = 1000 / 30;
const DRIFT_SECONDS_PER_CELL = 14;
const PARALLAX_PX = 8;

const rgba = ([r, g, b]: Rgb, alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
const random = (min: number, max: number) => min + Math.random() * (max - min);

export function AnimatedGridBackground({
  cellSize = 40,
  fadeCenter = true,
  className = '',
}: {
  cellSize?: number;
  fadeCenter?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 640px), (pointer: coarse)');

    let stop = () => {};

    const start = () => {
      stop();
      const small = compact.matches;
      const settings: Settings = {
        cell: small ? Math.round(cellSize * 1.15) : cellSize,
        lineAlpha: 0.06,
        density: small ? 0.014 : 0.024,
        maxPulses: small ? 12 : 48,
        dprCap: small ? 1.5 : 2,
        interactive: !small,
      };
      stop = reducedMotion.matches ? drawStatic(canvas, ctx, settings) : animate(canvas, ctx, settings);
    };

    start();
    reducedMotion.addEventListener('change', start);
    compact.addEventListener('change', start);
    return () => {
      stop();
      reducedMotion.removeEventListener('change', start);
      compact.removeEventListener('change', start);
    };
  }, [cellSize]);

  const mask = fadeCenter
    ? 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.5) 50%, #000 100%)'
    : undefined;
  const style: CSSProperties = { maskImage: mask, WebkitMaskImage: mask };

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 h-full w-full select-none ${className}`}
      style={style}
    />
  );
}

function resize(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dprCap: number) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cell: number,
  offsetX: number,
  offsetY: number,
  alpha: number,
) {
  const startX = (((offsetX % cell) + cell) % cell) - cell;
  const startY = (((offsetY % cell) + cell) % cell) - cell;
  ctx.beginPath();
  for (let x = startX; x <= width + cell; x += cell) {
    const px = Math.round(x) + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
  }
  for (let y = startY; y <= height + cell; y += cell) {
    const py = Math.round(y) + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
  }
  ctx.strokeStyle = rgba(LINE_COLOR, alpha);
  ctx.lineWidth = 1;
  ctx.stroke();
}

function fillCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  cell: number,
  offsetX: number,
  offsetY: number,
  color: Rgb,
  alpha: number,
) {
  ctx.fillStyle = rgba(color, alpha);
  ctx.fillRect(Math.round(col * cell + offsetX) + 1, Math.round(row * cell + offsetY) + 1, cell - 1, cell - 1);
}

function visibleRange(width: number, height: number, cell: number, offsetX: number, offsetY: number) {
  return {
    col0: Math.floor(-offsetX / cell),
    col1: Math.floor((width - offsetX) / cell),
    row0: Math.floor(-offsetY / cell),
    row1: Math.floor((height - offsetY) / cell),
  };
}

function pulseCount(width: number, height: number, settings: Settings) {
  const cells = Math.ceil(width / settings.cell) * Math.ceil(height / settings.cell);
  return Math.max(4, Math.min(settings.maxPulses, Math.round(cells * settings.density)));
}

function drawStatic(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, settings: Settings) {
  const paint = () => {
    const { width, height } = resize(canvas, ctx, settings.dprCap);
    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx, width, height, settings.cell, 0, 0, settings.lineAlpha);
    const range = visibleRange(width, height, settings.cell, 0, 0);
    const count = Math.round(pulseCount(width, height, settings) / 2);
    let seed = 7;
    const next = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < count; i += 1) {
      const col = range.col0 + Math.floor(next() * (range.col1 - range.col0 + 1));
      const row = range.row0 + Math.floor(next() * (range.row1 - range.row0 + 1));
      const color = ACCENTS[Math.floor(next() * ACCENTS.length)] ?? LINE_COLOR;
      fillCell(ctx, col, row, settings.cell, 0, 0, color, 0.06 + next() * 0.05);
    }
  };
  paint();
  window.addEventListener('resize', paint);
  return () => window.removeEventListener('resize', paint);
}

function animate(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, settings: Settings) {
  const { cell } = settings;
  const drift = cell / DRIFT_SECONDS_PER_CELL;
  let size = resize(canvas, ctx, settings.dprCap);
  let elapsed = 0;
  let last = performance.now();
  let frame = 0;
  let pointer: { x: number; y: number } | null = null;
  let parallaxX = 0;
  let parallaxY = 0;
  const trail = new Map<string, number>();

  const spawn = (pulse: Pulse | null, now: number, offsetX: number, offsetY: number): Pulse => {
    const range = visibleRange(size.width, size.height, cell, offsetX, offsetY);
    const fromCol = range.col0 + Math.floor(Math.random() * (range.col1 - range.col0 + 1));
    const fromRow = range.row0 + Math.floor(Math.random() * (range.row1 - range.row0 + 1));
    const horizontal = Math.random() > 0.5;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const distance = Math.random() > 0.7 ? 2 : 1;
    const duration = random(10, 18);
    return {
      fromCol,
      fromRow,
      toCol: fromCol + (horizontal ? direction * distance : 0),
      toRow: fromRow + (horizontal ? 0 : direction * distance),
      color: ACCENTS[Math.floor(Math.random() * ACCENTS.length)] ?? LINE_COLOR,
      peak: random(0.11, 0.2),
      duration,
      start: pulse ? now + random(0.5, 2.5) : now - Math.random() * duration,
    };
  };

  let pulses: Pulse[] = [];
  const seedPulses = () => {
    pulses = Array.from({ length: pulseCount(size.width, size.height, settings) }, () => spawn(null, elapsed, 0, 0));
  };
  seedPulses();

  const render = () => {
    const { width, height } = size;
    const targetX = pointer && settings.interactive ? ((pointer.x / width) * 2 - 1) * -PARALLAX_PX : 0;
    const targetY = pointer && settings.interactive ? ((pointer.y / height) * 2 - 1) * -PARALLAX_PX : 0;
    parallaxX += (targetX - parallaxX) * 0.04;
    parallaxY += (targetY - parallaxY) * 0.04;
    const offsetX = elapsed * drift + parallaxX;
    const offsetY = elapsed * drift + parallaxY;

    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx, width, height, cell, offsetX, offsetY, settings.lineAlpha);

    pulses = pulses.map((pulse) => {
      const progress = (elapsed - pulse.start) / pulse.duration;
      if (progress >= 1) return spawn(pulse, elapsed, offsetX, offsetY);
      if (progress > 0) {
        const travel = (1 - Math.cos(Math.PI * progress)) / 2;
        const col = pulse.fromCol + (pulse.toCol - pulse.fromCol) * travel;
        const row = pulse.fromRow + (pulse.toRow - pulse.fromRow) * travel;
        const alpha = pulse.peak * (0.35 + 0.65 * Math.sin(Math.PI * progress) ** 2);
        fillCell(ctx, col, row, cell, offsetX, offsetY, pulse.color, alpha);
      }
      return pulse;
    });

    if (settings.interactive) {
      if (pointer) {
        const key = `${Math.floor((pointer.x - offsetX) / cell)},${Math.floor((pointer.y - offsetY) / cell)}`;
        trail.set(key, Math.min(0.11, (trail.get(key) ?? 0) + 0.01));
      }
      for (const [key, alpha] of trail) {
        const [col, row] = key.split(',').map(Number) as [number, number];
        fillCell(ctx, col, row, cell, offsetX, offsetY, LINE_COLOR, alpha);
        const next = alpha * 0.94;
        if (next < 0.004) trail.delete(key);
        else trail.set(key, next);
      }
    }
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const delta = now - last;
    if (delta < FRAME_MS) return;
    last = now;
    elapsed += Math.min(delta, 100) / 1000;
    render();
  };

  const onResize = () => {
    size = resize(canvas, ctx, settings.dprCap);
    seedPulses();
    render();
  };
  const onPointerMove = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
  };
  const onPointerLeave = () => {
    pointer = null;
  };
  const onVisibility = () => {
    cancelAnimationFrame(frame);
    if (!document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  render();
  frame = requestAnimationFrame(tick);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  if (settings.interactive) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
  }

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
  };
}
