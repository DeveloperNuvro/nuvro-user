import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '@/app/store';
import { createCheckoutSession, createPortalSession } from '@/features/subscription/subscriptionSlice';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format, parseISO, differenceInDays } from "date-fns";
import { Calendar, Globe, MessageCircle, Bot, Sparkles, Users, Zap, type LucideIcon } from "lucide-react";
import { enUS, es } from 'date-fns/locale';
import { fetchBusinessById, fetchAiIntregationByBusinessId } from "@/features/business/businessSlice";
import { api } from "@/api/axios";
import PricingPageSkeleton from '@/components/skeleton/PaymentPageSkeleton';
import { cn } from '@/lib/utils';


type PlanLimitsFromApi = {
  maxWebsites?: number; maxWhatsappNumbers?: number; maxAgents?: number; maxModelTraining?: number;
  maxSeats?: number; maxMonthlyAiTurns?: number; maxConversationsPerMonth?: number; maxWorkflows?: number;
  maxAiTurnsPerConversation?: number;
};

/** Build feature list from backend limits for the Features section (single source of truth). */
function buildFeaturesFromLimits(
  limits: PlanLimitsFromApi,
  planName: string,
  t: (key: string, opts?: { defaultValue?: string; count?: number }) => string
): string[] {
  const features: string[] = [];
  if (limits.maxSeats != null)
    features.push(limits.maxSeats === 1
      ? t('pricingPage.featuresFromLimits.oneSeat', { defaultValue: '1 team seat' })
      : t('pricingPage.featuresFromLimits.seats', { defaultValue: '{{count}} team seats', count: limits.maxSeats }).replace('{{count}}', String(limits.maxSeats)));
  if (limits.maxMonthlyAiTurns != null) {
    const n = limits.maxMonthlyAiTurns;
    const formatted = n >= 1000 ? n.toLocaleString() : String(n);
    features.push(t('pricingPage.featuresFromLimits.aiCreditsPerMonth', { defaultValue: '{{count}} AI credits per month' }).replace('{{count}}', formatted));
  }
  if (limits.maxConversationsPerMonth != null)
    features.push(limits.maxConversationsPerMonth === -1
      ? t('pricingPage.featuresFromLimits.unlimitedConversations', { defaultValue: 'Unlimited conversations' })
      : t('pricingPage.featuresFromLimits.conversationsPerMonth', { defaultValue: '{{count}} conversations per month' }).replace('{{count}}', String(limits.maxConversationsPerMonth)));
  if (limits.maxAgents != null)
    features.push(limits.maxAgents === 1
      ? t('pricingPage.featuresFromLimits.oneAgent', { defaultValue: '1 AI Agent' })
      : t('pricingPage.featuresFromLimits.agents', { defaultValue: '{{count}} AI Agents' }).replace('{{count}}', String(limits.maxAgents)));
  if (limits.maxModelTraining != null)
    features.push(limits.maxModelTraining === 1
      ? t('pricingPage.featuresFromLimits.oneTrainingModel', { defaultValue: '1 Training Model' })
      : t('pricingPage.featuresFromLimits.trainingModels', { defaultValue: '{{count}} Training Models' }).replace('{{count}}', String(limits.maxModelTraining)));
  if (limits.maxWhatsappNumbers != null)
    features.push(limits.maxWhatsappNumbers === 1
      ? t('pricingPage.featuresFromLimits.oneWhatsApp', { defaultValue: '1 WhatsApp number' })
      : t('pricingPage.featuresFromLimits.whatsappNumbers', { defaultValue: '{{count}} WhatsApp numbers' }).replace('{{count}}', String(limits.maxWhatsappNumbers)));
  if (limits.maxWebsites != null)
    features.push(limits.maxWebsites === 1
      ? t('pricingPage.featuresFromLimits.oneWebsite', { defaultValue: '1 Website' })
      : t('pricingPage.featuresFromLimits.websites', { defaultValue: '{{count}} Websites' }).replace('{{count}}', String(limits.maxWebsites)));
  const supportLabel = t(`pricingPage.featuresFromLimits.support.${planName}`, { defaultValue: planName === 'basic' ? 'Basic Support' : planName === 'premium' ? 'Priority Support' : '24/7 Dedicated Support' });
  features.push(supportLabel);
  return features;
}

