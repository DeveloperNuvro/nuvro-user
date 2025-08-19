import { useEffect, useState } from "react";
import { Plus, Users, MoreVertical, Trash2, Edit} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import toast from "react-hot-toast";

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
import { ButtonSmall } from "@/components/custom/button/Button"; 
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

// =========================================================================
// MAIN PAGE COMPONENT
// =========================================================================
export default function ChannelPage() {
  const dispatch = useDispatch<AppDispatch>();

  const { channels, status: channelStatus, error: channelError } = useSelector((state: RootState) => state.channel);
  const { agents, status: agentStatus } = useSelector((state: RootState) => state.humanAgent);
  
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
      loading: 'Creating channel...',
      success: () => {
        setCreateModalOpen(false);
        dispatch(fetchChannels());
        return 'Channel created successfully!';
      },
      error: (err) => err.message || 'Failed to create channel.',
    });
  };
  
  const handleUpdateChannel = (formData: any) => {
    if (!selectedChannel) return;
    const promise = dispatch(updateChannel({ channelId: selectedChannel._id, ...formData })).unwrap();
    toast.promise(promise, {
      loading: 'Updating channel...',
      success: () => {
        setEditModalOpen(false);
        dispatch(fetchChannels());
        return 'Channel updated successfully!';
      },
      error: (err) => err.message || 'Failed to update channel.',
    });
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return;
    const promise = dispatch(deleteChannel(selectedChannel._id)).unwrap();
    toast.promise(promise, {
      loading: 'Deleting channel...',
      success: 'Channel deleted successfully!',
      error: (err) => err || 'Failed to delete channel.', 
    });
    setDeleteConfirmOpen(false);
    setSelectedChannel(null);
  };
  
  const openEditModal = (channel: Channel) => {
    setSelectedChannel(channel);
    setEditModalOpen(true);
  };

  const openDeleteConfirm = (channel: Channel) => {
    setSelectedChannel(channel);
    setDeleteConfirmOpen(true);
  };
  
  const isLoading = channelStatus === "loading" || agentStatus === 'loading';
  const hasChannels = Array.isArray(channels) && channels.length > 0;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Channels</h2>
        <ButtonSmall 
          value="Add Channel" 
          onClick={() => setCreateModalOpen(true)} 
          customClass="w-auto flex items-center gap-2 mb-0"
        >
          <Plus className="h-4 w-4" /> Add Channel
        </ButtonSmall>
      </div>
      
      {channelStatus === 'failed' && <div className="text-red-500">Error: {channelError}</div>}

      {isLoading ? (
        <ComponentSkeleton />
      ) : hasChannels ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {channels.map((channel) => (
            <ChannelCard key={channel._id} channel={channel} onEdit={openEditModal} onDelete={openDeleteConfirm} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
            <Users className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">No Channels Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first channel (e.g., Sales, Support).</p>
            <div className="mt-6">
                <ButtonSmall value="Create First Channel" onClick={() => setCreateModalOpen(true)} customClass="w-auto flex items-center gap-2 mb-0">
                    <Plus className="h-4 w-4" /> Create First Channel
                </ButtonSmall>
            </div>
        </div>
      )}

      {/* --- MODALS --- */}
      <ChannelFormModal
        isOpen={isCreateModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateChannel}
        agents={agents}
        title="Create New Channel"
        submitButtonText="Create Channel"
      />

      {selectedChannel && (
          <ChannelFormModal
            isOpen={isEditModalOpen}
            onOpenChange={setEditModalOpen}
            onSubmit={handleUpdateChannel}
            agents={agents}
            channelData={selectedChannel}
            title="Edit Channel"
            submitButtonText="Save Changes"
          />
      )}
      
      {selectedChannel && (
         <DeleteConfirmDialog
            isOpen={isDeleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            onConfirm={handleDeleteChannel}
            itemName={selectedChannel.name}
        />
      )}
    </div>
  );
}


// =========================================================================
// SUB-COMPONENTS
// =========================================================================

const ChannelCard = ({ channel, onEdit, onDelete }: { channel: Channel, onEdit: (channel: Channel) => void, onDelete: (channel: Channel) => void }) => {
    const memberCount = channel?.members?.length || 0;
    
    // This list should match the list in your backend controller.
    const defaultChannels = ['Support', 'Sales', 'Billing'];
    const isDefault = defaultChannels.includes(channel.name);

    return (
        <div className="rounded-xl bg-card border transition-all duration-200 overflow-hidden relative">
            <div className="absolute top-2 right-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(channel)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => { if (!isDefault) onDelete(channel); }} 
                            className="text-red-500 focus:text-red-500"
                            disabled={isDefault}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> 
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="h-[180px] flex flex-col items-center justify-center bg-[#4CAF50]/90 text-white p-4">
                <Users size={40} />
                <h3 className="mt-2 text-2xl font-bold tracking-wide text-center truncate">{channel?.name}</h3>
            </div>
            <div className="p-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Members ({memberCount})</h4>
                <div className="space-y-1 text-xs text-muted-foreground min-h-[60px]">
                    {memberCount > 0 ? (
                        channel.members.slice(0, 3).map(member => <p key={member._id} className="truncate">{member.name}</p>)
                    ) : <p className="italic">No members assigned</p>}
                    {memberCount > 3 && <p className="italic">...and {memberCount - 3} more</p>}
                </div>
            </div>
        </div>
    );
};

const ChannelFormModal = ({ isOpen, onOpenChange, onSubmit, agents, channelData, title, submitButtonText }: any) => {
    const [name, setName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const isEditMode = !!channelData;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && channelData) {
                setName(channelData.name || '');
                const memberIds = Array.isArray(channelData.members) ? channelData.members.map((member: HumanAgent) => member._id) : [];
                setSelectedMembers(memberIds);
            } else {
                setName('');
                setSelectedMembers([]);
            }
        }
    }, [channelData, isOpen, isEditMode]);

    const handleMemberChange = (agentId: string) => {
        setSelectedMembers(prev => prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ name, members: selectedMembers });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-background border text-foreground rounded-lg p-6 ">
                <DialogHeader className="flex flex-row justify-between items-center">
                    <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                   
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">Channel Name</Label>
                        <Input 
                            id="name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                            placeholder="e.g., Sales, Support"
                            className="bg-background placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-[#ff21b0]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Assign Agents</Label>
                        <div className="rounded-md border bg-muted/50 p-4 h-40 overflow-y-auto">
                            {agents && agents.length > 0 ? agents.map((agent: HumanAgent) => (
                                <div key={agent._id} className="flex items-center space-x-3 mb-2">
                                    <Checkbox
                                        checked={selectedMembers.includes(agent._id)}
                                        onCheckedChange={() => handleMemberChange(agent._id)}
                                    />
                                    <Label htmlFor={agent._id} className="font-normal cursor-pointer">{agent.name}</Label>
                                </div>
                            )) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-muted-foreground text-center">
                                        No agents have been created yet. You can create agents and assign them to this channel later.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-4">
                       <ButtonSmall 
                         type="button" 
                         isOutline 
                         onClick={() => onOpenChange(false)} 
                         value="Cancel" 
                         customClass="mb-0 w-[120px]"
                       />
                       <ButtonSmall 
                         type="submit" 
                         value={submitButtonText} 
                         customClass="mb-0 w-[160px]"
                       />
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const DeleteConfirmDialog = ({ isOpen, onOpenChange, onConfirm, itemName }: any) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-background border text-foreground rounded-lg p-6 ">
                <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-2">
                        This action cannot be undone. This will permanently delete the channel <span className="font-semibold text-foreground">{itemName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-end gap-4 pt-6">
                    <ButtonSmall isOutline onClick={() => onOpenChange(false)} value="Cancel" customClass="mb-0 w-[120px]" />
                    <ButtonSmall onClick={onConfirm} value="Delete" customClass="mb-0 w-[120px] bg-red-600 hover:bg-red-700" />
                </div>
            </DialogContent>
        </Dialog>
    );
};

const ComponentSkeleton = () => {
  return (<div className="col-span-full flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 dark:border-white border-[#4CAF50]"></div></div>);
};