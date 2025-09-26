// src/components/DashboardOverviewPageSkeleton.tsx

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

// Reusable Skeleton for Stat Cards
const StatCardSkeleton = () => (
    <Card className="shadow-sm py-3 dark:bg-[#1B1B20]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-5" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-10 w-1/2 mb-1" />
            <Skeleton className="h-3 w-full" />
        </CardContent>
    </Card>
);

const DashboardOverviewPageSkeleton: React.FC = () => {
    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <Skeleton className="h-8 w-64" />
            </div>

            {/* Top Stats Grid Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>

            {/* Performance Analytics Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-7 w-72" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => <StatCardSkeleton key={i} />)}
                </div>
                <Card className="shadow-sm dark:bg-[#1B1B20]">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Skeleton className="h-[350px] w-full" />
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Grid Skeleton */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 py-5 shadow-sm dark:bg-[#1B1B20]">
                    <CardHeader className='mb-5'>
                        <Skeleton className="h-6 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                    <TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableHead>
                                    <TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...Array(4)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-24" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3 py-5 shadow-sm dark:bg-[#1B1B20]">
                    <CardHeader className='mb-5'>
                        <Skeleton className="h-6 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverviewPageSkeleton;