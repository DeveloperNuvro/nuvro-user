import { useEffect, useState } from "react";
import { Plus, User, MoreVertical, Trash2, Edit, Users, UserCheck, Mail, Sparkles } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; // --- IMPORT ---

import { fetchAgentsWithStatus, createHumanAgent, updateHumanAgent, deleteHumanAgent, HumanAgent, setAgentStatus } from "@/features/humanAgent/humanAgentSlice";
import { fetchChannels, Channel } from "@/features/channel/channelSlice";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Checkbox from "@/components/custom/checkbox/Checkbox"; 
import ComponentSkeleton from "@/components/skeleton/ComponentSkeleton";
import { useTheme } from "@/components/theme-provider";
import { getSocket } from "../lib/useSocket";

export default function HumanAgentPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(); // --- INITIALIZE ---
  const { theme } = useTheme();

  const { agents, status: agentStatus, error: agentError } = useSelector((state: RootState) => state.humanAgent);
  const { channels, status: channelStatus } = useSelector((state: RootState) => state.channel);
  
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
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<HumanAgent | null>(null);

  useEffect(() => {
    dispatch(fetchAgentsWithStatus());
    dispatch(fetchChannels());
  }, [dispatch]);
  
  // Listen for real-time agent status updates via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleAgentStatusChange = (data: { userId: string; status: 'online' | 'offline'; lastSeen?: string | null }) => {
      dispatch(setAgentStatus(data));
    };

    socket.on('agentStatusChanged', handleAgentStatusChange);

    return () => {
      socket.off('agentStatusChanged', handleAgentStatusChange);
    };
  }, [dispatch]);
  
  const handleCreateAgent = (formData: any) => {
    const promise = dispatch(createHumanAgent(formData)).unwrap();
    toast.promise(promise, {
      loading: t('humanAgentPage.toastCreating'),
      success: () => {
        setCreateModalOpen(false);
        dispatch(fetchAgentsWithStatus());
        dispatch(fetchChannels());
        return t('humanAgentPage.toastCreateSuccess');
      },
      error: (err) => err.message || t('humanAgentPage.toastCreateError'),
    });
  };
  
  const handleUpdateAgent = (formData: any) => {
    if (!selectedAgent) return;
    const promise = dispatch(updateHumanAgent({ agentId: selectedAgent._id, ...formData })).unwrap();
    toast.promise(promise, {
      loading: t('humanAgentPage.toastUpdating'),
      success: () => {
        setEditModalOpen(false);
        dispatch(fetchAgentsWithStatus());
        dispatch(fetchChannels());
        return t('humanAgentPage.toastUpdateSuccess');
      },
      error: (err) => err.message || t('humanAgentPage.toastUpdateError'),
    });
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;
    const promise = dispatch(deleteHumanAgent(selectedAgent._id)).unwrap();
    toast.promise(promise, {
      loading: t('humanAgentPage.toastDeleting'),
      success: () => {
        dispatch(fetchChannels());
        return t('humanAgentPage.toastDeleteSuccess');
      },
      error: (err) => err.message || t('humanAgentPage.toastDeleteError'),
    });
    setDeleteConfirmOpen(false);
    setSelectedAgent(null);
  };
  
  const openEditModal = (agent: HumanAgent) => { setSelectedAgent(agent); setEditModalOpen(true); };
  const openDeleteConfirm = (agent: HumanAgent) => { setSelectedAgent(agent); setDeleteConfirmOpen(true); };
  
  const isLoading = agentStatus === "loading" || channelStatus === 'loading';
  const hasAgents = Array.isArray(agents) && agents.length > 0;
  
  const totalAgents = agents?.length || 0;
  const activeAgents = agents?.filter((agent: HumanAgent) => agent.status === 'online').length || 0;
  const totalChannels = channels?.length || 0;
  
  return (
    <div className="space-y-8 pb-8">
      {/* Enhanced Header Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {t('humanAgentPage.title')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {t('humanAgentPage.subtitle', 'Manage your human support agents and assign them to channels for efficient customer service')}
            </p>
          </div>
          <Button 
            onClick={() => setCreateModalOpen(true)}
            className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer shrink-0 font-semibold"
          >
            <Plus className="h-4 w-4" />
            {t('humanAgentPage.addAgentButton')}
          </Button>
        </div>

        {/* Enhanced Stats Cards */}
        {hasAgents && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Total Agents Card */}
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
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{totalAgents}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600/80'}`}>
                  {t('humanAgentPage.stats.totalAgents', 'Total Agents')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-300'}`}></div>
            </div>

            {/* Active Agents Card */}
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
                    <UserCheck className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{activeAgents}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-green-300/80' : 'text-green-600/80'}`}>
                  {t('humanAgentPage.stats.activeAgents', 'Active Agents')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-green-400' : 'bg-green-300'}`}></div>
            </div>

            {/* Total Channels Card */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-primary/20 via-pink-600/15 to-rose-600/10 border-primary/30 hover:border-primary/50' 
                : 'bg-gradient-to-br from-pink-50 via-rose-100/50 to-primary/30 border-pink-200/60 hover:border-pink-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-primary' : 'text-primary'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-primary/30 border border-primary/40' 
                      : 'bg-primary/20 border border-primary/30'
                    }
                  `}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{totalChannels}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-primary/80' : 'text-primary/80'}`}>
                  {t('humanAgentPage.stats.totalChannels', 'Total Channels')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-primary' : 'bg-primary'}`}></div>
            </div>
          </div>
        )}
      </div>
      
      {agentStatus === 'failed' && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 text-red-600 dark:text-red-400">
          {t('humanAgentPage.loadingError', { error: agentError })}
        </div>
      )}

      {isLoading ? (
        <ComponentSkeleton />
      ) : hasAgents ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {agents.map((agent) => (
            <AgentCard key={agent._id} agent={agent} onEdit={openEditModal} onDelete={openDeleteConfirm} isDarkMode={isDarkMode} />
          ))}
        </div>
      ) : (
        <div className={`
          flex flex-col items-center justify-center text-center rounded-2xl p-12 sm:p-16 min-h-[500px] 
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
                <User className="h-20 w-20 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t('humanAgentPage.noAgentsTitle')}</h3>
            <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base">{t('humanAgentPage.noAgentsSubtitle')}</p>
            <Button 
              onClick={() => setCreateModalOpen(true)}
              className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer font-semibold"
            >
              <Plus className="h-4 w-4" />
              {t('humanAgentPage.createFirstAgentButton')}
            </Button>
        </div>
      )}

      <AgentFormModal isOpen={isCreateModalOpen} onOpenChange={setCreateModalOpen} onSubmit={handleCreateAgent} channels={channels} title={t('humanAgentPage.createModalTitle')} submitButtonText={t('humanAgentPage.createModalButton')} />
      {selectedAgent && <AgentFormModal isOpen={isEditModalOpen} onOpenChange={setEditModalOpen} onSubmit={handleUpdateAgent} channels={channels} agentData={selectedAgent} title={t('humanAgentPage.editModalTitle')} submitButtonText={t('humanAgentPage.editModalButton')} />}
      {selectedAgent && <DeleteConfirmDialog isOpen={isDeleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} onConfirm={handleDeleteAgent} itemName={selectedAgent.name} />}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTS
// =========================================================================

const AgentCard = ({ agent, onEdit, onDelete, isDarkMode }: { agent: HumanAgent, onEdit: (agent: HumanAgent) => void, onDelete: (agent: HumanAgent) => void, isDarkMode: boolean }) => {
    const { t } = useTranslation();
    const initials = agent.name.split(" ").map((n) => n[0]).join("").toUpperCase();
    
    // Generate gradient colors based on agent name
    const getGradientColors = (name: string) => {
      const colors = [
        'from-blue-500 via-blue-600 to-indigo-600',
        'from-purple-500 via-purple-600 to-pink-600',
        'from-green-500 via-emerald-600 to-teal-600',
        'from-orange-500 via-amber-600 to-yellow-600',
        'from-red-500 via-rose-600 to-pink-600',
        'from-cyan-500 via-blue-600 to-indigo-600',
        'from-pink-500 via-rose-600 to-red-600',
        'from-violet-500 via-purple-600 to-indigo-600',
      ];
      const index = name.charCodeAt(0) % colors.length;
      return colors[index];
    };

    const isOnline = agent.status === 'online';

    return (
        <div className={`
          group rounded-2xl overflow-hidden relative transition-all duration-300
          ${isDarkMode 
            ? 'bg-card border border-border/60 hover:border-primary/60 shadow-lg shadow-black/10' 
            : 'bg-card border border-border/80 hover:border-primary/60 shadow-md shadow-black/5'
          }
          hover:-translate-y-1 hover:shadow-xl
        `}>
            {/* Action Menu */}
            <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 bg-background/80 backdrop-blur-sm hover:bg-background border border-border/50 cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEdit(agent)} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> 
                          {t('humanAgentPage.cardEdit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(agent)} 
                          className="text-red-500 focus:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> 
                          {t('humanAgentPage.cardDelete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Header with Gradient */}
            <div className={`relative h-[160px] flex flex-col items-center justify-center bg-gradient-to-br ${getGradientColors(agent.name)} text-white p-6 overflow-hidden`}>
              {/* Decorative Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }}></div>
              </div>
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl mb-3 border border-white/30">
                  <User size={32} className="text-white" />
                </div>
                <div className="text-3xl font-bold tracking-wide drop-shadow-lg mb-2">
                  {initials}
                </div>
                {isOnline && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/80 backdrop-blur-sm rounded-full border border-white/30">
                    <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                    <span className="text-xs font-medium">{t('humanAgentPage.status.online', 'Online')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-5 bg-card">
              <h3 className="text-lg font-bold text-foreground truncate mb-2">{agent.name}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <p className="truncate">{agent.email}</p>
                </div>
                {agent._id && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono break-all">{t('humanAgentPage.card.id', 'ID:')} {agent._id.toString()}</span>
                  </div>
                )}
                {agent.status && (
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <p className="text-xs text-muted-foreground capitalize">{agent.status}</p>
                  </div>
                )}
              </div>
            </div>
        </div>
    );
};

const AgentFormModal = ({ isOpen, onOpenChange, onSubmit, channels, agentData, title, submitButtonText }: any) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const isEditMode = !!agentData;
    
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && agentData && Array.isArray(channels)) {
                setName(agentData.name || '');
                const agentChannelIds = channels.filter((ch: Channel) => Array.isArray(ch.members) && ch.members.some((mem: any) => mem._id === agentData._id)).map((ch: Channel) => ch._id);
                setSelectedChannels(agentChannelIds);
            } else { setName(''); setEmail(''); setPassword(''); setSelectedChannels([]); }
        }
    }, [agentData, isOpen, isEditMode, channels]);

    const handleChannelChange = (channelId: string) => { setSelectedChannels(prev => prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId]); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData: any = { name, channelIds: selectedChannels };
        if (!isEditMode) { formData.email = email; formData.password = password; }
        onSubmit(formData);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-background border text-foreground rounded-2xl p-0 overflow-hidden max-w-2xl">
              {/* Header with Gradient */}
              <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 border-b border-border/50 p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    {title}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-2">
                    {isEditMode ? 'Update agent details and channel assignments' : 'Create a new human agent for your support team'}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t('humanAgentPage.formName')}
                  </Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    className="h-11 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/50 transition-all" 
                  />
                </div>

                {!isEditMode && (
                  <>
                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {t('humanAgentPage.formEmail')}
                      </Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="h-11 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/50 transition-all" 
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                        {t('humanAgentPage.formPassword')}
                      </Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        minLength={6}
                        className="h-11 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/50 transition-all" 
                      />
                    </div>
                  </>
                )}

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    {t('humanAgentPage.formAssignChannels')}
                  </Label>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                    {channels && channels.length > 0 ? (
                      <div className="space-y-2">
                        {channels.map((channel: Channel) => (
                          <div 
                            key={channel._id} 
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => handleChannelChange(channel._id)}
                          >
                            <Checkbox 
                              checked={selectedChannels.includes(channel._id)} 
                              onCheckedChange={() => handleChannelChange(channel._id)} 
                            />
                            <Label htmlFor={channel._id} className="font-medium cursor-pointer flex-1">
                              {channel.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground text-center">{t('humanAgentPage.formNoChannels')}</p>
                      </div>
                    )}
                  </div>
                  {selectedChannels.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedChannels.length} {selectedChannels.length === 1 ? 'channel' : 'channels'} selected
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    className="px-6 cursor-pointer"
                  >
                    {t('humanAgentPage.cancelButton')}
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-pink-500 hover:bg-pink-600 text-white px-6 shadow-lg shadow-pink-500/25 cursor-pointer"
                  >
                    {submitButtonText}
                  </Button>
                </div>
              </form>
            </DialogContent>
        </Dialog>
    );
};

const DeleteConfirmDialog = ({ isOpen, onOpenChange, onConfirm, itemName }: any) => {
    const { t } = useTranslation();
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-background border text-foreground rounded-2xl p-0 overflow-hidden max-w-md">
              {/* Header with Red Gradient */}
              <div className="bg-gradient-to-r from-red-500/20 via-red-500/10 to-red-500/5 border-b border-red-500/20 p-6">
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">{t('humanAgentPage.deleteConfirmTitle')}</DialogTitle>
                  </div>
                  <DialogDescription className="text-muted-foreground">
                    {t('humanAgentPage.deleteConfirmDescription', { itemName })}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    This action cannot be undone. All data associated with this agent will be permanently deleted.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    className="px-6 cursor-pointer"
                  >
                    {t('humanAgentPage.cancelButton')}
                  </Button>
                  <Button 
                    onClick={onConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 shadow-lg shadow-red-500/25 cursor-pointer"
                  >
                    {t('humanAgentPage.deleteButton')}
                  </Button>
                </div>
              </div>
            </DialogContent>
        </Dialog>
    );
};
