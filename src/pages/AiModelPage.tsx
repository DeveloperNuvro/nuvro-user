import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; // --- IMPORT ---
import { AppDispatch, RootState } from '@/app/store';
import { fetchAiModelsByBusinessId, deleteAIModel, AIModel } from '@/features/aiModel/trainModelSlice';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ButtonExtraSmall, IconDeleteButton } from '@/components/custom/button/Button';
import { CiFileOn } from "react-icons/ci";
import { DeleteConfirmationModal } from '../components/custom/modals/DeleteConfirmationModal'; 

// A single card component for displaying one AI model
const AIModelCard = ({ model }: { model: AIModel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(); // --- INITIALIZE ---
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteAIModel(model._id)).unwrap();
      toast.success(t('aiModelListPage.toastDeleteSuccess', { modelName: model.name }));
    } catch (err: any) {
      toast.error(t('aiModelListPage.toastDeleteError', { error: err }));
      setIsModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-[#D4D8DE] dark:border-[#2C3139] border-[1px] rounded-[8px] p-4 flex flex-col">
        <CardHeader className="p-2">
          <CardTitle className="flex justify-between items-center text-lg font-semibold">
            {model.name}
            <div className="ml-auto">
              <IconDeleteButton onClick={() => setIsModalOpen(true)} />
            </div>
          </CardTitle>
          <CardDescription className="text-sm">{t('aiModelListPage.modelTypeLabel')}: {model.modelType}</CardDescription>
        </CardHeader>
        <CardContent className="p-2 flex-grow">
          <div className="text-sm flex items-center gap-2">
              <CiFileOn /> 
              <span>{t('aiModelListPage.trainedFiles', { count: model.trainedFiles.length })}</span>
          </div>
          <p className="text-sm mt-2">{t('aiModelListPage.statusLabel')}: <span className="font-bold rounded-full px-2 py-1 text-xs bg-green-100 text-green-800">{model.status}</span></p>
        </CardContent>
        <div className="mt-4 p-2">
           <Link to={`/main-menu/ai-model/update/${model._id}`}>
              <ButtonExtraSmall value={t('aiModelListPage.editButton')} customClass="w-full" />
           </Link>
        </div>
      </Card>
      
      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        modelName={model.name}
        isLoading={isDeleting}
      />
    </>
  );
};


// The main page component that lists all models
export default function AIModelListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(); // --- INITIALIZE ---
  const { aiModels, status, error } = useSelector((state: RootState) => state.trainModel);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAiModelsByBusinessId());
    }
  }, [status, dispatch]);

  return (
    <div className="mx-auto max-w-6xl mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('aiModelListPage.title')}</h1>
        <Link to="/main-menu/ai-model/train-model">
          <ButtonExtraSmall value={t('aiModelListPage.createNewButton')} />
        </Link>
      </div>

      {status === 'loading' && aiModels.length === 0 && <p>{t('aiModelListPage.loading')}</p>}
      {status === 'failed' && <p className="text-red-500">{t('aiModelListPage.loadingError', { error })}</p>}
      
      {aiModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiModels?.map(model => (
            <AIModelCard key={model._id} model={model} />
          ))}
        </div>
      ) : (
        status !== 'loading' && (
          <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8 border-[#D4D8DE] dark:border-[#2C3139]">
             <h2 className="text-xl font-semibold">{t('aiModelListPage.noModelsTitle')}</h2>
             <p className="text-muted-foreground mt-2">{t('aiModelListPage.noModelsSubtitle')}</p>
          </div>
        )
      )}
    </div>
  );
}