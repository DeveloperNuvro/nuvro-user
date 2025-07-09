import { useSelector } from 'react-redux';
import { RootState } from '@/app/store'; // Adjust path to your Redux store

/**
 * A custom hook to get consolidated subscription status from the Redux store.
 * It assumes the user's business details (including subscription) are stored
 * in the `auth` slice after login or fetching.
 */
export const useSubscription = () => {
  // We get the business object, which should be attached to the authenticated user's state.
  const { selectedBusiness } = useSelector((state: RootState) => state.business);

  // If there's no business data, return a default "no subscription" state.
  if (!selectedBusiness) {
    return {
      plan: null,
      status: null,
      isTrial: false,
      isActive: false,
      isCanceled: false,
      currentPeriodEnd: null,
      trialEndDate: null,
      isLoading: true, // Indicates that business data might still be loading
    };
  }

  const { subscriptionStatus, trialEndDate, currentPeriodEnd, subscriptionPlan, cancelAtPeriodEnd } = selectedBusiness;

  // Determine the user's current status
  const isTrial = subscriptionStatus === 'trial' && trialEndDate && new Date(trialEndDate) > new Date();
  const isActive = subscriptionStatus === 'active';

  return {
    plan: subscriptionPlan,
    status: subscriptionStatus,
    isTrial,
    isActive,
    isCanceled: cancelAtPeriodEnd || false,
    currentPeriodEnd: currentPeriodEnd || null,
    trialEndDate: trialEndDate || null,
    isLoading: false, // Business data is available
  };
};