import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const accentBar: Record<string, string> = {
  violet: 'from-violet-500 via-fuchsia-500 to-pink-500',
  ocean: 'from-sky-500 via-cyan-500 to-teal-500',
  sunset: 'from-amber-500 via-orange-500 to-rose-500',
  forest: 'from-emerald-500 via-green-500 to-lime-500',
  rose: 'from-pink-500 via-rose-500 to-red-400',
};

export type ReportChartAccent = keyof typeof accentBar;

type ReportChartCardProps = {
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  chartHeightClass?: string;
  accent?: ReportChartAccent;
  /** Optional icon next to title */
  icon?: React.ReactNode;
};

const ReportChartCard: React.FC<ReportChartCardProps> = ({
  title,
  description,
  children,
  className,
  contentClassName,
  chartHeightClass = 'min-h-[280px] h-[300px]',
  accent = 'violet',
  icon,
}) => (
  <Card
    className={cn(
      'relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm shadow-black/[0.04] backdrop-blur-md transition-shadow duration-300',
      'dark:border-white/10 dark:bg-card/90 dark:shadow-black/30',
      'hover:shadow-md hover:shadow-black/[0.06] dark:hover:shadow-black/40',
      className
    )}
  >
    <div
      className={cn(
        'absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90',
        accentBar[accent] ?? accentBar.violet
      )}
      aria-hidden
    />
    <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl pointer-events-none" />
    <CardHeader className="relative space-y-1 pb-2 pt-6">
      <CardTitle className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground">
        {icon ? <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/80 text-primary">{icon}</span> : null}
        <span>{title}</span>
      </CardTitle>
      {description ? (
        <CardDescription className="text-sm leading-relaxed text-muted-foreground dark:text-neutral-400">{description}</CardDescription>
      ) : null}
    </CardHeader>
    <CardContent className={cn('relative pb-6', chartHeightClass, contentClassName)}>{children}</CardContent>
  </Card>
);

export default ReportChartCard;
