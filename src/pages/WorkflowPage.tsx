import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { useTranslation } from 'react-i18next';
import { Workflow, Plus, Edit, Trash2, MessageSquare, Globe, HelpCircle, Phone, Bot, Users, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  fetchWorkflows,
  createWorkflowThunk,
  updateWorkflowThunk,
  deleteWorkflowThunk,
  ConversationWorkflow,
  WorkflowLanguageContent,
} from '@/features/workflow/workflowSlice';
import { fetchAiAgentsByBusinessId } from '@/features/aiAgent/aiAgentSlice';
import { fetchWhatsAppConnections } from '@/features/whatsappBusiness/whatsappBusinessSlice';
import { fetchUnipileConnections } from '@/features/unipile/unipileSlice';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ComponentSkeleton from '@/components/skeleton/ComponentSkeleton';
import { Card, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DEFAULT_STEPS = [
  { id: 'welcome', type: 'send_message' as const, nextStepId: 'ask_category' },
  {
    id: 'ask_category',
    type: 'ask_question' as const,
    nextStepId: 'end',
    branches: [
      { value: 'quotation', nextStepId: 'tag_quotation' },
      { value: 'technical', nextStepId: 'tag_technical' },
    ],
    defaultNextStepId: 'end',
  },
  { id: 'tag_quotation', type: 'update_tag' as const, nextStepId: 'end', config: { tags: ['quotation'] } },
  { id: 'tag_technical', type: 'update_tag' as const, nextStepId: 'end', config: { tags: ['technical'] } },
];

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
];

const DEFAULT_TRANSLATIONS: Record<string, WorkflowLanguageContent> = {
  es: {
    steps: {
      welcome: { message: '¡Hola! ¿En qué podemos ayudarte hoy?' },
      ask_category: {
        message: 'Elige una opción:',
        options: [
          { value: 'quotation', label: 'Cotización' },
          { value: 'technical', label: 'Problema técnico' },
        ],
      },
    },
  },
  en: {
    steps: {
      welcome: { message: 'Hello! How can we help you today?' },
        ask_category: {
          message: 'Choose an option:',
          options: [
            { value: 'quotation', label: 'Quotation' },
            { value: 'technical', label: 'Technical' },
          ],
        },
    },
  },
  bn: {
    steps: {
      welcome: { message: 'হ্যালো! আজ আমরা আপনাকে কীভাবে সাহায্য করতে পারি?' },
      ask_category: {
        message: 'একটি অপশন বেছে নিন:',
        options: [
          { value: 'quotation', label: 'কোটেশন' },
          { value: 'technical', label: 'টেকনিক্যাল' },
        ],
      },
    },
  },
};

