import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { createCheckoutSession, createPortalSession } from "@/features/subscription/subscriptionSlice";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format, parseISO, differenceInDays } from "date-fns";
import { fetchAiIntregationByBusinessId, fetchBusinessById } from "@/features/business/businessSlice";


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


const plans = [
    {
        name: "basic", label: "Basic", price: 19, priceDisplay: "USD $19/month",
        description: "For Individuals or small businesses testing the service with real resources (limited).",
        features: ["Up to 1000 conversations per month", "1 AI Agent", "1 Training Model", "Whatsapp Integration", "Basic Support"],
        priceId: import.meta.env.VITE_STRIPE_BASIC_PLAN_PRICE_ID,
    },
    {
        name: "premium", label: "Premium", price: 70, priceDisplay: "USD $70/month",
        description: "For individuals, and small to medium-sized businesses with growing customer interaction needs.",
        recommended: true,
        features: ["Up to 100000 conversations per month", "3 AI Agents", "3 Training Model", "Whatsapp Integration", "Priority Support"],
        priceId: import.meta.env.VITE_STRIPE_PREMIUM_PLAN_PRICE_ID,
    },
    {
        name: "enterprise", label: "Enterprise", price: 400, priceDisplay: "USD $400/month",
        description: "Large enterprises or corporations with high chat volumes and complex operations.",
        features: ["Up to 1000000 conversations per month", "10 AI Agents", "10 Training Model", "Whatsapp Integration", "24/7 Dedicated Support"],
        priceId: import.meta.env.VITE_STRIPE_ENTERPRISE_PLAN_PRICE_ID,
    },
];


