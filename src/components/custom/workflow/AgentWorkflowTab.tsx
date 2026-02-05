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

const DEFAULT_STEPS = [
  ASK_LANGUAGE_STEP,
  { id: 'welcome', type: 'send_message' as const, nextStepId: 'ask_channel' },
  {
    id: 'ask_channel',
    type: 'ask_question' as const,
    nextStepId: 'end',
    branches: [
      { value: 'Sales', nextStepId: 'ask_sales_options' },
      { value: 'Support', nextStepId: 'ask_support_options' },
      { value: 'Technical', nextStepId: 'ask_technical_options' },
    ],
    defaultNextStepId: 'end',
  },
  {
    id: 'ask_sales_options',
    type: 'ask_question' as const,
    nextStepId: 'end',
    branches: [
      { value: 'product', nextStepId: 'assign_sales' },
      { value: 'general', nextStepId: 'end' },
      { value: 'transfer_to_human', nextStepId: 'assign_sales' },
    ],
  },
  {
    id: 'ask_support_options',
    type: 'ask_question' as const,
    nextStepId: 'end',
    branches: [
      { value: 'product', nextStepId: 'assign_support' },
      { value: 'general', nextStepId: 'end' },
      { value: 'transfer_to_human', nextStepId: 'assign_support' },
    ],
  },
  {
    id: 'ask_technical_options',
    type: 'ask_question' as const,
    nextStepId: 'end',
    branches: [
      { value: 'product', nextStepId: 'assign_technical' },
      { value: 'general', nextStepId: 'end' },
      { value: 'transfer_to_human', nextStepId: 'assign_technical' },
    ],
  },
  {
    id: 'ask_product_intent',
    type: 'ask_question' as const,
    nextStepId: 'end',
    branches: [
      { value: 'quotation', nextStepId: 'tag_quotation' },
      { value: 'product', nextStepId: 'tag_product' },
    ],
    defaultNextStepId: 'end',
  },
  { id: 'assign_sales', type: 'assign_to' as const, nextStepId: 'end', config: { channelName: 'Sales' } },
  { id: 'assign_support', type: 'assign_to' as const, nextStepId: 'end', config: { channelName: 'Support' } },
  { id: 'assign_technical', type: 'assign_to' as const, nextStepId: 'end', config: { channelName: 'Technical' } },
  { id: 'tag_product', type: 'update_tag' as const, nextStepId: 'end', config: { tags: ['product'] } },
  { id: 'tag_quotation', type: 'update_tag' as const, nextStepId: 'end', config: { tags: ['quotation'] } },
];

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Santiago', // Chile
  'Europe/London',
  'Europe/Paris',
  'Asia/Dhaka',
  'Asia/Kolkata',
  'Asia/Dubai',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const defaultBusinessHoursSchedule = (): { dayOfWeek: number; start: string; end: string }[] =>
  [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: '09:00', end: '17:00' }));

const ASK_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'bn', label: 'বাংলা' },
];

const DEFAULT_CHANNEL_OPTIONS = [
  { value: 'Sales', label: 'Sales' },
  { value: 'Support', label: 'Support' },
  { value: 'Technical', label: 'Technical' },
];

const DEFAULT_SUB_OPTIONS_ES = [
  { value: 'product', label: 'Productos e información' },
  { value: 'general', label: 'Consulta general' },
  { value: 'transfer_to_human', label: 'Hablar con un agente' },
];
const DEFAULT_SUB_OPTIONS_EN = [
  { value: 'product', label: 'Products & info' },
  { value: 'general', label: 'General inquiry' },
  { value: 'transfer_to_human', label: 'Talk to an agent' },
];
const DEFAULT_SUB_OPTIONS_BN = [
  { value: 'product', label: 'পণ্য ও তথ্য' },
  { value: 'general', label: 'সাধারণ জিজ্ঞাসা' },
  { value: 'transfer_to_human', label: 'এজেন্টের সাথে কথা বলুন' },
];

const DEFAULT_PRODUCT_INTENT_OPTIONS_ES = [
  { value: 'quotation', label: 'Solicitar cotización' },
  { value: 'product', label: 'Solo información de productos' },
];
const DEFAULT_PRODUCT_INTENT_OPTIONS_EN = [
  { value: 'quotation', label: 'Get a quote' },
  { value: 'product', label: 'Just product info' },
];
const DEFAULT_PRODUCT_INTENT_OPTIONS_BN = [
  { value: 'quotation', label: 'কোটেশন নিতে চাই' },
  { value: 'product', label: 'শুধু পণ্যের তথ্য' },
];

const DEFAULT_TRANSLATIONS: Record<string, WorkflowLanguageContent> = {
  es: {
    steps: {
      ask_language: { message: '¿En qué idioma desea continuar?', options: ASK_LANGUAGE_OPTIONS },
      welcome: { message: '¡Hola! ¿En qué podemos ayudarte hoy?' },
      ask_channel: {
        message: 'Elige un departamento:',
        options: [
          { value: 'Sales', label: 'Ventas' },
          { value: 'Support', label: 'Soporte' },
          { value: 'Technical', label: 'Técnico' },
        ],
      },
      ask_sales_options: { message: '¿En qué podemos ayudarte?', options: DEFAULT_SUB_OPTIONS_ES },
      ask_support_options: { message: '¿En qué podemos ayudarte?', options: DEFAULT_SUB_OPTIONS_ES },
      ask_technical_options: { message: '¿En qué podemos ayudarte?', options: DEFAULT_SUB_OPTIONS_ES },
      ask_product_intent: { message: '¿Qué necesitas?', options: DEFAULT_PRODUCT_INTENT_OPTIONS_ES },
    },
  },
  en: {
    steps: {
      ask_language: { message: 'Which language would you like to continue in?', options: ASK_LANGUAGE_OPTIONS },
      welcome: { message: 'Hello! How can we help you today?' },
      ask_channel: {
        message: 'Choose a department:',
        options: DEFAULT_CHANNEL_OPTIONS,
      },
      ask_sales_options: { message: 'How can we help you?', options: DEFAULT_SUB_OPTIONS_EN },
      ask_support_options: { message: 'How can we help you?', options: DEFAULT_SUB_OPTIONS_EN },
      ask_technical_options: { message: 'How can we help you?', options: DEFAULT_SUB_OPTIONS_EN },
      ask_product_intent: { message: 'What do you need?', options: DEFAULT_PRODUCT_INTENT_OPTIONS_EN },
    },
  },
  bn: {
    steps: {
      ask_language: { message: 'কোন ভাষায় চালিয়ে যেতে চান?', options: ASK_LANGUAGE_OPTIONS },
      welcome: { message: 'হ্যালো! আজ আমরা আপনাকে কীভাবে সাহায্য করতে পারি?' },
      ask_channel: {
        message: 'ডিপার্টমেন্ট বেছে নিন:',
        options: [
          { value: 'Sales', label: 'সেলস' },
          { value: 'Support', label: 'সাপোর্ট' },
          { value: 'Technical', label: 'টেকনিক্যাল' },
        ],
      },
      ask_sales_options: { message: 'কীভাবে সাহায্য করতে পারি?', options: DEFAULT_SUB_OPTIONS_BN },
      ask_support_options: { message: 'কীভাবে সাহায্য করতে পারি?', options: DEFAULT_SUB_OPTIONS_BN },
      ask_technical_options: { message: 'কীভাবে সাহায্য করতে পারি?', options: DEFAULT_SUB_OPTIONS_BN },
      ask_product_intent: { message: 'কী চাইবেন?', options: DEFAULT_PRODUCT_INTENT_OPTIONS_BN },
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
  const [businessHours24_7, setBusinessHours24_7] = useState(true);
  const [businessHoursTimezone, setBusinessHoursTimezone] = useState('UTC');
  const [businessHoursSchedule, setBusinessHoursSchedule] = useState<{ dayOfWeek: number; start: string; end: string }[]>(defaultBusinessHoursSchedule());
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (businessId && agentId) dispatch(fetchWorkflows({ businessId, agentId }));
  }, [businessId, agentId, dispatch]);

  const updateScheduleSlot = (dayOfWeek: number, field: 'start' | 'end', value: string) => {
    setBusinessHoursSchedule((prev) => {
      const idx = prev.findIndex((s) => s.dayOfWeek === dayOfWeek);
      const next = [...prev];
      if (idx >= 0) {
        next[idx] = { ...next[idx], [field]: value };
      } else {
        next.push({ dayOfWeek, start: field === 'start' ? value : '09:00', end: field === 'end' ? value : '17:00' });
        next.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      }
      return next;
    });
  };

  const getScheduleSlot = (dayOfWeek: number) =>
    businessHoursSchedule.find((s) => s.dayOfWeek === dayOfWeek) ?? { dayOfWeek, start: '', end: '' };

  const openCreate = () => {
    setEditingWorkflow(null);
    setName('');
    setTrigger('conversation_opened');
    setActive(true);
    setDefaultLanguage('es');
    setTranslations(JSON.parse(JSON.stringify(DEFAULT_TRANSLATIONS)));
    setBusinessHours24_7(true);
    setBusinessHoursTimezone('UTC');
    setBusinessHoursSchedule(defaultBusinessHoursSchedule());
    setIsModalOpen(true);
  };

  const openEdit = (w: ConversationWorkflow) => {
    try {
      setEditingWorkflow(w);
      setName(w.name ?? '');
      setTrigger(w.trigger ?? 'conversation_opened');
      setActive(w.active ?? true);
      setDefaultLanguage(w.defaultLanguage || 'es');
      const bh = (w as any).businessHours;
      if (bh && bh.timezone) {
        setBusinessHours24_7(bh.enabled === false);
        setBusinessHoursTimezone(bh.timezone || 'UTC');
        setBusinessHoursSchedule(Array.isArray(bh.schedule) && bh.schedule.length ? bh.schedule : defaultBusinessHoursSchedule());
      } else {
        setBusinessHours24_7(true);
        setBusinessHoursTimezone('UTC');
        setBusinessHoursSchedule(defaultBusinessHoursSchedule());
      }
      const base = w.translations && typeof w.translations === 'object'
        ? JSON.parse(JSON.stringify(w.translations))
        : JSON.parse(JSON.stringify(DEFAULT_TRANSLATIONS));
      for (const lang of Object.keys(base)) {
        const def = (DEFAULT_TRANSLATIONS as any)[lang]?.steps;
        (base[lang] as any).steps = { ...(base[lang] as any)?.steps };
        if (!(base[lang] as any).steps.ask_language) {
          (base[lang] as any).steps.ask_language = { message: def?.ask_language?.message ?? 'Which language?', options: ASK_LANGUAGE_OPTIONS };
        }
        if (!(base[lang] as any).steps.ask_channel) {
          (base[lang] as any).steps.ask_channel = def?.ask_channel ?? { message: 'Choose a department:', options: DEFAULT_CHANNEL_OPTIONS };
        }
        ['ask_sales_options', 'ask_support_options', 'ask_technical_options'].forEach((stepId) => {
          if (!(base[lang] as any).steps[stepId]) {
            (base[lang] as any).steps[stepId] = def?.ask_sales_options ?? { message: 'How can we help you?', options: DEFAULT_SUB_OPTIONS_EN };
          }
        });
        if (!(base[lang] as any).steps.ask_product_intent) {
          (base[lang] as any).steps.ask_product_intent = def?.ask_product_intent ?? { message: 'What do you need?', options: DEFAULT_PRODUCT_INTENT_OPTIONS_EN };
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
    // Fixed 3-channel flow: ask_channel (Sales/Support/Technical) + ask_*_options (Product/General/Transfer). No dynamic channels.
    const steps = [...DEFAULT_STEPS];

    const defaultTr = DEFAULT_TRANSLATIONS as Record<string, WorkflowLanguageContent>;
    const translationsWithFixedOptions: Record<string, WorkflowLanguageContent> = {};
    for (const lang of Object.keys(translations)) {
      const tr = translations[lang];
      const channelOpts = (tr?.steps?.ask_channel as any)?.options ?? (defaultTr[lang]?.steps?.ask_channel as any)?.options ?? DEFAULT_CHANNEL_OPTIONS;
      const subOpts = (tr?.steps?.ask_sales_options as any)?.options ?? (defaultTr[lang]?.steps?.ask_sales_options as any)?.options ?? DEFAULT_SUB_OPTIONS_EN;
      const productIntentOpts = (tr?.steps?.ask_product_intent as any)?.options ?? (defaultTr[lang]?.steps?.ask_product_intent as any)?.options ?? DEFAULT_PRODUCT_INTENT_OPTIONS_EN;
      translationsWithFixedOptions[lang] = {
        ...tr,
        steps: {
          ...tr?.steps,
          ask_language: { message: (tr?.steps?.ask_language as any)?.message ?? (defaultTr[lang]?.steps?.ask_language as any)?.message ?? 'Which language?', options: ASK_LANGUAGE_OPTIONS },
          ask_channel: { message: (tr?.steps?.ask_channel as any)?.message ?? (defaultTr[lang]?.steps?.ask_channel as any)?.message ?? '', options: channelOpts },
          ask_sales_options: { message: (tr?.steps?.ask_sales_options as any)?.message ?? (defaultTr[lang]?.steps?.ask_sales_options as any)?.message ?? '', options: subOpts },
          ask_support_options: { message: (tr?.steps?.ask_support_options as any)?.message ?? (defaultTr[lang]?.steps?.ask_support_options as any)?.message ?? '', options: subOpts },
          ask_technical_options: { message: (tr?.steps?.ask_technical_options as any)?.message ?? (defaultTr[lang]?.steps?.ask_technical_options as any)?.message ?? '', options: subOpts },
          ask_product_intent: { message: (tr?.steps?.ask_product_intent as any)?.message ?? (defaultTr[lang]?.steps?.ask_product_intent as any)?.message ?? '', options: productIntentOpts },
        },
      };
    }

    const businessHoursPayload =
      businessHours24_7
        ? undefined
        : {
            timezone: businessHoursTimezone,
            enabled: true,
            schedule: businessHoursSchedule.filter((s) => s.start && s.end),
          };

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
        updateWorkflowThunk({
          businessId,
          workflowId: editingWorkflow._id,
          data: {
            ...basePayload,
            businessHours: businessHours24_7 ? null : businessHoursPayload ?? undefined,
          },
        })
      )
        .unwrap()
        .then(() => {
          toast.success(t('workflow.updated'));
          setIsModalOpen(false);
          dispatch(fetchWorkflows({ businessId, agentId }));
        })
        .catch((err) => toast.error(err));
    } else {
      dispatch(
        createWorkflowThunk({
          businessId,
          data: {
            ...basePayload,
            ...(businessHoursPayload && { businessHours: businessHoursPayload }),
            agentId,
          },
        })
      )
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
            <div className="space-y-3 rounded-lg border border-input bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('workflow.businessHours')}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t('workflow.businessHours24_7')}</span>
                  <Switch checked={businessHours24_7} onCheckedChange={setBusinessHours24_7} />
                </div>
              </div>
              {!businessHours24_7 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('workflow.businessHoursTimezone')}</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={businessHoursTimezone}
                      onChange={(e) => setBusinessHoursTimezone(e.target.value)}
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('workflow.businessHoursSchedule')}</Label>
                    <div className="grid gap-2 text-xs">
                      {DAY_NAMES.map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-8">{DAY_NAMES[i]}</span>
                          <Input
                            type="time"
                            className="h-8 w-28"
                            value={getScheduleSlot(i).start}
                            onChange={(e) => updateScheduleSlot(i, 'start', e.target.value)}
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            className="h-8 w-28"
                            value={getScheduleSlot(i).end}
                            onChange={(e) => updateScheduleSlot(i, 'end', e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
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
                      <Label className="text-xs font-medium">{t('workflow.askChannelMessage')}</Label>
                      <Input
                        className="mt-1"
                        value={translations[lang.code]?.steps?.ask_channel?.message ?? ''}
                        onChange={(e) => updateLangStep(lang.code, 'ask_channel', 'message', e.target.value)}
                        placeholder={lang.code === 'es' ? 'Elige un departamento:' : lang.code === 'bn' ? 'ডিপার্টমেন্ট বেছে নিন:' : 'Choose a department:'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">{t('workflow.askSubOptionsMessage')}</Label>
                      <Input
                        className="mt-1"
                        value={translations[lang.code]?.steps?.ask_sales_options?.message ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTranslations((prev) => {
                            const next = { ...prev };
                            if (!next[lang.code]) next[lang.code] = { steps: {} };
                            const steps = { ...next[lang.code].steps };
                            steps.ask_sales_options = { ...(steps.ask_sales_options as any), message: v };
                            steps.ask_support_options = { ...(steps.ask_support_options as any), message: v };
                            steps.ask_technical_options = { ...(steps.ask_technical_options as any), message: v };
                            next[lang.code] = { ...next[lang.code], steps };
                            return next;
                          });
                        }}
                        placeholder={lang.code === 'es' ? '¿En qué podemos ayudarte?' : lang.code === 'bn' ? 'কীভাবে সাহায্য করতে পারি?' : 'How can we help you?'}
                      />
                      <p className="text-xs text-muted-foreground mt-0.5">{t('workflow.askSubOptionsMessageHint')}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">{t('workflow.askProductIntentMessage')}</Label>
                      <Input
                        className="mt-1"
                        value={translations[lang.code]?.steps?.ask_product_intent?.message ?? ''}
                        onChange={(e) => updateLangStep(lang.code, 'ask_product_intent', 'message', e.target.value)}
                        placeholder={lang.code === 'es' ? '¿Qué necesitas?' : lang.code === 'bn' ? 'কী চাইবেন?' : 'What do you need?'}
                      />
                      <p className="text-xs text-muted-foreground mt-0.5">{t('workflow.askProductIntentMessageHint')}</p>
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
