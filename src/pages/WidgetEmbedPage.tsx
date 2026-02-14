import { useEffect, useState } from "react";
import { Copy, Loader2, CheckCircle, Zap, Sparkles, Globe } from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { fetchAiAgentsByBusinessId, fetchAIAgentById, fetchWidgetApiKey } from "@/features/aiAgent/aiAgentSlice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

const BUSINESS_WORKFLOW_ONLY_VALUE = "__business_only__";

/**
 * Dashboard-level Widget embed page. Widget can be added with or without an agent:
 * - "Business workflow only": flow runs without a specific agent; later add agent in Workflow to get AI.
 * - Or pick an agent: that agent's workflow and AI are used.
 */
export default function WidgetEmbedPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const businessId = user?.businessId ?? "";
  const { aiAgents, status: agentsStatus } = useSelector((state: RootState) => state.aiAgent);
  const { selectedAgent, apiKey, status: selectedStatus } = useSelector((state: RootState) => state.aiAgent);

  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [businessOnlyApiKey, setBusinessOnlyApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (businessId) dispatch(fetchAiAgentsByBusinessId());
  }, [businessId, dispatch]);

  useEffect(() => {
    if (selectedAgentId && selectedAgentId !== BUSINESS_WORKFLOW_ONLY_VALUE) {
      dispatch(fetchAIAgentById(selectedAgentId));
    }
  }, [selectedAgentId, dispatch]);

  useEffect(() => {
    if (selectedAgentId === BUSINESS_WORKFLOW_ONLY_VALUE && !businessOnlyApiKey) {
      dispatch(fetchWidgetApiKey())
        .unwrap()
        .then((data) => setBusinessOnlyApiKey(data.apiKey))
        .catch(() => setBusinessOnlyApiKey(null));
    } else if (selectedAgentId !== BUSINESS_WORKFLOW_ONLY_VALUE) {
      setBusinessOnlyApiKey(null);
    }
  }, [selectedAgentId, businessOnlyApiKey, dispatch]);

  const isBusinessOnly = selectedAgentId === BUSINESS_WORKFLOW_ONLY_VALUE;
  const script = isBusinessOnly && businessOnlyApiKey
    ? `<script src="https://api.nuvro.ai/public/widget.js?apiKey=${businessOnlyApiKey}" async></script>`
    : selectedAgentId && selectedAgentId !== BUSINESS_WORKFLOW_ONLY_VALUE && apiKey && selectedAgent?.name
      ? `<script src="https://api.nuvro.ai/public/widget.js?apiKey=${apiKey}&agentName=${encodeURIComponent(selectedAgent.name)}" async></script>`
      : "";

  const handleCopy = () => {
    if (script && !script.includes("apiKey=&")) {
      navigator.clipboard.writeText(script);
      toast.success(t("singleAiAgentPage.toast.copySuccess"));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error(t("singleAiAgentPage.toast.copyError"));
    }
  };

  const loading =
    agentsStatus === "loading" ||
    (selectedAgentId && selectedAgentId !== BUSINESS_WORKFLOW_ONLY_VALUE && selectedStatus === "loading") ||
    (isBusinessOnly && !businessOnlyApiKey);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("singleAiAgentPage.websiteEmbed.title") || "Website chat widget"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("widgetEmbed.pageSubtitle") ||
              "Add the chat widget with business workflow only (no agent) or pick an AI agent. You can add an agent to a workflow later from the Workflow page."}
          </p>
        </div>

        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] py-6">
          <CardHeader className="pb-4">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("widgetEmbed.selectAgentOrWorkflow") || "Widget: workflow only or an agent"}
            </Label>
            <Select value={selectedAgentId || undefined} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="max-w-sm mt-2">
                <SelectValue placeholder={t("widgetEmbed.chooseOption") || "Choose an option..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BUSINESS_WORKFLOW_ONLY_VALUE}>
                  {t("widgetEmbed.businessWorkflowOnly") || "Business workflow only (no agent yet)"}
                </SelectItem>
                {(aiAgents ?? []).map((agent) => (
                  <SelectItem key={agent._id} value={agent._id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        )}

        {!loading && selectedAgentId && (isBusinessOnly ? !!businessOnlyApiKey : !!selectedAgent && !!apiKey) && (
          <>
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] py-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                    <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    {t("singleAiAgentPage.websiteEmbed.embedScript") || "Embed script"}
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
                        {t("singleAiAgentPage.websiteEmbed.copied") || "Copied"}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        {t("singleAiAgentPage.websiteEmbed.copy") || "Copy"}
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription className="text-sm mt-2">
                  {t("singleAiAgentPage.websiteEmbed.description") ||
                    "Paste this script before the closing body tag on your website."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="block w-full rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a] p-5 text-sm text-gray-700 dark:text-gray-300 font-mono overflow-x-auto">
                  <code className="whitespace-pre-wrap break-all">{script}</code>
                </pre>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 py-6">
                <CardContent className="px-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t("singleAiAgentPage.websiteEmbed.oneScript") || "One script"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 py-6">
                <CardContent className="px-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t("singleAiAgentPage.websiteEmbed.activation") || "Instant activation"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 py-6">
                <CardContent className="px-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t("singleAiAgentPage.websiteEmbed.compatible") || "Works everywhere"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {!loading && !selectedAgentId && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("widgetEmbed.selectAbove") || "Select an option above to get the embed script."}</p>
        )}

        {!loading && selectedAgentId === BUSINESS_WORKFLOW_ONLY_VALUE && !businessOnlyApiKey && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("widgetEmbed.loadingApiKey") || "Loading..."}</p>
        )}
      </div>
    </div>
  );
}
