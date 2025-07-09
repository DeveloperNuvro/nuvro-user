import { useEffect, useState } from 'react'; // Import useState
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppDispatch, RootState } from '@/app/store';
import { fetchAiModelsByBusinessId, deleteAIModel, AIModel } from '@/features/aiModel/trainModelSlice';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ButtonExtraSmall, IconDeleteButton } from '@/components/custom/button/Button';
import { CiFileOn } from "react-icons/ci";
import { DeleteConfirmationModal } from '../components/custom/modals/DeleteConfirmationModal'; 

// A single card component for displaying one AI model
const AIModelCard = ({ model }: { model: AIModel }) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // ✅ State to control the modal and loading status for deletion
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ This function is now passed to the modal's "onConfirm" prop
  const handleDeleteConfirm = async () => {
    setIsDeleting(true); // Show loading state
    try {
      await dispatch(deleteAIModel(model._id)).unwrap();
      // ✅ Toast message on success
      toast.success(`Model "${model.name}" deleted successfully.`);
      // No need to manually close the modal, as the component will re-render without this card
    } catch (err: any) {
      // ✅ Toast message on error
      toast.error(`❌ ${err}`);
      setIsModalOpen(false); // Close modal on error
    } finally {
      setIsDeleting(false); // Reset loading state
    }
  };

  return (
    <>
      <Card className="border-[#D4D8DE] dark:border-[#2C3139] border-[1px] rounded-[8px] p-4 flex flex-col">
        <CardHeader className="p-2">
          <CardTitle className="flex justify-between items-center text-lg font-semibold">
            {model.name}
            <div className="ml-auto">
              {/* ✅ Clicking the delete button now just opens the modal */}
              <IconDeleteButton onClick={() => setIsModalOpen(true)} />
            </div>
          </CardTitle>
          <CardDescription className="text-sm">Type: {model.modelType}</CardDescription>
        </CardHeader>
        <CardContent className="p-2 flex-grow">
          <div className="text-sm flex items-center gap-2">
              <CiFileOn /> 
              <span>{model.trainedFiles.length} Trained Files</span>
          </div>
          <p className="text-sm mt-2">Status: <span className="font-bold rounded-full px-2 py-1 text-xs bg-green-100 text-green-800">{model.status}</span></p>
        </CardContent>
        <div className="mt-4 p-2">
           <Link to={`/main-menu/ai-model/update/${model._id}`}>
              <ButtonExtraSmall value="Edit Model" customClass="w-full" />
           </Link>
        </div>
      </Card>
      
      {/* ✅ Render the modal, controlled by local state */}
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


// The main page component that lists all models (no changes needed here)
export default function AIModelListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { aiModels, status, error } = useSelector((state: RootState) => state.trainModel);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAiModelsByBusinessId());
    }
  }, [status, dispatch]);

  return (
    <div className="mx-auto max-w-6xl mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">AI Models</h1>
        <Link to="/main-menu/ai-model/train-model">
          <ButtonExtraSmall value="+ Create New" />
        </Link>
      </div>

      {status === 'loading' && aiModels.length === 0 && <p>Loading models...</p>}
      {status === 'failed' && <p className="text-red-500">Error: {error}</p>}
      
      {aiModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiModels?.map(model => (
            <AIModelCard key={model._id} model={model} />
          ))}
        </div>
      ) : (
        status !== 'loading' && (
          <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8 border-[#D4D8DE] dark:border-[#2C3139]">
             <h2 className="text-xl font-semibold">No AI Models Found</h2>
             <p className="text-muted-foreground mt-2">Click "Create New Model" to get started.</p>
          </div>
        )
      )}
    </div>
  );
}