import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

import { AppDispatch, RootState } from "@/app/store";
import { fetchCustomersForTable } from "@/features/chatInbox/chatInboxSlice";
import dayjs from "dayjs";
import 'dayjs/locale/en';
import 'dayjs/locale/es';

const pageSize = 10;

// Define an interface for a customer for type safety
interface ICustomer {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
}

export default function CustomersPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();

    const { user }: any = useSelector((state: RootState) => state.auth);
    const businessId = user?.businessId || '';

    const {
        list: customers,
        totalPages,
        status,
        error,
    } = useSelector((state: RootState) => state.chatInbox.customerTable);

    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

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

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <Tabs defaultValue="all">
                    <TabsList>
                        <TabsTrigger value="all">{t('customersPage.filters.all')}</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder={t('customersPage.searchPlaceholder')}
                        className="w-full max-w-xs sm:w-60"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden border">
                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                        <table className="min-w-full text-sm table-auto">
                            <thead className="bg-gray-100 dark:bg-[#1e1e1f] text-left">
                                <tr>
                                    <th className="p-3 sm:p-4 whitespace-nowrap">{t('customersPage.table.no', 'No.')}</th>
                                    <th className="p-3 sm:p-4 whitespace-nowrap">{t('customersPage.table.customerId')}</th>
                                    <th className="p-3 sm:p-4 whitespace-nowrap">{t('customersPage.table.customerName')}</th>
                                    <th className="p-3 sm:p-4 whitespace-nowrap">{t('customersPage.table.email')}</th>
                                    <th className="p-3 sm:p-4 whitespace-nowrap hidden sm:table-cell">{t('customersPage.table.phone')}</th>
                                    <th className="p-3 sm:p-4 whitespace-nowrap hidden md:table-cell">{t('customersPage.table.dateJoined')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {status === "loading" && customers.length === 0 && (
                                    <tr><td colSpan={6} className="text-center p-8"><div className="flex justify-center items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>{t('customersPage.table.loading')}</span></div></td></tr>
                                )}
                                {status === "failed" && (
                                    <tr><td colSpan={6} className="text-center p-8 text-red-500">{t('customersPage.table.error', { error: error || t('customersPage.table.defaultError') })}</td></tr>
                                )}
                                {status !== 'loading' && customers.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center">{t('customersPage.table.noCustomersFound')}</td></tr>
                                )}
                                {customers.map((customer: ICustomer, idx) => (
                                    <tr key={customer.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="p-3 sm:p-4">{(currentPage - 1) * pageSize + idx + 1}</td>
                                        <td className="p-3 sm:p-4 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]" title={customer.id}>
                                            {customer.id}
                                        </td>
                                        <td className="p-3 sm:p-4 whitespace-nowrap truncate max-w-[150px]" title={customer.name}>{customer.name}</td>
                                        <td className="p-3 sm:p-4 whitespace-nowrap truncate max-w-[200px]" title={customer.email}>{customer.email}</td>
                                        <td className="p-3 sm:p-4 whitespace-nowrap hidden sm:table-cell">{customer.phone || '-'}</td>
                                        <td className="p-3 sm:p-4 whitespace-nowrap hidden md:table-cell">
                                            {dayjs(customer.createdAt).format("MMM D, YYYY")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end items-center mt-4 text-sm flex-wrap gap-2">
                <div className="flex items-center gap-2">
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
                        disabled={currentPage >= totalPages || status === "loading" || totalPages === 0}
                        onClick={() => setCurrentPage((p) => p + 1)}
                    >
                        {t('customersPage.pagination.next')}
                    </Button>
                </div>
            </div>
        </div>
    );
}