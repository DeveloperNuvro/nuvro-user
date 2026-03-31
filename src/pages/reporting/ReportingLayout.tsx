import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Calendar, LayoutDashboard, Users, Bot, Ticket, GitBranch, Loader2, Sparkles } from 'lucide-react';

import { AppDispatch, RootState } from '@/app/store';
import { fetchReportingBundle } from '@/features/reporting/reportingSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ReportingLayout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const reporting = useSelector((state: RootState) => state.reporting);

  const businessId = user?.businessId;

  const [start, setStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [end, setEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!businessId) return;
    dispatch(fetchReportingBundle({ businessId, start, end }));
  }, [dispatch, businessId, start, end]);

  const navItems = useMemo(
    () => [
      { to: 'overview', label: t('reporting.nav.overview', 'Overview'), icon: LayoutDashboard },
      { to: 'agents', label: t('reporting.nav.agents', 'Agent performance'), icon: Users },
      { to: 'ai', label: t('reporting.nav.ai', 'AI usage'), icon: Bot },
      { to: 'tickets', label: t('reporting.nav.tickets', 'Tickets'), icon: Ticket },
      { to: 'assignments', label: t('reporting.nav.assignments', 'Assignments'), icon: GitBranch },
    ],
    [t]
  );

  const applyRange = () => {
    if (!businessId) return;
    dispatch(fetchReportingBundle({ businessId, start, end }));
  };

  return (
    <div className="relative flex-1 min-h-screen overflow-hidden text-foreground dark:[color-scheme:dark]">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[22rem] w-[min(100%,56rem)] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl dark:bg-primary/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black, transparent 88%)',
        }}
        aria-hidden
      />

      <div className="relative p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
          <aside className="w-full lg:w-[220px] shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground dark:text-neutral-400 px-1 mb-3">
              {t('reporting.nav.section', 'Reports')}
            </p>
            <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide rounded-2xl border border-border/60 bg-card/50 p-2 backdrop-blur-md dark:border-white/10 dark:bg-card/80">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to}>
                  {({ isActive }) => (
                    <span
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap',
                        isActive
                          ? 'bg-primary/15 text-primary shadow-sm ring-1 ring-primary/25 dark:bg-primary/20 dark:text-primary dark:ring-primary/30'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-all duration-200 dark:bg-white/10 dark:text-neutral-200',
                          isActive && 'bg-background text-primary shadow-sm ring-1 ring-border dark:bg-white/15 dark:text-primary dark:ring-white/10'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('reporting.layout.badge', 'Insights')}
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold tracking-tight text-foreground">
                  {t('reporting.pageTitle', 'Reporting')}
                </h1>
                <p className="max-w-xl text-sm md:text-base text-muted-foreground dark:text-neutral-400 leading-relaxed">
                  {t('reporting.pageSubtitlePolished', 'Interactive metrics for agents, AI, tickets, and assignments.')}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-card/90">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/20">
                  <Calendar className="h-4 w-4" />
                </span>
                <span className="font-medium text-foreground">{new Date().toLocaleDateString(i18n.language, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</span>
              </div>
            </div>

            <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/80 shadow-md backdrop-blur-md dark:border-white/10 dark:bg-card/90">
              <div className="h-0.5 bg-gradient-to-r from-violet-500 via-primary to-amber-400 opacity-90" />
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold text-foreground">{t('reporting.filters', 'Filters')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center pb-5">
                <Input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full sm:w-[170px] rounded-xl border-border bg-background text-foreground dark:border-white/15 dark:bg-background"
                />
                <Input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full sm:w-[170px] rounded-xl border-border bg-background text-foreground dark:border-white/15 dark:bg-background"
                />
                <Button
                  variant="default"
                  onClick={applyRange}
                  disabled={reporting.status === 'loading'}
                  className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#e11d8c] to-[#a855f7] font-semibold text-white shadow-md shadow-primary/25 hover:opacity-95 dark:text-white"
                >
                  {reporting.status === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('reporting.loading', 'Loading…')}
                    </>
                  ) : (
                    t('apply', 'Apply')
                  )}
                </Button>
                {reporting.error ? <p className="text-sm text-destructive w-full sm:w-auto">{reporting.error}</p> : null}
              </CardContent>
            </Card>

            <div className="relative min-h-[240px]">
              {reporting.status === 'loading' && !reporting.userPerformance ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/80 backdrop-blur-sm dark:bg-background/90">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm font-medium text-muted-foreground dark:text-neutral-300">{t('reporting.loading', 'Loading…')}</p>
                </div>
              ) : null}
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportingLayout;
