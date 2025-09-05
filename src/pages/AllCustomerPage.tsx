import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreVertical, Loader2 } from "lucide-react";

import { AppDispatch, RootState } from "@/app/store";
import { fetchCustomersForTable } from "@/features/chatInbox/chatInboxSlice";
import dayjs from "dayjs";
import 'dayjs/locale/en';
import 'dayjs/locale/es';

const pageSize = 10;

export default function CustomersPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const {
        list: customers,
        totalPages,
        status,
        error,
    } = useSelector((state: RootState) => state.chatInbox.customerTable);

    const { user }: any = useSelector((state: RootState) => state.auth);
    const businessId = user?.businessId || '';

    const [_selectedTab, setSelectedTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        dayjs.locale(i18n.language);
    }, [i18n.language]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (businessId) {
            dispatch(fetchCustomersForTable({ businessId, page: currentPage, limit: pageSize, searchQuery: debouncedSearch }));
        }
    }, [dispatch, businessId, currentPage, debouncedSearch]);

    const renderTableContent = () => {
        if (status === "loading" && customers.length === 0) {
            return (
                <tr>
                    <td colSpan={7} className="text-center p-8">
                        <div className="flex justify-center items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{t('customersPage.table.loading')}</span>
                        </div>
                    </td>
                </tr>
            );
        }

        if (status === "failed") {
            return (
                <tr>
                    <td colSpan={7} className="text-center p-8 text-red-500">
                        {t('customersPage.table.error', { error: error || t('customersPage.table.defaultError') })}
                    </td>
                </tr>
            );
        }

        if (customers.length === 0) {
            return (
                <tr>
                    <td colSpan={7} className="text-center p-8">
                        {t('customersPage.table.noCustomersFound')}
                    </td>
                </tr>
            );
        }

        return customers.map((customer) => (
            <tr key={customer.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-4">
                    <input type="checkbox" className="rounded border-gray-300" />
                </td>
                <td className="p-4 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400">
                    {customer.id}
                </td>
                <td className="p-4 whitespace-nowrap">{customer.name}</td>
                <td className="p-4 whitespace-nowrap">{customer.email}</td>
                <td className="p-4 whitespace-nowrap">{customer.phone}</td>
                <td className="p-4 whitespace-nowrap">
                    {dayjs(customer.createdAt).format("MMM D, YYYY")}
                </td>
                <td className="p-4">
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                    </Button>
                </td>
            </tr>
        ));
    };

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <Tabs defaultValue="all" onValueChange={setSelectedTab}>
                    <TabsList>
                        <TabsTrigger value="all">{t('customersPage.filters.all')}</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder={t('customersPage.searchPlaceholder')}
                        className="w-60"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden border">
                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                        <table className="min-w-full text-sm table-auto">
                            <thead className="bg-gray-100 dark:bg-gray-900/50 text-left">
                                <tr>
                                    <th className="p-4 w-12">
                                        <input type="checkbox" className="rounded border-gray-300" />
                                    </th>
                                    <th className="p-4 whitespace-nowrap">{t('customersPage.table.customerId')}</th>
                                    <th className="p-4 whitespace-nowrap">{t('customersPage.table.customerName')}</th>
                                    <th className="p-4 whitespace-nowrap">{t('customersPage.table.email')}</th>
                                    <th className="p-4 whitespace-nowrap">{t('customersPage.table.phone')}</th>
                                    <th className="p-4 whitespace-nowrap">{t('customersPage.table.dateJoined')}</th>
                                    <th className="p-4 whitespace-nowrap w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderTableContent()}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end mt-4 items-center gap-2 text-sm">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1 || status === "loading"}
                    onClick={() => setCurrentPage((p) => p - 1)}
                >
                    {t('customersPage.pagination.previous')}
                </Button>
                <span>
                    {t('customersPage.pagination.page', { currentPage, totalPages: totalPages || 1 })}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages || status === "loading"}
                    onClick={() => setCurrentPage((p) => p + 1)}
                >
                    {t('customersPage.pagination.next')}
                </Button>
            </div>
        </div>
    );
}