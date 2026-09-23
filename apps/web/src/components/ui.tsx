import type { SessionStatus } from '@attendence-up/shared';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

export const inputClass =
  'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-[#94a3b8] focus:border-accent focus:ring-[3px] focus:ring-accent/15';

const buttonStyles = {
  primary: 'bg-accent text-white shadow-sm hover:bg-accent-strong',
  secondary: 'border border-line bg-card text-ink hover:border-line-strong hover:bg-mist',
  danger: 'bg-danger text-white shadow-sm hover:opacity-90',
  ghost: 'text-muted hover:bg-mist hover:text-ink',
};

export function buttonClass(variant: keyof typeof buttonStyles = 'primary', className = '') {
  return `inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyles[variant]} ${className}`;
}

export const tableHeadClass = 'border-b border-line bg-paper text-xs font-semibold tracking-wider text-muted uppercase';
export const thClass = 'h-10 px-4 font-semibold whitespace-nowrap';
export const tdClass = 'h-[52px] px-4';
export const trClass = 'border-b border-mist last:border-0 transition-colors hover:bg-paper';

export function Icon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}>
      {name}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-card shadow-card ${className}`}>{children}</div>;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  );
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-xs font-semibold tracking-wider text-accent uppercase">{eyebrow}</div>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[2rem] sm:leading-10">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  );
}

export function ErrorBlock({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
      <Icon name="error" className="text-[18px]" />
      {message}
    </div>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-card px-6 py-10 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-mist text-muted">
        <Icon name={icon} className="text-[22px]" />
      </div>
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

type PillTone = 'neutral' | 'good' | 'warn' | 'live' | 'closed' | 'danger';

export function StatusPill({ tone, icon, children }: { tone: PillTone; icon?: string; children: ReactNode }) {
  const tones: Record<PillTone, string> = {
    neutral: 'bg-mist text-muted',
    good: 'bg-good-soft text-good',
    warn: 'bg-amber-soft text-amber',
    live: 'bg-teal-soft text-teal',
    closed: 'border border-line bg-paper text-[#94a3b8]',
    danger: 'bg-danger-soft text-danger',
  };
  const dots: Record<PillTone, string> = {
    neutral: 'bg-muted',
    good: 'bg-good animate-pulse',
    warn: 'bg-amber',
    live: 'bg-teal',
    closed: 'bg-[#94a3b8]',
    danger: 'bg-danger',
  };
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}
    >
      {icon ? <Icon name={icon} className="text-[14px]" /> : <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
}

export function sessionTone(status: SessionStatus): PillTone {
  if (status === 'OPEN') return 'good';
  if (status === 'CLOSED') return 'closed';
  return 'neutral';
}

export function LiveDot({ className = '' }: { className?: string }) {
  return (
    <span className={`relative flex h-2.5 w-2.5 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal" />
    </span>
  );
}

const metricTones = {
  accent: 'bg-accent-soft text-accent',
  teal: 'bg-teal-soft text-teal',
  amber: 'bg-amber-soft text-amber',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-mist text-muted',
};

export function MetricCard({
  label,
  value,
  unit,
  caption,
  icon,
  tone = 'accent',
  live = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  caption?: ReactNode;
  icon: string;
  tone?: keyof typeof metricTones;
  live?: boolean;
}) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07),0_2px_4px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</span>
        {live ? (
          <LiveDot />
        ) : (
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${metricTones[tone]}`}>
            <Icon name={icon} className="text-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-[2rem] leading-10 font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
      </div>
      {caption && <div className="mt-1 truncate text-xs text-muted">{caption}</div>}
    </Card>
  );
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number; tone?: 'warn' }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-mist p-1" role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              active
                ? 'bg-card text-accent shadow-sm'
                : option.tone === 'warn'
                  ? 'text-amber hover:text-ink'
                  : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className="ml-1 tabular-nums opacity-70">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-[#94a3b8]" />
      <input
        type="search"
        className={`${inputClass} pl-9`}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
      {initials}
    </span>
  );
}

export function CardLink({
  to,
  title,
  meta,
  aside,
}: {
  to: string;
  title: string;
  meta?: string;
  aside?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-4 rounded-xl border border-line bg-card px-4 py-3 shadow-card transition hover:border-line-strong hover:bg-mist"
    >
      <span>
        <span className="block text-sm font-medium">{title}</span>
        {meta && <span className="mt-0.5 block text-sm text-muted">{meta}</span>}
      </span>
      {aside}
    </Link>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
