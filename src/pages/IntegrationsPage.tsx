import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/app/store";
import { fetchUnipileConnections } from "@/features/unipile/unipileSlice";
import { fetchWhapiConnections } from "@/features/whapi/whapiSlice";
import UnipileIntegrationTab from "@/components/custom/unipile/UnipileIntegrationTab";
import WhapiIntegrationTab from "@/components/custom/whapi/WhapiIntegrationTab";
import toast from "react-hot-toast";

/** Dashboard Integrations: primary WhatsApp tab + optional secondary channels. */
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
      dispatch(fetchWhapiConnections());
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
        </div>
        <Tabs defaultValue="whapi" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-2">
            <TabsTrigger value="whapi" className="gap-1.5 sm:gap-2 px-2 sm:px-3">
              <Phone className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("integrationsPage.tabPrimaryWhatsApp")}</span>
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px] px-1.5 py-0 h-5 font-medium leading-none uppercase tracking-wide"
              >
                {t("integrationsPage.tabRecommended")}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unipile" className="gap-2">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("integrationsPage.tabMoreChannels")}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="whapi" className="mt-6">
            <WhapiIntegrationTab />
          </TabsContent>
          <TabsContent value="unipile" className="mt-6">
            <UnipileIntegrationTab neutralIntegrationsCopy />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
