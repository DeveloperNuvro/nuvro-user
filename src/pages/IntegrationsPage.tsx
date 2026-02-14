import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Phone, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/app/store";
import { fetchUnipileConnections } from "@/features/unipile/unipileSlice";
import { fetchWhatsAppConnections } from "@/features/whatsappBusiness/whatsappBusinessSlice";
import UnipileIntegrationTab from "@/components/custom/unipile/UnipileIntegrationTab";
import WhatsAppBusinessIntegrationTab from "@/components/custom/whatsappBusiness/WhatsAppBusinessIntegrationTab";
import { Card, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";

/**
 * Dashboard-level Integrations: WhatsApp & Multi-Platform (Unipile).
 * Aligned with 4 scenarios: connect with or without AI; add AI in Workflow later if needed.
 */
export default function IntegrationsPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Refetch connections when returning from OAuth (e.g. ?status=success&platform=whatsapp) so dashboard shows active, not pending
  useEffect(() => {
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    if (status === "success" && platform) {
      dispatch(fetchUnipileConnections(undefined));
      dispatch(fetchWhatsAppConnections()).catch(() => {});
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("status");
        next.delete("platform");
        return next;
      }, { replace: true });
      toast.success(t("integrationsPage.toast.connectionSuccess"));
    }
  }, [dispatch, searchParams, setSearchParams, t]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("integrationsPage.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("integrationsPage.subtitle")}
          </p>
          <Card className="mt-3 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
            <CardContent className="p-4 flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                {t("integrationsPage.fourScenarioNote") ||
                  "You can connect WhatsApp without an AI agent (human-only). Add an AI agent in Workflows later for AI replies. All 4 scenarios (business hours on/off × with or without AI) are supported."}
              </div>
            </CardContent>
          </Card>
        </div>
        <Tabs defaultValue="whatsapp" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="whatsapp" className="gap-2">
              <Phone className="h-4 w-4" />
              {t("integrationsPage.tabWhatsApp")}
            </TabsTrigger>
            <TabsTrigger value="unipile" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("integrationsPage.tabMultiPlatform")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="whatsapp" className="mt-6">
            <WhatsAppBusinessIntegrationTab />
          </TabsContent>
          <TabsContent value="unipile" className="mt-6">
            <UnipileIntegrationTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
