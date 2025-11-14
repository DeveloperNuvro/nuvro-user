import { useEffect, useState } from "react";
import { Copy, Loader2, CheckCircle, XCircle, Globe, MessageSquare, Code, Zap, Sparkles, Power } from "lucide-react";
import toast from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { fetchAIAgentById, toggleAIAgentStatus } from "@/features/aiAgent/aiAgentSlice";
import { useParams } from "react-router-dom";
import UnipileIntegrationTab from "@/components/custom/unipile/UnipileIntegrationTab";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

// --- SUB-COMPONENT: Website Embed Tab ---
const WebsiteEmbedTab = ({ script }: { script: string }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (script && !script.includes("apiKey=&")) {
            navigator.clipboard.writeText(script);
            toast.success(t('singleAiAgentPage.toast.copySuccess'));
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } else {
            toast.error(t('singleAiAgentPage.toast.copyError'));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                            <Code className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('singleAiAgentPage.websiteEmbed.title')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {t('singleAiAgentPage.websiteEmbed.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Script Section */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] py-6">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    {t('singleAiAgentPage.websiteEmbed.embedScript')}
                                </CardTitle>
                                <Button
                                    onClick={handleCopy}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            {t('singleAiAgentPage.websiteEmbed.copied')}
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            {t('singleAiAgentPage.websiteEmbed.copy')}
                                        </>
                                    )}
                                </Button>
                            </div>
                            <CardDescription className="text-sm mt-2">
                                {t('singleAiAgentPage.websiteEmbed.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <pre className="block w-full rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a] p-5 text-sm text-gray-700 dark:text-gray-300 font-mono overflow-x-auto">
                                    <code className="whitespace-pre-wrap break-all">{script}</code>
                                </pre>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 py-6">
                            <CardContent className="px-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.websiteEmbed.easySetup')}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('singleAiAgentPage.websiteEmbed.oneScript')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 py-6">
                            <CardContent className="px-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-800">
                                        <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.websiteEmbed.instant')}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('singleAiAgentPage.websiteEmbed.activation')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 py-6">
                            <CardContent className="px-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg border border-purple-200 dark:border-purple-800">
                                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.websiteEmbed.universal')}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('singleAiAgentPage.websiteEmbed.compatible')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Instructions Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 py-6">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                {t('singleAiAgentPage.websiteEmbed.quickSetupGuide')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-semibold text-sm text-blue-700 dark:text-blue-300">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1 text-gray-900 dark:text-white">{t('singleAiAgentPage.websiteEmbed.step1Title')}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.websiteEmbed.step1Description')}</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-semibold text-sm text-blue-700 dark:text-blue-300">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1 text-gray-900 dark:text-white">{t('singleAiAgentPage.websiteEmbed.step2Title')}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.websiteEmbed.step2Description')}</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-semibold text-sm text-blue-700 dark:text-blue-300">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1 text-gray-900 dark:text-white">{t('singleAiAgentPage.websiteEmbed.step3Title')}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('singleAiAgentPage.websiteEmbed.step3Description')}</p>
                                    </div>
                                </li>
                            </ol>
                        </CardContent>
                    </Card>

                    {/* Features Card */}
                    <Card className="border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/30 py-6">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                                <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                {t('singleAiAgentPage.websiteEmbed.keyFeatures')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700 dark:text-gray-300">{t('singleAiAgentPage.websiteEmbed.worksOnAnyWebsite')}</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700 dark:text-gray-300">{t('singleAiAgentPage.websiteEmbed.noServerConfig')}</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700 dark:text-gray-300">{t('singleAiAgentPage.websiteEmbed.automaticallyResponsive')}</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700 dark:text-gray-300">{t('singleAiAgentPage.websiteEmbed.realtimeAiResponses')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// --- The Main Page Component ---
export default function SingleAiAgent() {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation();
    const [isToggling, setIsToggling] = useState(false);

    const { selectedAgent, status: agentStatus, apiKey } = useSelector((state: RootState) => state.aiAgent);

    useEffect(() => {
        if (id) {
            dispatch(fetchAIAgentById(id));
        }
    }, [dispatch, id]);

    const handleToggleStatus = async () => {
        if (!id || !selectedAgent) return;
        
        setIsToggling(true);
        try {
            await dispatch(toggleAIAgentStatus(id)).unwrap();
            const status = selectedAgent.active ? 'deactivated' : 'activated';
            toast.success(t('singleAiAgentPage.toast.toggleSuccess', { status }));
        } catch (error: any) {
            toast.error(error || t('singleAiAgentPage.toast.toggleError'));
        } finally {
            setIsToggling(false);
        }
    };

    const script = `<script src="https://nuvro-dtao9.ondigitalocean.app/public/widget.js?apiKey=${apiKey || ''}&agentName=${encodeURIComponent(selectedAgent?.name || '')}" async></script>`;

    if (agentStatus === 'loading' || agentStatus === 'idle') {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.loading')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background dark:bg-[#0a0a0a] p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-[#1a1a1a] dark:to-[#0f0f0f] py-8 shadow-sm dark:shadow-none">
                <div className="relative z-10 px-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                                        {selectedAgent?.name || t('singleAiAgentPage.title')}
                                    </h1>
                                </div>
                                {selectedAgent?.active ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        {t('singleAiAgentPage.active')}
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                                        <XCircle className="w-4 h-4" />
                                        {t('singleAiAgentPage.inactive')}
                                    </div>
                                )}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-base max-w-2xl">
                                {t('singleAiAgentPage.subtitle')}
                            </p>
                        </div>
                        {/* Toggle Status Switch */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 shadow-sm">
                                <Power className={`w-5 h-5 ${selectedAgent?.active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                                <div className="flex flex-col">
                                    <Label htmlFor="agent-status-toggle" className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer">
                                        {t('singleAiAgentPage.agentStatus')}
                                    </Label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {selectedAgent?.active ? t('singleAiAgentPage.currentlyActive') : t('singleAiAgentPage.currentlyInactive')}
                                    </p>
                                </div>
                                <button
                                    id="agent-status-toggle"
                                    onClick={handleToggleStatus}
                                    disabled={isToggling}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-3 ${
                                        selectedAgent?.active 
                                            ? 'bg-green-600 dark:bg-green-500' 
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    aria-label="Toggle agent status"
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            selectedAgent?.active ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Tabs Section */}
            <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm dark:shadow-none">
                <Tabs defaultValue="integration-website" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b border-gray-200 dark:border-gray-700 bg-transparent p-0 h-auto">
                        <TabsTrigger 
                            value="integration-website" 
                            className="data-[state=active]:bg-blue-50 data-[state=active]:dark:bg-blue-900/20 data-[state=active]:text-blue-700 data-[state=active]:dark:text-blue-300 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 px-6 py-4 text-base font-semibold transition-all text-gray-600 dark:text-gray-400"
                        >
                            <Globe className="mr-2 h-5 w-5" />
                            {t('singleAiAgentPage.tabs.websiteEmbed')}
                        </TabsTrigger>
                        <TabsTrigger 
                            value="integration-unipile" 
                            className="data-[state=active]:bg-blue-50 data-[state=active]:dark:bg-blue-900/20 data-[state=active]:text-blue-700 data-[state=active]:dark:text-blue-300 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 px-6 py-4 text-base font-semibold transition-all text-gray-600 dark:text-gray-400"
                        >
                            <MessageSquare className="mr-2 h-5 w-5" />
                            {t('singleAiAgentPage.tabs.multiPlatform')}
                        </TabsTrigger>
                    </TabsList>

                    <div className="p-6 lg:p-8">
                        <TabsContent value="integration-website" className="mt-0">
                            <WebsiteEmbedTab script={script} />
                        </TabsContent>

                        <TabsContent value="integration-unipile" className="mt-0">
                            <UnipileIntegrationTab agentId={selectedAgent?._id} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