export const PricingPage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { selectedBusiness, aiIntegrations } = useSelector((state: RootState) => state.business);
    const { status: subscriptionLoadingStatus } = useSelector((state: RootState) => state.subscription);
    const { user } = useSelector((state: RootState) => state.auth);

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const businessId = user?.businessId || '';

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
            if (result.url) {
                window.location.href = result.url;
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to open billing portal.");
        } finally {
            setLoadingAction(null);
        }
    };

    const handleNewSubscription = async (priceId: string | undefined) => {
        if (!priceId) {
            toast.error("Plan configuration is missing. Please contact support.");
            return;
        }
        setLoadingAction(priceId);
        try {
            const result = await dispatch(createCheckoutSession({ priceId })).unwrap();
            if (result.url) {
                window.location.href = result.url;
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.");
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
    
    console.log("Limits:", limits);
    console.log("Usage:", usage);

    const TrialBanner = () => {
        if (!trialEndDate) return null;
        const daysRemaining = differenceInDays(parseISO(trialEndDate), new Date());
        
        return (
            <div className="bg-[#ff21b0] border border-purple-400 text-white p-4 rounded-lg mb-8 text-center">
                <p className="text-sm font-medium">
                    <span>🧪</span> You’re on the <strong>{currentPlan?.label} Trial</strong>.
                    {daysRemaining >= 0 ? (
                        <> Trial ends in <strong>{daysRemaining} day{daysRemaining !== 1 && 's'}</strong>.</>
                    ) : (
                        <> Your trial has ended. Please select a plan to continue.</>
                    )}
                </p>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-[#1B1B20] min-h-screen">
            <div className="max-w-7xl mx-auto">
                <nav className="mb-8">
                    <button className="whitespace-nowrap bg-[#ff21b0] text-white px-6 rounded-md py-2 font-semibold text-sm">Plan & Payment</button>
                </nav>

                {subscriptionStatus === 'trial' && <TrialBanner />}

                {selectedBusiness && (
                    <div className="bg-gray-50 dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2C3139] rounded-xl p-6 mb-12">
                        {/* Usage Summary content remains the same */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{currentPlan?.label || 'No Plan'}</h2>
                                <span className="bg-purple-100 text-[#ff21b0] text-xs font-semibold px-2.5 py-0.5 rounded-full">Current Plan</span>
                            </div>
                            {nextBillingDate && !isPayingSubscriber && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 sm:mt-0">Next Payment on {format(parseISO(nextBillingDate), "dd/MM/yyyy")}</p>
                            )}
                        </div>
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                            <UsageProgressBar label="Plan Expiration" value={1} max={1} display={nextBillingDate ? format(parseISO(nextBillingDate), "dd/MM/yyyy") : 'N/A'} />
                            <UsageProgressBar label="AI Agent Usage" value={usage?.agentsCreated ?? 0} max={limits?.maxAgents ?? 0} display={`${usage?.agentsCreated ?? 0}/${limits?.maxAgents ?? 0}`} />
                            <UsageProgressBar label="Model Training" value={usage?.modelTrained ?? 0} max={limits?.maxModelTraining ?? 0} display={`${usage?.modelTrained ?? 0}/${limits?.maxModelTraining ?? 0}`} />
                            <UsageProgressBar label="Conversation" value={usage?.monthlyConversations ?? 0} max={limits?.maxConversationsPerMonth ?? 0} display={`${usage?.monthlyConversations ?? 0}/${limits?.maxConversationsPerMonth ?? 0}`} />
                        </div>
                    </div>
                )}

                <div>
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">All Plans</h3>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">Unlock the full potential of your AI chatbot with the right plan.</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {plans.map((plan) => {
                            const isCurrent = currentPlan?.name === plan.name;
                            const isLoading = subscriptionLoadingStatus === 'loading';

                            return (
                                <div key={plan.name} className={`rounded-xl p-6 flex flex-col h-full dark:text-white ${plan.recommended ? "border-2 border-[#ff21b0] bg-purple-50 dark:bg-purple-900/10" : "border border-gray-200 dark:border-[#2C3139] bg-white dark:bg-[#0D0D0D]"}`}>
                                    <div className="flex-grow">
                                        {/* Card content remains the same */}
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{plan.label}</h4>
                                            {plan.recommended && <span className="bg-purple-200 dark:bg-purple-500/20 text-[#ff21b0] text-xs font-semibold px-3 py-1 rounded-md">Recommended</span>}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 h-10">{plan.description}</p>
                                        <p className="text-3xl font-extrabold text-gray-900 dark:text-white my-4">{plan.priceDisplay}</p>
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Features</h5>
                                            <ul className="space-y-3">
                                                {plan.features.map((feature) => ( <li key={feature} className="flex items-start"> <CheckCircleIcon className="w-5 h-5 text-[#ff21b0] mr-2 flex-shrink-0 mt-0.5" /> <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span> </li> ))}
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="mt-8">
                                        {isCurrent ? (
                                            <Button disabled className="w-full bg-purple-200 text-[#ff21b0] font-semibold cursor-default dark:bg-[#ff21b0] dark:text-purple-100 dark:opacity-70">Selected</Button>
                                        ) : isPayingSubscriber ? (
                                            // LOGIC FOR EXISTING SUBSCRIBERS: ALWAYS GO TO PORTAL
                                            <Button onClick={handleManageBilling} disabled={isLoading && loadingAction === 'portal'} className="w-full cursor-pointer bg-[#ff21b0] hover:bg-[#ff21b0] text-white font-semibold">
                                                {isLoading && loadingAction === 'portal' ? 'Opening Portal...' : (plan.price > (currentPlan?.price || 0) ? "Upgrade Plan" : "Downgrade Plan")}
                                            </Button>
                                        ) : (
                                            // LOGIC FOR NEW/TRIAL USERS: GO TO CHECKOUT
                                            <Button onClick={() => handleNewSubscription(plan.priceId)} disabled={isLoading && loadingAction === plan.priceId} className="w-full cursor-pointer bg-[#ff21b0] hover:bg-[#db79b9] text-white font-semibold">
                                                {isLoading && loadingAction === plan.priceId ? 'Redirecting...' : "Select Plan"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Render general-purpose Billing Management Portal button for active, paying subscribers */}
                    {isPayingSubscriber && (
                        <div className="mt-10 text-center">
                            <Button className="cursor-pointer" onClick={handleManageBilling} disabled={subscriptionLoadingStatus === 'loading' && loadingAction === 'portal'} variant="outline">
                                {subscriptionLoadingStatus === 'loading' && loadingAction === 'portal' ? 'Loading Portal...' : 'Manage Subscription & Billing'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};