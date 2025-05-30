import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreVertical } from "lucide-react";

import { AppDispatch, RootState } from "@/app/store";
import {
    fetchCustomersByBusiness,
} from "@/features/chatInbox/chatInboxSlice";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import isToday from "dayjs/plugin/isToday";

dayjs.extend(localizedFormat);
dayjs.extend(isToday);

const pageSize = 10;

export default function CustomersPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { list: customers, totalPages } = useSelector(
        (state: RootState) => state.chatInbox.customerTable
    );

    const [_selectedTab, setSelectedTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const { user }: any = useSelector((state: RootState) => state.auth);
    const businessId = user?.businessId || '';

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        dispatch(fetchCustomersByBusiness({ businessId, page: currentPage, searchQuery: debouncedSearch, context: "table" }));
    }, [dispatch, businessId, currentPage, debouncedSearch]);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <Tabs defaultValue="all" onValueChange={setSelectedTab}>
                    <TabsList>
                        <TabsTrigger value="all">All Customers</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Search by phone number or name"
                        className="w-60"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="w-full overflow-auto">
                        <table className="min-w-full text-sm table-auto">
                            <thead className="bg-gray-100 dark:bg-[#1e1e1f] text-left">
                                <tr>
                                    <th className="p-4">
                                        <input type="checkbox" />
                                    </th>
                                    <th className="p-4 whitespace-nowrap">No.</th>
                                    <th className="p-4 whitespace-nowrap">Customer ID</th>
                                    <th className="p-4 whitespace-nowrap">Customer Name</th>
                                    <th className="p-4 whitespace-nowrap">Email</th>
                                    <th className="p-4 whitespace-nowrap">Phone Number</th>
                                    <th className="p-4 whitespace-nowrap hidden lg:table-cell">Preview</th>
                                    <th className="p-4 whitespace-nowrap">Last Message</th>
                                    <th className="p-4 whitespace-nowrap"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers?.map((customer, idx) => (
                                    <tr
                                        key={customer.id}
                                        className="border-t hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <td className="p-4">
                                            <input type="checkbox" />
                                        </td>
                                        <td className="p-4">{(currentPage - 1) * pageSize + idx + 1}</td>
                                        <td className="p-4">{customer.id}</td>
                                        <td className="p-4">{customer.name}</td>
                                        <td className="p-4">{customer.email}</td>
                                        <td className="p-4">{customer.phone}</td>
                                        <td className="p-4 hidden lg:table-cell">{customer.preview}</td>
                                        <td className="p-4">
                                            {customer.latestMessageTimestamp
                                                ? dayjs(customer.latestMessageTimestamp).isToday()
                                                    ? `Today at ${dayjs(customer.latestMessageTimestamp).format("h:mm A")}`
                                                    : dayjs(customer.latestMessageTimestamp).format("MMM D, YYYY · h:mm A")
                                                : "-"}
                                        </td>
                                        <td className="p-4">
                                            <MoreVertical className="w-4 h-4 cursor-pointer" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex justify-end mt-4 items-center gap-2 text-sm">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                >
                    Previous
                </Button>
                <span>
                    Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}