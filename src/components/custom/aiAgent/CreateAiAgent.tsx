import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Bot, Sparkles, MessageSquare, Plus, X, ArrowLeft, Settings, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { useState, useEffect } from "react";

import { useDispatch } from "react-redux";
import { createAIAgent } from "../../../features/aiAgent/aiAgentSlice";

import { fetchAiModelsByBusinessId } from "@/features/aiModel/trainModelSlice";
import { RootState, AppDispatch } from "../../../app/store";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const MAX_TEMPLATES = 5;

const agentSchema = z.object({
  name: z.string()
    .min(1, "Agent name is required")
    .refine((val) => {
      if (!val) return false;
      const trimmed = val.trim();
      return trimmed.length >= 2;
    }, {
      message: "Agent name must be at least 2 characters (after trimming spaces)"
    })
    .refine((val) => {
      if (!val) return true;
      const trimmed = val.trim();
      return trimmed.length <= 100;
    }, {
      message: "Agent name must be less than 100 characters"
    }),
  aiModel: z.string().min(1, "Select a model"),
  tone: z.enum(["friendly", "formal", "neutral"]),
  instruction: z.string().optional(),
  responseTemplates: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    )
    .max(MAX_TEMPLATES, `Maximum ${MAX_TEMPLATES} templates allowed`)
    .refine(
      (templates) => {
        // Allow empty templates, but if filled, both question and answer must be present
        if (!templates || templates.length === 0) return true;
        return templates.every(t => {
          const qTrimmed = (t.question || '').trim();
          const aTrimmed = (t.answer || '').trim();
          // Both empty is OK, or both filled is OK
          return (!qTrimmed && !aTrimmed) || (qTrimmed && aTrimmed);
        });
      },
      { message: "If a template is filled, both question and answer are required" }
    ),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function CreateAiAgent() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  // Detect if dark mode is active
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  });
  
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      setIsDarkMode(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    mode: "onTouched", // Validate on blur/touch
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: {
      name: "",
      aiModel: "",
      tone: "friendly",
      instruction: "",
      responseTemplates: [{ question: "", answer: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "responseTemplates",
  });
  
  // Debug: Watch name value
  const watchedName = watch("name");
  useEffect(() => {
    if (watchedName !== undefined) {
      console.log('🔍 Agent name value:', {
        value: watchedName,
        type: typeof watchedName,
        length: watchedName?.length,
        trimmed: watchedName?.trim?.(),
        trimmedLength: watchedName?.trim?.()?.length,
        errors: errors.name
      });
    }
  }, [watchedName, errors.name]);

  const { aiModels } = useSelector((state: RootState) => state.trainModel);
  const {status} = useSelector((state: RootState) => state.aiAgent);

  useEffect(() => {
    dispatch(fetchAiModelsByBusinessId());
  }, [dispatch]);

  const onSubmit = async (data: AgentFormData) => {
    try {
      // Filter out empty templates before sending
      const validTemplates = data.responseTemplates.filter(
        (template) => template.question.trim() && template.answer.trim()
      );
      
      const formattedData = {
        name: data.name.trim(),
        aiModel: data.aiModel,
        tone: data.tone,
        instruction: data.instruction?.trim() || undefined,
        responseTemplates: validTemplates.length > 0 
          ? validTemplates.map((template) => `${template.question.trim()}: ${template.answer.trim()}`)
          : [],
      };
      
      const res: any = await dispatch(createAIAgent(formattedData)).unwrap();
      toast.success(res.message || 'Agent created successfully!');
       
      navigate('/main-menu/ai-agent/setup');

    } catch (err: any) {
      toast.error(`❌ ${err}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/main-menu/ai-agent/setup')}
              className="cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className={cn(
                "p-2 rounded-xl shrink-0",
                isDarkMode 
                  ? 'bg-gradient-to-br from-pink-500/30 to-primary/20 border border-primary/30' 
                  : 'bg-gradient-to-br from-pink-500/20 to-primary/10 border border-primary/20'
              )}>
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight truncate">
                {t('createAiAgentPage.title', 'Create AI Agent')}
              </h1>
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground ml-12 sm:ml-14">
            {t('createAiAgentPage.subtitle', 'Build a custom AI agent tailored to your business needs. Configure its personality, responses, and behavior.')}
          </p>
        </div>

        {/* Form Card */}
        <Card className={cn(
          "border",
          isDarkMode 
            ? 'bg-card border-border/60 shadow-lg shadow-black/10' 
            : 'bg-card border-border/80 shadow-md shadow-black/5'
        )}>
          <CardHeader className={cn(
            "pt-4 sm:pt-6 pb-3 sm:pb-4 px-4 sm:px-6 border-b",
            isDarkMode ? 'border-border/40' : 'border-border/60'
          )}>
            <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary shrink-0" />
              {t('createAiAgentPage.form.agentConfiguration', 'Agent Configuration')}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6 px-4 sm:px-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Agent Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary shrink-0" />
                  {t('createAiAgentPage.form.nameLabel', 'Agent Name')}
                </Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        id="name"
                        type="text"
                        {...field}
                        value={field.value || ''}
                        placeholder={t('createAiAgentPage.form.namePlaceholder', 'e.g., Customer Support Bot')}
                        className={cn(
                          "w-full h-11",
                          (errors.name || fieldState.error) && "border-destructive"
                        )}
                      />
                      {(errors.name || fieldState.error) && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.name?.message || fieldState.error?.message}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>

              {/* AI Model */}
              <div className="space-y-2">
                <Label htmlFor="aiModel" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  {t('createAiAgentPage.form.aiModelLabel', 'AI Model')}
                </Label>
                <Controller
                  name="aiModel"
                  control={control}
                  rules={{ required: "Select a model" }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setValue("aiModel", value, { shouldValidate: true });
                      }}
                    >
                      <SelectTrigger 
                        id="aiModel"
                        className={cn(
                          "w-full h-11",
                          errors.aiModel && "border-destructive"
                        )}
                      >
                        <SelectValue placeholder={t('createAiAgentPage.form.selectModel', 'Select a model')} />
                      </SelectTrigger>
                      <SelectContent>
                        {aiModels.map((model) => (
                          <SelectItem key={model._id} value={model._id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.aiModel && (
                  <p className="text-sm text-destructive mt-1">{errors.aiModel.message}</p>
                )}
              </div>

              {/* Communication Tone */}
              <div className="space-y-2">
                <Label htmlFor="tone" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                  {t('createAiAgentPage.form.toneLabel', 'Communication Tone')}
                </Label>
                <Controller
                  name="tone"
                  control={control}
                  rules={{ required: "Select a tone" }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setValue("tone", value as "friendly" | "formal" | "neutral", { shouldValidate: true });
                      }}
                    >
                      <SelectTrigger 
                        id="tone"
                        className={cn(
                          "w-full h-11",
                          errors.tone && "border-destructive"
                        )}
                      >
                        <SelectValue placeholder={t('createAiAgentPage.form.selectTone', 'Select a tone')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">{t('createAiAgentPage.form.tones.friendly', 'Friendly')}</SelectItem>
                        <SelectItem value="formal">{t('createAiAgentPage.form.tones.formal', 'Formal')}</SelectItem>
                        <SelectItem value="neutral">{t('createAiAgentPage.form.tones.neutral', 'Neutral')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tone && (
                  <p className="text-sm text-destructive mt-1">{errors.tone.message}</p>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instruction" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  {t('createAiAgentPage.form.instructionLabel', 'Instructions')}
                  <span className="text-xs text-muted-foreground font-normal">({t('createAiAgentPage.form.optional', 'Optional')})</span>
                </Label>
                <Textarea
                  id="instruction"
                  {...register("instruction", {
                    validate: (value) => {
                      if (!value || value.trim() === "") return true; // Optional
                      if (value.trim().length < 5) return "Instruction must be at least 5 characters";
                      return true;
                    }
                  })}
                  placeholder={t('createAiAgentPage.form.instructionPlaceholder', 'Enter specific instructions for your AI agent (e.g., Always be helpful, provide accurate information, etc.)')}
                  className={cn(
                    "w-full min-h-[120px]",
                    errors.instruction && "border-destructive"
                  )}
                />
                {errors.instruction && (
                  <p className="text-sm text-destructive mt-1">{errors.instruction.message}</p>
                )}
              </div>

              {/* Response Templates Section */}
              <div className={cn(
                "space-y-4 pt-6 border-t",
                isDarkMode ? 'border-border/40' : 'border-border/60'
              )}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <Label className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                    {t('createAiAgentPage.form.defaultQaResponses', 'Default Q&A Responses')}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {t('createAiAgentPage.form.templatesCount', '{{count}} / {{max}}', { count: fields.length, max: MAX_TEMPLATES })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('createAiAgentPage.form.templatesDescription', 'Add common questions and answers to help your agent respond quickly to frequent inquiries.')}
                </p>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card
                      key={field.id}
                      className={cn(
                        "relative",
                        isDarkMode 
                          ? 'bg-muted/30 border-border/40' 
                          : 'bg-muted/20 border-border/60'
                      )}
                    >
                      <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6 px-4 sm:px-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                              isDarkMode 
                                ? 'bg-primary/30 text-primary border border-primary/30' 
                                : 'bg-primary/20 text-primary border border-primary/20'
                            )}>
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {t('createAiAgentPage.form.templateLabel', 'Template #{{index}}', { index: index + 1 })}
                            </span>
                          </div>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-4">
                          {/* Question */}
                          <div className="space-y-2">
                            <Label 
                              htmlFor={`question-${index}`}
                              className="text-sm font-medium text-foreground"
                            >
                              {t('createAiAgentPage.form.questionLabel', 'Question')}
                            </Label>
                            <Controller
                              name={`responseTemplates.${index}.question`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <Input
                                    id={`question-${index}`}
                                    type="text"
                                    {...field}
                                    value={field.value || ''}
                                    placeholder={t('createAiAgentPage.form.questionPlaceholder', 'e.g., What is your return policy?')}
                                    className={cn(
                                      "w-full h-11",
                                      (errors.responseTemplates?.[index]?.question || fieldState.error) && "border-destructive"
                                    )}
                                  />
                                  {(errors.responseTemplates?.[index]?.question || fieldState.error) && (
                                    <p className="text-sm text-destructive mt-1">
                                      {errors.responseTemplates?.[index]?.question?.message || fieldState.error?.message}
                                    </p>
                                  )}
                                </>
                              )}
                            />
                          </div>
                          
                          {/* Answer */}
                          <div className="space-y-2">
                            <Label 
                              htmlFor={`answer-${index}`}
                              className="text-sm font-medium text-foreground"
                            >
                              {t('createAiAgentPage.form.answerLabel', 'Answer')}
                            </Label>
                            <Controller
                              name={`responseTemplates.${index}.answer`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <Textarea
                                    id={`answer-${index}`}
                                    {...field}
                                    value={field.value || ''}
                                    placeholder={t('createAiAgentPage.form.answerPlaceholder', 'Enter the answer for this question...')}
                                    className={cn(
                                      "w-full min-h-[100px]",
                                      (errors.responseTemplates?.[index]?.answer || fieldState.error) && "border-destructive"
                                    )}
                                  />
                                  {(errors.responseTemplates?.[index]?.answer || fieldState.error) && (
                                    <p className="text-sm text-destructive mt-1">
                                      {errors.responseTemplates?.[index]?.answer?.message || fieldState.error?.message}
                                    </p>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {fields.length < MAX_TEMPLATES && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ question: "", answer: "" })}
                    className="w-full cursor-pointer border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('createAiAgentPage.form.addAnotherTemplate', 'Add Another Q&A Template')}
                  </Button>
                )}
              </div>

              {/* Form Actions */}
              <div className={cn(
                "flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t",
                isDarkMode ? 'border-border/40' : 'border-border/60'
              )}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/main-menu/ai-agent/setup')}
                  className="cursor-pointer w-full sm:w-auto order-2 sm:order-1"
                >
                  {t('createAiAgentPage.form.cancelButton', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 cursor-pointer w-full sm:w-auto order-1 sm:order-2"
                >
                  {status === 'loading' ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      {t('createAiAgentPage.form.creatingButton', 'Creating...')}
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      {t('createAiAgentPage.form.createButton', 'Create Agent')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
