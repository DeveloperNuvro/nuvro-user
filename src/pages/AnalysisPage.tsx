import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next'; // --- IMPORT ---
import { AppDispatch, RootState } from '@/app/store';
import { fetchAnalysisReports, AnalysisReport } from '@/features/analysisReport/analysisReportSlice';
import ScoreBarChart from '../components/custom/analysis/ScoreBarChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, TrendingUp, TrendingDown, MessageSquareQuote, FileText, Bot, Users, MessageCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";

// --- Reusable Stat Card Component ---
const StatCard = ({ title, value, icon, description, colorClass }: { title: string, value: string, icon: React.ReactNode, description?: string, colorClass?: string }) => (
    <Card className=" hover:shadow-sm border-1  cursor-pointer transition-shadow py-3 duration-300 dark:bg-[#1B1B20]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className={cn("text-4xl font-bold", colorClass)}>{value}</div>
            {description && <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>}
        </CardContent>
    </Card>
);

// --- Main Analysis Page Component ---
const AnalysisPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation(); // --- INITIALIZE ---
    const { user } = useSelector((state: RootState) => state.auth);
    const { reports, status, error } = useSelector((state: RootState) => state.analysisReport);
    const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);

    useEffect(() => {
        if (user?.businessId) {
            dispatch(fetchAnalysisReports(user.businessId));
        }
    }, [dispatch, user?.businessId]);

    useEffect(() => {
        if (reports && reports.length > 0) {
            const sortedReports = [...reports].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
            setSelectedReport(sortedReports[0]);
        }
    }, [reports]);

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500 dark:text-gray-400">
                <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
                <h2 className="text-2xl font-semibold">{t('analysisPage.loading.title')}</h2>
                <p className="mt-2">{t('analysisPage.loading.subtitle')}</p>
            </div>
        );
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
    const formattedDate = new Date(selectedReport.reportDate).toLocaleDateString(i18n.language, {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    return (
        <div className=" min-h-screen">
            <div className="container mx-auto py-8 px-4 md:px-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{t('analysisPage.header.title')}</h1>
                        <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                            {t('analysisPage.header.subtitle')} <span className="font-semibold text-primary">{formattedDate}</span>
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:gap-8 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                        title={t('analysisPage.stats.overallScore')}
                        value={selectedReport.overallAccuracyScore.toFixed(1)} 
                        icon={<Star className={`h-6 w-6 ${scoreColor}`} />}
                        description={t('analysisPage.stats.overallScoreDesc')}
                        colorClass={scoreColor}
                    />
                    <StatCard 
                        title={t('analysisPage.stats.conversationsAnalyzed')}
                        value={selectedReport.analyzedConversations.length.toString()} 
                        icon={<MessageCircle className="h-6 w-6 text-gray-400"/>}
                        description={t('analysisPage.stats.conversationsAnalyzedDesc')}
                    />
                     <StatCard 
                        title={t('analysisPage.stats.agentName')}
                        value="Pullman"
                        icon={<Bot className="h-6 w-6 text-gray-400"/>}
                        description={t('analysisPage.stats.agentNameDesc')}
                    />
                     <StatCard 
                        title={t('analysisPage.stats.customersInvolved')}
                        value={new Set(selectedReport.analyzedConversations.map(c => c.customerName)).size.toString()} 
                        icon={<Users className="h-6 w-6 text-gray-400"/>}
                        description={t('analysisPage.stats.customersInvolvedDesc')}
                    />
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-8">
                        <Card className="py-4 cursor-pointer hover:shadow-md transition-shadow duration-300 dark:bg-[#1B1B20]">
                            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="text-green-500"/>{t('analysisPage.summary.workingWell')}</CardTitle></CardHeader>
                            <CardContent className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{selectedReport.positiveFeedbackSummary}</CardContent>
                        </Card>
                         <Card className="py-4 cursor-pointer hover:shadow-md transition-shadow duration-300 dark:bg-[#1B1B20]">
                            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="text-red-500"/>{t('analysisPage.summary.improvementAreas')}</CardTitle></CardHeader>
                            <CardContent className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{selectedReport.criticalFeedbackSummary}</CardContent>
                        </Card>
                         <Card className="py-4 cursor-pointer hover:shadow-md transition-shadow duration-300 dark:bg-[#1B1B20]">
                            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareQuote className="text-blue-500"/>{t('analysisPage.summary.knowledgeSuggestions')}</CardTitle></CardHeader>
                            <CardContent className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{selectedReport.suggestedKnowledgeUpdates}</CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card className=" py-5 transition-shadow duration-300 dark:bg-[#1B1B20]">
                            <CardHeader>
                                <CardTitle>{t('analysisPage.details.title')}</CardTitle>
                                <CardDescription>{t('analysisPage.details.subtitle')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('analysisPage.details.scoresByConversation')}</h3>
                                    <ScoreBarChart data={selectedReport.analyzedConversations} />
                                </div>
                                <div>
                                     <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('analysisPage.details.feedbackBreakdown')}</h3>
                                    <Accordion type="single" collapsible className="w-full">
                                        {selectedReport.analyzedConversations?.map((conv, index) => (
                                            <AccordionItem value={`item-${index}`} key={conv.conversationId} className="border-b dark:border-gray-700">
                                                <AccordionTrigger className="hover:no-underline text-left py-4">
                                                    <div className="flex cursor-pointer items-center justify-between w-full">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-200">{t('analysisPage.details.conversationWith', { name: conv.customerName })}</span>
                                                        <Badge className={`px-3 py-1 text-xs ${conv.overallScore >= 8 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : conv.overallScore >= 5 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                            {t('analysisPage.details.score', { score: conv.overallScore })}
                                                        </Badge>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="p-4 bg-gray-50 dark:bg-gray-900/50">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t('analysisPage.details.reasoning')}:</h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{conv.scoreReasoning}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t('analysisPage.details.suggestions')}:</h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{conv.improvementSuggestions}</p>
                                                        </div>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;