import { useEffect, useState } from "react";
import { Plus, User, MoreVertical, Trash2, Edit} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; // --- IMPORT ---

import { fetchHumanAgents, createHumanAgent, updateHumanAgent, deleteHumanAgent, HumanAgent } from "@/features/humanAgent/humanAgentSlice";
import { fetchChannels, Channel } from "@/features/channel/channelSlice";

import { ButtonSmall } from "@/components/custom/button/Button"; 
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Checkbox from "@/components/custom/checkbox/Checkbox"; 

export default function HumanAgentPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(); // --- INITIALIZE ---

  const { agents, status: agentStatus, error: agentError } = useSelector((state: RootState) => state.humanAgent);
  const { channels, status: channelStatus } = useSelector((state: RootState) => state.channel);
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<HumanAgent | null>(null);

  useEffect(() => {
    dispatch(fetchHumanAgents());
    dispatch(fetchChannels());
  }, [dispatch]);
  
  const handleCreateAgent = (formData: any) => {
    const promise = dispatch(createHumanAgent(formData)).unwrap();
    toast.promise(promise, {
      loading: t('humanAgentPage.toastCreating'),
      success: () => {
        setCreateModalOpen(false);
        dispatch(fetchHumanAgents());
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
        dispatch(fetchHumanAgents());
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
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">{t('humanAgentPage.title')}</h2>
        <ButtonSmall 
          value={t('humanAgentPage.addAgentButton')}
          onClick={() => setCreateModalOpen(true)} 
          customClass="w-auto flex items-center gap-2 mb-0"
        >
          <Plus className="h-4 w-4" /> {t('humanAgentPage.addAgentButton')}
        </ButtonSmall>
      </div>
      
      {agentStatus === 'failed' && <div className="text-red-500">{t('humanAgentPage.loadingError', { error: agentError })}</div>}

      {isLoading ? (
        <ComponentSkeleton />
      ) : hasAgents ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {agents.map((agent) => (
            <AgentCard key={agent._id} agent={agent} onEdit={openEditModal} onDelete={openDeleteConfirm} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
            <User className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">{t('humanAgentPage.noAgentsTitle')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t('humanAgentPage.noAgentsSubtitle')}</p>
            <div className="mt-6">
                <ButtonSmall value={t('humanAgentPage.createFirstAgentButton')} onClick={() => setCreateModalOpen(true)} customClass="w-auto flex items-center gap-2 mb-0">
                    <Plus className="h-4 w-4" /> {t('humanAgentPage.createFirstAgentButton')}
                </ButtonSmall>
            </div>
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

const AgentCard = ({ agent, onEdit, onDelete }: { agent: HumanAgent, onEdit: (agent: HumanAgent) => void, onDelete: (agent: HumanAgent) => void }) => {
    const { t } = useTranslation();
    const initials = agent.name.split(" ").map((n) => n[0]).join("").toUpperCase();
    return (
        <div className="rounded-xl bg-card border transition-all duration-200 overflow-hidden relative">
            <div className="absolute top-2 right-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(agent)}><Edit className="mr-2 h-4 w-4" /> {t('humanAgentPage.cardEdit')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(agent)} className="text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" /> {t('humanAgentPage.cardDelete')}</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="h-[180px] flex items-center justify-center bg-[#2196F3]/90 text-white">
                <div className="flex flex-col items-center gap-2"><User size={48} /><span className="text-4xl font-bold tracking-wide">{initials}</span></div>
            </div>
            <div className="p-4">
                <h3 className="text-base font-medium text-foreground truncate">{agent.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{agent.email}</p>
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
            <DialogContent className="bg-background border text-foreground rounded-lg p-6 ">
                <DialogHeader className="flex flex-row justify-between items-center"><DialogTitle className="text-lg font-semibold">{title}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">{t('humanAgentPage.formName')}</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    {!isEditMode && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">{t('humanAgentPage.formEmail')}</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">{t('humanAgentPage.formPassword')}</Label>
                                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                            </div>
                        </>
                    )}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">{t('humanAgentPage.formAssignChannels')}</Label>
                        <div className="rounded-md border bg-muted/50 p-4 h-32 overflow-y-auto">
                            {channels && channels.length > 0 ? channels.map((channel: Channel) => (
                                <div key={channel._id} className="flex items-center space-x-3 mb-2">
                                    <Checkbox checked={selectedChannels.includes(channel._id)} onCheckedChange={() => handleChannelChange(channel._id)} />
                                    <Label htmlFor={channel._id} className="font-normal cursor-pointer">{channel.name}</Label>
                                </div>
                            )) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-muted-foreground text-center">{t('humanAgentPage.formNoChannels')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-4 pt-4">
                       <ButtonSmall type="button" isOutline onClick={() => onOpenChange(false)} value={t('humanAgentPage.cancelButton')} customClass="mb-0 w-[120px]" />
                       <ButtonSmall type="submit" value={submitButtonText} customClass="mb-0 w-[160px]" />
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
            <DialogContent className="bg-background border text-foreground rounded-lg p-6 ">
                <DialogHeader>
                    <DialogTitle>{t('humanAgentPage.deleteConfirmTitle')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-2">
                        {t('humanAgentPage.deleteConfirmDescription', { itemName })}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-end gap-4 pt-6">
                    <ButtonSmall isOutline onClick={() => onOpenChange(false)} value={t('humanAgentPage.cancelButton')} customClass="mb-0 w-[120px]" />
                    <ButtonSmall onClick={onConfirm} value={t('humanAgentPage.deleteButton')} customClass="mb-0 w-[120px] bg-red-600 hover:bg-red-700" />
                </div>
            </DialogContent>
        </Dialog>
    );
};

const ComponentSkeleton = () => {
  return (<div className="col-span-full flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 dark:border-white border-[#2196F3]"></div></div>);
};