import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '@/app/store';
import { fetchAnalysisReports } from '@/features/analysisReport/analysisReportSlice';
import ScoreBarChart from '../components/custom/analysis/ScoreBarChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, MessageSquareQuote, FileText, Bot, Users, MessageCircle, Star, Lightbulb, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import AnalysisPageSkeleton from '@/components/skeleton/AnalysisSkeleton'; // Import the skeleton component

// --- Reusable Metric Card Component (Upgraded for enterprise look) ---
const MetricCard = ({ title, value, icon, description }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    description: string;
}) => (
    <Card className="hover:shadow-lg py-5 cursor-pointer  bg-[#ffd8f1] dark:bg-[#1B1B20]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-4xl font-bold">{value}</div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
        </CardContent>
    </Card>
);

// --- Main Analysis Page Component ---
const AnalysisPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();
    const { user } = useSelector((state: RootState) => state.auth);
    const { reports, status, error } = useSelector((state: RootState) => state.analysisReport);

    // State to manage the currently selected report ID
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    // Memoize the sorted reports to prevent re-sorting on every render
    const sortedReports = useMemo(() => {
        if (!reports) return [];
        return [...reports].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
    }, [reports]);

    useEffect(() => {
        if (user?.businessId) {
            dispatch(fetchAnalysisReports(user.businessId));
        }
    }, [dispatch, user?.businessId]);

    // Effect to set the selected report to the latest one by default
    useEffect(() => {
        if (sortedReports.length > 0 && !selectedReportId) {
            setSelectedReportId(sortedReports[0]._id);
        }
    }, [sortedReports, selectedReportId]);

    // Derive the selected report object from the ID
    const selectedReport = useMemo(() => {
        return reports.find(report => report._id === selectedReportId) || null;
    }, [reports, selectedReportId]);

    // --- RENDER STATES ---
    if (status === 'loading') {
        return <AnalysisPageSkeleton />;
    }

    if (status === 'failed') {
        return <div className="text-center text-red-500 p-8">{t('analysisPage.error', { error })}</div>;
    }

    if (!selectedReport) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 dark:text-gray-500">
                <FileText className="mx-auto h-16 w-16 mb-6" />
                <h2 className="text-2xl font-semibold">{t('analysisPage.empty.title')}</h2>
                <p className="mt-2 max-w-md text-center">{t('analysisPage.empty.subtitle')}</p>
            </div>
        );
    }

    const scoreColor = selectedReport.overallAccuracyScore >= 8 ? 'text-green-500' : selectedReport.overallAccuracyScore >= 5 ? 'text-amber-500' : 'text-red-500';

    return (
        <div className="min-h-screen">
            <div className="container mx-auto py-8 px-4 md:px-8 space-y-8">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{t('analysisPage.header.title')}</h1>
                        <p className="mt-1 text-lg text-gray-500 dark:text-gray-400">
                            {t('analysisPage.header.showingReportFor', 'Showing report for')}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Select value={selectedReportId || ''} onValueChange={setSelectedReportId}>
                            <SelectTrigger className="w-full md:w-[280px] bg-white dark:bg-gray-900 text-base py-6">
                                <SelectValue placeholder={t('analysisPage.header.selectReport')} />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedReports.map(report => (
                                    <SelectItem key={report._id} value={report._id}>
                                        {new Date(report.reportDate).toLocaleDateString(i18n.language, { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* --- METRICS GRID --- */}
                <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title={t('analysisPage.stats.overallScore')}
                        value={selectedReport.overallAccuracyScore.toFixed(1)}
                        icon={<Star className={`h-6 w-6 ${scoreColor}`} />}
                        description={t('analysisPage.stats.overallScoreDesc', 'Based on AI analysis')}
                    />
                    <MetricCard
                        title={t('analysisPage.stats.conversationsAnalyzed')}
                        value={selectedReport.analyzedConversations.length.toString()}
                        icon={<MessageCircle className="h-6 w-6 text-gray-400" />}
                        description={t('analysisPage.stats.totalThisPeriod', 'Total for this period')}
                    />
                    <MetricCard
                        title={t('analysisPage.stats.agentName')}
                        value={selectedReport.agentInfo || t('analysisPage.stats.unknown', 'Unknown')}
                        icon={<Bot className="h-6 w-6 text-gray-400" />}
                        description={t('analysisPage.stats.primaryAgent', 'Primary AI Agent')}
                    />
                    <MetricCard
                        title={t('analysisPage.stats.customersInvolved')}
                        value={new Set(selectedReport.analyzedConversations.map(c => c.customerName)).size.toString()}
                        icon={<Users className="h-6 w-6 text-gray-400" />}
                        description={t('analysisPage.stats.uniqueCustomers', 'Unique customers')}
                    />
                </div>

                {/* --- MAIN CONTENT GRID --- */}
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="dark:bg-[#1B1B20] py-5 h-full">
                            <CardHeader>
                                <CardTitle>{t('analysisPage.details.performanceBreakdown', 'Performance Breakdown')}</CardTitle>
                                <CardDescription>{t('analysisPage.details.scoresByConversation')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[350px] w-full">
                                    <ScoreBarChart data={selectedReport.analyzedConversations} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="dark:bg-[#1B1B20] h-full py-5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Lightbulb className="text-amber-400" />{t('analysisPage.summary.aiInsights', 'AI-Generated Insights')}</CardTitle>
                                <CardDescription>{t('analysisPage.summary.aiInsightsDesc', 'Key takeaways from the analysis')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="positive" className="flex-grow">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="positive"><TrendingUp className="h-4 w-4 mr-1.5" />{t('analysisPage.tabs.positive', 'Positive')}</TabsTrigger>
                                        <TabsTrigger value="critical"><TrendingDown className="h-4 w-4 mr-1.5" />{t('analysisPage.tabs.critical', 'Critical')}</TabsTrigger>
                                        <TabsTrigger value="suggestions"><MessageSquareQuote className="h-4 w-4 mr-1.5" />{t('analysisPage.tabs.suggestions', 'Ideas')}</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="positive" className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-h-[260px] overflow-y-auto pr-2">{selectedReport.positiveFeedbackSummary}</TabsContent>
                                    <TabsContent value="critical" className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-h-[260px] overflow-y-auto pr-2">{selectedReport.criticalFeedbackSummary}</TabsContent>
                                    <TabsContent value="suggestions" className="mt-4 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-[260px] overflow-y-auto pr-2">{selectedReport.suggestedKnowledgeUpdates}</TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* --- CONVERSATION BREAKDOWN LIST --- */}
                <Card className="dark:bg-[#1B1B20] py-5">
                    <CardHeader>
                        <CardTitle>{t('analysisPage.details.conversationBreakdown', 'Conversation Breakdown')}</CardTitle>
                        <CardDescription>{t('analysisPage.details.breakdownDesc', 'Select a conversation to see detailed feedback.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {selectedReport.analyzedConversations?.map((conv, index) => (
                                <AccordionItem value={`item-${index}`} key={conv.conversationId} className="border-b dark:border-gray-800 last:border-b-0">
                                    <AccordionTrigger className="hover:no-underline text-left py-4 px-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex flex-col text-left">
                                                <span className="font-semibold text-gray-800 dark:text-gray-100">{t('analysisPage.details.conversationWith', { name: conv.customerName })}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">{t('analysisPage.details.conversationId', 'ID: {{id}}', { id: conv.conversationId.slice(-8) })}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline" className={cn("px-3 py-1 text-sm font-bold",
                                                    conv.overallScore >= 8 ? 'border-green-500 text-green-500' :
                                                        conv.overallScore >= 5 ? 'border-amber-500 text-amber-500' :
                                                            'border-red-500 text-red-500'
                                                )}>
                                                    {conv.overallScore.toFixed(1)}
                                                </Badge>
                                                <ChevronDown className="h-5 w-5 transition-transform duration-200 accordion-chevron" />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4 pb-6 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">{t('analysisPage.details.reasoning')}:</h4>
                                                <blockquote className="border-l-4 pl-4 text-sm text-gray-600 dark:text-gray-400 dark:border-gray-600">{conv.scoreReasoning}</blockquote>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">{t('analysisPage.details.suggestions')}:</h4>
                                                <blockquote className="border-l-4 pl-4 text-sm text-gray-600 dark:text-gray-400 dark:border-blue-500">{conv.improvementSuggestions}</blockquote>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AnalysisPage;