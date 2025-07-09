import { useEffect } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';
import { useSubscription } from '@/hooks/useSubscription'; // Import the hook we just created

import { Button } from '@/components/ui/button';
import { Card, CardContent,  CardHeader, } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton'; // For a nice loading state
import { Calendar} from 'lucide-react';
import { format } from 'date-fns';

export const BillingManagement = () => {


  // Use our custom hook to get live subscription data and loading state
  const { plan, status, isCanceled, currentPeriodEnd, isLoading: isBusinessLoading } = useSubscription();

  const location = useLocation();
  const navigate = useNavigate();

  // This effect runs once to check for status messages from Stripe redirects
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const statusParam = queryParams.get('status');

    if (statusParam) {
      if (statusParam === 'success') {
        toast.success('Your subscription has been successfully updated!');
      } else if (statusParam === 'canceled') {
        toast.error('The subscription process was canceled.');
      }
      // Clean the URL to remove the query parameters after showing the message
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);



  const getStatusBadge = () => {
    if (!status) return null;
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Active</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  const getRenewalInfo = () => {
    if (!currentPeriodEnd) return "No active subscription.";
    const formattedDate = format(new Date(currentPeriodEnd), 'MMMM d, yyyy');
    if (isCanceled) {
      return `Plan expires and will not renew on ${formattedDate}.`;
    }
    return `Plan renews on ${formattedDate}.`;
  };

  // Show a loading skeleton while the initial business data is being fetched
  if (isBusinessLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </div>
          <div className="text-center">
            <Skeleton className="h-10 w-48 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto dark:bg-[#0D0D0D] border-gray-200 dark:border-[#2C3139]">

      <CardContent className="mt-10 p-10">
        <div className="p-6 border rounded-lg dark:border-gray-700 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold capitalize">{plan || 'No Active Plan'}</h3>
              <p className="text-sm text-muted-foreground">Your current subscription plan.</p>
            </div>
            {getStatusBadge()}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{getRenewalInfo()}</span>
          </div>
        </div>
        <div className="text-center mt-10">
          <Link to='/main-menu/pricing'>
            <Button
              className="w-full sm:w-auto cursor-pointer bg-[#ff21b0] hover:bg-[#c76ea8] text-white font-semibold"
            >
              Back to Plan & Payment page
            </Button>
          </Link>

        </div>
      </CardContent>
    </Card>
  );
};