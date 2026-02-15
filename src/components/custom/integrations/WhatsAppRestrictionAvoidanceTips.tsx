import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, ShieldCheck, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Shows best practices so businesses can avoid WhatsApp number restriction.
 * Rendered on Integrations page (Unipile / WhatsApp).
 */
export default function WhatsAppRestrictionAvoidanceTips() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const tips = [
    { key: "warmup", icon: ShieldCheck },
    { key: "firstMessage", icon: Info },
    { key: "coldOutreach", icon: Info },
    { key: "quality", icon: ShieldCheck },
    { key: "volume", icon: Info },
  ] as const;

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/15">
      <CardHeader
        className="cursor-pointer select-none py-4"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <ShieldCheck className="h-4 w-4" />
            {t("integrationsPage.restrictionAvoidance.title")}
          </CardTitle>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          )}
        </div>
        <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
          {t("integrationsPage.restrictionAvoidance.subtitle")}
        </p>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 pb-4">
          <ul className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
            {tips.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-2 items-start">
                <Icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0 mt-0.5",
                    key === "quality" || key === "warmup"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-amber-500 dark:text-amber-500"
                  )}
                />
                <span>{t(`integrationsPage.restrictionAvoidance.tips.${key}`)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
