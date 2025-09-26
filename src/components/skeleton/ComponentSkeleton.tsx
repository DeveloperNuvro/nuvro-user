import { Skeleton } from "@/components/ui/skeleton";

const ChannelCardSkeleton = () => {
    return (
        <div className="rounded-xl bg-card border transition-all duration-200 overflow-hidden relative">
            {/* Skeleton for the top section (Icon and Title) */}
            <div className="h-[180px] flex flex-col items-center justify-center bg-muted/50 p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-6 w-3/5 mt-3" />
            </div>

            {/* Skeleton for the bottom section (Members info) */}
            <div className="p-4">
                <Skeleton className="h-5 w-1/3 mb-4" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                </div>
            </div>
        </div>
    );
};

const ComponentSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Create an array of 8 skeletons to show a loading state */}
      {[...Array(8)].map((_, index) => (
        <ChannelCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default ComponentSkeleton;