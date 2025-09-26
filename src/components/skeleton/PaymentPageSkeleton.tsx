import { Skeleton } from "@/components/ui/skeleton";

const UsageProgressBarSkeleton = () => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
        </div>
        <Skeleton className="h-1.5 w-full" />
    </div>
);

const PricingCardSkeleton = ({ recommended = false }: { recommended?: boolean }) => (
    <div className={`rounded-xl p-6 flex flex-col h-full ${recommended ? "border-2 border-muted" : "border border-gray-200 dark:border-[#2C3139]"} bg-white dark:bg-[#0D0D0D]`}>
        <div className="flex-grow">
            <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-2/5" />
                {recommended && <Skeleton className="h-6 w-24 rounded-md" />}
            </div>
            <Skeleton className="h-4 w-full mt-3" />
            <Skeleton className="h-4 w-4/5 mt-1" />
            <Skeleton className="h-10 w-1/3 my-4" />
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <Skeleton className="h-5 w-1/3 mb-4" />
                <ul className="space-y-3">
                    <li className="flex items-start">
                        <Skeleton className="w-5 h-5 rounded-full mr-2 flex-shrink-0 mt-0.5" />
                        <Skeleton className="h-4 w-full" />
                    </li>
                    <li className="flex items-start">
                        <Skeleton className="w-5 h-5 rounded-full mr-2 flex-shrink-0 mt-0.5" />
                        <Skeleton className="h-4 w-5/6" />
                    </li>
                    <li className="flex items-start">
                        <Skeleton className="w-5 h-5 rounded-full mr-2 flex-shrink-0 mt-0.5" />
                        <Skeleton className="h-4 w-4/5" />
                    </li>
                </ul>
            </div>
        </div>
        <div className="mt-8">
            <Skeleton className="w-full h-10" />
        </div>
    </div>
);

const PricingPageSkeleton = () => {
    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-[#1B1B20] min-h-screen">
            <div className="max-w-7xl mx-auto">
                <nav className="mb-8">
                    <Skeleton className="h-9 w-40 rounded-md" />
                </nav>

                {/* Skeleton for Usage Section */}
                <div className="bg-gray-50 dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2C3139] rounded-xl p-6 mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                        <UsageProgressBarSkeleton />
                        <UsageProgressBarSkeleton />
                        <UsageProgressBarSkeleton />
                        <UsageProgressBarSkeleton />
                    </div>
                </div>

                {/* Skeleton for Pricing Plans Section */}
                <div>
                    <div className="mb-8">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-2/5 mt-2" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <PricingCardSkeleton />
                        <PricingCardSkeleton recommended={true} />
                        <PricingCardSkeleton />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPageSkeleton;