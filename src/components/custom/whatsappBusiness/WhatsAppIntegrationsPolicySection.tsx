/**
 * Integrations → WhatsApp: policy copy + optional compliance summary.
 * Place in the WhatsApp tab (e.g. below connection list or in a "Policy" accordion).
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getWhatsAppComplianceSummary } from '@/api/chatApi';
import WhatsAppPolicyCopyBlock from './WhatsAppPolicyCopyBlock';
import { Button } from '@/components/ui/button';

interface WhatsAppIntegrationsPolicySectionProps {
  /** Show full policy text (optInFull, contentFull) */
  variant?: 'short' | 'full';
  /** Show "View compliance summary" expandable */
  showComplianceSummary?: boolean;
  className?: string;
}

interface ComplianceMeasure {
  id: string;
  description: string;
  detail: string;
  endpoints?: string[];
  codePaths?: string[];
}

interface ComplianceSummaryData {
  policyVersion: string;
  implementedMeasures: ComplianceMeasure[];
  references: Record<string, string>;
}

export const WhatsAppIntegrationsPolicySection = ({
  variant = 'short',
  showComplianceSummary = true,
  className = '',
}: WhatsAppIntegrationsPolicySectionProps) => {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState<ComplianceSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadSummary = async () => {
    if (summary) return;
    setSummaryLoading(true);
    try {
      const data = await getWhatsAppComplianceSummary();
      setSummary(data as ComplianceSummaryData);
    } catch (e) {
      console.error('Failed to load compliance summary', e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const toggleSummary = () => {
    setSummaryOpen((o) => !o);
    if (!summaryOpen && !summary) loadSummary();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <WhatsAppPolicyCopyBlock variant={variant} />

      {showComplianceSummary && (
        <div className="rounded-lg border border-border bg-card">
          <Button
            type="button"
            variant="ghost"
            className="flex w-full items-center justify-between px-4 py-3 text-left font-medium hover:bg-muted/50"
            onClick={toggleSummary}
          >
            <span className="text-sm">View compliance summary (for appeal / review)</span>
            {summaryOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          {summaryOpen && (
            <div className="border-t border-border px-4 pb-3 pt-2 text-sm">
              {summaryLoading && (
                <p className="text-muted-foreground">Loading…</p>
              )}
              {summary && !summaryLoading && (
                <div className="space-y-3">
                  <p className="text-muted-foreground">{summary.policyVersion}</p>
                  <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                    {summary.implementedMeasures?.map((m) => (
                      <li key={m.id}>
                        <span className="font-medium text-foreground">{m.description}</span>
                        : {m.detail}
                        {m.endpoints?.length ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({m.endpoints.slice(0, 2).join(', ')})
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {Object.entries(summary.references || {}).map(([k, v]) => (
                      <a
                        key={k}
                        href={v}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {k}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppIntegrationsPolicySection;
