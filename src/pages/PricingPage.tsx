import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '@/app/store';
import { createCheckoutSession, createPortalSession } from '@/features/subscription/subscriptionSlice';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format, parseISO, differenceInDays } from "date-fns";
import { enUS, es } from 'date-fns/locale';
import { fetchBusinessById, fetchAiIntregationByBusinessId } from "@/features/business/businessSlice";


const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const UsageProgressBar = ({ label, value, max, display }: { label: string; value: number; max: number; display: string; }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-sm">{display}</p>
            </div>
            <Progress value={percentage} className="h-1.5 [&>div]:bg-[#ff21b0]" />
        </div>
    );
};


export const PricingPage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();
    const { selectedBusiness, aiIntegrations } = useSelector((state: RootState) => state.business);
    const { status: subscriptionLoadingStatus } = useSelector((state: RootState) => state.subscription);
    const { user } = useSelector((state: RootState) => state.auth);

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const businessId = user?.businessId || '';
    const dateLocale = i18n.language === 'es' ? es : enUS;

    const plans = useMemo(() => [
        {
            name: "basic", label: t('pricingPage.plans.basic.label'), price: 19, priceDisplay: t('pricingPage.plans.basic.priceDisplay'),
            description: t('pricingPage.plans.basic.description'),
            features: t('pricingPage.plans.basic.features', { returnObjects: true }) as string[],
            priceId: import.meta.env.VITE_STRIPE_BASIC_PLAN_PRICE_ID,
        },
        {
            name: "premium", label: t('pricingPage.plans.premium.label'), price: 70, priceDisplay: t('pricingPage.plans.premium.priceDisplay'),
            description: t('pricingPage.plans.premium.description'),
            recommended: true,
            features: t('pricingPage.plans.premium.features', { returnObjects: true }) as string[],
            priceId: import.meta.env.VITE_STRIPE_PREMIUM_PLAN_PRICE_ID,
        },
        {
            name: "enterprise", label: t('pricingPage.plans.enterprise.label'), price: 400, priceDisplay: t('pricingPage.plans.enterprise.priceDisplay'),
            description: t('pricingPage.plans.enterprise.description'),
            features: t('pricingPage.plans.enterprise.features', { returnObjects: true }) as string[],
            priceId: import.meta.env.VITE_STRIPE_ENTERPRISE_PLAN_PRICE_ID,
        },
    ], [t]);
    
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

    const handleNewSubscription = async (priceId: string | undefined) => {
        if (!priceId) {
            toast.error(t('pricingPage.toast.missingConfig'));
            return;
        }
        setLoadingAction(priceId);
        try {
            const result = await dispatch(createCheckoutSession({ priceId })).unwrap();
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

                {selectedBusiness && (
                    <div className="bg-gray-50 dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2C3139] rounded-xl p-6 mb-12">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{currentPlan?.label || t('pricingPage.usage.noPlan')}</h2>
                                <span className="bg-purple-100 text-[#ff21b0] text-xs font-semibold px-2.5 py-0.5 rounded-full">{t('pricingPage.usage.currentPlan')}</span>
                            </div>
                            {nextBillingDate && !isPayingSubscriber && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 sm:mt-0">{t('pricingPage.usage.nextPaymentOn', { date: format(parseISO(nextBillingDate), "dd/MM/yyyy", { locale: dateLocale }) })}</p>
                            )}
                        </div>
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                            <UsageProgressBar label={t('pricingPage.usage.expiration')} value={1} max={1} display={nextBillingDate ? format(parseISO(nextBillingDate), "dd/MM/yyyy", { locale: dateLocale }) : t('pricingPage.usage.notAvailable')} />
                            <UsageProgressBar label={t('pricingPage.usage.agentUsage')} value={usage?.agentsCreated ?? 0} max={limits?.maxAgents ?? 0} display={`${usage?.agentsCreated ?? 0}/${limits?.maxAgents ?? 0}`} />
                            <UsageProgressBar label={t('pricingPage.usage.modelTraining')} value={usage?.modelTrained ?? 0} max={limits?.maxModelTraining ?? 0} display={`${usage?.modelTrained ?? 0}/${limits?.maxModelTraining ?? 0}`} />
                            <UsageProgressBar label={t('pricingPage.usage.conversation')} value={usage?.monthlyConversations ?? 0} max={limits?.maxConversationsPerMonth ?? 0} display={`${usage?.monthlyConversations ?? 0}/${limits?.maxConversationsPerMonth ?? 0}`} />
                        </div>
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
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <h5 className="font-semibold text-gray-900 dark:text-white mb-3">{t('pricingPage.plans.featuresTitle')}</h5>
                                            <ul className="space-y-3">
                                                {(plan.features as string[]).map((feature) => ( <li key={feature} className="flex items-start"> <CheckCircleIcon className="w-5 h-5 text-[#ff21b0] mr-2 flex-shrink-0 mt-0.5" /> <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span> </li> ))}
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
                                            <Button onClick={() => handleNewSubscription(plan.priceId)} disabled={isLoading && loadingAction === plan.priceId} className="w-full cursor-pointer bg-[#ff21b0] hover:bg-[#db79b9] text-white font-semibold">
                                                {isLoading && loadingAction === plan.priceId ? t('pricingPage.buttons.redirecting') : t('pricingPage.buttons.selectPlan')}
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