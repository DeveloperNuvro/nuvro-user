import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { InputBox as Input } from '@/components/custom/inputbox/InputBox';
import CustomSelect from '../select/CustomSelect';
import { ButtonExtraSmall, ButtonSmall, IconDeleteButton } from '../button/Button';
import { Link, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import CustomTextarea from '../textArea/CustomTextarea';
import { formatFileSize, getFileTypeLabel, countTextCharacters } from '@/lib/utils';
import { FiPaperclip } from "react-icons/fi";
import { CiFileOn } from "react-icons/ci";


import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { trainModel } from '../../../features/aiModel/trainModelSlice';
import toast from 'react-hot-toast';



const trainModelSchema = z.object({
  name: z.string().min(2, 'Model name is required'),
  modelType: z.string().min(1, 'Model type is required'),
  // trainingData: z.string().optional(),
  file: z.instanceof(File).optional(),
});

type TrainModelFormData = z.infer<typeof trainModelSchema>;

export default function TrainModelForm() {
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [totalChars, setTotalChars] = useState(0);


  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrainModelFormData>({
    resolver: zodResolver(trainModelSchema),
    mode: 'onChange',
  });


  const dispatch = useDispatch<AppDispatch>();
  const { status } = useSelector((state: RootState) => state.trainModel);

  const navigate = useNavigate();

  const onSubmit = async(data: TrainModelFormData) => {
    if (step === 1) {
      setStep(2);
    } else {
      if (tab === 'file' && uploadedFiles.length === 0) {
        alert('Please upload at least one file.');
        return;
      }
      // if (tab === 'text' && !data.trainingData?.trim()) {
      //   alert('Please enter some training data.');
      //   return;
      // }
      try {
        const res = await dispatch(
          trainModel({
            name: data.name,
            modelType: data.modelType,
            // trainingData: tab === 'text' ? data.trainingData : undefined,
            files: tab === 'file' ? uploadedFiles : undefined,
          })
        ).unwrap();

        toast.success(res.message || 'Model trained successfully!');
        setUploadedFiles([]);
        navigate("/main-menu/ai-model");

        // Optionally redirect or reset form here
      } catch (err: any) {
        toast.error(`❌ ${err}`);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const validFiles = Array.from(event.target.files).filter(file =>
        ['application/pdf', 'text/plain', 'application/msword', 'application/zip'].includes(file.type)
      );
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const validFiles = files.filter(file =>
      ['application/pdf', 'text/plain', 'application/msword', 'application/zip'].includes(file.type)
    );
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const preventDefaults = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const calculateTotalChars = async () => {
      let total = 0;
      const counts = await Promise.all(
        uploadedFiles.map(async file => {
          try {
            return await countTextCharacters(file);
          } catch {
            return 0;
          }
        })
      );
      total = counts.reduce((acc, curr) => acc + curr, 0);
      setTotalChars(total);
    };

    if (uploadedFiles.length > 0) {
      calculateTotalChars();
    } else {
      setTotalChars(0);
    }
  }, [uploadedFiles]);

  function handleRemoveFile(idx: number): void {
    setUploadedFiles(prev => prev.filter((_, index) => index !== idx));
  }

  return (
    <div className="mx-auto max-w-6xl mt-10">
      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">Model Information</h2>
            <Input label="Model Name" {...register('name')} />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            <CustomSelect
              text="Select LLM"
              {...register('modelType')}
              options={[
                { label: 'GPT-4', value: 'GPT-4' },
                { label: 'GPT-3.5', value: 'GPT-3.5' },
              ]}
              error={errors.modelType?.message}
            />
            <div className='flex justify-end gap-5 p-5'>
              <Link to="/main-menu/ai-model">
                <ButtonExtraSmall value="Cancel" isOutline />
              </Link>
              <ButtonExtraSmall value="Next" type="submit" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-2">
              <h2 className="text-[22px] font-semibold text-foreground mb-6">Data Sources</h2>
              <Tabs defaultValue="file" className="w-full mb-4" value={tab} onValueChange={(v) => setTab(v as 'file' | 'text')}>
                <TabsList className='w-[204px]'>
                  <TabsTrigger value="file">File</TabsTrigger>
                </TabsList>
              </Tabs>
              <Card
                className="min-h-[300px] border-dashed border-[#D4D8DE] dark:border-[#2C3139] border-2 flex justify-center items-center text-muted-foreground text-sm p-6"
                onDrop={handleDrop}
                onDragOver={preventDefaults}
                onDragEnter={preventDefaults}
                onDragLeave={preventDefaults}
              >
                {tab === 'file' ? (
                  <div className="h-full flex justify-center items-center flex-col space-y-2">

                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3 text-primary">
                      <FiPaperclip className='text-[20px]' />
                      Drag & drop files here, or click to select files
                    </label>
                    <input type="file" id="file-upload" multiple onChange={handleFileChange} className="hidden" />
                    <p>Supported File Types: .pdf, .docx, .txt</p>
                  </div>
                ) : (
                  <CustomTextarea
                    placeholder="Paste your training data here..."
                    className="w-full h-full min-h-[300px] p-4 bg-background text-foreground border border-muted rounded-md focus:outline-none"
                  />
                )}
              </Card>

              {uploadedFiles.length > 0 && (
                <div className='mt-5'>
                  {uploadedFiles.map((file, idx) => (
                    <div className='border-[1px] flex items-center gap-2 mt-1 text-[#101214] dark:text-[#FFFFFF] border-[#D4D8DE] dark:border-[#2C3139] w-full px-[16px] py-[24px]' key={idx}>
                      <div>
                        <CiFileOn className='text-[40px]' />
                      </div>
                      <div>
                        <div className='text-[#101214] dark:text-[#FFFFFF]'>{file.name}</div>
                        <div className='text-[12px] text-[#A3ABB8]'>
                          <span className='uppercase'>.{getFileTypeLabel(file.type, file.name)}</span> |
                          <span className='ml-1'>{formatFileSize(file.size)}</span>
                        </div>
                      </div>

                      <div className='ml-auto'>
                        <IconDeleteButton onClick={() => handleRemoveFile(idx)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2 text-center">
                Note: If you're uploading a PDF, make sure you can select/highlight the text
              </p>
            </div>

            <div className="col-span-1 space-y-4">
              <Card className="border-[#D4D8DE] dark:border-[#2C3139] border-[1px] rounded-[8px] p-[16px]">
                <p className="text-[22px] font-500 text-center font-bold mb-[20px]">Sources</p>
                <p className="text-[16px] font-500">Total Detected Characters</p>
                <p className="text-[#A3ABB8] font-500 mb-5">{totalChars.toLocaleString()}/1,000,000</p>
                <ButtonSmall value={`${status === 'loading' ? 'Uploading...' : 'Create AI Model'}`} disabled={uploadedFiles.length === 0 || status === 'loading'} type='submit' customClass='w-full' />
              </Card>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
