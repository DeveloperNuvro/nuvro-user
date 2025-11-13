import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import InputBox from "../inputbox/InputBox";
import CustomSelect from "../select/CustomSelect";
import CustomTextarea from "../textArea/CustomTextarea";
import ChatInbox from "../chatbotInbox/ChatInbox";
import toast from "react-hot-toast";
import { Bot, Sparkles, MessageSquare, Plus, X, ArrowLeft, Settings, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useState, useEffect } from "react";

import { useDispatch } from "react-redux";
import { createAIAgent } from "../../../features/aiAgent/aiAgentSlice";

import { fetchAiModelsByBusinessId } from "@/features/aiModel/trainModelSlice";
import { RootState, AppDispatch } from "../../../app/store";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const MAX_TEMPLATES = 5;

const agentSchema = z.object({
  name: z.string().min(2, "Agent name is required"),
  aiModel: z.string().nonempty("Select a model"),
  tone: z.enum(["friendly", "formal", "neutral"]),
  instruction: z.string().min(5, "Instruction must be at least 5 characters"),
  responseTemplates: z
    .array(
      z.object({
        question: z.string().min(1, "Question is required"),
        answer: z.string().min(1, "Answer is required"),
      })
    )
    .max(MAX_TEMPLATES, `Maximum ${MAX_TEMPLATES} templates allowed`),
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
    formState: { errors },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
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

  const { aiModels } = useSelector((state: RootState) => state.trainModel);
  const {status} = useSelector((state: RootState) => state.aiAgent);

  useEffect(() => {
    dispatch(fetchAiModelsByBusinessId());
  }, [dispatch]);

  const onSubmit = async (data: AgentFormData) => {
    try {
      const formattedData = {
        ...data,
        aiModel: data.aiModel,
        responseTemplates: data.responseTemplates.map(
          (template) => `${template.question}: ${template.answer}`
        ),
      };
      const res: any = await dispatch(createAIAgent(formattedData)).unwrap();
      toast.success(res.message || 'Agent created successfully!');
       
      navigate('/main-menu/ai-agent/setup');


    } catch (err: any) {
      toast.error(`❌ ${err}`);
    }
  };

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 md:p-8 lg:p-12 space-y-8">
      {/* Enhanced Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/main-menu/ai-agent/setup')}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-3">
              <div className={`
                p-2 rounded-xl
                ${isDarkMode 
                  ? 'bg-gradient-to-br from-pink-500/30 to-primary/20 border border-primary/30' 
                  : 'bg-gradient-to-br from-pink-500/20 to-primary/10 border border-primary/20'
                }
              `}>
                <Bot className="h-6 w-6 text-primary" />
              </div>
              {t('createAiAgentPage.title', 'Create AI Agent')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
              {t('createAiAgentPage.subtitle', 'Build a custom AI agent tailored to your business needs. Configure its personality, responses, and behavior.')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Form Panel */}
        <div className="space-y-6">
          <Card className={`
            border
            ${isDarkMode 
              ? 'bg-card border-border/60 shadow-lg shadow-black/10' 
              : 'bg-card border-border/80 shadow-md shadow-black/5'
            }
          `}>
            <CardHeader className={`
              pt-6 pb-4 border-b
              ${isDarkMode ? 'border-border/40' : 'border-border/60'}
            `}>
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                {t('createAiAgentPage.form.agentConfiguration', 'Agent Configuration')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    Agent Name
                  </label>
                  <InputBox 
                    label="" 
                    {...register("name")} 
                    error={errors.name?.message}
                    placeholder="e.g., Customer Support Bot"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Model
                  </label>
                  <CustomSelect
                    {...register("aiModel")}
                    options={aiModels.map((model) => ({
                      label: model.name,
                      value: model._id,
                    }))}
                    text="Select a model"
                    error={errors.aiModel?.message}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Communication Tone
                  </label>
                  <CustomSelect
                    text="Select a tone"
                    {...register("tone")}
                    options={[
                      { value: "friendly", label: "Friendly" },
                      { value: "formal", label: "Formal" },
                      { value: "neutral", label: "Neutral" },
                    ]}
                    error={errors.tone?.message}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Instructions
                  </label>
                  <CustomTextarea
                    {...register("instruction")}
                    placeholder="Enter specific instructions for your AI agent (e.g., Always be helpful, provide accurate information, etc.)"
                    error={errors.instruction?.message}
                  />
                </div>

                {/* Response Templates Section */}
                <div className={`
                  space-y-4 pt-6 border-t
                  ${isDarkMode ? 'border-border/40' : 'border-border/60'}
                `}>
                  <div className="flex items-center justify-between">
                    <label className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      {t('createAiAgentPage.form.defaultQaResponses', 'Default Q&A Responses')}
                    </label>
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
                        className={`
                          relative
                          ${isDarkMode 
                            ? 'bg-muted/30 border-border/40' 
                            : 'bg-muted/20 border-border/60'
                          }
                        `}
                      >
                        <CardContent className="pt-6 pb-6 px-4 sm:px-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                                ${isDarkMode 
                                  ? 'bg-primary/30 text-primary border border-primary/30' 
                                  : 'bg-primary/20 text-primary border border-primary/20'
                                }
                              `}>
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
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">
                                {t('createAiAgentPage.form.questionLabel', 'Question')}
                              </label>
                              <InputBox
                                label=""
                                {...register(`responseTemplates.${index}.question`)}
                                error={errors.responseTemplates?.[index]?.question?.message}
                                placeholder={t('createAiAgentPage.form.questionPlaceholder', 'e.g., What is your return policy?')}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">
                                {t('createAiAgentPage.form.answerLabel', 'Answer')}
                              </label>
                              <CustomTextarea
                                placeholder={t('createAiAgentPage.form.answerPlaceholder', 'Enter the answer for this question...')}
                                {...register(`responseTemplates.${index}.answer`)}
                                error={errors.responseTemplates?.[index]?.answer?.message}
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
                <div className={`
                  flex justify-end gap-4 pt-6 border-t
                  ${isDarkMode ? 'border-border/40' : 'border-border/60'}
                `}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/main-menu/ai-agent/setup')}
                    className="cursor-pointer"
                  >
                    {t('createAiAgentPage.form.cancelButton', 'Cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={status === 'loading'}
                    className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 cursor-pointer"
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

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card className={`
            border sticky top-8
            ${isDarkMode 
              ? 'bg-card border-border/60 shadow-lg shadow-black/10' 
              : 'bg-card border-border/80 shadow-md shadow-black/5'
            }
          `}>
            <CardHeader className={`
              pt-6 pb-4 border-b
              ${isDarkMode ? 'border-border/40' : 'border-border/60'}
            `}>
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Live Preview
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                See how your agent will appear to customers
              </p>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              <div className="h-[600px] rounded-lg overflow-hidden border border-border/40">
                <ChatInbox agentName="Nuvro AI Agent" setOpen={true} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
