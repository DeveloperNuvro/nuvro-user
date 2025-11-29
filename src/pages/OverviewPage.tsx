import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { fetchBusinessOverview } from '@/features/overview/overviewSlice';
import { fetchAiAgentsByBusinessId } from '@/features/aiAgent/aiAgentSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Users,
    Bot,
    MessageSquare,
    Ticket,
    BrainCircuit,
    TrendingUp,
    BarChart,
    Calendar,
    ServerCrash,
    UserPlus,
    Filter,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import PerformanceChart from '../components/custom/analysis/PerformanceChart';
import DashboardOverviewPageSkeleton from '@/components/skeleton/DashboardOverviewPageSkeleton'; // 1. Import the skeleton component

// Enhanced Stat Card Component with gradient and animations
const StatCard = ({ 
    title, 
    value, 
    icon, 
    description, 
    gradient = "from-blue-500 to-blue-600",
    iconBg = "bg-blue-100 dark:bg-blue-900/30",
    borderColor = "border-blue-200 dark:border-blue-800/50"
}: { 
    title: string, 
    value: string | number, 
    icon: React.ReactNode, 
    description: string,
    gradient?: string,
    iconBg?: string,
    borderColor?: string
}) => (
    <Card className={`relative overflow-hidden border ${borderColor} transition-all duration-300 hover:scale-[1.02] dark:bg-gradient-to-br dark:from-[#1B1B20] dark:to-[#252530] bg-white group py-6`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 dark:opacity-20 rounded-full blur-2xl group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity duration-300`}></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">{title}</CardTitle>
            <div className={`${iconBg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-gray-700 dark:text-gray-200">{icon}</div>
            </div>
        </CardHeader>
        <CardContent className="relative z-10">
            <div className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-1">
                {value}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </CardContent>
    </Card>
);

const DashboardOverviewPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();
    
    const { user } = useSelector((state: RootState) => state.auth);
    const { data: overviewData, status, error } = useSelector((state: RootState) => state.overview);
    const { aiAgents } = useSelector((state: RootState) => state.aiAgent);
    
    const businessId = user?.businessId;
    const dateLocale = i18n.language === 'es' ? es : undefined;
    const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

    useEffect(() => {
        if (businessId) {
            dispatch(fetchAiAgentsByBusinessId());
        }
    }, [dispatch, businessId]);

    useEffect(() => {
        if (businessId) {
            dispatch(fetchBusinessOverview({ 
                businessId, 
                agentId: selectedAgentId && selectedAgentId !== 'all' ? selectedAgentId : undefined 
            }));
        }
    }, [dispatch, businessId, selectedAgentId]);

    // 2. Replace the old loader with the new skeleton component
    if (status === 'loading') {
        return <DashboardOverviewPageSkeleton />;
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

    const getTranslatedStatus = (status: string) => {
        const key = `status_${status.toLowerCase().replace('-', '_')}`;
        return t(key, status); 
    };

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0F0F12] dark:via-[#151519] dark:to-[#0F0F12] min-h-screen">
            {/* Header Section with Welcome Message */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 mb-8">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-gray-300 dark:to-gray-100 bg-clip-text text-transparent mb-2">
                        {t('dashboardTitle')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                        {t('dashboardSubtitle', 'Welcome back! Here\'s what\'s happening with your business today.')}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1B1B20] rounded-lg border border-gray-200 dark:border-gray-800">
                    <Calendar className="h-4 w-4 text-gray-400"/>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Main Stats Grid with Enhanced Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard 
                    title={t('totalCustomers')} 
                    value={coreStats.totalCustomers} 
                    icon={<Users className="h-6 w-6"/>} 
                    description={t('totalCustomersDesc')}
                    gradient="from-blue-500 to-cyan-500"
                    iconBg="bg-blue-100 dark:bg-blue-900/30"
                    borderColor="border-blue-200 dark:border-blue-800/50"
                />
                <StatCard 
                    title={t('totalConversations')} 
                    value={coreStats.totalChats} 
                    icon={<MessageSquare className="h-6 w-6"/>} 
                    description={t('totalConversationsDesc')}
                    gradient="from-purple-500 to-pink-500"
                    iconBg="bg-purple-100 dark:bg-purple-900/30"
                    borderColor="border-purple-200 dark:border-purple-800/50"
                />
                <StatCard 
                    title={t('supportTickets')} 
                    value={coreStats.recentTickets.length} 
                    icon={<Ticket className="h-6 w-6"/>} 
                    description={t('supportTicketsDesc')}
                    gradient="from-orange-500 to-red-500"
                    iconBg="bg-orange-100 dark:bg-orange-900/30"
                    borderColor="border-orange-200 dark:border-orange-800/50"
                />
                <StatCard 
                    title={t('activeAiAgents')} 
                    value={coreStats.totalAgents} 
                    icon={<Bot className="h-6 w-6"/>} 
                    description={t('activeAiAgentsDesc')}
                    gradient="from-green-500 to-emerald-500"
                    iconBg="bg-green-100 dark:bg-green-900/30"
                    borderColor="border-green-200 dark:border-green-800/50"
                />
                <StatCard 
                    title={t('trainedAiModels')} 
                    value={overviewData.totalModels ?? 'N/A'} 
                    icon={<BrainCircuit className="h-6 w-6"/>} 
                    description={t('trainedAiModelsDesc')}
                    gradient="from-indigo-500 to-purple-500"
                    iconBg="bg-indigo-100 dark:bg-indigo-900/30"
                    borderColor="border-indigo-200 dark:border-indigo-800/50"
                />
            </div>

            {/* Performance Analytics Section */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                            <BarChart className="h-5 w-5 text-white"/>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                            {t('performanceAnalyticsTitle')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
                        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder={t('filterByAgent', 'Filter by AI Agent')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('allAgents', 'All Agents')}</SelectItem>
                                {aiAgents.map((agent) => (
                                    <SelectItem key={agent._id} value={agent._id}>
                                        {agent.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard 
                        title={t('avgScore7Day')} 
                        value={performanceAnalytics.avgScoreLast7Days || 'N/A'} 
                        icon={<TrendingUp className="h-6 w-6"/>} 
                        description={t('avgScore7DayDesc')}
                        gradient="from-green-500 to-teal-500"
                        iconBg="bg-green-100 dark:bg-green-900/30"
                        borderColor="border-green-200 dark:border-green-800/50"
                    />
                    <StatCard 
                        title={t('avgScore30Day')} 
                        value={performanceAnalytics.avgScoreLast30Days || 'N/A'} 
                        icon={<Calendar className="h-6 w-6"/>} 
                        description={t('avgScore30DayDesc')}
                        gradient="from-amber-500 to-orange-500"
                        iconBg="bg-amber-100 dark:bg-amber-900/30"
                        borderColor="border-amber-200 dark:border-amber-800/50"
                    />
                    <StatCard 
                        title={t('conversationsAnalyzed')} 
                        value={performanceAnalytics.totalConversationsAnalyzed} 
                        icon={<BarChart className="h-6 w-6"/>} 
                        description={t('conversationsAnalyzedDesc')}
                        gradient="from-cyan-500 to-blue-500"
                        iconBg="bg-cyan-100 dark:bg-cyan-900/30"
                        borderColor="border-cyan-200 dark:border-cyan-800/50"
                    />
                </div>
                <Card className="transition-all duration-300 border border-purple-200 dark:border-purple-800/50 dark:bg-gradient-to-br dark:from-[#1B1B20] dark:to-[#252530] bg-white overflow-hidden py-6">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-white"/>
                            </div>
                            {t('dailyAccuracyChartTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <PerformanceChart data={performanceAnalytics.dailyData} />
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 py-6 transition-all duration-300 border border-blue-200 dark:border-blue-800/50 dark:bg-gradient-to-br dark:from-[#1B1B20] dark:to-[#252530] bg-white overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"></div>
                    <CardHeader className='mb-5 pb-4 border-b border-gray-200 dark:border-gray-800'>
                        <CardTitle className="flex items-center gap-3 text-xl font-bold">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                <UserPlus className="h-5 w-5 text-white"/>
                            </div>
                            {t('recentCustomersTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-gray-200 dark:border-gray-800">
                                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">{t('tableHeaderCustomer')}</TableHead>
                                        <TableHead className="hidden sm:table-cell font-semibold text-gray-700 dark:text-gray-300">{t('tableHeaderEmail')}</TableHead>
                                        <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">{t('tableHeaderSignedUp')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {coreStats.recentCustomers.map((customer) => (
                                        <TableRow 
                                            key={customer._id} 
                                            className="hover:bg-gray-50 dark:hover:bg-[#252530] transition-colors duration-200 border-b border-gray-100 dark:border-gray-800/50 cursor-pointer"
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                                                        {customer.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="font-semibold text-gray-800 dark:text-gray-100">{customer.name}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-gray-600 dark:text-gray-400">{customer.email || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                    {formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true, locale: dateLocale })}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3 py-6 transition-all duration-300 border border-orange-200 dark:border-orange-800/50 dark:bg-gradient-to-br dark:from-[#1B1B20] dark:to-[#252530] bg-white overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500"></div>
                    <CardHeader className='mb-5 pb-4 border-b border-gray-200 dark:border-gray-800'>
                        <CardTitle className="flex items-center gap-3 text-xl font-bold">
                            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                <Ticket className="h-5 w-5 text-white"/>
                            </div>
                            {t('recentTicketsTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {coreStats.recentTickets.map((ticket) => (
                            <div 
                                key={ticket._id} 
                                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#252530] transition-all duration-200 cursor-pointer group/item"
                            >
                                <div className="flex-1 space-y-1 min-w-0">
                                    <p className="text-sm font-semibold leading-none text-gray-800 dark:text-gray-100 truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                                        {ticket.subject}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3 text-gray-400"/>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: dateLocale })}
                                        </p>
                                    </div>
                                </div>
                                <Badge 
                                    variant={ticket.status === 'open' ? 'destructive' : 'secondary'} 
                                    className={`ml-3 shrink-0 ${ticket.status === 'open' 
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/70' 
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    } transition-colors font-semibold`}
                                >
                                    {getTranslatedStatus(ticket.status)}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverviewPage;