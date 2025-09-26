import { Skeleton } from "@/components/ui/skeleton";

const CustomersPageSkeleton = () => {
    return (
        // This component returns a fragment of table rows.
        // It maps over an array to create 10 skeleton rows, matching the page size.
        <>
            {[...Array(10)].map((_, index) => (
                <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="p-3 sm:p-4">
                        <Skeleton className="h-5 w-8" />
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap max-w-[100px]">
                        <Skeleton className="h-5 w-full" />
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap max-w-[150px]">
                        <Skeleton className="h-5 w-full" />
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap max-w-[200px]">
                        <Skeleton className="h-5 w-full" />
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap hidden sm:table-cell">
                        <Skeleton className="h-5 w-full" />
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap hidden md:table-cell">
                        <Skeleton className="h-5 w-full" />
                    </td>
                </tr>
            ))}
        </>
    );
};

export default CustomersPageSkeleton;