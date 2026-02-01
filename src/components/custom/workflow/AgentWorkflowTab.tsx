import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { useTranslation } from 'react-i18next';
import { Workflow, Plus, Edit, Trash2, MessageSquare, Globe, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchWorkflows,
  createWorkflowThunk,
  updateWorkflowThunk,
  deleteWorkflowThunk,
  seedDemoWorkflowThunk,
  ConversationWorkflow,
  WorkflowLanguageContent,
} from '@/features/workflow/workflowSlice';
import { fetchChannels } from '@/features/channel/channelSlice';
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ComponentSkeleton from '@/components/skeleton/ComponentSkeleton';

const ASK_LANGUAGE_STEP = {
  id: 'ask_language',
  type: 'ask_question' as const,
  nextStepId: 'welcome',
  branches: [
    { value: 'en', nextStepId: 'welcome' },
    { value: 'es', nextStepId: 'welcome' },
    { value: 'bn', nextStepId: 'welcome' },
  ],
  defaultNextStepId: 'welcome',
};

// Fixed menu options only: General, Product, Quotation. Rest = business channels (human agent: transfer if online, else ticket for that channel).
const FIXED_CATEGORY_OPTIONS = [
  { value: 'general', labelKey: 'general' },
  { value: 'product', labelKey: 'product' },
  { value: 'quotation', labelKey: 'quotation' },
];

const DEFAULT_STEPS = [
  ASK_LANGUAGE_STEP,
  { id: 'welcome', type: 'send_message' as const, nextStepId: 'ask_category' },
  {
    id: 'ask_category',
    type: 'ask_question' as const,
    nextStepId: 'end',
    branches: [
      { value: 'general', nextStepId: 'end' },
      { value: 'product', nextStepId: 'tag_product' },
      { value: 'quotation', nextStepId: 'tag_quotation' },
    ],
    defaultNextStepId: 'end',
  },
  { id: 'tag_product', type: 'update_tag' as const, nextStepId: 'end', config: { tags: ['product'] } },
  { id: 'tag_quotation', type: 'update_tag' as const, nextStepId: 'end', config: { tags: ['quotation'] } },
];

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
];

const ASK_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'bn', label: 'বাংলা' },
];

const DEFAULT_TRANSLATIONS: Record<string, WorkflowLanguageContent> = {
  es: {
    steps: {
      ask_language: { message: '¿En qué idioma desea continuar?', options: ASK_LANGUAGE_OPTIONS },
      welcome: { message: '¡Hola! ¿En qué podemos ayudarte hoy?' },
      ask_category: {
        message: 'Elige una opción:',
        options: [
          { value: 'general', label: 'Consulta general' },
          { value: 'product', label: 'Productos' },
          { value: 'quotation', label: 'Cotización' },
        ],
      },
    },
  },
  en: {
    steps: {
      ask_language: { message: 'Which language would you like to continue in?', options: ASK_LANGUAGE_OPTIONS },
      welcome: { message: 'Hello! How can we help you today?' },
      ask_category: {
        message: 'Choose an option:',
        options: [
          { value: 'general', label: 'General' },
          { value: 'product', label: 'Products' },
          { value: 'quotation', label: 'Quotation' },
        ],
      },
    },
  },
  bn: {
    steps: {
      ask_language: { message: 'কোন ভাষায় চালিয়ে যেতে চান?', options: ASK_LANGUAGE_OPTIONS },
      welcome: { message: 'হ্যালো! আজ আমরা আপনাকে কীভাবে সাহায্য করতে পারি?' },
      ask_category: {
        message: 'একটি অপশন বেছে নিন:',
        options: [
          { value: 'general', label: 'সাধারণ' },
          { value: 'product', label: 'পণ্য' },
          { value: 'quotation', label: 'কোটেশন' },
        ],
      },
    },
  },
};

interface AgentWorkflowTabProps {
  businessId: string;
  agentId: string;
}

