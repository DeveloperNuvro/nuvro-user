import { useEffect, useState } from "react";
import { Loader2, Sparkles, Power, ArrowLeft, Cpu, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { fetchAIAgentById, toggleAIAgentStatus } from "@/features/aiAgent/aiAgentSlice";
import type { AgentDetailsPayload } from "@/features/aiAgent/aiAgentSlice";
import { useParams, Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "—";
  }
}

export default function SingleAiAgent() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const [isToggling, setIsToggling] = useState(false);
  const { selectedAgent, selectedAgentDetails, status: agentStatus } = useSelector(
    (state: RootState) => state.aiAgent
  );

  useEffect(() => {
    if (id) dispatch(fetchAIAgentById(id));
  }, [dispatch, id]);

  const handleToggleStatus = async () => {
    if (!id || !selectedAgent) return;
    setIsToggling(true);
    try {
      await dispatch(toggleAIAgentStatus(id)).unwrap();
      const status = selectedAgent.active ? "deactivated" : "activated";
      toast.success(t("singleAiAgentPage.toast.toggleSuccess", { status }));
    } catch (error: any) {
      toast.error(error || t("singleAiAgentPage.toast.toggleError"));
    } finally {
      setIsToggling(false);
    }
  };

  if (agentStatus === "loading" || agentStatus === "idle") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("singleAiAgentPage.loading")}</p>
      </div>
    );
  }

  const d: AgentDetailsPayload | null = selectedAgentDetails;
  const name = d?.basic?.name ?? selectedAgent?.name ?? t("singleAiAgentPage.title");
  const active = d?.basic?.active ?? selectedAgent?.active ?? false;
  const modelName = d?.aiModel?.name ?? (typeof selectedAgent?.aiModel === "object" ? selectedAgent.aiModel?.name : null);
  const createdAt = d?.basic?.createdAt;
  const workflowEnabled = d?.basic?.workflowEnabled ?? false;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Back */}
        <Link
          to="/main-menu/ai-agent/setup"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("singleAiAgentPage.backToAgents", "Back to AI Agents")}
        </Link>

        {/* Hero */}
        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">{name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("singleAiAgentPage.subtitle")}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    active
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {active ? t("singleAiAgentPage.active") : t("singleAiAgentPage.inactive")}
                </span>
                {workflowEnabled && (
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {t("singleAiAgentPage.workflowEnabled", "Workflow")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Toggle */}
          <div className="mt-6 flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <Power className={`h-5 w-5 shrink-0 ${active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
              <div>
                <Label htmlFor="agent-toggle" className="cursor-pointer text-sm font-medium text-foreground">
                  {t("singleAiAgentPage.agentStatus")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {active ? t("singleAiAgentPage.currentlyActive") : t("singleAiAgentPage.currentlyInactive")}
                </p>
              </div>
            </div>
            <button
              id="agent-toggle"
              type="button"
              onClick={handleToggleStatus}
              disabled={isToggling}
              aria-label={active ? "Deactivate agent" : "Activate agent"}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                active ? "bg-emerald-500" : "bg-muted-foreground/30"
              } ${isToggling ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Key details - minimal */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium text-foreground">{t("singleAiAgentPage.details.overview", "Overview")}</h2>
          <dl className="mt-4 space-y-4">
            {modelName && (
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground">{t("singleAiAgentPage.modelName", "Model")}</dt>
                  <dd className="text-sm font-medium text-foreground">{modelName}</dd>
                </div>
              </div>
            )}
            {createdAt && (
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 shrink-0 rounded bg-muted" />
                <div>
                  <dt className="text-xs text-muted-foreground">{t("singleAiAgentPage.created", "Created")}</dt>
                  <dd className="text-sm font-medium text-foreground">{formatDate(createdAt)}</dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        {/* Widget CTA */}
        <div className="mt-6">
          <Link
            to="/main-menu/widget"
            className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("singleAiAgentPage.widgetCta", "Add chat widget to your website")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("singleAiAgentPage.widgetCtaDesc", "Get the embed code from the Widget page")}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