/** Format plan limits from API for display on card (so admin changes show on frontend). */
function formatPlanLimitsSummary(limits: PlanLimitsFromApi, t: (key: string, opts?: { defaultValue?: string }) => string): string[] {
    const parts: string[] = [];
    if (limits.maxWebsites != null) parts.push(limits.maxWebsites === 1 ? t('pricingPage.limitsSummary.oneWebsite', { defaultValue: '1 Website' }) : t('pricingPage.limitsSummary.websites', { defaultValue: '{{count}} Websites' }).replace('{{count}}', String(limits.maxWebsites)));
    if (limits.maxWhatsappNumbers != null) parts.push(limits.maxWhatsappNumbers === 1 ? t('pricingPage.limitsSummary.oneWhatsApp', { defaultValue: '1 WhatsApp' }) : t('pricingPage.limitsSummary.whatsapp', { defaultValue: '{{count}} WhatsApp' }).replace('{{count}}', String(limits.maxWhatsappNumbers)));
    if (limits.maxAgents != null) parts.push(limits.maxAgents === 1 ? t('pricingPage.limitsSummary.oneAgent', { defaultValue: '1 Agent' }) : t('pricingPage.limitsSummary.agents', { defaultValue: '{{count}} Agents' }).replace('{{count}}', String(limits.maxAgents)));
    if (limits.maxSeats != null) parts.push(limits.maxSeats === 1 ? t('pricingPage.limitsSummary.oneSeat', { defaultValue: '1 Seat' }) : t('pricingPage.limitsSummary.seats', { defaultValue: '{{count}} Seats' }).replace('{{count}}', String(limits.maxSeats)));
    if (limits.maxMonthlyAiTurns != null) {
        const n = limits.maxMonthlyAiTurns;
        const str = n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
        parts.push(t('pricingPage.limitsSummary.aiCredits', { defaultValue: '{{count}} AI credits/mo' }).replace('{{count}}', str));
    }
    return parts;
}