export default function AgentWorkflowTab({ businessId, agentId }: AgentWorkflowTabProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { workflows, status, error } = useSelector((state: RootState) => state.workflow);
  const { channels } = useSelector((state: RootState) => state.channel);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ConversationWorkflow | null>(null);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<'conversation_opened' | 'first_message'>('conversation_opened');
  const [active, setActive] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState('es');
  const [translations, setTranslations] = useState<Record<string, WorkflowLanguageContent>>(
    JSON.parse(JSON.stringify(DEFAULT_TRANSLATIONS))
  );
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (businessId && agentId) dispatch(fetchWorkflows({ businessId, agentId }));
  }, [businessId, agentId, dispatch]);

  useEffect(() => {
    dispatch(fetchChannels());
  }, [dispatch]);

  const channelNames = Array.isArray(channels) ? channels.map((c) => c.name) : [];

  const openCreate = () => {
    setEditingWorkflow(null);
    setName('');
    setTrigger('conversation_opened');
    setActive(true);
    setDefaultLanguage('es');
    setTranslations(JSON.parse(JSON.stringify(DEFAULT_TRANSLATIONS)));
    setIsModalOpen(true);
  };

  const openEdit = (w: ConversationWorkflow) => {
    try {
      setEditingWorkflow(w);
      setName(w.name ?? '');
      setTrigger(w.trigger ?? 'conversation_opened');
      setActive(w.active ?? true);
      setDefaultLanguage(w.defaultLanguage || 'es');
      const base = w.translations && typeof w.translations === 'object'
        ? JSON.parse(JSON.stringify(w.translations))
        : JSON.parse(JSON.stringify(DEFAULT_TRANSLATIONS));
      for (const lang of Object.keys(base)) {
        if (!(base[lang] as any)?.steps?.ask_language) {
          (base[lang] as any).steps = { ...(base[lang] as any)?.steps, ask_language: { message: (DEFAULT_TRANSLATIONS as any)[lang]?.steps?.ask_language?.message ?? 'Which language?', options: ASK_LANGUAGE_OPTIONS } };
        }
      }
      setTranslations(base);
      setIsModalOpen(true);
    } catch (e) {
      console.error('openEdit failed', e);
      toast.error(t('workflow.errorOpening') || 'Could not open workflow editor');
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !businessId || !agentId) {
      toast.error(t('workflow.nameRequired'));
      return;
    }
    // Fixed 3 (general, product, quotation) + business channels only
    const baseAskStep = DEFAULT_STEPS.find((s) => s.id === 'ask_category') as any;
    const channelBranches = channelNames.map((n) => ({ value: n, nextStepId: `tag_channel_${n}` }));
    const askCategoryStep = baseAskStep
      ? { ...baseAskStep, branches: [...(baseAskStep.branches ?? []), ...channelBranches] }
      : baseAskStep;
    const baseTagSteps = DEFAULT_STEPS.filter((s: any) => s.type === 'update_tag');
    const channelTagSteps = channelNames.map((n) => ({
      id: `tag_channel_${n}`,
      type: 'update_tag' as const,
      nextStepId: 'end',
      config: { tags: [n] },
    }));
    const steps = [
      DEFAULT_STEPS.find((s) => s.id === 'ask_language'),
      DEFAULT_STEPS.find((s) => s.id === 'welcome'),
      askCategoryStep,
      ...baseTagSteps,
      ...channelTagSteps,
    ].filter(Boolean);

    const defaultTr = DEFAULT_TRANSLATIONS as Record<string, WorkflowLanguageContent>;
    const translationsWithFixedOptions: Record<string, WorkflowLanguageContent> = {};
    for (const lang of Object.keys(translations)) {
      const tr = translations[lang];
      const fixedOptions = (defaultTr[lang]?.steps?.ask_category as any)?.options ?? FIXED_CATEGORY_OPTIONS.map((f) => ({ value: f.value, label: f.value }));
      const channelOptions = channelNames.map((n) => ({ value: n, label: n }));
      translationsWithFixedOptions[lang] = {
        ...tr,
        steps: {
          ...tr?.steps,
          ask_language: { message: (tr?.steps?.ask_language as any)?.message ?? (defaultTr[lang]?.steps?.ask_language as any)?.message ?? 'Which language?', options: ASK_LANGUAGE_OPTIONS },
          ask_category: { ...(tr?.steps?.ask_category as any), message: (tr?.steps?.ask_category as any)?.message ?? '', options: [...fixedOptions, ...channelOptions] },
        },
      };
    }

    const basePayload = {
      name: name.trim(),
      trigger,
      active,
      defaultLanguage,
      steps,
      translations: translationsWithFixedOptions,
    };
    if (editingWorkflow) {
      dispatch(
        updateWorkflowThunk({ businessId, workflowId: editingWorkflow._id, data: basePayload })
      )
        .unwrap()
        .then(() => {
          toast.success(t('workflow.updated'));
          setIsModalOpen(false);
          dispatch(fetchWorkflows({ businessId, agentId }));
        })
        .catch((err) => toast.error(err));
    } else {
      dispatch(createWorkflowThunk({ businessId, data: { ...basePayload, agentId } }))
        .unwrap()
        .then(() => {
          toast.success(t('workflow.created'));
          setIsModalOpen(false);
          dispatch(fetchWorkflows({ businessId, agentId }));
        })
        .catch((err) => toast.error(err));
    }
  };

  const handleDelete = () => {
    if (!editingWorkflow || !businessId) return;
    dispatch(deleteWorkflowThunk({ businessId, workflowId: editingWorkflow._id }))
      .unwrap()
      .then(() => {
        toast.success(t('workflow.deleted'));
        setIsDeleteOpen(false);
        setEditingWorkflow(null);
        setIsModalOpen(false);
        dispatch(fetchWorkflows({ businessId, agentId }));
      })
      .catch((err) => toast.error(err));
  };

  const handleSeedDemo = () => {
    setSeeding(true);
    dispatch(seedDemoWorkflowThunk({ businessId, agentId }))
      .unwrap()
      .then(() => {
        toast.success(t('workflow.seedSuccess'));
        dispatch(fetchWorkflows({ businessId, agentId }));
      })
      .catch((err) => toast.error(err))
      .finally(() => setSeeding(false));
  };

  const updateLangStep = (
    lang: string,
    stepId: string,
    field: 'message' | 'options',
    value: string | { value: string; label: string }[]
  ) => {
    setTranslations((prev) => {
      const next = { ...prev };
      if (!next[lang]) next[lang] = { steps: {} };
      if (!next[lang].steps[stepId]) next[lang].steps[stepId] = {};
      (next[lang].steps[stepId] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-xl">
          {t('workflow.agentTabDescShort')}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleSeedDemo} disabled={seeding} className="text-muted-foreground">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {t('workflow.seedDemo')}
          </Button>
          <Button onClick={openCreate} className="bg-pink-500 hover:bg-pink-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            {t('workflow.addWorkflow')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {status === 'loading' && workflows.length === 0 ? (
        <ComponentSkeleton />
      ) : workflows.length === 0 ? (
        <div className="border rounded-xl p-12 text-center text-muted-foreground">
          <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('workflow.noWorkflows')}</p>
          <Button onClick={openCreate} variant="outline" className="mt-4">
            {t('workflow.addWorkflow')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((w) => (
            <div
              key={w._id}
              className="border rounded-xl p-4 flex items-center justify-between hover:bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('workflow.trigger')}: {w.trigger === 'conversation_opened' ? t('workflow.triggerOpened') : t('workflow.triggerFirstMessage')}
                    {' · '}
                    <Globe className="inline h-3 w-3 mr-0.5" />
                    {w.defaultLanguage}
                    {w.active ? (
                      <span className="ml-2 text-green-600 dark:text-green-400">{t('workflow.active')}</span>
                    ) : (
                      <span className="ml-2 text-muted-foreground">{t('workflow.inactive')}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(w)}>
                  <Edit className="h-4 w-4 mr-1" />
                  {t('workflow.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setEditingWorkflow(w);
                    setIsDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('workflow.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? t('workflow.editWorkflow') : t('workflow.createWorkflow')}
            </DialogTitle>
            <DialogDescription>{t('workflow.modalDescShort')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('workflow.name')}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('workflow.namePlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
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
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-input bg-muted/30 px-4 py-3">
              <Label className="text-sm font-medium">{t('workflow.activeLabel')}</Label>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('workflow.triggerLabel')}</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as 'conversation_opened' | 'first_message')}
              >
                <option value="conversation_opened">{t('workflow.triggerOpened')}</option>
                <option value="first_message">{t('workflow.triggerFirstMessage')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('workflow.translations')}</Label>
              <Tabs value={defaultLanguage} onValueChange={(v) => setDefaultLanguage(v as 'es' | 'en' | 'bn')} className="mt-1">
                <TabsList className="w-full">
                  {LANGUAGES.map((l) => (
                    <TabsTrigger key={l.code} value={l.code}>{l.label}</TabsTrigger>
                  ))}
                </TabsList>
                {LANGUAGES.map((lang) => (
                  <TabsContent key={lang.code} value={lang.code} className="space-y-3 pt-3">
                    <div>
                      <Label className="text-xs font-medium">{t('workflow.askLanguageMessage')}</Label>
                      <Input
                        className="mt-1"
                        value={translations[lang.code]?.steps?.ask_language?.message ?? ''}
                        onChange={(e) => updateLangStep(lang.code, 'ask_language', 'message', e.target.value)}
                        placeholder={lang.code === 'es' ? '¿En qué idioma desea continuar?' : lang.code === 'bn' ? 'কোন ভাষায় চালিয়ে যেতে চান?' : 'Which language would you like to continue in?'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">{t('workflow.welcomeMessage')}</Label>
                      <Input
                        className="mt-1"
                        value={translations[lang.code]?.steps?.welcome?.message ?? ''}
                        onChange={(e) => updateLangStep(lang.code, 'welcome', 'message', e.target.value)}
                        placeholder={lang.code === 'es' ? '¡Hola! ¿En qué podemos ayudarte hoy?' : lang.code === 'bn' ? 'হ্যালো! কীভাবে সাহায্য করতে পারি?' : 'Hello! How can we help you today?'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">{t('workflow.askCategoryMessage')}</Label>
                      <Input
                        className="mt-1"
                        value={translations[lang.code]?.steps?.ask_category?.message ?? ''}
                        onChange={(e) => updateLangStep(lang.code, 'ask_category', 'message', e.target.value)}
                        placeholder={lang.code === 'es' ? 'Elige una opción:' : lang.code === 'bn' ? 'একটি অপশন বেছে নিন:' : 'Choose an option:'}
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <div>
              {editingWorkflow && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setEditingWorkflow(editingWorkflow);
                    setIsDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('workflow.delete')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                {t('workflow.cancel')}
              </Button>
              <Button onClick={handleSubmit}>
                {editingWorkflow ? t('workflow.save') : t('workflow.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('workflow.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('workflow.deleteConfirmDesc')}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('workflow.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('workflow.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
