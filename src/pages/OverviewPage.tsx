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
import { formatDistanceToNow } from 'date-fns';
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
    
    const { user } = useSelector((state: RootState) => state.auth);
    const { data: overviewData, status, error } = useSelector((state: RootState) => state.overview);
    
    const businessId = user?.businessId;

    useEffect(() => {
        if (businessId) {
            dispatch(fetchBusinessOverview(businessId));
        }
    }, [dispatch, businessId]);

    // --- Loading and Error states are unchanged ---
    if (status === 'loading') {
        return <div className="flex items-center justify-center h-[70vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    if (status === 'failed') {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center text-red-500">
                <ServerCrash className="h-16 w-16 mb-4" /><h2 className="text-2xl font-bold">Failed to Load Dashboard</h2><p className="mt-2 text-sm">{error}</p>
            </div>
        );
    }
    if (!overviewData) {
        return <div className="p-8 text-center text-gray-500">No overview data available.</div>;
    }

    const { performanceAnalytics, ...coreStats } = overviewData;

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Dashboard</h1>
            </div>

            {/* --- Core Stats Grid (No changes) --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard title="Total Customers" value={coreStats.totalCustomers} icon={<Users className="h-5 w-5"/>} description="All unique customer interactions"/>
                <StatCard title="Total Conversations" value={coreStats.totalChats} icon={<MessageSquare className="h-5 w-5"/>} description="Total messages exchanged"/>
                <StatCard title="Support Tickets" value={coreStats.recentTickets.length} icon={<Ticket className="h-5 w-5"/>} description="Tickets created by the AI agent" />
                <StatCard title="Active AI Agents" value={coreStats.totalAgents} icon={<Bot className="h-5 w-5"/>} description="Your deployed AI workforce"/>
                <StatCard title="Trained AI Models" value={overviewData.totalModels ?? 'N/A'} icon={<BrainCircuit className="h-5 w-5"/>} description="Custom knowledge bases"/>
            </div>

            {/* --- NEW: Performance Analytics Section --- */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Performance Analytics</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard title="7-Day Avg Score" value={performanceAnalytics.avgScoreLast7Days || 'N/A'} icon={<TrendingUp className="h-5 w-5"/>} description="Agent performance this week" />
                    <StatCard title="30-Day Avg Score" value={performanceAnalytics.avgScoreLast30Days || 'N/A'} icon={<Calendar className="h-5 w-5"/>} description="Agent performance this month" />
                    <StatCard title="Conversations Analyzed" value={performanceAnalytics.totalConversationsAnalyzed} icon={<BarChart className="h-5 w-5"/>} description="Total in the last 30 days" />
                </div>
                <Card className="shadow-sm hover:shadow-lg transition-shadow duration-300 dark:bg-[#1B1B20]">
                    <CardHeader>
                        <CardTitle>Daily Accuracy Score (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <PerformanceChart data={performanceAnalytics.dailyData} />
                    </CardContent>
                </Card>
            </div>

            {/* --- Recent Activity Section (No changes) --- */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 py-5 shadow-sm hover:shadow-lg transition-shadow duration-300 dark:bg-[#1B1B20]">
                    <CardHeader className='mb-5'><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary"/>Recent Customers</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="hidden sm:table-cell">Email</TableHead><TableHead className="text-right">Signed Up</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {coreStats.recentCustomers.map((customer) => (
                                    <TableRow key={customer._id}><TableCell><div className="font-medium text-gray-800 dark:text-gray-100">{customer.name}</div></TableCell><TableCell className="hidden sm:table-cell text-gray-500 dark:text-gray-400">{customer.email || 'N/A'}</TableCell><TableCell className="text-right text-gray-500 dark:text-gray-400 text-xs">{formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true })}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3 py-5 shadow-sm hover:shadow-lg transition-shadow duration-300 dark:bg-[#1B1B20]">
                    <CardHeader className='mb-5'><CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-primary"/>Recent Support Tickets</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {coreStats.recentTickets.map((ticket) => (
                            <div key={ticket._id} className="flex items-center space-x-4"><div className="flex-1 space-y-1"><p className="text-sm font-medium leading-none text-gray-800 dark:text-gray-100">{ticket.subject}</p><p className="text-xs text-gray-500 dark:text-gray-400">Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p></div><Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'} className={ticket.status === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'dark:bg-gray-700 dark:text-gray-300'}>{ticket.status}</Badge></div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverviewPage;