import type { ReactNode } from 'react';
import { Card, Icon } from './ui';

export function FormLayout({
  children,
  tips,
}: {
  children: ReactNode;
  tips: { icon: string; title: string; body: string }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">{children}</Card>
      <Card className="h-fit p-5">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">How it works</p>
        <ul className="mt-3 grid gap-4">
          {tips.map((tip) => (
            <li key={tip.title} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon name={tip.icon} className="text-[18px]" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{tip.title}</span>
                <span className="block text-sm text-muted">{tip.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
