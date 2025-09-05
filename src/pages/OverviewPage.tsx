import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { fetchBusinessOverview } from '@/features/overview/overviewSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Bot,
    MessageSquare,
    Ticket,
    BrainCircuit,
    TrendingUp,
    BarChart,
    Calendar,
    Loader2,
    ServerCrash,
    UserPlus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale for dates
import PerformanceChart from '../components/custom/analysis/PerformanceChart';

// Reusable Stat Card Component (No changes needed)
const StatCard = ({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description: string }) => (
    <Card className="shadow-sm py-3 hover:shadow-lg transition-shadow duration-300 dark:bg-[#1B1B20]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
            <div className="text-gray-400 dark:text-gray-500">{icon}</div>
        </CardHeader>
        <CardContent>
            <div className="text-4xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
        </CardContent>
    </Card>
);

const DashboardOverviewPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation(); // Initialize t function and get i18n instance
    
    const { user } = useSelector((state: RootState) => state.auth);
    const { data: overviewData, status, error } = useSelector((state: RootState) => state.overview);
    
    const businessId = user?.businessId;
    const dateLocale = i18n.language === 'es' ? es : undefined; // Set date locale based on current language

    useEffect(() => {
        if (businessId) {
            dispatch(fetchBusinessOverview(businessId));
        }
    }, [dispatch, businessId]);

    if (status === 'loading') {
        return <div className="flex items-center justify-center h-[70vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    if (status === 'failed') {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center text-red-500">
                <ServerCrash className="h-16 w-16 mb-4" /><h2 className="text-2xl font-bold">{t('loadingFailed')}</h2><p className="mt-2 text-sm">{error}</p>
            </div>
        );
    }
    if (!overviewData) {
        return <div className="p-8 text-center text-gray-500">{t('noData')}</div>;
    }

    const { performanceAnalytics, ...coreStats } = overviewData;

    // Helper to translate ticket statuses
    const getTranslatedStatus = (status: string) => {
        const key = `status_${status.toLowerCase().replace('-', '_')}`;
        return t(key, status); 
    };

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">{t('dashboardTitle')}</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard title={t('totalCustomers')} value={coreStats.totalCustomers} icon={<Users className="h-5 w-5"/>} description={t('totalCustomersDesc')}/>
                <StatCard title={t('totalConversations')} value={coreStats.totalChats} icon={<MessageSquare className="h-5 w-5"/>} description={t('totalConversationsDesc')}/>
                <StatCard title={t('supportTickets')} value={coreStats.recentTickets.length} icon={<Ticket className="h-5 w-5"/>} description={t('supportTicketsDesc')} />
                <StatCard title={t('activeAiAgents')} value={coreStats.totalAgents} icon={<Bot className="h-5 w-5"/>} description={t('activeAiAgentsDesc')}/>
                <StatCard title={t('trainedAiModels')} value={overviewData.totalModels ?? 'N/A'} icon={<BrainCircuit className="h-5 w-5"/>} description={t('trainedAiModelsDesc')}/>
            </div>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100">{t('performanceAnalyticsTitle')}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard title={t('avgScore7Day')} value={performanceAnalytics.avgScoreLast7Days || 'N/A'} icon={<TrendingUp className="h-5 w-5"/>} description={t('avgScore7DayDesc')} />
                    <StatCard title={t('avgScore30Day')} value={performanceAnalytics.avgScoreLast30Days || 'N/A'} icon={<Calendar className="h-5 w-5"/>} description={t('avgScore30DayDesc')} />
                    <StatCard title={t('conversationsAnalyzed')} value={performanceAnalytics.totalConversationsAnalyzed} icon={<BarChart className="h-5 w-5"/>} description={t('conversationsAnalyzedDesc')} />
                </div>
                <Card className="shadow-sm hover:shadow-lg transition-shadow duration-300 dark:bg-[#1B1B20]">
                    <CardHeader>
                        <CardTitle>{t('dailyAccuracyChartTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <PerformanceChart data={performanceAnalytics.dailyData} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 py-5 shadow-sm hover:shadow-lg transition-shadow duration-300 dark:bg-[#1B1B20]">
                    <CardHeader className='mb-5'><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary"/>{t('recentCustomersTitle')}</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>{t('tableHeaderCustomer')}</TableHead><TableHead className="hidden sm:table-cell">{t('tableHeaderEmail')}</TableHead><TableHead className="text-right">{t('tableHeaderSignedUp')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {coreStats.recentCustomers.map((customer) => (
                                    <TableRow key={customer._id}><TableCell><div className="font-medium text-gray-800 dark:text-gray-100">{customer.name}</div></TableCell><TableCell className="hidden sm:table-cell text-gray-500 dark:text-gray-400">{customer.email || 'N/A'}</TableCell><TableCell className="text-right text-gray-500 dark:text-gray-400 text-xs">{formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true, locale: dateLocale })}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3 py-5 shadow-sm hover:shadow-lg transition-shadow duration-300 dark:bg-[#1B1B20]">
                    <CardHeader className='mb-5'><CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-primary"/>{t('recentTicketsTitle')}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {coreStats.recentTickets.map((ticket) => (
                            <div key={ticket._id} className="flex items-center space-x-4"><div className="flex-1 space-y-1"><p className="text-sm font-medium leading-none text-gray-800 dark:text-gray-100">{ticket.subject}</p><p className="text-xs text-gray-500 dark:text-gray-400">{t('createdTimeAgo', { time: formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: dateLocale }) })}</p></div><Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'} className={ticket.status === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'dark:bg-gray-700 dark:text-gray-300'}>{getTranslatedStatus(ticket.status)}</Badge></div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverviewPage;