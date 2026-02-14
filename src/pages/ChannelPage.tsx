import { useEffect, useState } from "react";
import { Plus, Users, MoreVertical, Trash2, Edit, MessageSquare, Sparkles, Badge } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; // --- IMPORT ---

// Data handling imports
import {
  fetchChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  Channel,
} from "@/features/channel/channelSlice";
import { fetchHumanAgents, HumanAgent } from "@/features/humanAgent/humanAgentSlice";

// --- CUSTOM & UI Component Imports ---
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Checkbox from "@/components/custom/checkbox/Checkbox";
import ComponentSkeleton from "@/components/skeleton/ComponentSkeleton";
import { useTheme } from "@/components/theme-provider";

// =========================================================================
// MAIN PAGE COMPONENT
// =========================================================================
export default function ChannelPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(); // --- INITIALIZE ---
  const { theme } = useTheme();

  const { channels, status: channelStatus, error: channelError } = useSelector((state: RootState) => state.channel);
  const { agents, status: agentStatus } = useSelector((state: RootState) => state.humanAgent);
  
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
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  useEffect(() => {
    dispatch(fetchChannels());
    dispatch(fetchHumanAgents());
  }, [dispatch]);
  
  const handleCreateChannel = (formData: any) => {
    const promise = dispatch(createChannel(formData)).unwrap();
    toast.promise(promise, {
      loading: t('channelPage.toastCreating'),
      success: () => {
        setCreateModalOpen(false);
        dispatch(fetchChannels());
        return t('channelPage.toastCreateSuccess');
      },
      error: (err) => err.message || t('channelPage.toastCreateError'),
    });
  };
  
  const handleUpdateChannel = (formData: any) => {
    if (!selectedChannel) return;
    const promise = dispatch(updateChannel({ channelId: selectedChannel._id, ...formData })).unwrap();
    toast.promise(promise, {
      loading: t('channelPage.toastUpdating'),
      success: () => {
        setEditModalOpen(false);
        dispatch(fetchChannels());
        return t('channelPage.toastUpdateSuccess');
      },
      error: (err) => err.message || t('channelPage.toastUpdateError'),
    });
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return;
    const promise = dispatch(deleteChannel(selectedChannel._id)).unwrap();
    toast.promise(promise, {
      loading: t('channelPage.toastDeleting'),
      success: t('channelPage.toastDeleteSuccess'),
      error: (err) => err || t('channelPage.toastDeleteError'), 
    });
    setDeleteConfirmOpen(false);
    setSelectedChannel(null);
  };
  
  const openEditModal = (channel: Channel) => { setSelectedChannel(channel); setEditModalOpen(true); };
  const openDeleteConfirm = (channel: Channel) => { setSelectedChannel(channel); setDeleteConfirmOpen(true); };
  
  const isLoading = channelStatus === "loading" || agentStatus === 'loading';
  const hasChannels = Array.isArray(channels) && channels.length > 0;
  
  const totalChannels = channels?.length || 0;
  const totalMembers = channels?.reduce((acc, channel) => acc + (channel.members?.length || 0), 0) || 0;
  
  return (
    <div className="space-y-8 pb-8">
      {/* Enhanced Header Section */}
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {t('channelPage.title')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {t('channelPage.subtitle', 'Organize and manage your support channels for efficient team collaboration')}
            </p>
          </div>
          <Button 
          onClick={() => setCreateModalOpen(true)} 
            className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer shrink-0 font-semibold"
          >
            <Plus className="h-4 w-4" />
            {t('channelPage.addChannelButton')}
          </Button>
        </div>

        {/* Enhanced Stats Cards */}
        {hasChannels && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Total Channels Card */}
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
                    <MessageSquare className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{totalChannels}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600/80'}`}>
                  {t('channelPage.stats.totalChannels', 'Total Channels')}
                </p>
              </div>
              {/* Decorative gradient overlay */}
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-300'}`}></div>
            </div>

            {/* Total Members Card */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-purple-500/20 via-purple-600/15 to-pink-600/10 border-purple-500/30 hover:border-purple-400/50' 
                : 'bg-gradient-to-br from-purple-50 via-purple-100/50 to-pink-50 border-purple-200/60 hover:border-purple-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-purple-500/30 border border-purple-400/30' 
                      : 'bg-purple-500/20 border border-purple-300/40'
                    }
                  `}>
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{totalMembers}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-purple-300/80' : 'text-purple-600/80'}`}>
                  Total Members
                </p>
              </div>
              {/* Decorative gradient overlay */}
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-300'}`}></div>
            </div>

            {/* Avg per Channel Card */}
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
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{Math.round(totalMembers / totalChannels) || 0}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-primary/80' : 'text-primary/80'}`}>
                  Avg. per Channel
                </p>
              </div>
              {/* Decorative gradient overlay */}
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-primary' : 'bg-primary'}`}></div>
            </div>
          </div>
        )}
      </div>
      
      {channelStatus === 'failed' && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 text-red-600 dark:text-red-400">
          {t('channelPage.loadingError', { error: channelError })}
        </div>
      )}

      {isLoading ? (
        <ComponentSkeleton />
      ) : hasChannels ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {channels.map((channel) => (
            <ChannelCard key={channel._id} channel={channel} onEdit={openEditModal} onDelete={openDeleteConfirm} isDarkMode={isDarkMode} />
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
                <Users className="h-20 w-20 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t('channelPage.noChannelsTitle')}</h3>
            <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base">{t('channelPage.noChannelsSubtitle')}</p>
            <Button 
              onClick={() => setCreateModalOpen(true)}
              className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer font-semibold"
            >
              <Plus className="h-4 w-4" />
              {t('channelPage.createFirstChannelButton')}
            </Button>
        </div>
      )}

      {/* --- MODALS --- */}
      <ChannelFormModal
        isOpen={isCreateModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateChannel}
        agents={agents}
        title={t('channelPage.createModalTitle')}
        submitButtonText={t('channelPage.createModalButton')}
      />

      {selectedChannel && (
          <ChannelFormModal
            isOpen={isEditModalOpen}
            onOpenChange={setEditModalOpen}
            onSubmit={handleUpdateChannel}
            agents={agents}
            channelData={selectedChannel}
            title={t('channelPage.editModalTitle')}
            submitButtonText={t('channelPage.editModalButton')}
          />
      )}
      
      {selectedChannel && (
         <DeleteConfirmDialog
            isOpen={isDeleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            onConfirm={handleDeleteChannel}
            itemName={selectedChannel.displayLabel ?? selectedChannel.name}
        />
      )}
    </div>
  );
}


// =========================================================================
// SUB-COMPONENTS
// =========================================================================

const ChannelCard = ({ channel, onEdit, onDelete, isDarkMode }: { channel: Channel, onEdit: (channel: Channel) => void, onDelete: (channel: Channel) => void, isDarkMode: boolean }) => {
    const { t } = useTranslation();
    const memberCount = channel?.members?.length || 0;
    const defaultChannels = ['Support', 'Sales', 'Billing'];
    const isDefault = defaultChannels.includes(channel.name);

    // Generate gradient colors based on channel name (colorful variations)
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
                        <DropdownMenuItem onClick={() => onEdit(channel)} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> 
                          {t('channelPage.cardEdit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => { if (!isDefault) onDelete(channel); }} 
                          className="text-red-500 focus:text-red-500 cursor-pointer" 
                          disabled={isDefault}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> 
                          <span>{t('channelPage.cardDelete')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Header with Gradient */}
            <div className={`relative h-[160px] flex flex-col items-center justify-center bg-gradient-to-br ${getGradientColors(channel.name)} text-white p-6 overflow-hidden`}>
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
                  <Users size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold tracking-wide text-center truncate w-full px-2 drop-shadow-lg">
                  {channel?.displayLabel ?? channel?.name}
                </h3>
                {isDefault && (
                  <div className="mt-2 flex items-center gap-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                    <Badge className="h-3 w-3 fill-white" />
                    <span className="text-xs font-medium">Default</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {t('channelPage.cardMembersTitle', { count: memberCount })}
                </h4>
                {memberCount > 0 && (
                  <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {memberCount}
                  </span>
                )}
              </div>
              
              <div className="space-y-2 min-h-[80px]">
                    {memberCount > 0 ? (
                  <>
                    {channel.members.slice(0, 3).map((member) => (
                      <div 
                        key={member._id} 
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <p className="text-sm text-foreground truncate flex-1">{member.name}</p>
                      </div>
                    ))}
                    {memberCount > 3 && (
                      <p className="text-xs text-muted-foreground italic pt-1">
                        +{memberCount - 3} {t('channelPage.cardAndMore', { count: memberCount - 3 })}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[60px]">
                    <p className="text-sm text-muted-foreground italic">{t('channelPage.cardNoMembers')}</p>
                  </div>
                )}
                </div>
            </div>
        </div>
    );
};

const ChannelFormModal = ({ isOpen, onOpenChange, onSubmit, agents, channelData, title, submitButtonText }: any) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const isEditMode = !!channelData;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && channelData) {
                setName(channelData.name || '');
                const memberIds = Array.isArray(channelData.members) ? channelData.members.map((member: HumanAgent) => member._id) : [];
                setSelectedMembers(memberIds);
            } else { setName(''); setSelectedMembers([]); }
        }
    }, [channelData, isOpen, isEditMode]);

    const handleMemberChange = (agentId: string) => { setSelectedMembers(prev => prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ name, members: selectedMembers }); };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-background border text-foreground rounded-2xl p-0 overflow-hidden max-w-2xl">
              {/* Header with Gradient */}
              <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 border-b border-border/50 p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    {title}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-2">
                    {isEditMode ? 'Update channel details and member assignments' : 'Create a new channel to organize your team'}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    {t('channelPage.formChannelName')}
                  </Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder={t('channelPage.formChannelPlaceholder')} 
                    className="h-11 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/50 transition-all" 
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {t('channelPage.formAssignAgents')}
                  </Label>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                    {agents && agents.length > 0 ? (
                    <div className="space-y-2">
                        {agents.map((agent: HumanAgent) => (
                          <div 
                            key={agent._id} 
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => handleMemberChange(agent._id)}
                          >
                            <Checkbox 
                              checked={selectedMembers.includes(agent._id)} 
                              onCheckedChange={() => handleMemberChange(agent._id)} 
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                {agent.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <Label htmlFor={agent._id} className="font-medium cursor-pointer flex-1">
                                {agent.name}
                              </Label>
                            </div>
                          </div>
                        ))}
                                </div>
                    ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-muted-foreground text-center">{t('channelPage.formNoAgents')}</p>
                                </div>
                            )}
                        </div>
                  {selectedMembers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedMembers.length} {selectedMembers.length === 1 ? 'agent' : 'agents'} selected
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
                    {t('channelPage.cancelButton')}
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 shadow-lg shadow-primary/25 cursor-pointer"
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
                    <DialogTitle className="text-2xl font-bold">{t('channelPage.deleteConfirmTitle')}</DialogTitle>
                  </div>
                  <DialogDescription className="text-muted-foreground">
                        {t('channelPage.deleteConfirmDescription', { itemName })}
                    </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    This action cannot be undone. All data associated with this channel will be permanently deleted.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    className="px-6 cursor-pointer"
                  >
                    {t('channelPage.cancelButton')}
                  </Button>
                  <Button 
                    onClick={onConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 shadow-lg shadow-red-500/25 cursor-pointer"
                  >
                    {t('channelPage.deleteButton')}
                  </Button>
                </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

