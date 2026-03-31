import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  default: {
    icon: 'from-slate-500/15 to-slate-500/5 text-slate-600 dark:text-slate-300 ring-slate-500/20',
    glow: 'from-primary/20 via-transparent to-transparent',
  },
  violet: {
    icon: 'from-violet-500/20 to-purple-500/10 text-violet-600 dark:text-violet-300 ring-violet-500/25',
    glow: 'from-violet-500/15 via-fuchsia-500/5 to-transparent',
  },
  emerald: {
    icon: 'from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-300 ring-emerald-500/25',
    glow: 'from-emerald-500/15 via-teal-500/5 to-transparent',
  },
  rose: {
    icon: 'from-rose-500/20 to-pink-500/10 text-rose-600 dark:text-rose-300 ring-rose-500/25',
    glow: 'from-rose-500/15 via-pink-500/5 to-transparent',
  },
  amber: {
    icon: 'from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-300 ring-amber-500/25',
    glow: 'from-amber-500/15 via-orange-500/5 to-transparent',
  },
  sky: {
    icon: 'from-sky-500/20 to-blue-500/10 text-sky-600 dark:text-sky-300 ring-sky-500/25',
    glow: 'from-sky-500/15 via-blue-500/5 to-transparent',
  },
} as const;

export type ReportStatVariant = keyof typeof variants;

const ReportStatCard = ({
  title,
  value,
  icon,
  description,
  helpText,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  helpText?: string;
  variant?: ReportStatVariant;
}) => {
  const v = variants[variant];
  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-card/95 py-0 shadow-sm',
        'shadow-black/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md hover:shadow-black/[0.06]',
        'dark:border-white/10 dark:from-card dark:to-card/95 dark:shadow-black/20 dark:hover:border-white/15'
      )}
    >
      <div
        className={cn('pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl transition-opacity group-hover:opacity-80', v.glow)}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.06] dark:to-primary/[0.1]" />
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-2 pt-5 px-5">
        <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-neutral-300 flex items-center gap-2 pr-2 leading-snug">
          <span>{title}</span>
          {helpText ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6} className="max-w-[300px] border border-border/80 text-sm leading-relaxed shadow-lg">
                {helpText}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </CardTitle>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-inset backdrop-blur-sm transition-transform duration-300 group-hover:scale-105',
            v.icon
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative px-5 pb-5 pt-0">
        <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">{value}</div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground dark:text-neutral-400">{description}</p>
      </CardContent>
    </Card>
  );
};

export default ReportStatCard;
