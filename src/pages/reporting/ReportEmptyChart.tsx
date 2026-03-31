import React from 'react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ReportEmptyChart: React.FC<{ message: string; className?: string }> = ({ message, className }) => (
  <div
    className={cn(
      'flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 text-center',
      className
    )}
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground dark:bg-white/10 dark:text-neutral-400">
      <BarChart3 className="h-7 w-7 opacity-70" />
    </div>
    <p className="max-w-xs text-sm text-muted-foreground dark:text-neutral-300">{message}</p>
  </div>
);

export default ReportEmptyChart;