const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const UsageProgressBar = ({
    label,
    value,
    max,
    display,
    remainingText,
    icon: Icon,
    noProgress = false,
}: {
    label: string;
    value: number;
    max: number;
    display: string;
    remainingText?: string;
    icon?: LucideIcon;
    noProgress?: boolean;
}) => {
    const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const isHighUsage = !noProgress && max > 0 && percentage >= 80;
    return (
        <div className="group relative rounded-xl border border-gray-200 dark:border-[#2C3139] bg-white dark:bg-[#141418] p-4 shadow-sm hover:shadow-md hover:border-[#ff21b0]/30 dark:hover:border-[#ff21b0]/40 transition-all duration-200">
            <div className="flex items-start gap-3">
                {Icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff21b0]/10 dark:bg-[#ff21b0]/20 text-[#ff21b0]">
                        <Icon className="h-5 w-5" />
                    </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
                        <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{display}</p>
                    </div>
                    {remainingText != null && remainingText !== '' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{remainingText}</p>
                    )}
                    {!noProgress && (
                        <div className="pt-0.5">
                            <Progress
                                value={percentage}
                                className={cn(
                                    "h-2 rounded-full overflow-hidden [&>div]:rounded-full",
                                    isHighUsage && "[&>div]:bg-gradient-to-r from-amber-500 to-[#ff21b0]"
                                )}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export const PricingPage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();
    // --- 2. GET STATUS FROM REDUX STATE ---
    const { selectedBusiness, aiIntegrations, status: businessStatus } = useSelector((state: RootState) => state.business);
    const { connections: whatsappConnections } = useSelector((state: RootState) => state.whatsappBusiness);
    const { status: subscriptionLoadingStatus } = useSelector((state: RootState) => state.subscription);
    const { user } = useSelector((state: RootState) => state.auth);

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [catalogPlans, setCatalogPlans] = useState<Array<{ name: string; priceUsd: number; limits?: unknown }> | null>(null);
    const businessId = user?.businessId || '';
    const dateLocale = i18n.language === 'es' ? es : enUS;

    const ensureFeaturesArray = (val: unknown): string[] => {
        if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? v : String(v)));
        if (typeof val === 'string') return [val];
        return [];
    };

    useEffect(() => {
        api.get<{ plans: Array<{ name: string; priceUsd: number; limits?: unknown }> }>('/api/v1/subscriptions/plans')
            .then((res) => setCatalogPlans(res.data?.plans ?? null))
            .catch(() => setCatalogPlans(null));
    }, []);

    const PRICE_IDS: Record<string, string | undefined> = {
        basic: import.meta.env.VITE_STRIPE_BASIC_PLAN_PRICE_ID,
        premium: import.meta.env.VITE_STRIPE_PREMIUM_PLAN_PRICE_ID,
        enterprise: import.meta.env.VITE_STRIPE_ENTERPRISE_PLAN_PRICE_ID,
    };
    const planNames = ['basic', 'premium', 'enterprise'] as const;
    const plans = useMemo(() => {
        const catalogByName = catalogPlans ? Object.fromEntries((catalogPlans).map((p) => [p.name, p])) : {};
        return planNames.map((name) => {
            const catalog = catalogByName[name];
            const priceUsd = catalog?.priceUsd ?? (name === 'basic' ? 69 : name === 'premium' ? 209 : 549);
            const priceDisplay = t('pricingPage.plans.priceFormat', { amount: priceUsd, defaultValue: 'USD ${{amount}}/month' });
            const limits = (catalog?.limits && typeof catalog.limits === 'object' ? catalog.limits : {}) as PlanLimitsFromApi;
            const hasLimits = limits && Object.keys(limits).length > 0;
            const features = hasLimits
                ? buildFeaturesFromLimits(limits, name, t)
                : ensureFeaturesArray(t(`pricingPage.plans.${name}.features`, { returnObjects: true }));
            return {
                name,
                label: t(`pricingPage.plans.${name}.label`),
                price: priceUsd,
                priceDisplay,
                description: t(`pricingPage.plans.${name}.description`),
                recommended: name === 'premium',
                features,
                priceId: PRICE_IDS[name],
                limits,
            };
        });
    }, [t, catalogPlans]);
    
    useEffect(() => {
        if (businessId) {
            dispatch(fetchBusinessById(businessId));
            dispatch(fetchAiIntregationByBusinessId(businessId));
        }
    }, [dispatch, businessId]);

    const handleManageBilling = async () => {
        setLoadingAction('portal');
        try {
            const result = await dispatch(createPortalSession()).unwrap();
            if (result.url) { window.location.href = result.url; }
        } catch (error: any) {
            toast.error(error.message || t('pricingPage.toast.portalError'));
        } finally {
            setLoadingAction(null);
        }
    };

    const handleNewSubscription = async (planName: string) => {
        if (!planName) {
            toast.error(t('pricingPage.toast.missingConfig'));
            return;
        }
        setLoadingAction(planName);
        try {
            const result = await dispatch(createCheckoutSession({ plan: planName as 'basic' | 'premium' | 'enterprise' })).unwrap();
            if (result.url) { window.location.href = result.url; }
        } catch (error: any) {
            toast.error(error.message || t('pricingPage.toast.unexpectedError'));
        } finally {
            setLoadingAction(null);
        }
    };

    const currentPlan = plans.find(p => p.name === selectedBusiness?.subscriptionPlan);
    const subscriptionStatus = selectedBusiness?.subscriptionStatus;
    const isPayingSubscriber = subscriptionStatus === 'active';
    const nextBillingDate = selectedBusiness?.currentPeriodEnd;
    const trialEndDate = selectedBusiness?.trialEndDate;

    const limits = aiIntegrations?.integrationDetails?.limits;
    const usage = aiIntegrations?.integrationDetails?.usageStats;
    const existingDomains = aiIntegrations?.integrationDetails?.existingDomains ?? [];

    const websitesUsed = existingDomains.length;
    const websitesLimit = limits?.maxWebsites ?? 0;

    const whatsappUsed = Array.isArray(whatsappConnections) ? whatsappConnections.length : (usage?.whatsappNumbersConnected ?? 0);
    const whatsappLimit = limits?.maxWhatsappNumbers ?? 0;

    const formatUsageWithRemaining = (
        used: number,
        max: number,
    ): { display: string; remainingText: string | undefined } => {
        if (!max || max <= 0) return { display: `${used}`, remainingText: undefined };
        const remaining = Math.max(0, max - used);
        return {
            display: t('pricingPage.usage.usedOf', { used, max, defaultValue: '{{used}} of {{max}}' }),
            remainingText: t('pricingPage.usage.remaining', { count: remaining, defaultValue: '{{count}} remaining' }),
        };
    };

    const websitesUsage = formatUsageWithRemaining(websitesUsed, websitesLimit);
    const whatsappUsage = formatUsageWithRemaining(whatsappUsed, whatsappLimit);
    const agentsUsed = usage?.agentsCreated ?? 0;
    const agentsMax = limits?.maxAgents ?? 0;
    const agentsUsage = formatUsageWithRemaining(agentsUsed, agentsMax);
    const modelTrainingUsed = usage?.modelTrained ?? 0;
    const modelTrainingMax = limits?.maxModelTraining ?? 0;
    const modelTrainingUsage = formatUsageWithRemaining(modelTrainingUsed, modelTrainingMax);
    const aiCreditsUsed = usage?.monthlyAiTurnsUsed ?? 0;
    const aiCreditsMax = limits?.maxMonthlyAiTurns ?? 0;
    const aiCreditsUsage = formatUsageWithRemaining(aiCreditsUsed, aiCreditsMax);

    const seatsUsed = (aiIntegrations as any)?.seatsUsed ?? 0;
    const seatsMax = limits?.maxSeats ?? 0;
    const seatsUsage = formatUsageWithRemaining(seatsUsed, seatsMax);

    // --- 3. DEFINE LOADING STATE AND RENDER SKELETON ---
    const isLoading = businessStatus === 'loading' || (businessStatus === 'idle' && !selectedBusiness);
    if (isLoading) {
        return <PricingPageSkeleton />;
    }

    const TrialBanner = () => {
        if (!trialEndDate) return null;
        const daysRemaining = differenceInDays(parseISO(trialEndDate), new Date());
        
        return (
            <div className="bg-[#ff21b0] border border-purple-400 text-white p-4 rounded-lg mb-8 text-center">
                <p className="text-sm font-medium">
                    <span>🧪</span> {t('pricingPage.trial.onTrial', { planLabel: currentPlan?.label })}
                    {daysRemaining >= 0 ? (
                        <> {t('pricingPage.trial.endsIn', { count: daysRemaining })}</>
                    ) : (
                        <> {t('pricingPage.trial.ended')}</>
                    )}
                </p>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-[#1B1B20] min-h-screen">
            <div className="max-w-7xl mx-auto">
                <nav className="mb-8">
                    <button className="whitespace-nowrap bg-[#ff21b0] text-white px-6 rounded-md py-2 font-semibold text-sm">{t('pricingPage.nav.planAndPayment')}</button>
                </nav>

                {subscriptionStatus === 'trial' && <TrialBanner />}

                {(businessId || selectedBusiness) && (
                    <div className="bg-gradient-to-b from-gray-50 to-gray-100/50 dark:from-[#0D0D0D] dark:to-[#0a0a0d] border border-gray-200 dark:border-[#2C3139] rounded-2xl p-5 sm:p-6 mb-12 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{currentPlan?.label || t('pricingPage.usage.noPlan')}</h2>
                                <span className="bg-[#ff21b0]/15 text-[#ff21b0] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#ff21b0]/30">{t('pricingPage.usage.currentPlan')}</span>
                            </div>
                            {nextBillingDate && !isPayingSubscriber && selectedBusiness && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">{t('pricingPage.usage.nextPaymentOn', { date: format(parseISO(nextBillingDate), "dd/MM/yyyy", { locale: dateLocale }) })}</p>
                            )}
                        </div>
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t('pricingPage.usage.subtitle', 'Usage this billing period according to your plan')}</p>
                        {!selectedBusiness && businessId ? (
                            <div className="mt-6 py-10 text-center rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-[#2C3139]">
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('pricingPage.usage.loadFailed', 'Could not load usage. Please try again.')}</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-3"
                                    onClick={() => {
                                        dispatch(fetchBusinessById(businessId));
                                        dispatch(fetchAiIntregationByBusinessId(businessId));
                                    }}
                                >
                                    {t('pricingPage.usage.retry', 'Retry')}
                                </Button>
                            </div>
                        ) : (
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                            <UsageProgressBar
                                icon={Calendar}
                                noProgress
                                label={t('pricingPage.usage.expiration')}
                                value={1}
                                max={1}
                                display={nextBillingDate ? format(parseISO(nextBillingDate), "dd/MM/yyyy", { locale: dateLocale }) : t('pricingPage.usage.notAvailable')}
                            />
                            <UsageProgressBar
                                icon={Users}
                                label={t('pricingPage.usage.seats', 'Team seats')}
                                value={seatsUsed}
                                max={seatsMax}
                                display={seatsMax > 0 ? seatsUsage.display : `${seatsUsed}`}
                                remainingText={seatsUsage.remainingText}
                            />
                            <UsageProgressBar
                                icon={Globe}
                                label={t('pricingPage.usage.websites', 'Websites')}
                                value={websitesUsed}
                                max={websitesLimit}
                                display={websitesUsage.display}
                                remainingText={websitesUsage.remainingText}
                            />
                            <UsageProgressBar
                                icon={MessageCircle}
                                label={t('pricingPage.usage.whatsappNumbers', 'WhatsApp numbers')}
                                value={whatsappUsed}
                                max={whatsappLimit}
                                display={whatsappUsage.display}
                                remainingText={whatsappUsage.remainingText}
                            />
                            <UsageProgressBar
                                icon={Bot}
                                label={t('pricingPage.usage.agentUsage')}
                                value={agentsUsed}
                                max={agentsMax}
                                display={agentsMax > 0 ? agentsUsage.display : `${agentsUsed}`}
                                remainingText={agentsUsage.remainingText}
                            />
                            <UsageProgressBar
                                icon={Sparkles}
                                label={t('pricingPage.usage.modelTraining')}
                                value={modelTrainingUsed}
                                max={modelTrainingMax}
                                display={modelTrainingMax > 0 ? modelTrainingUsage.display : `${modelTrainingUsed}`}
                                remainingText={modelTrainingUsage.remainingText}
                            />
                            <UsageProgressBar
                                icon={Zap}
                                label={t('pricingPage.usage.aiCredits', 'AI credits')}
                                value={aiCreditsUsed}
                                max={aiCreditsMax}
                                display={aiCreditsMax > 0 ? aiCreditsUsage.display : t('pricingPage.usage.aiCreditsUsedOnly', { used: aiCreditsUsed, defaultValue: '{{used}} used' })}
                                remainingText={aiCreditsMax > 0 ? aiCreditsUsage.remainingText : undefined}
                            />
                        </div>
                        )}
                    </div>
                )}

                <div>
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pricingPage.plans.title')}</h3>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">{t('pricingPage.plans.subtitle')}</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {plans.map((plan) => {
                            const isCurrent = currentPlan?.name === plan.name;
                            const isLoading = subscriptionLoadingStatus === 'loading';

                            return (
                                <div key={plan.name} className={`rounded-xl p-6 flex flex-col h-full dark:text-white ${plan.recommended ? "border-2 border-[#ff21b0] bg-purple-50 dark:bg-purple-900/10" : "border border-gray-200 dark:border-[#2C3139] bg-white dark:bg-[#0D0D0D]"}`}>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{plan.label}</h4>
                                            {plan.recommended && <span className="bg-purple-200 dark:bg-purple-500/20 text-[#ff21b0] text-xs font-semibold px-3 py-1 rounded-md">{t('pricingPage.plans.recommended')}</span>}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 h-10">{plan.description}</p>
                                        <p className="text-3xl font-extrabold text-gray-900 dark:text-white my-4">{plan.priceDisplay}</p>
                                        {(() => {
                                            const limitParts = formatPlanLimitsSummary(plan.limits || {}, t);
                                            if (limitParts.length === 0) return null;
                                            return (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex flex-wrap gap-x-1 gap-y-0.5">
                                                    {limitParts.map((part, i) => (
                                                        <span key={i}>
                                                            {i > 0 && <span className="text-gray-400 dark:text-gray-500"> · </span>}
                                                            {part}
                                                        </span>
                                                    ))}
                                                </p>
                                            );
                                        })()}
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <h5 className="font-semibold text-gray-900 dark:text-white mb-3">{t('pricingPage.plans.featuresTitle')}</h5>
                                            <ul className="space-y-3">
                                                {(Array.isArray(plan.features) ? plan.features : []).map((feature: string, idx: number) => (
                                                <li key={idx} className="flex items-start">
                                                    <CheckCircleIcon className="w-5 h-5 text-[#ff21b0] mr-2 flex-shrink-0 mt-0.5" />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{typeof feature === 'string' ? feature : String(feature)}</span>
                                                </li>
                                            ))}
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="mt-8">
                                        {isCurrent ? (
                                            <Button disabled className="w-full bg-purple-200 text-[#ff21b0] font-semibold cursor-default dark:bg-[#ff21b0] dark:text-purple-100 dark:opacity-70">{t('pricingPage.buttons.selected')}</Button>
                                        ) : isPayingSubscriber ? (
                                            <Button onClick={handleManageBilling} disabled={isLoading && loadingAction === 'portal'} className="w-full cursor-pointer bg-[#ff21b0] hover:bg-[#ff21b0] text-white font-semibold">
                                                {isLoading && loadingAction === 'portal' ? t('pricingPage.buttons.openingPortal') : (plan.price > (currentPlan?.price || 0) ? t('pricingPage.buttons.upgrade') : t('pricingPage.buttons.downgrade'))}
                                            </Button>
                                        ) : (
                                            <Button onClick={() => handleNewSubscription(plan.name)} disabled={isLoading && loadingAction === plan.name} className="w-full cursor-pointer bg-[#ff21b0] hover:bg-[#db79b9] text-white font-semibold">
                                                {isLoading && loadingAction === plan.name ? t('pricingPage.buttons.redirecting') : t('pricingPage.buttons.selectPlan')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {isPayingSubscriber && (
                        <div className="mt-10 text-center">
                            <Button className="cursor-pointer" onClick={handleManageBilling} disabled={subscriptionLoadingStatus === 'loading' && loadingAction === 'portal'} variant="outline">
                                {subscriptionLoadingStatus === 'loading' && loadingAction === 'portal' ? t('pricingPage.buttons.loadingPortal') : t('pricingPage.buttons.manageSubscription')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PricingPage;