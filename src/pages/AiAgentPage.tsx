import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { 
    AIAgent,
    fetchAiAgentsByBusinessId,
    editAIAgent,
    deleteAIAgent,
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
  
  // Select state from two different slices
  const { aiAgents, status: agentStatus } = useSelector((state: RootState) => state.aiAgent);
  const { aiModels, status: modelStatus } = useSelector((state: RootState) => state.trainModel);

  const [modalState, setModalState] = useState<any>({ isOpen: false, mode: null, agent: null });
  const [formData, setFormData] = useState<Partial<AIAgent>>({});

  // Fetch data from both sources if their state is 'idle'
  useEffect(() => {
    if (agentStatus === 'idle') {
      dispatch(fetchAiAgentsByBusinessId());
    }
    if (modelStatus === 'idle') {
      dispatch(fetchAiModelsByBusinessId());
    }
  }, [dispatch, agentStatus, modelStatus]);

  const openModal = (mode: 'view' | 'edit' | 'delete', agent: AIAgent) => {
    setModalState({ isOpen: true, mode, agent });
    if (mode === 'edit') {
      setFormData({
        _id: agent._id,
        name: agent.name,
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
        dispatch(editAIAgent(formData as AIAgent)).unwrap(),
        {
            loading: 'Saving changes...',
            success: () => {
                closeModal();
                return 'Agent updated successfully!';
            },
            error: (err) => err || 'Failed to update agent.'
        }
    );
  };
  
  const handleDeleteConfirm = () => {
    if (!modalState.agent?._id) return;
    toast.promise(
        dispatch(deleteAIAgent(modalState.agent._id)).unwrap(),
        {
            loading: 'Deleting agent...',
            success: () => {
                closeModal();
                return 'Agent deleted successfully!';
            },
            error: (err) => err || 'Failed to delete agent.'
        }
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">AI Agents</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {agentStatus === "loading" && <AiAgentSkeleton />}

        {agentStatus !== "loading" && aiAgents?.map((agent) => {
          const firstWord = agent.name.split(" ")[0];
          const modelDetails = aiModels.find(m => m._id === (typeof agent.aiModel === 'object' ? agent?.aiModel._id : agent?.aiModel));
          
          return (
            <div
              key={agent._id}
              className="group rounded-xl bg-card border dark:border-[#2C3139] transition-all duration-200 overflow-hidden relative"
            >
              <div onClick={() => openModal('view', agent)} className="cursor-pointer">
                <div className="h-[180px] flex items-center justify-center bg-[#ff21b0]/90 text-white text-4xl font-bold tracking-wide">
                  {firstWord}
                </div>
                <div className="p-4">
                  <h3 className="text-base font-medium text-foreground">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">Model: {modelDetails?.name || 'Unknown'}</p>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button className="cursor-pointer" variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); openModal('edit', agent); }}><Edit className="h-4 w-4" /></Button>
                <Button className="cursor-pointer"  variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); openModal('delete', agent); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}

        {agentStatus !== "loading" && (
          <Link to="/main-menu/ai-agent/create">
            <div className="border border-dashed border-[#ff21b0] rounded-xl flex items-center justify-center min-h-[268px] hover:border-[#ff21b0] cursor-pointer transition-all duration-150">
              <Plus className="text-[#ff21b0]" size={32} />
            </div>
          </Link>
        )}
      </div>

      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {modalState.mode === 'view' && `Viewing: ${modalState.agent?.name}`}
              {modalState.mode === 'edit' && `Editing: ${modalState.agent?.name}`}
              {modalState.mode === 'delete' && 'Confirm Deletion'}
            </DialogTitle>
          </DialogHeader>

          {modalState?.mode === 'view' && modalState.agent && (
             <div className="py-4 space-y-4 text-sm">
                <div className="flex"><strong className="w-28 shrink-0">Agent Name:</strong><span>{modalState.agent.name}</span></div>
                <div className="flex"><strong className="w-28 shrink-0">Personality:</strong><span className="capitalize">{modalState.agent.personality?.tone || modalState.agent.tone}</span></div>
                <div className="flex"><strong className="w-28 shrink-0">AI Model:</strong><span>{aiModels.find(m => m._id === (typeof modalState?.agent.aiModel === 'object' ? modalState?.agent.aiModel._id : modalState?.agent.aiModel))?.name || 'Unknown'}</span></div>
                <div className="flex flex-col"><strong className="w-28 shrink-0 mb-1">Instructions:</strong><p className="text-muted-foreground bg-secondary p-2 rounded-md">{modalState.agent.personality?.instruction || 'No special instructions provided.'}</p></div>
            </div>
          )}

          {modalState.mode === 'edit' && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4"><label htmlFor="name" className="text-right">Name</label><Input id="name" name="name" value={formData.name || ''} onChange={handleFormChange} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="aiModel" className="text-right">AI Model</label>
                <Select value={typeof formData.aiModel === 'object' ? formData.aiModel._id : formData.aiModel} onValueChange={(value) => handleSelectChange('aiModel', value)}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a model" /></SelectTrigger>
                  <SelectContent>
                    {aiModels.map(model => (<SelectItem key={model._id} value={model._id}>{model.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="tone" className="text-right">Tone</label>
                <Select value={formData.tone} onValueChange={(value) => handleSelectChange('tone', value)}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a tone" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4"><label htmlFor="instruction" className="text-right pt-2">Instruction</label><Textarea id="instruction" name="instruction" value={formData.instruction || ''} onChange={handleFormChange} className="col-span-3" rows={4} placeholder="e.g., Be concise and helpful..." /></div>
            </div>
          )}

          {modalState.mode === 'delete' && (<DialogDescription className="py-4">Are you sure you want to permanently delete the agent named "{modalState.agent?.name}"? This action cannot be undone.</DialogDescription>)}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            {modalState.mode === 'edit' && <Button onClick={handleEditSubmit} disabled={agentStatus === 'loading'} className="bg-[#ff21b0] hover:bg-[#c76ba7]">Save Changes</Button>}
            {modalState.mode === 'delete' && <Button variant="destructive" onClick={handleDeleteConfirm} disabled={agentStatus === 'loading'}>Confirm Delete</Button>}
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