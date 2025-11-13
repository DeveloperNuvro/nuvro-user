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
import { TrendingUp, TrendingDown, MessageSquareQuote, FileText, Bot, Users, MessageCircle, Star, Lightbulb, ChevronDown, BarChart3, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import AnalysisPageSkeleton from '@/components/skeleton/AnalysisSkeleton';
import { useTheme } from "@/components/theme-provider";

// --- Enhanced Metric Card Component ---
const MetricCard = ({ title, value, icon, description, colorScheme = 'blue', isDarkMode }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    description: string;
    colorScheme?: 'blue' | 'green' | 'purple' | 'amber' | 'red';
    isDarkMode: boolean;
}) => {
    const colorClasses = {
        blue: {
            gradient: isDarkMode ? 'from-blue-500/20 via-blue-600/15 to-indigo-600/10' : 'from-blue-50 via-blue-100/50 to-indigo-50',
            border: isDarkMode ? 'border-blue-500/30 hover:border-blue-400/50' : 'border-blue-200/60 hover:border-blue-300/80',
            shadow: 'hover:shadow-blue-500/20',
            blur: isDarkMode ? 'bg-blue-400' : 'bg-blue-300',
            iconBg: isDarkMode ? 'bg-blue-500/30 border-blue-400/30' : 'bg-blue-500/20 border-blue-300/40',
        },
        green: {
            gradient: isDarkMode ? 'from-green-500/20 via-emerald-600/15 to-teal-600/10' : 'from-green-50 via-emerald-100/50 to-teal-50',
            border: isDarkMode ? 'border-green-500/30 hover:border-green-400/50' : 'border-green-200/60 hover:border-green-300/80',
            shadow: 'hover:shadow-green-500/20',
            blur: isDarkMode ? 'bg-green-400' : 'bg-green-300',
            iconBg: isDarkMode ? 'bg-green-500/30 border-green-400/30' : 'bg-green-500/20 border-green-300/40',
        },
        purple: {
            gradient: isDarkMode ? 'from-purple-500/20 via-purple-600/15 to-pink-600/10' : 'from-purple-50 via-purple-100/50 to-pink-50',
            border: isDarkMode ? 'border-purple-500/30 hover:border-purple-400/50' : 'border-purple-200/60 hover:border-purple-300/80',
            shadow: 'hover:shadow-purple-500/20',
            blur: isDarkMode ? 'bg-purple-400' : 'bg-purple-300',
            iconBg: isDarkMode ? 'bg-purple-500/30 border-purple-400/30' : 'bg-purple-500/20 border-purple-300/40',
        },
        amber: {
            gradient: isDarkMode ? 'from-amber-500/20 via-amber-600/15 to-orange-600/10' : 'from-amber-50 via-amber-100/50 to-orange-50',
            border: isDarkMode ? 'border-amber-500/30 hover:border-amber-400/50' : 'border-amber-200/60 hover:border-amber-300/80',
            shadow: 'hover:shadow-amber-500/20',
            blur: isDarkMode ? 'bg-amber-400' : 'bg-amber-300',
            iconBg: isDarkMode ? 'bg-amber-500/30 border-amber-400/30' : 'bg-amber-500/20 border-amber-300/40',
        },
        red: {
            gradient: isDarkMode ? 'from-red-500/20 via-red-600/15 to-rose-600/10' : 'from-red-50 via-red-100/50 to-rose-50',
            border: isDarkMode ? 'border-red-500/30 hover:border-red-400/50' : 'border-red-200/60 hover:border-red-300/80',
            shadow: 'hover:shadow-red-500/20',
            blur: isDarkMode ? 'bg-red-400' : 'bg-red-300',
            iconBg: isDarkMode ? 'bg-red-500/30 border-red-400/30' : 'bg-red-500/20 border-red-300/40',
        },
    };

    const colors = colorClasses[colorScheme];

    return (
        <Card className={`
            relative overflow-hidden border transition-all duration-300 hover:scale-[1.02] group py-5
            bg-gradient-to-br ${colors.gradient} ${colors.border}
            hover:shadow-lg ${colors.shadow}
        `}>
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${colors.blur}`}></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{title}</CardTitle>
                <div className={`
                    p-3 rounded-xl backdrop-blur-sm transition-transform duration-300 group-hover:scale-110
                    ${colors.iconBg}
                `}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-4xl font-bold mb-1 text-foreground">{value}</div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
            </CardContent>
        </Card>
    );
};

// --- Main Analysis Page Component ---
const AnalysisPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const { user } = useSelector((state: RootState) => state.auth);
    const { reports, status, error } = useSelector((state: RootState) => state.analysisReport);

    // State to manage the currently selected report ID
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    
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
        return (
            <div className={`
                flex flex-col items-center justify-center min-h-[60vh] p-8 rounded-2xl
                ${isDarkMode ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-200'}
                border
            `}>
                <FileText className={`h-16 w-16 mb-6 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`} />
                <h2 className={`text-2xl font-semibold mb-2 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {t('analysisPage.error', { error })}
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    {error || 'Failed to load analysis reports'}
                </p>
            </div>
        );
    }

    if (!selectedReport) {
        return (
            <div className={`
                flex flex-col items-center justify-center text-center rounded-2xl p-12 sm:p-16 min-h-[60vh]
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
                        <FileText className="h-20 w-20 text-primary" />
                    </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t('analysisPage.empty.title')}</h2>
                <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base">
                    {t('analysisPage.empty.subtitle')}
                </p>
            </div>
        );
    }

    const scoreColor = selectedReport.overallAccuracyScore >= 8 ? 'text-green-500' : selectedReport.overallAccuracyScore >= 5 ? 'text-amber-500' : 'text-red-500';
    const scoreBorder = selectedReport.overallAccuracyScore >= 8 ? 'green' : selectedReport.overallAccuracyScore >= 5 ? 'amber' : 'red';

    return (
        <div className="min-h-screen pb-8">
            <div className="container mx-auto py-8 px-4 md:px-8 space-y-8">
                {/* Enhanced Header Section */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-3">
                                <div className={`
                                    p-2 rounded-xl
                                    ${isDarkMode 
                                        ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/20 border border-primary/30' 
                                        : 'bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-primary/20'
                                    }
                                `}>
                                    <BarChart3 className="h-6 w-6 text-primary" />
                                </div>
                                {t('analysisPage.header.title')}
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                                {t('analysisPage.header.showingReportFor', 'Showing report for')} {new Date(selectedReport.reportDate).toLocaleDateString(i18n.language, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Select value={selectedReportId || ''} onValueChange={setSelectedReportId}>
                                <SelectTrigger className={`
                                    w-full md:w-[280px] text-base py-6 cursor-pointer
                                    ${isDarkMode ? 'bg-muted/50 border-border/60' : 'bg-background border-border'}
                                `}>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder={t('analysisPage.header.selectReport')} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedReports.map(report => (
                                        <SelectItem key={report._id} value={report._id} className="cursor-pointer">
                                            {new Date(report.reportDate).toLocaleDateString(i18n.language, { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* --- METRICS GRID --- */}
                <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title={t('analysisPage.stats.overallScore')}
                        value={selectedReport.overallAccuracyScore.toFixed(1)}
                        icon={<Star className={`h-6 w-6 ${scoreColor}`} />}
                        description={t('analysisPage.stats.overallScoreDesc', 'Based on AI analysis')}
                        colorScheme={scoreBorder as 'blue' | 'green' | 'purple' | 'amber' | 'red'}
                        isDarkMode={isDarkMode}
                    />
                    <MetricCard
                        title={t('analysisPage.stats.conversationsAnalyzed')}
                        value={selectedReport.analyzedConversations.length.toString()}
                        icon={<MessageCircle className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />}
                        description={t('analysisPage.stats.totalThisPeriod', 'Total for this period')}
                        colorScheme="blue"
                        isDarkMode={isDarkMode}
                    />
                    <MetricCard
                        title={t('analysisPage.stats.agentName')}
                        value={selectedReport.agentInfo || t('analysisPage.stats.unknown', 'Unknown')}
                        icon={<Bot className={`h-6 w-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />}
                        description={t('analysisPage.stats.primaryAgent', 'Primary AI Agent')}
                        colorScheme="purple"
                        isDarkMode={isDarkMode}
                    />
                    <MetricCard
                        title={t('analysisPage.stats.customersInvolved')}
                        value={new Set(selectedReport.analyzedConversations.map(c => c.customerName)).size.toString()}
                        icon={<Users className={`h-6 w-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />}
                        description={t('analysisPage.stats.uniqueCustomers', 'Unique customers')}
                        colorScheme="green"
                        isDarkMode={isDarkMode}
                    />
                </div>

                {/* --- MAIN CONTENT GRID --- */}
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className={`
                            overflow-hidden border transition-all duration-300 h-full py-5
                            ${isDarkMode 
                                ? 'bg-card border-border/60 shadow-lg shadow-black/10' 
                                : 'bg-card border-border/80 shadow-md shadow-black/5'
                            }
                        `}>
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500`}></div>
                            <CardHeader className="relative z-10">
                                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                    <div className={`
                                        p-2 rounded-lg
                                        ${isDarkMode 
                                            ? 'bg-gradient-to-br from-blue-500/30 to-cyan-500/20 border border-blue-400/30' 
                                            : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-300/40'
                                        }
                                    `}>
                                        <BarChart3 className="h-5 w-5 text-blue-500" />
                                    </div>
                                    {t('analysisPage.details.performanceBreakdown', 'Performance Breakdown')}
                                </CardTitle>
                                <CardDescription>{t('analysisPage.details.scoresByConversation')}</CardDescription>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="h-[350px] w-full">
                                    <ScoreBarChart data={selectedReport.analyzedConversations} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className={`
                            overflow-hidden border transition-all duration-300 h-full py-5
                            ${isDarkMode 
                                ? 'bg-card border-border/60 shadow-lg shadow-black/10' 
                                : 'bg-card border-border/80 shadow-md shadow-black/5'
                            }
                        `}>
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500`}></div>
                            <CardHeader className="relative z-10">
                                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                    <div className={`
                                        p-2 rounded-lg
                                        ${isDarkMode 
                                            ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-400/30' 
                                            : 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-300/40'
                                        }
                                    `}>
                                        <Lightbulb className="h-5 w-5 text-amber-500" />
                                    </div>
                                    {t('analysisPage.summary.aiInsights', 'AI-Generated Insights')}
                                </CardTitle>
                                <CardDescription>{t('analysisPage.summary.aiInsightsDesc', 'Key takeaways from the analysis')}</CardDescription>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <Tabs defaultValue="positive" className="flex-grow">
                                    <TabsList className={`
                                        grid w-full grid-cols-3
                                        ${isDarkMode ? 'bg-muted/50' : 'bg-muted/30'}
                                    `}>
                                        <TabsTrigger value="positive" className="cursor-pointer">
                                            <TrendingUp className="h-4 w-4 mr-1.5" />
                                            {t('analysisPage.tabs.positive', 'Positive')}
                                        </TabsTrigger>
                                        <TabsTrigger value="critical" className="cursor-pointer">
                                            <TrendingDown className="h-4 w-4 mr-1.5" />
                                            {t('analysisPage.tabs.critical', 'Critical')}
                                        </TabsTrigger>
                                        <TabsTrigger value="suggestions" className="cursor-pointer">
                                            <MessageSquareQuote className="h-4 w-4 mr-1.5" />
                                            {t('analysisPage.tabs.suggestions', 'Ideas')}
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="positive" className={`
                                        mt-4 text-sm leading-relaxed max-h-[260px] overflow-y-auto pr-2
                                        ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}
                                    `}>
                                        {selectedReport.positiveFeedbackSummary}
                                    </TabsContent>
                                    <TabsContent value="critical" className={`
                                        mt-4 text-sm leading-relaxed max-h-[260px] overflow-y-auto pr-2
                                        ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}
                                    `}>
                                        {selectedReport.criticalFeedbackSummary}
                                    </TabsContent>
                                    <TabsContent value="suggestions" className={`
                                        mt-4 text-sm whitespace-pre-wrap max-h-[260px] overflow-y-auto pr-2
                                        ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}
                                    `}>
                                        {selectedReport.suggestedKnowledgeUpdates}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* --- CONVERSATION BREAKDOWN LIST --- */}
                <Card className={`
                    overflow-hidden border transition-all duration-300 py-5
                    ${isDarkMode 
                        ? 'bg-card border-border/60 shadow-lg shadow-black/10' 
                        : 'bg-card border-border/80 shadow-md shadow-black/5'
                    }
                `}>
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500`}></div>
                    <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <div className={`
                                p-2 rounded-lg
                                ${isDarkMode 
                                    ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/20 border border-purple-400/30' 
                                    : 'bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-300/40'
                                }
                            `}>
                                <MessageCircle className="h-5 w-5 text-purple-500" />
                            </div>
                            {t('analysisPage.details.conversationBreakdown', 'Conversation Breakdown')}
                        </CardTitle>
                        <CardDescription>{t('analysisPage.details.breakdownDesc', 'Select a conversation to see detailed feedback.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <Accordion type="single" collapsible className="w-full">
                            {selectedReport.analyzedConversations?.map((conv, index) => (
                                <AccordionItem 
                                    value={`item-${index}`} 
                                    key={conv.conversationId} 
                                    className={`
                                        border-b last:border-b-0
                                        ${isDarkMode ? 'border-border/40' : 'border-border/60'}
                                    `}
                                >
                                    <AccordionTrigger className={`
                                        hover:no-underline text-left py-4 px-2 rounded-lg transition-colors
                                        ${isDarkMode 
                                            ? 'hover:bg-muted/30' 
                                            : 'hover:bg-muted/20'
                                        }
                                    `}>
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex flex-col text-left">
                                                <span className="font-semibold text-foreground">
                                                    {t('analysisPage.details.conversationWith', { name: conv.customerName })}
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-1 font-mono">
                                                    {t('analysisPage.details.conversationId', 'ID: {{id}}', { id: conv.conversationId.slice(-8) })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline" className={cn(
                                                    "px-3 py-1 text-sm font-bold cursor-default",
                                                    conv.overallScore >= 8 ? 'border-green-500 text-green-500' :
                                                        conv.overallScore >= 5 ? 'border-amber-500 text-amber-500' :
                                                            'border-red-500 text-red-500'
                                                )}>
                                                    {conv.overallScore.toFixed(1)}
                                                </Badge>
                                                <ChevronDown className="h-5 w-5 transition-transform duration-200 accordion-chevron text-muted-foreground" />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className={`
                                        pt-4 pb-6 px-4 rounded-b-lg
                                        ${isDarkMode 
                                            ? 'bg-muted/20' 
                                            : 'bg-muted/10'
                                        }
                                    `}>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-semibold text-sm text-foreground mb-2">{t('analysisPage.details.reasoning')}:</h4>
                                                <blockquote className={`
                                                    border-l-4 pl-4 text-sm
                                                    ${isDarkMode 
                                                        ? 'text-gray-300 border-gray-600' 
                                                        : 'text-gray-600 border-gray-400'
                                                    }
                                                `}>
                                                    {conv.scoreReasoning}
                                                </blockquote>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm text-foreground mb-2">{t('analysisPage.details.suggestions')}:</h4>
                                                <blockquote className={`
                                                    border-l-4 pl-4 text-sm
                                                    ${isDarkMode 
                                                        ? 'text-gray-300 border-blue-500' 
                                                        : 'text-gray-600 border-blue-400'
                                                    }
                                                `}>
                                                    {conv.improvementSuggestions}
                                                </blockquote>
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