export default function WorkflowPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const businessId = user?.businessId ?? '';
  const { workflows, status, error } = useSelector((state: RootState) => state.workflow);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ConversationWorkflow | null>(null);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<'conversation_opened' | 'first_message'>('conversation_opened');
  const [active, setActive] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState('es');
  const [translations, setTranslations] = useState<Record<string, WorkflowLanguageContent>>({
    ...JSON.parse(JSON.stringify(DEFAULT_TRANSLATIONS)),
  });

  useEffect(() => {
    if (businessId) dispatch(fetchWorkflows({ businessId }));
  }, [businessId, dispatch]);

  const openCreate = () => {
    setEditingWorkflow(null);
    setSelectedAgentId('');
    setSelectedChannelIds([]);
    setName('');
    setTrigger('conversation_opened');
    setActive(true);
    setDefaultLanguage('es');
    setTranslations(JSON.parse(JSON.stringify(DEFAULT_TRANSLATIONS)));
    if (businessId) {
      dispatch(fetchAiAgentsByBusinessId());
      dispatch(fetchWhatsAppConnections(undefined));
      dispatch(fetchUnipileConnections(undefined));
    }
    setIsModalOpen(true);
  };

  const openEdit = (w: ConversationWorkflow) => {
    try {
      if (businessId) {
        dispatch(fetchAiAgentsByBusinessId());
        dispatch(fetchWhatsAppConnections(undefined));
        dispatch(fetchUnipileConnections(undefined));
      }
      setEditingWorkflow(w);
      setName(w.name ?? '');
      setTrigger(w.trigger ?? 'conversation_opened');
      setActive(w.active ?? true);
      setDefaultLanguage(w.defaultLanguage || 'es');
      setSelectedAgentId(w.agentId ?? '');
      setSelectedChannelIds(Array.isArray(w.channelIds) ? [...w.channelIds] : []);
      setTranslations(
        w.translations && typeof w.translations === 'object'
          ? JSON.parse(JSON.stringify(w.translations))
          : JSON.parse(JSON.stringify(DEFAULT_TRANSLATIONS))
      );
      setIsModalOpen(true);
    } catch (e) {
      console.error('openEdit failed', e);
      toast.error(t('workflow.errorOpening') || 'Could not open workflow editor');
    }
  };

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const aiAgents = useSelector((state: RootState) => state.aiAgent?.aiAgents ?? []);
  const whatsappConnections = useSelector((state: RootState) => state.whatsappBusiness?.connections ?? []);
  const unipileConnections = useSelector((state: RootState) => state.unipile?.connections ?? []);

  const workflowChannels = useMemo(() => {
    const list: { id: string; label: string; source: 'whatsapp' | 'unipile' }[] = [];
    whatsappConnections.forEach((conn: { connectionId?: string; _id?: string; connectionName?: string; phoneNumber?: string }) => {
      const id = conn.connectionId || (conn as any)._id?.toString?.() || '';
      if (id) list.push({ id, label: conn.connectionName || conn.phoneNumber || id, source: 'whatsapp' });
    });
    unipileConnections
      .filter((c: { platform?: string }) => (c.platform || '').toLowerCase() === 'whatsapp')
      .forEach((conn: { _id?: string; connectionId?: string; id?: string; name?: string }) => {
        const id = (conn as any)._id || conn.id || conn.connectionId || '';
        if (id) list.push({ id, label: `${conn.name || 'WhatsApp'} (Unipile)`, source: 'unipile' });
      });
    return list;
  }, [whatsappConnections, unipileConnections]);

  const handleSubmit = () => {
    if (!name.trim() || !businessId) {
      toast.error(t('workflow.nameRequired'));
      return;
    }
    const basePayload = {
      name: name.trim(),
      trigger,
      active,
      defaultLanguage,
      steps: editingWorkflow?.steps ?? DEFAULT_STEPS,
      translations,
      channelIds: selectedChannelIds,
    };
    const agentIdValue = selectedAgentId?.trim() || null;
    if (editingWorkflow) {
      dispatch(
        updateWorkflowThunk({
          businessId,
          workflowId: editingWorkflow._id,
          data: { ...basePayload, agentId: agentIdValue },
        })
      )
        .unwrap()
        .then(() => {
          toast.success(t('workflow.updated'));
          setIsModalOpen(false);
        })
        .catch((err) => toast.error(err));
    } else {
      dispatch(
        createWorkflowThunk({
          businessId,
          data: { ...basePayload, agentId: agentIdValue || undefined },
        })
      )
        .unwrap()
        .then(() => {
          toast.success(t('workflow.created'));
          setIsModalOpen(false);
        })
        .catch((err) => toast.error(err));
    }
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const workflowId = editingWorkflow?._id;
    if (!workflowId || !businessId || isDeleting) return;
    setIsDeleting(true);
    dispatch(deleteWorkflowThunk({ businessId, workflowId }))
      .unwrap()
      .then(() => {
        toast.success(t('workflow.deleted'));
        setIsDeleteOpen(false);
        setEditingWorkflow(null);
        setIsModalOpen(false);
      })
      .catch((err) => toast.error(err))
      .finally(() => setIsDeleting(false));
  };

  const updateLangStep = (lang: string, stepId: string, field: 'message' | 'options', value: string | { value: string; label: string }[]) => {
    setTranslations((prev) => {
      const next = { ...prev };
      if (!next[lang]) next[lang] = { steps: {} };
      if (!next[lang].steps[stepId]) next[lang].steps[stepId] = {};
      (next[lang].steps[stepId] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  if (!businessId) {
      return (
      <div className="p-6 text-muted-foreground">
        {t('workflow.noBusiness')}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('workflow.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            {t('workflow.subtitle')}
            {t('workflow.subtitleHybrid') || ' Workflows can run without an AI agent (human-only). Add an agent in edit to enable AI replies on website and WhatsApp.'}
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[var(--accent-color)] hover:opacity-90 text-white shadow-md shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {t('workflow.addWorkflow')}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          {error}
        </div>
      )}

      {status === 'loading' && workflows.length === 0 ? (
        <ComponentSkeleton />
      ) : workflows.length === 0 ? (
        <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/20 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-2xl bg-[var(--accent-color)]/10 p-6 mb-6">
              <Workflow className="h-14 w-14 text-[var(--accent-color)]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{t('workflow.noWorkflows')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              {t('workflow.subtitle')} {t('workflow.subtitleHybrid') || 'Create your first workflow to automate conversations.'}
            </p>
            <Button onClick={openCreate} className="bg-[var(--accent-color)] hover:opacity-90 text-white shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              {t('workflow.addWorkflow')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
          {workflows.map((w) => (
            <Card
              key={w._id}
              className="group border bg-card shadow-sm hover:shadow-md hover:border-[var(--accent-color)]/30 transition-all duration-200 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-stretch">
                <div className="flex flex-1 min-w-0 p-5">
                  <div className="flex items-start gap-4 w-full">
                    <div className="shrink-0 rounded-xl bg-gradient-to-br from-[var(--accent-color)]/20 to-[var(--accent-color)]/5 p-3 ring-1 ring-[var(--accent-color)]/10">
                      <MessageSquare className="h-6 w-6 text-[var(--accent-color)]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate pr-2">{w.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant={w.active ? 'default' : 'secondary'} className="text-xs font-medium">
                          {w.active ? t('workflow.active') : t('workflow.inactive')}
                        </Badge>
                        {w.agentId ? (
                          <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                            <Bot className="h-3 w-3 mr-0.5" />
                            {t('workflow.withAI', 'With AI')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                            <Users className="h-3 w-3 mr-0.5" />
                            {t('workflow.humanOnly', 'Human only')}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-0.5" />
                          {w.trigger === 'conversation_opened' ? t('workflow.triggerOpened') : t('workflow.triggerFirstMessage')}
                        </Badge>
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {w.defaultLanguage}
                        </span>
                        {(w.channelIds?.length ?? 0) > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Phone className="h-3 w-3 mr-0.5" />
                            {t('workflow.channelsCount', '{{count}} channel(s)', { count: w.channelIds!.length })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <CardFooter className="flex flex-row sm:flex-col justify-end gap-2 p-4 sm:p-5 sm:border-l border-t sm:border-t-0 bg-muted/20 sm:bg-transparent">
                  <Button variant="outline" size="sm" onClick={() => openEdit(w)} className="w-full sm:w-auto">
                    <Edit className="h-4 w-4 mr-1.5" />
                    {t('workflow.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                    onClick={() => {
                      setEditingWorkflow(w);
                      setIsDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    {t('workflow.delete')}
                  </Button>
                </CardFooter>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[100]">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">
              {editingWorkflow ? t('workflow.editWorkflow') : t('workflow.createWorkflow')}
            </DialogTitle>
            <DialogDescription>
              {t('workflow.modalDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Section: Overview */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <div className="rounded-lg bg-[var(--accent-color)]/10 p-1.5">
                  <Zap className="h-4 w-4 text-[var(--accent-color)]" />
                </div>
                {t('workflow.overview', 'Overview')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('workflow.name')}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('workflow.namePlaceholder')}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('workflow.defaultLanguage')}</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">{t('workflow.defaultLanguageHelp')}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  {t('workflow.triggerLabel')}
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as 'conversation_opened' | 'first_message')}
                >
                  <option value="conversation_opened">{t('workflow.triggerOpened')}</option>
                  <option value="first_message">{t('workflow.triggerFirstMessage')}</option>
                </select>
                <p className="text-xs text-muted-foreground">{t('workflow.triggerHelp')}</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-input bg-background/50 px-4 py-3">
                <div>
                  <Label className="text-sm font-medium">{t('workflow.activeLabel')}</Label>
                  <p className="text-xs text-muted-foreground">{t('workflow.activeHelp')}</p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            </div>

            {/* Section: Channels & AI */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <div className="rounded-lg bg-[var(--accent-color)]/10 p-1.5">
                  <MessageSquare className="h-4 w-4 text-[var(--accent-color)]" />
                </div>
                {t('workflow.channelsAndAgent', 'Channels & AI Agent')}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('workflow.agentLabel')} ({t('workflow.optional', 'Optional')})</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  <option value="">{t('workflow.noAgent', 'No agent (human-only workflow)')}</option>
                  {aiAgents.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {t('workflow.agentHelpOptional', 'Leave empty for human/ticket only. Add an AI agent later to enable AI replies in this workflow.')}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {t('workflow.channelsLabel', 'Channels (where this workflow runs)')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('workflow.channelsHelp', 'Select WhatsApp connections (direct or via Unipile) that will use this workflow. Leave empty to use only on website widget or when assigned from a channel.')}
                </p>
                <div className="rounded-lg border border-input bg-background/50 p-3 space-y-2 max-h-36 overflow-y-auto">
                  {workflowChannels.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('workflow.noChannels', 'No WhatsApp connections. Add one in Integrations → WhatsApp or Unipile (WhatsApp).')}</p>
                  ) : (
                    workflowChannels.map(({ id, label }) => {
                      const checked = selectedChannelIds.includes(id);
                      return (
                        <label key={id} className="flex items-center gap-2.5 cursor-pointer text-sm rounded-md hover:bg-muted/50 px-2 py-1.5 -mx-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedChannelIds((prev) =>
                                prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
                              );
                            }}
                            className="rounded border-input size-4"
                          />
                          <span className="truncate">{label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Section: Messages (Translations) */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <div className="rounded-lg bg-[var(--accent-color)]/10 p-1.5">
                  <Globe className="h-4 w-4 text-[var(--accent-color)]" />
                </div>
                {t('workflow.translations')}
              </div>
              <p className="text-xs text-muted-foreground">{t('workflow.translationsHelp')}</p>
              <Tabs value={defaultLanguage} onValueChange={(v) => setDefaultLanguage(v as 'es' | 'en' | 'bn')} className="mt-1">
                <TabsList className="w-full grid grid-cols-3">
                  {LANGUAGES.map((l) => (
                    <TabsTrigger key={l.code} value={l.code}>{l.label}</TabsTrigger>
                  ))}
                </TabsList>
                {LANGUAGES.map((lang) => (
                  <TabsContent key={lang.code} value={lang.code} className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('workflow.welcomeMessage')}</Label>
                      <p className="text-xs text-muted-foreground">{t('workflow.welcomeMessageHelp')}</p>
                      <Input
                        value={translations[lang.code]?.steps?.welcome?.message ?? ''}
                        onChange={(e) => updateLangStep(lang.code, 'welcome', 'message', e.target.value)}
                        placeholder={lang.code === 'es' ? '¡Hola! ¿En qué podemos ayudarte hoy?' : lang.code === 'bn' ? 'হ্যালো! কীভাবে সাহায্য করতে পারি?' : 'Hello! How can we help you today?'}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('workflow.askCategoryMessage')}</Label>
                      <p className="text-xs text-muted-foreground">{t('workflow.askCategoryMessageHelp')}</p>
                      <Input
                        value={translations[lang.code]?.steps?.ask_category?.message ?? ''}
                        onChange={(e) => updateLangStep(lang.code, 'ask_category', 'message', e.target.value)}
                        placeholder={lang.code === 'es' ? 'Elige una opción:' : lang.code === 'bn' ? 'একটি অপশন বেছে নিন:' : 'Choose an option:'}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('workflow.categoryOptions')}</Label>
                      <p className="text-xs text-muted-foreground">{t('workflow.categoryOptionsHelp')}</p>
                      <textarea
                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                        value={(translations[lang.code]?.steps?.ask_category?.options ?? [])
                          .map((o) => `${o.value}|${o.label}`)
                          .join('\n')}
                        onChange={(e) => {
                          const lines = e.target.value.split('\n').filter(Boolean);
                          const options = lines.map((line) => {
                            const [value, label] = line.split('|').map((s) => s.trim());
                            return { value: value || 'option', label: label || value || 'Option' };
                          });
                          if (options.length === 0) options.push({ value: 'quotation', label: 'Quotation' });
                          updateLangStep(lang.code, 'ask_category', 'options', options);
                        }}
                        placeholder={t('workflow.optionsPlaceholder')}
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {editingWorkflow && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setEditingWorkflow(editingWorkflow);
                    setIsDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {t('workflow.delete')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                {t('workflow.cancel')}
              </Button>
              <Button onClick={handleSubmit} className="bg-[var(--accent-color)] hover:opacity-90 text-white">
                {editingWorkflow ? t('workflow.save') : t('workflow.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('workflow.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('workflow.deleteConfirmDesc')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('workflow.cancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={(e) => handleDelete(e)}
            >
              {isDeleting ? t('workflow.deleting') || 'Deleting...' : t('workflow.delete')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
