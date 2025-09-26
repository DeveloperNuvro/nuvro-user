// src/components/AnalysisPageSkeleton.tsx

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const MetricCardSkeleton = () => (
    <Card className="py-5 bg-[#ffd8f1] dark:bg-[#1B1B20]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-6 rounded-full" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-10 w-1/2 mb-2" />
            <Skeleton className="h-3 w-full" />
        </CardContent>
    </Card>
);

const AnalysisPageSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen">
            <div className="container mx-auto py-8 px-4 md:px-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <Skeleton className="h-10 w-64 mb-2" />
                        <Skeleton className="h-5 w-48" />
                    </div>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-full md:w-[280px]" />
                    </div>
                </div>

                {/* --- METRICS GRID SKELETON --- */}
                <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                </div>

                {/* --- MAIN CONTENT GRID SKELETON --- */}
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="dark:bg-[#1B1B20] py-5 h-full">
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-[350px] w-full flex items-end gap-2">
                                    <Skeleton className="h-full w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="dark:bg-[#1B1B20] h-full py-5">
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 mb-4">
                                    <Skeleton className="h-8 w-1/3" />
                                    <Skeleton className="h-8 w-1/3" />
                                    <Skeleton className="h-8 w-1/3" />
                                </div>
                                <Skeleton className="h-24 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* --- CONVERSATION BREAKDOWN SKELETON --- */}
                <Card className="dark:bg-[#1B1B20] py-5">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="border-b dark:border-gray-800 last:border-b-0 py-4 px-2">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex flex-col text-left w-2/3">
                                        <Skeleton className="h-5 w-1/2 mb-2" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-7 w-12" />
                                        <Skeleton className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AnalysisPageSkeleton;