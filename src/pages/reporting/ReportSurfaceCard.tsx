import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ReportChartAccent } from './ReportChartCard';

const accentBar: Record<string, string> = {
  violet: 'from-violet-500 via-fuchsia-500 to-pink-500',
  ocean: 'from-sky-500 via-cyan-500 to-teal-500',
  sunset: 'from-amber-500 via-orange-500 to-rose-500',
  forest: 'from-emerald-500 via-green-500 to-lime-500',
  rose: 'from-pink-500 via-rose-500 to-red-400',
};

/** Same chrome as ReportChartCard, for tables and summary blocks (no fixed chart height). */
const ReportSurfaceCard: React.FC<{
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  accent?: ReportChartAccent;
  icon?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerAction?: React.ReactNode;
}> = ({ title, description, children, accent = 'violet', icon, className, contentClassName, headerAction }) => (
  <Card
    className={cn(
      'relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm shadow-black/[0.04] backdrop-blur-md',
      'dark:border-white/10 dark:bg-card/90 dark:shadow-black/30',
      className
    )}
  >
    <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90', accentBar[accent] ?? accentBar.violet)} aria-hidden />
    <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl pointer-events-none" />
    <CardHeader className="relative flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between pb-4 pt-6">
      <div className="space-y-1 min-w-0">
        <CardTitle className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          {icon ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-primary">{icon}</span> : null}
          <span>{title}</span>
        </CardTitle>
        {description ? (
          <CardDescription className="text-sm leading-relaxed text-muted-foreground dark:text-neutral-400">{description}</CardDescription>
        ) : null}
      </div>
      {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
    </CardHeader>
    <CardContent className={cn('relative pb-6', contentClassName)}>{children}</CardContent>
  </Card>
);

export default ReportSurfaceCard;
