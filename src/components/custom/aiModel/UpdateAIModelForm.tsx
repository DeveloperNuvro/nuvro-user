import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { InputBox as Input } from '@/components/custom/inputbox/InputBox';
import CustomSelect from '../select/CustomSelect';
import { ButtonSmall, IconDeleteButton } from '../button/Button';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { formatFileSize, getFileTypeLabel } from '@/lib/utils';
import { FiPaperclip, FiRotateCcw } from "react-icons/fi";
import { CiFileOn } from "react-icons/ci";
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { fetchAiModelsByBusinessId, updateAIModel } from '../../../features/aiModel/trainModelSlice';
import toast from 'react-hot-toast';

const updateModelSchema = z.object({
  name: z.string().min(2, 'Model name is required'),
});
type UpdateModelFormData = z.infer<typeof updateModelSchema>;

export default function UpdateAIModelForm() {
  const { id: modelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // State for new files to add AND existing file URLs to delete
  const [newlyUploadedFiles, setNewlyUploadedFiles] = useState<File[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  const { status, aiModels } = useSelector((state: RootState) => state.trainModel);
  const modelToUpdate = aiModels.find(model => model._id === modelId);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<UpdateModelFormData>({
    resolver: zodResolver(updateModelSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (aiModels.length === 0) {
      dispatch(fetchAiModelsByBusinessId());
    }
  }, [dispatch, aiModels.length]);

  useEffect(() => {
    if (modelToUpdate) {
      reset({ name: modelToUpdate.name });
    }
  }, [modelToUpdate, reset]);

  // Handlers for managing the deletion list
  const handleMarkForDeletion = (fileUrl: string) => {
    setFilesToDelete(prev => [...prev, fileUrl]);
  };
  const handleUndoDeletion = (fileUrl: string) => {
    setFilesToDelete(prev => prev.filter(url => url !== fileUrl));
  };

  const onSubmit = async (data: UpdateModelFormData) => {
    if (!modelId || !modelToUpdate) return;
    
    const hasNameChanged = data.name !== modelToUpdate.name;
    const haveFilesBeenAdded = newlyUploadedFiles.length > 0;
    const haveFilesBeenMarkedForDeletion = filesToDelete.length > 0;

    if (!hasNameChanged && !haveFilesBeenAdded && !haveFilesBeenMarkedForDeletion) {
      return toast.error('No changes detected. Please edit the name, add new files, or remove existing ones.');
    }

    try {
      // The updateAIModel thunk handles creating FormData and stringifying the array
      await dispatch(updateAIModel({
        id: modelId,
        name: hasNameChanged ? data.name : undefined,
        files: newlyUploadedFiles,
        filesToDelete: filesToDelete,
      })).unwrap();

      toast.success('Model updated successfully!');
      navigate("/main-menu/ai-model");
      
    } catch (err: any) {
      toast.error(`Update failed: ${err}`);
    }
  };

  // --- Handlers for new file uploads ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewlyUploadedFiles(p => [...p, ...Array.from(e.target.files as FileList)]);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setNewlyUploadedFiles(p => [...p, ...Array.from(e.dataTransfer.files)]);
  };
  const handleRemoveNewFile = (idx: number) => {
    setNewlyUploadedFiles(p => p.filter((_, i) => i !== idx));
  };
  const preventDefaults = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  // --- End of new file upload handlers ---

  if (status === 'loading' && !modelToUpdate) return <div>Loading model data...</div>;
  if (status === 'failed' && !modelToUpdate) return <div>Error loading model. It may not exist.</div>;
  if (!modelToUpdate) return <div>Model not found. It might have been deleted.</div>;

  return (
    <div className="mx-auto max-w-6xl mt-10">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* MODEL INFO */}
            <h2 className="text-2xl font-semibold text-foreground mb-4">Update Model Information</h2>
            <div className="space-y-6 mb-8">
              <Input label="Model Name" {...register('name')} />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              <CustomSelect
                text="Select LLM"
                value={modelToUpdate.modelType}
                disabled={true}
                options={[
                  { label: modelToUpdate.modelType, value: modelToUpdate.modelType }
                ]}
              />
            </div>

            {/* --- MANAGE EXISTING FILES (UPDATED LOGIC) --- */}
            <h2 className="text-[22px] font-semibold text-foreground mb-4">Manage Existing Files</h2>
            <div className='space-y-2 mb-8 max-h-60 overflow-y-auto pr-2'>
              {modelToUpdate.trainedFiles.map((file) => {
                // Check if the file's URL is in the deletion list
                const isMarkedForDeletion = filesToDelete.includes(file.url);
                return (
                  <div
                    className={`border-[1px] flex items-center gap-2 text-[#101214] dark:text-[#FFFFFF] border-[#D4D8DE] dark:border-[#2C3139] w-full px-4 py-3 transition-all ${isMarkedForDeletion ? 'bg-red-50 dark:bg-red-900/20 opacity-60' : ''}`}
                    // Use the unique URL as the key
                    key={file.url}
                  >
                    <CiFileOn className='text-[30px]' />
                    <span className={`truncate ${isMarkedForDeletion ? 'line-through' : ''}`}>
                      {/* Display the real file name from the database */}
                      {file.name}
                    </span>
                    <div className='ml-auto'>
                      {isMarkedForDeletion ? (
                        <button type="button" onClick={() => handleUndoDeletion(file.url)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                           <FiRotateCcw className="text-green-600 h-5 w-5" title="Undo Delete" />
                        </button>
                      ) : (
                        // Pass the file's URL to the deletion handler
                        <IconDeleteButton onClick={() => handleMarkForDeletion(file.url)} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* ADD NEW FILES */}
            <h2 className="text-[22px] font-semibold text-foreground mb-4">Add More Files</h2>
            <Card className="min-h-[200px] border-dashed border-[#D4D8DE] dark:border-[#2C3139] border-2 flex justify-center items-center p-6" onDrop={handleDrop} onDragOver={preventDefaults}>
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3 text-primary">
                  <FiPaperclip className='text-[20px]' /> Drag & drop files here, or click to select files
                </label>
                <input type="file" id="file-upload" multiple onChange={handleFileChange} className="hidden" />
            </Card>

            {newlyUploadedFiles.length > 0 && (
              <div className='mt-5'>
                <h3 className="font-semibold mb-2">New files to be added:</h3>
                {newlyUploadedFiles.map((file, idx) => (
                  <div className='border-[1px] flex items-center gap-2 mt-1 text-[#101214] dark:text-[#FFFFFF] border-[#D4D8DE] dark:border-[#2C3139] w-full px-4 py-3' key={idx}>
                    <CiFileOn className='text-[40px]' />
                    <div>
                      <div className='text-[#101214] dark:text-[#FFFFFF]'>{file.name}</div>
                      <div className='text-[12px] text-[#A3ABB8]'>
                        <span className='uppercase'>.{getFileTypeLabel(file.type, file.name)}</span> | <span className='ml-1'>{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                    <div className='ml-auto'><IconDeleteButton onClick={() => handleRemoveNewFile(idx)} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-[#D4D8DE] dark:border-[#2C3139] border-[1px] rounded-[8px] p-[16px]">
              <p className="text-[22px] font-500 text-center font-bold mb-[20px]">Save Changes</p>
              <ButtonSmall 
                value={status === 'updating' ? 'Updating...' : 'Update AI Model'} 
                disabled={status === 'updating'} 
                type='submit' 
                customClass='w-full' 
              />
              <div className="mt-4">
                <Link to="/main-menu/ai-model">
                    <ButtonSmall value="Cancel" isOutline customClass="w-full" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}