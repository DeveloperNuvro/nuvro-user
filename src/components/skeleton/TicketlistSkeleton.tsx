// src/components/TicketListSkeleton.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";

const TableRowSkeleton = () => (
    <TableRow className="border-t border-gray-200 dark:border-gray-700">
        <TableCell><Skeleton className="h-4 w-6" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
        <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-[130px]" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[130px]" /></TableCell>
        <TableCell><Skeleton className="h-6 w-[60px] rounded-full" /></TableCell>
        <TableCell>
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-8 w-16" />
            </div>
        </TableCell>
    </TableRow>
);


const TicketListSkeleton: React.FC = () => {
    return (
        <div className="p-4 sm:p-6 md:p-8">
            {/* Top controls skeleton */}
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-20" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-60" />
                    <Skeleton className="h-10 w-28" />
                </div>
            </div>

            {/* Table skeleton */}
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="w-full overflow-auto">
                        <table className="min-w-full text-sm table-auto">
                            <thead className="bg-gray-100 dark:bg-[#1e1e1f] text-left">
                                <tr>
                                    <th className="p-3 sm:p-4"><Skeleton className="h-5 w-8" /></th>
                                    <th className="p-3 sm:p-4"><Skeleton className="h-5 w-20" /></th>
                                    <th className="p-3 sm:p-4"><Skeleton className="h-5 w-24" /></th>
                                    <th className="p-3 sm:p-4"><Skeleton className="h-5 w-32" /></th>
                                    <th className="p-3 sm:p-4 hidden md:table-cell"><Skeleton className="h-5 w-16" /></th>
                                    <th className="p-3 sm:p-4"><Skeleton className="h-5 w-20" /></th>
                                    <th className="p-3 sm:p-4 hidden lg:table-cell"><Skeleton className="h-5 w-28" /></th>
                                    <th className="p-3 sm:p-4 hidden sm:table-cell"><Skeleton className="h-5 w-24" /></th>
                                    <th className="p-3 sm:p-4 hidden md:table-cell"><Skeleton className="h-5 w-32" /></th>
                                    <th className="p-3 sm:p-4"><Skeleton className="h-5 w-20" /></th>
                                    <th className="p-3 sm:p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 10 }).map((_, index) => (
                                    <TableRowSkeleton key={index} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            
            {/* Pagination skeleton */}
            <div className="flex justify-between items-center mt-4 text-sm flex-wrap gap-2">
                <Skeleton className="h-5 w-48" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-9 w-20" />
                </div>
            </div>
        </div>
    );
};

export default TicketListSkeleton;