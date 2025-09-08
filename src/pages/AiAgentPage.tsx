// src/pages/AiAgentPage.tsx

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AppDispatch, RootState } from "@/app/store";
import { 
    AIAgent,
    fetchAiAgentsByBusinessId,
    editAIAgent,
    deleteAIAgent,
    fetchAIAgentById,
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
import { Skeleton } from "@/components/ui/skeleton";


export default function AiAgentPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  
  const { 
    aiAgents, 
    status: agentStatus, 
    selectedAgent,
    apiKey
  } = useSelector((state: RootState) => state.aiAgent);

  const { aiModels, status: modelStatus } = useSelector((state: RootState) => state.trainModel);

  const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'view' | 'edit' | 'delete' | null; agent: AIAgent | null }>({ isOpen: false, mode: null, agent: null });
  const [formData, setFormData] = useState<Partial<AIAgent>>({});

  useEffect(() => {
    if (agentStatus === 'idle') { dispatch(fetchAiAgentsByBusinessId()); }
    if (modelStatus === 'idle') { dispatch(fetchAiModelsByBusinessId()); }
  }, [dispatch, agentStatus, modelStatus]);

  const openModal = (mode: 'view' | 'edit' | 'delete', agent: AIAgent) => {
    setModalState({ isOpen: true, mode, agent });
    
    if (mode === 'view') {
        dispatch(fetchAIAgentById(agent._id));
    }

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
  
  const handleCopy = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(message);
    }).catch(() => {
      toast.error(t('aiAgentPage.toast.copyError'));
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">{t('aiAgentPage.title')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {agentStatus === "loading" && aiAgents.length === 0 && <AiAgentSkeleton />}
        {aiAgents?.map((agent) => {
          const firstWord = agent.name.split(" ")[0];
          const modelDetails = aiModels.find(m => m._id === (typeof agent.aiModel === 'object' ? agent?.aiModel._id : agent?.aiModel));
          
          return (
            <div key={agent._id} className="group rounded-xl bg-card border dark:border-[#2C3139] transition-all duration-200 overflow-hidden relative">
              <div onClick={() => openModal('view', agent)} className="cursor-pointer">
                <div className="h-[180px] flex items-center justify-center bg-[#ff21b0]/90 text-white text-4xl font-bold tracking-wide">{firstWord}</div>
                <div className="p-4">
                  <h3 className="text-base font-medium text-foreground">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">{t('aiAgentPage.modelLabel')}: {modelDetails?.name || t('aiAgentPage.unknown')}</p>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button className="cursor-pointer" variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); openModal('edit', agent); }}><Edit className="h-4 w-4" /></Button>
                <Button className="cursor-pointer" variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); openModal('delete', agent); }}><Trash2 className="h-4 w-4" /></Button>
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
              {modalState.mode === 'view' && `${t('aiAgentPage.modal.viewingTitle')}: ${modalState.agent?.name}`}
              {modalState.mode === 'edit' && `${t('aiAgentPage.modal.editingTitle')}: ${modalState.agent?.name}`}
              {modalState.mode === 'delete' && t('aiAgentPage.modal.deleteTitle')}
            </DialogTitle>
          </DialogHeader>

          {modalState?.mode === 'view' && (
             <div className="py-4 space-y-4 text-sm">
                {agentStatus === 'loading' && !selectedAgent && <ViewModalSkeleton />}
                {agentStatus === 'failed' && !selectedAgent && <p className="text-destructive">{t('aiAgentPage.toast.fetchDetailsError')}</p>}
                {agentStatus !== 'loading' && selectedAgent && apiKey && (() => {
                  
                  // Construct the script string here
                  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                  const encodedAgentName = encodeURIComponent(selectedAgent.name);
                  const scriptString = `<script src="${baseUrl}/public/widget.js?apiKey=${apiKey}&agentName=${encodedAgentName}" async></script>`;

                  return (
                    <>
                      <div className="flex"><strong className="w-28 shrink-0">{t('aiAgentPage.modal.agentName')}:</strong><span>{selectedAgent.name}</span></div>
                      <div className="flex"><strong className="w-28 shrink-0">{t('aiAgentPage.modal.personality')}:</strong><span className="capitalize">{selectedAgent.personality?.tone || selectedAgent.tone}</span></div>
                      <div className="flex"><strong className="w-28 shrink-0">{t('aiAgentPage.modal.aiModel')}:</strong><span>{aiModels.find(m => m._id === (typeof selectedAgent.aiModel === 'object' ? selectedAgent.aiModel._id : selectedAgent.aiModel))?.name || t('aiAgentPage.unknown')}</span></div>
                      <div className="flex flex-col"><strong className="w-28 shrink-0 mb-1">{t('aiAgentPage.modal.instructions')}:</strong><p className="text-muted-foreground bg-secondary p-2 rounded-md">{selectedAgent.personality?.instruction || t('aiAgentPage.modal.noInstructions')}</p></div>
                      
                      {/* Embed Script Section */}
                      <div className="flex flex-col pt-2">
                        <strong className="w-full shrink-0 mb-1">{t('aiAgentPage.modal.embedScript')}:</strong>
                        <div className="flex items-center gap-2">
                          <Textarea
                            readOnly
                            value={scriptString}
                            className="bg-secondary border-none font-mono text-xs h-20 resize-none"
                            rows={3}
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleCopy(scriptString, t('aiAgentPage.toast.copyScriptSuccess'))}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
            </div>
          )}

          {modalState.mode === 'edit' && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4"><label htmlFor="name" className="text-right">{t('aiAgentPage.form.name')}</label><Input id="name" name="name" value={formData.name || ''} onChange={handleFormChange} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="aiModel" className="text-right">{t('aiAgentPage.form.aiModel')}</label>
                <Select value={typeof formData.aiModel === 'object' ? formData.aiModel._id : formData.aiModel} onValueChange={(value) => handleSelectChange('aiModel', value)}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder={t('aiAgentPage.form.selectModel')} /></SelectTrigger>
                  <SelectContent>{aiModels.map(model => (<SelectItem key={model._id} value={model._id}>{model.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="tone" className="text-right">{t('aiAgentPage.form.tone')}</label>
                <Select value={formData.tone} onValueChange={(value) => handleSelectChange('tone', value)}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder={t('aiAgentPage.form.selectTone')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">{t('aiAgentPage.tones.friendly')}</SelectItem>
                    <SelectItem value="formal">{t('aiAgentPage.tones.formal')}</SelectItem>
                    <SelectItem value="neutral">{t('aiAgentPage.tones.neutral')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4"><label htmlFor="instruction" className="text-right pt-2">{t('aiAgentPage.form.instruction')}</label><Textarea id="instruction" name="instruction" value={formData.instruction || ''} onChange={handleFormChange} className="col-span-3" rows={4} placeholder={t('aiAgentPage.form.instructionPlaceholder')} /></div>
            </div>
          )}

          {modalState.mode === 'delete' && (<DialogDescription className="py-4">{t('aiAgentPage.modal.deleteDescription', { agentName: modalState.agent?.name })}</DialogDescription>)}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>{t('aiAgentPage.form.cancelButton')}</Button>
            {modalState.mode === 'edit' && <Button onClick={handleEditSubmit} disabled={agentStatus === 'loading'} className="bg-[#ff21b0] hover:bg-[#c76ba7]">{t('aiAgentPage.form.saveButton')}</Button>}
            {modalState.mode === 'delete' && <Button variant="destructive" onClick={handleDeleteConfirm} disabled={agentStatus === 'loading'}>{t('aiAgentPage.form.deleteButton')}</Button>}
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

const ViewModalSkeleton = () => (
    <div className="space-y-4">
        <div className="flex gap-4"><Skeleton className="h-5 w-28" /><Skeleton className="h-5 w-48" /></div>
        <div className="flex gap-4"><Skeleton className="h-5 w-28" /><Skeleton className="h-5 w-32" /></div>
        <div className="flex gap-4"><Skeleton className="h-5 w-28" /><Skeleton className="h-5 w-40" /></div>
        <div className="flex flex-col gap-2"><Skeleton className="h-5 w-28" /><Skeleton className="h-16 w-full" /></div>
        {/* Updated skeleton for the embed script */}
        <div className="flex flex-col gap-2 pt-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-20 w-full" />
        </div>
    </div>
);