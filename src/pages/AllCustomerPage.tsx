import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppDispatch, RootState } from "@/app/store";
import { fetchCustomersForTable } from "@/features/chatInbox/chatInboxSlice";
import dayjs from "dayjs";
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import CustomersPageSkeleton from "@/components/skeleton/CustomersPageSkeleton";
import { Users, Search, Mail, Phone, Calendar } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

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
    const { theme } = useTheme();

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
    
    // Detect if dark mode is active
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return theme === 'dark';
    });
    
    useEffect(() => {
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
            setIsDarkMode(mediaQuery.matches);
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            setIsDarkMode(theme === 'dark');
        }
    }, [theme]);

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

    // Calculate stats
    const totalCustomers = customers.length;
    const customersWithEmail = customers.filter(c => c.email).length;
    const customersWithPhone = customers.filter(c => c.phone).length;

    return (
        <div className="space-y-8 pb-8 p-4 sm:p-6 md:p-8">
            {/* Enhanced Header Section */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-3">
                            <div className={`
                                p-2 rounded-xl
                                ${isDarkMode 
                                    ? 'bg-gradient-to-br from-blue-500/30 to-indigo-500/20 border border-primary/30' 
                                    : 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-primary/20'
                                }
                            `}>
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            {t('customersPage.title') || 'Customers'}
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                            {t('customersPage.description', 'Manage and view all your customers. Search, filter, and access customer information easily.')}
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                {customers.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Total Customers */}
                        <div className={`
                            relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
                            ${isDarkMode 
                                ? 'bg-gradient-to-br from-blue-500/20 via-blue-600/15 to-indigo-600/10 border-blue-500/30 hover:border-blue-400/50' 
                                : 'bg-gradient-to-br from-blue-50 via-blue-100/50 to-indigo-50 border-blue-200/60 hover:border-blue-300/80'
                            }
                            hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/20
                        `}>
                            <div className="relative z-10">
                                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    <div className={`
                                        p-3 rounded-xl backdrop-blur-sm
                                        ${isDarkMode 
                                            ? 'bg-blue-500/30 border border-blue-400/30' 
                                            : 'bg-blue-500/20 border border-blue-300/40'
                                        }
                                    `}>
                                        <Users className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{totalCustomers}</p>
                                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600/80'}`}>
                                    {t('customersPage.stats.totalCustomers', 'Total Customers')}
                                </p>
                            </div>
                            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-300'}`}></div>
                        </div>

                        {/* Customers with Email */}
                        <div className={`
                            relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
                            ${isDarkMode 
                                ? 'bg-gradient-to-br from-purple-500/20 via-purple-600/15 to-pink-600/10 border-purple-500/30 hover:border-purple-400/50' 
                                : 'bg-gradient-to-br from-purple-50 via-purple-100/50 to-pink-50 border-purple-200/60 hover:border-purple-300/80'
                            }
                            hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20
                        `}>
                            <div className="relative z-10">
                                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                    <div className={`
                                        p-3 rounded-xl backdrop-blur-sm
                                        ${isDarkMode 
                                            ? 'bg-purple-500/30 border border-purple-400/30' 
                                            : 'bg-purple-500/20 border border-purple-300/40'
                                        }
                                    `}>
                                        <Mail className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{customersWithEmail}</p>
                                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-purple-300/80' : 'text-purple-600/80'}`}>
                                    {t('customersPage.stats.withEmail', 'With Email')}
                                </p>
                            </div>
                            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-300'}`}></div>
                        </div>

                        {/* Customers with Phone */}
                        <div className={`
                            relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
                            ${isDarkMode 
                                ? 'bg-gradient-to-br from-green-500/20 via-emerald-600/15 to-teal-600/10 border-green-500/30 hover:border-green-400/50' 
                                : 'bg-gradient-to-br from-green-50 via-emerald-100/50 to-teal-50 border-green-200/60 hover:border-green-300/80'
                            }
                            hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/20
                        `}>
                            <div className="relative z-10">
                                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                    <div className={`
                                        p-3 rounded-xl backdrop-blur-sm
                                        ${isDarkMode 
                                            ? 'bg-green-500/30 border border-green-400/30' 
                                            : 'bg-green-500/20 border border-green-300/40'
                                        }
                                    `}>
                                        <Phone className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{customersWithPhone}</p>
                                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-green-300/80' : 'text-green-600/80'}`}>
                                    {t('customersPage.stats.withPhone', 'With Phone')}
                                </p>
                            </div>
                            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-green-400' : 'bg-green-300'}`}></div>
                        </div>
                    </div>
                )}

                {/* Search Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Tabs defaultValue="all">
                        <TabsList className={`
                            ${isDarkMode ? 'bg-muted/50' : 'bg-muted/30'}
                        `}>
                        <TabsTrigger value="all">{t('customersPage.filters.all')}</TabsTrigger>
                    </TabsList>
                </Tabs>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('customersPage.searchPlaceholder')}
                                className="w-full sm:w-60 pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                        </div>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {status === 'failed' && (
                <div className={`
                    p-4 rounded-lg border
                    ${isDarkMode ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-200'}
                `}>
                    <p className={`${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        {t('customersPage.table.error', { error: error || t('customersPage.table.defaultError') })}
                    </p>
                </div>
            )}

            {/* Empty State */}
            {status !== "loading" && customers.length === 0 && (
                <div className={`
                    flex flex-col items-center justify-center text-center rounded-2xl p-12 sm:p-16 min-h-[400px] 
                    ${isDarkMode 
                        ? 'bg-gradient-to-br from-muted/40 via-muted/20 to-muted/10 border-2 border-dashed border-muted-foreground/20' 
                        : 'bg-gradient-to-br from-muted/30 via-muted/20 to-muted/10 border-2 border-dashed border-muted-foreground/20'
                    }
                    backdrop-blur-sm
                `}>
                    <div className="relative mb-8">
                        <div className={`absolute inset-0 ${isDarkMode ? 'bg-primary/30' : 'bg-primary/20'} blur-3xl rounded-full`}></div>
                        <div className={`
                            relative p-6 rounded-2xl border backdrop-blur-sm
                            ${isDarkMode 
                                ? 'bg-gradient-to-br from-primary/30 to-primary/15 border-primary/30' 
                                : 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/20'
                            }
                        `}>
                            <Users className="h-20 w-20 text-primary" />
                        </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t('customersPage.table.noCustomersFound')}</h3>
                    <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base">
                        {t('customersPage.empty.description', 'No customers found. Customers will appear here once they start conversations with your business.')}
                    </p>
                </div>
            )}

            {/* Desktop Table View */}
            {customers.length > 0 && (
                <Card className={`
                    overflow-hidden border
                    ${isDarkMode 
                        ? 'bg-card border-border/60 shadow-lg shadow-black/10' 
                        : 'bg-card border-border/80 shadow-md shadow-black/5'
                    }
                `}>
                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className={`
                                    text-left border-b
                                    ${isDarkMode 
                                        ? 'bg-muted/50 border-border/60' 
                                        : 'bg-muted/30 border-border/40'
                                    }
                                `}>
                                    <tr>
                                        <th className="p-4 font-semibold text-foreground whitespace-nowrap">{t('customersPage.table.no', 'No.')}</th>
                                        <th className="p-4 font-semibold text-foreground whitespace-nowrap hidden lg:table-cell">{t('customersPage.table.customerId')}</th>
                                        <th className="p-4 font-semibold text-foreground whitespace-nowrap">{t('customersPage.table.customerName')}</th>
                                        <th className="p-4 font-semibold text-foreground whitespace-nowrap">{t('customersPage.table.email')}</th>
                                        <th className="p-4 font-semibold text-foreground whitespace-nowrap hidden sm:table-cell">{t('customersPage.table.phone')}</th>
                                        <th className="p-4 font-semibold text-foreground whitespace-nowrap hidden md:table-cell">{t('customersPage.table.dateJoined')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {status === "loading" ? (
                                    <CustomersPageSkeleton />
                                ) : (
                                    customers.map((customer: ICustomer, idx) => (
                                            <tr 
                                                key={customer.id} 
                                                className={`
                                                    border-b transition-colors
                                                    ${isDarkMode 
                                                        ? 'border-border/40 hover:bg-muted/30' 
                                                        : 'border-border/60 hover:bg-muted/20'
                                                    }
                                                `}
                                            >
                                                <td className="p-4 font-medium text-foreground">{(currentPage - 1) * pageSize + idx + 1}</td>
                                                <td className="p-4 text-muted-foreground truncate max-w-[150px] hidden lg:table-cell" title={customer.id}>
                                                    <code className="text-xs">{customer.id.slice(-8)}</code>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`
                                                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white
                                                            ${isDarkMode 
                                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                                                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                            }
                                                        `}>
                                                            {customer.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-foreground truncate max-w-[150px]" title={customer.name}>
                                                            {customer.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {customer.email ? (
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-foreground truncate max-w-[200px]" title={customer.email}>
                                                                {customer.email}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-muted-foreground hidden sm:table-cell">
                                                    {customer.phone ? (
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-4 w-4" />
                                                            <span>{customer.phone}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs">-</span>
                                                    )}
                                            </td>
                                                <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                {dayjs(customer.createdAt).format("MMM D, YYYY")}
                                                    </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            )}

            {/* Mobile Card View */}
            {customers.length > 0 && (
                <div className="lg:hidden space-y-4">
                    {customers.map((customer: ICustomer, idx) => (
                        <Card 
                            key={customer.id}
                            className={`
                                overflow-hidden border transition-all duration-200 hover:shadow-lg
                                ${isDarkMode 
                                    ? 'bg-card border-border/60 shadow-md' 
                                    : 'bg-card border-border/80 shadow-sm'
                                }
                            `}
                        >
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0
                                        ${isDarkMode 
                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                                            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                        }
                                    `}>
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-foreground mb-1 truncate">{customer.name}</h3>
                                        <p className="text-xs text-muted-foreground mb-2">#{idx + 1}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {customer.email && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-foreground truncate">{customer.email}</span>
                                        </div>
                                    )}
                                    {customer.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-foreground">{customer.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4 shrink-0" />
                                        <span>{dayjs(customer.createdAt).format("MMM D, YYYY")}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {customers.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                        {t('customersPage.pagination.showing', 'Showing {{start}} - {{end}} of {{total}} customers', {
                            start: ((currentPage - 1) * pageSize) + 1,
                            end: Math.min(currentPage * pageSize, totalCustomers || customers.length),
                            total: totalCustomers || customers.length
                        })}
                    </span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1 || status === "loading"}
                        onClick={() => setCurrentPage((p) => p - 1)}
                            className="cursor-pointer"
                    >
                        {t('customersPage.pagination.previous')}
                    </Button>
                        <span className="text-sm text-foreground px-3">
                        {t('customersPage.pagination.page', { currentPage, totalPages: totalPages || 1 })}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages || status === "loading" || totalPages === 0}
                        onClick={() => setCurrentPage((p) => p + 1)}
                            className="cursor-pointer"
                    >
                        {t('customersPage.pagination.next')}
                    </Button>
                </div>
            </div>
            )}
        </div>
    );
}