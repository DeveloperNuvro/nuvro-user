import { useEffect, useState } from "react";
import { Copy, Loader2, CheckCircle, XCircle, Globe, } from "lucide-react";
import toast from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card,  CardDescription,  CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { fetchAIAgentById } from "@/features/aiAgent/aiAgentSlice";
import { fetchIntegrationStatus, } from "@/features/whatsappIntregation/integrationsSlice";
import { useParams } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";

// --- SUB-COMPONENT: Website Embed Tab ---
const WebsiteEmbedTab = ({ script }: { script: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (script && !script.includes("apiKey=&")) {
            navigator.clipboard.writeText(script);
            toast.success("Embed script copied to clipboard!");
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } else {
            toast.error("API Key not ready. Please refresh.");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-3">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Embed on Your Website</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Add the AI agent to any website by pasting this script tag into your HTML.
                </p>
                <div className="mt-6">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Embed Script</label>
                    <div className="relative mt-2">
                        <pre className="block w-full rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-300 overflow-x-auto">
                            <code>{script}</code>
                        </pre>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 cursor-pointer bg-[#ff21b0] right-2 h-8 w-8 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                            onClick={handleCopy}
                            aria-label="Copy script"
                        >
                            {copied ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 text-white w-5" />}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="md:col-span-2">
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg h-full">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200">Quick Instructions</h4>
                    <ol className="mt-3 list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
                        <li>Click the copy icon to copy the script.</li>
                        <li>Paste the script just before the closing <code>&lt;/body&gt;</code> tag in your website's HTML file.</li>
                        <li>Save and publish your website. The widget will now be live!</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: WhatsApp Integration Tab ---
const WhatsAppIntegrationTab = () => {
    // const dispatch = useDispatch<AppDispatch>();
    const { integrations, status: integrationStatus } = useSelector((state: RootState) => state.integrations);
    // const { user } = useSelector((state: RootState) => state.auth);

    const isActivating = integrationStatus === 'loading';

    // const handleActivate = () => {
    //     if (user?.businessId) {
    //         dispatch(activateWhatsApp({ businessId: user.businessId }));
    //     } else {
    //         toast.error("Business information not found. Please relogin.");
    //     }
    // };

    if (integrations?.whatsapp.isActive) {
        return (
            <div className="w-full max-w-3xl mx-auto text-center">
                 <div className="p-4 bg-green-50 dark:bg-green-900/20 border-t-4 border-green-500 rounded-b-lg shadow-sm">
                    <div className="flex items-center">
                        <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0"/>
                        <div className="text-left">
                            <h3 className="font-semibold text-green-800 dark:text-green-200">WhatsApp Integration is Active</h3>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                Your dedicated business number is:
                                <span className="ml-2 font-mono bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded">{integrations.whatsapp.phoneNumber}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <Card className="w-full max-w-3xl mx-auto shadow-lg border-gray-200 dark:border-gray-700">
            <div className="grid md:grid-cols-5 md:gap-6">
                <div className="md:col-span-3 p-8">
                    <CardTitle className="text-2xl font-bold">One-Click WhatsApp Activation</CardTitle>
                    <CardDescription className="mt-2 text-base text-gray-500 dark:text-gray-400">
                        Instantly provision a dedicated phone number to enable AI-powered notifications for your business.
                    </CardDescription>
                    <div className="mt-8">
                        <Button size="lg"  disabled className="w-full text-base py-6 bg-green-600 hover:bg-green-700 text-white font-bold cursor-pointer shadow-md">
                            {isActivating ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <FaWhatsapp className="mr-3 h-5 w-5" />
                            )}
                            {isActivating ? "Provisioning..." : "We are working on that!"}
                        </Button>
                        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">
                            A US/Canada-based number will be assigned. This is a one-time action.
                        </p>
                    </div>
                </div>
                <div className="hidden md:block md:col-span-2 bg-gray-50 dark:bg-gray-800/50 p-8 rounded-r-lg">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">How It Works</h4>
                    <ul className="mt-4 list-none space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <li className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-3 mt-1 flex-shrink-0" />
                            <span>Your agent automatically sends alerts for new tickets and escalations.</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-3 mt-1 flex-shrink-0" />
                            <span>All customer replies appear in your dashboard, not your personal phone.</span>
                        </li>
                         <li className="flex items-start">
                            <XCircle className="h-4 w-4 text-red-500 mr-3 mt-1 flex-shrink-0" />
                            <span>This number cannot be used with the standard WhatsApp mobile app.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </Card>
    );
};


// --- The Main Page Component ---
export default function SingleAiAgent() {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch<AppDispatch>();

    const { selectedAgent, status: agentStatus, apiKey } = useSelector((state: RootState) => state.aiAgent);
    const { status: integrationStatus } = useSelector((state: RootState) => state.integrations);

    useEffect(() => {
        if (id) {
            dispatch(fetchAIAgentById(id));
            dispatch(fetchIntegrationStatus());
        }
    }, [dispatch, id]);

    const script = `<script src="https://nuvro-dtao9.ondigitalocean.app/public/widget.js?apiKey=${apiKey || ''}&agentName=${encodeURIComponent(selectedAgent?.name || '')}" async></script>`;

    if (agentStatus === 'loading' || agentStatus === 'idle') {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-5 mb-6">
                <div className="flex flex-wrap items-center justify-between sm:flex-nowrap">
                    <div className="mb-4 sm:mb-0">
                        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-white">{selectedAgent?.name}</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage integrations and settings for this agent.</p>
                    </div>
                    <div>
                        {selectedAgent?.active ? (
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className="w-4 h-4 mr-1.5" /> Active
                            </div>
                        ) : (
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                <XCircle className="w-4 h-4 mr-1.5" /> Inactive
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <Tabs defaultValue="integration-website" className="w-full">
                <TabsList className="border-b border-gray-200 dark:border-gray-700">
                    <TabsTrigger value="integration-website" className="text-base px-4 py-2">
                        <Globe className="mr-2 h-5 w-5" /> Website Embed
                    </TabsTrigger>
                    <TabsTrigger value="integration-whatsapp" className="text-base px-4 py-2">
                        <FaWhatsapp className="mr-2 h-5 w-5" /> WhatsApp
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="integration-website" className="pt-8">
                    <WebsiteEmbedTab script={script} />
                </TabsContent>

                <TabsContent value="integration-whatsapp" className="pt-8">
                    {(integrationStatus === 'idle' || integrationStatus === 'loading') ? (
                        <div className="flex justify-center p-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <WhatsAppIntegrationTab />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}