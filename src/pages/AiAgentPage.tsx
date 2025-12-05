// src/pages/AiAgentPage.tsx

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Bot, Sparkles, MessageSquare, FileText, Settings, CheckCircle, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AppDispatch, RootState } from "@/app/store";
import { useTheme } from "@/components/theme-provider";
import { 
    AIAgent,
    fetchAiAgentsByBusinessId,
    editAIAgent,
    deleteAIAgent,
    clearSelectedAgent,
    EditAIAgentPayload 
} from "../features/aiAgent/aiAgentSlice";
import { fetchAiModelsByBusinessId } from "@/features/aiModel/trainModelSlice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; 
import toast from "react-hot-toast";


export default function AiAgentPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  const { 
    aiAgents, 
    status: agentStatus
  } = useSelector((state: RootState) => state.aiAgent);

  const { aiModels, status: modelStatus } = useSelector((state: RootState) => state.trainModel);

  const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'edit' | 'delete' | null; agent: AIAgent | null }>({ isOpen: false, mode: null, agent: null });
  const [formData, setFormData] = useState<Partial<AIAgent>>({});
  
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

  // 🔧 FIX: Always fetch agents on mount, and refetch if status is idle or if we have no agents
  useEffect(() => {
    // Fetch agents if:
    // 1. Status is idle (initial state)
    // 2. We have no agents (might have been cleared or failed to load)
    // 3. Status is failed (retry on mount)
    if (agentStatus === 'idle' || (agentStatus !== 'loading' && aiAgents.length === 0)) {
      dispatch(fetchAiAgentsByBusinessId());
    }
    // Fetch models if status is idle
    if (modelStatus === 'idle') {
      dispatch(fetchAiModelsByBusinessId());
    }
  }, [dispatch]); // Only depend on dispatch to run once on mount

  const handleAgentClick = (agent: AIAgent) => {
    navigate(`/main-menu/ai-agent/${agent._id}`);
  };

  const openModal = (mode: 'edit' | 'delete', agent: AIAgent) => {
    setModalState({ isOpen: true, mode, agent });

    if (mode === 'edit') {
      setFormData({
        _id: agent._id, name: agent.name,
        aiModel: typeof agent.aiModel === 'object' ? agent.aiModel._id : agent.aiModel,
        tone: agent.personality?.tone || agent.tone,
        instruction: agent.personality?.instruction || agent.instruction,
        active: agent.active
      });
    }
  };

  const closeModal = () => { 
    setModalState({ isOpen: false, mode: null, agent: null }); 
    setFormData({});
    dispatch(clearSelectedAgent());
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { 
    setFormData({ ...formData, [e.target.name]: e.target.value }); 
  };
  
  const handleSelectChange = (field: 'tone' | 'aiModel', value: string) => { 
    setFormData({ ...formData, [field]: value }); 
  };

  const handleEditSubmit = () => {
    if (!formData._id) return;
    toast.promise(
        dispatch(editAIAgent(formData as EditAIAgentPayload)).unwrap(),
        {
            loading: t('aiAgentPage.toast.updating'),
            success: () => { closeModal(); return t('aiAgentPage.toast.updateSuccess'); },
            error: (err) => err || t('aiAgentPage.toast.updateError')
        }
    );
  };
  
  const handleDeleteConfirm = () => {
    if (!modalState.agent?._id) return;
    toast.promise(
        dispatch(deleteAIAgent(modalState.agent._id)).unwrap(),
        {
            loading: t('aiAgentPage.toast.deleting'),
            success: () => { closeModal(); return t('aiAgentPage.toast.deleteSuccess'); },
            error: (err) => err || t('aiAgentPage.toast.deleteError')
        }
    );
  };
  

  // Calculate stats
  const totalAgents = aiAgents.length;
  const activeAgents = aiAgents.filter(a => a.active).length;
  const inactiveAgents = totalAgents - activeAgents;

  return (
    <div className="space-y-8 pb-8 p-4 sm:p-6 md:p-8">
      {/* Enhanced Header Section */}
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
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
              {t('aiAgentPage.title', 'AI Agents')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {t('aiAgentPage.subtitle', 'Manage and configure your AI agents. Create, edit, and deploy intelligent assistants for your business.')}
            </p>
          </div>
          <Link to="/main-menu/ai-agent/create">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer shrink-0 font-semibold">
              <Plus className="h-4 w-4" />
              {t('aiAgentPage.createButton') || 'Create Agent'}
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        {aiAgents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Total Agents */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-blue-500/20 via-blue-600/15 to-indigo-600/10 border-blue-500/30 hover:border-blue-400/50' 
                : 'bg-gradient-to-br from-blue-50 via-blue-100/50 to-indigo-50 border-blue-200/60 hover:border-blue-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-blue-500/30 border border-blue-400/30' 
                      : 'bg-blue-500/20 border border-blue-300/40'
                    }
                  `}>
                    <Bot className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{totalAgents}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600/80'}`}>
                  {t('aiAgentPage.stats.totalAgents', 'Total Agents')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-300'}`}></div>
            </div>

            {/* Active Agents */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-green-500/20 via-emerald-600/15 to-teal-600/10 border-green-500/30 hover:border-green-400/50' 
                : 'bg-gradient-to-br from-green-50 via-emerald-100/50 to-teal-50 border-green-200/60 hover:border-green-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-green-500/30 border border-green-400/30' 
                      : 'bg-green-500/20 border border-green-300/40'
                    }
                  `}>
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{activeAgents}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-green-300/80' : 'text-green-600/80'}`}>
                  {t('aiAgentPage.stats.activeAgents', 'Active Agents')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-green-400' : 'bg-green-300'}`}></div>
            </div>

            {/* Inactive Agents */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-gray-500/20 via-gray-600/15 to-slate-600/10 border-gray-500/30 hover:border-gray-400/50' 
                : 'bg-gradient-to-br from-gray-50 via-gray-100/50 to-slate-50 border-gray-200/60 hover:border-gray-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-500/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-gray-500/30 border border-gray-400/30' 
                      : 'bg-gray-500/20 border border-gray-300/40'
                    }
                  `}>
                    <XCircle className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{inactiveAgents}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-300/80' : 'text-gray-600/80'}`}>
                  {t('aiAgentPage.stats.inactiveAgents', 'Inactive Agents')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
            </div>
          </div>
        )}
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {agentStatus === "loading" && aiAgents.length === 0 && <AiAgentSkeleton />}
        {aiAgents?.map((agent) => {
          const firstWord = agent.name.split(" ")[0];
          const modelDetails = aiModels.find(m => m._id === (typeof agent.aiModel === 'object' ? agent?.aiModel._id : agent?.aiModel));
          const gradientColors = [
            'from-pink-500/90 to-rose-500/90',
            'from-blue-500/90 to-indigo-500/90',
            'from-purple-500/90 to-pink-500/90',
            'from-green-500/90 to-emerald-500/90',
            'from-orange-500/90 to-red-500/90',
            'from-cyan-500/90 to-blue-500/90',
          ];
          const colorIndex = agent.name.charCodeAt(0) % gradientColors.length;
          
          return (
            <div 
              key={agent._id} 
              className={`
                group rounded-2xl border transition-all duration-300 overflow-hidden relative
                ${isDarkMode 
                  ? 'bg-card border-border/60 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20' 
                  : 'bg-card border-border/80 shadow-md shadow-black/5 hover:shadow-lg hover:shadow-black/10'
                }
                hover:scale-[1.02]
              `}
            >
              <div onClick={() => handleAgentClick(agent)} className="cursor-pointer">
                <div className={`
                  h-[180px] flex items-center justify-center bg-gradient-to-br ${gradientColors[colorIndex]} text-white text-4xl font-bold tracking-wide relative overflow-hidden
                `}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <span className="relative z-10">{firstWord}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-semibold text-foreground flex-1">{agent.name}</h3>
                    {agent.active ? (
                      <div className={`
                        flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold
                        ${isDarkMode 
                          ? 'bg-green-900/30 text-green-400 border border-green-800' 
                          : 'bg-green-100 text-green-700 border border-green-200'
                        }
                      `}>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        {t('aiAgentPage.active')}
                      </div>
                    ) : (
                      <div className={`
                        flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold
                        ${isDarkMode 
                          ? 'bg-gray-800 text-gray-400 border border-gray-700' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }
                      `}>
                        <XCircle className="w-3 h-3" />
                        {t('aiAgentPage.inactive')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="truncate">{modelDetails?.name || t('aiAgentPage.unknown')}</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  className="cursor-pointer backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900" 
                  variant="outline" 
                  size="icon" 
                  onClick={(e) => { e.stopPropagation(); openModal('edit', agent); }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  className="cursor-pointer backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 hover:bg-red-50 dark:hover:bg-red-950/50" 
                  variant="outline" 
                  size="icon" 
                  onClick={(e) => { e.stopPropagation(); openModal('delete', agent); }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          );
        })}
        {agentStatus !== "loading" && (
          <Link to="/main-menu/ai-agent/create">
            <div className={`
              border-2 border-dashed rounded-2xl flex flex-col items-center justify-center min-h-[268px] transition-all duration-300
              ${isDarkMode 
                ? 'border-primary/40 hover:border-primary/60 bg-primary/5 hover:bg-primary/10' 
                : 'border-primary/60 hover:border-primary/80 bg-primary/5 hover:bg-primary/10'
              }
              cursor-pointer group
            `}>
              <div className={`
                p-4 rounded-xl mb-3 transition-all duration-300
                ${isDarkMode 
                  ? 'bg-primary/20 border border-primary/30 group-hover:bg-primary/30' 
                  : 'bg-primary/10 border border-primary/20 group-hover:bg-primary/20'
                }
              `}>
                <Plus className="text-primary" size={32} />
              </div>
              <p className="text-sm font-semibold text-foreground">{t('aiAgentPage.createNewAgent')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('aiAgentPage.addNewAgent')}</p>
            </div>
          </Link>
        )}
      </div>

      {/* Empty State */}
      {agentStatus !== "loading" && aiAgents.length === 0 && (
        <div className={`
          flex flex-col items-center justify-center text-center rounded-2xl p-12 sm:p-16 min-h-[400px] 
          ${isDarkMode 
            ? 'bg-gradient-to-br from-muted/40 via-muted/20 to-muted/10 border-2 border-dashed border-muted-foreground/20' 
            : 'bg-gradient-to-br from-muted/30 via-muted/20 to-muted/10 border-2 border-dashed border-muted-foreground/20'
          }
          backdrop-blur-sm
        `}>
          <div className="relative mb-8">
            <div className={`absolute inset-0 ${isDarkMode ? 'bg-primary/30' : 'bg-primary/20'} blur-3xl rounded-full`}></div>
            <div className={`
              relative p-6 rounded-2xl border backdrop-blur-sm
              ${isDarkMode 
                ? 'bg-gradient-to-br from-primary/30 to-primary/15 border-primary/30' 
                : 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/20'
              }
            `}>
              <Bot className="h-20 w-20 text-primary" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t('aiAgentPage.noAgentsTitle')}</h3>
          <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base">
            {t('aiAgentPage.noAgentsSubtitle')}
          </p>
          <Link to="/main-menu/ai-agent/create">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer font-semibold">
              <Plus className="h-4 w-4" />
              {t('aiAgentPage.createFirstAgent')}
            </Button>
          </Link>
        </div>
      )}

      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className={`
          sm:max-w-[600px] max-h-[90vh] flex flex-col
          ${isDarkMode ? 'bg-card border-border/60' : 'bg-card border-border/80'}
        `}>
          <DialogHeader className={`
            pb-4 border-b shrink-0
            ${isDarkMode ? 'border-border/40' : 'border-border/60'}
          `}>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              {modalState.mode === 'edit' && (
                <>
                  <div className={`
                    p-2 rounded-xl
                    ${isDarkMode 
                      ? 'bg-gradient-to-br from-pink-500/30 to-primary/20 border border-primary/30' 
                      : 'bg-gradient-to-br from-pink-500/20 to-primary/10 border border-primary/20'
                    }
                  `}>
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  {t('aiAgentPage.modal.editingTitle')}: {modalState.agent?.name}
                </>
              )}
              {modalState.mode === 'delete' && (
                <>
                  <div className={`
                    p-2 rounded-xl
                    ${isDarkMode 
                      ? 'bg-gradient-to-br from-red-500/30 to-red-600/20 border border-red-500/30' 
                      : 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20'
                    }
                  `}>
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </div>
                  {t('aiAgentPage.modal.deleteTitle')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {modalState.mode === 'edit' && (
            <div className="grid gap-6 py-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  {t('aiAgentPage.form.name')}
                </label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name || ''} 
                  onChange={handleFormChange} 
                  className="w-full"
                  placeholder={t('aiAgentPage.searchPlaceholder', 'Enter agent name')}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="aiModel" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t('aiAgentPage.form.aiModel')}
                </label>
                <Select value={typeof formData.aiModel === 'object' ? formData.aiModel._id : formData.aiModel} onValueChange={(value) => handleSelectChange('aiModel', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('aiAgentPage.form.selectModel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels.map(model => (
                      <SelectItem key={model._id} value={model._id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="tone" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {t('aiAgentPage.form.tone')}
                </label>
                <Select value={formData.tone} onValueChange={(value) => handleSelectChange('tone', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('aiAgentPage.form.selectTone')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">{t('aiAgentPage.tones.friendly')}</SelectItem>
                    <SelectItem value="formal">{t('aiAgentPage.tones.formal')}</SelectItem>
                    <SelectItem value="neutral">{t('aiAgentPage.tones.neutral')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="instruction" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {t('aiAgentPage.form.instruction')}
                </label>
                <Textarea 
                  id="instruction" 
                  name="instruction" 
                  value={formData.instruction || ''} 
                  onChange={handleFormChange} 
                  className="w-full" 
                  rows={4} 
                  placeholder={t('aiAgentPage.form.instructionPlaceholder')} 
                />
              </div>
            </div>
          )}

          {modalState.mode === 'delete' && (
            <div className="py-6 overflow-y-auto flex-1 min-h-0">
              <div className={`
                p-4 rounded-lg
                ${isDarkMode ? 'bg-red-950/20 border border-red-900/50' : 'bg-red-50 border border-red-200'}
              `}>
                <DialogDescription className={`
                  ${isDarkMode ? 'text-red-300' : 'text-red-700'}
                `}>
                  {t('aiAgentPage.modal.deleteDescription', { agentName: modalState.agent?.name })}
                </DialogDescription>
              </div>
            </div>
          )}

          <DialogFooter className={`
            pt-4 border-t gap-2 shrink-0
            ${isDarkMode ? 'border-border/40' : 'border-border/60'}
          `}>
            <Button 
              variant="outline" 
              onClick={closeModal}
              className="cursor-pointer"
            >
              {t('aiAgentPage.form.cancelButton')}
            </Button>
            {modalState.mode === 'edit' && (
              <Button 
                onClick={handleEditSubmit} 
                disabled={agentStatus === 'loading'} 
                className="bg-pink-500 hover:bg-pink-600 text-white dark:text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 cursor-pointer"
              >
                {t('aiAgentPage.form.saveButton')}
              </Button>
            )}
            {modalState.mode === 'delete' && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm} 
                disabled={agentStatus === 'loading'}
                className="text-white dark:text-white cursor-pointer"
              >
                {t('aiAgentPage.form.deleteButton')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const AiAgentSkeleton = () => {
  return (
    <>
      {[...Array(4)].map((_, index) => (
        <div key={index} className="rounded-xl bg-card border dark:border-[#2C3139] animate-pulse">
          <div className="h-[180px] bg-muted"></div>
          <div className="p-4 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </>
  );
};
