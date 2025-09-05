import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { InputBox as Input } from '@/components/custom/inputbox/InputBox';
import CustomSelect from '../select/CustomSelect';
import { ButtonExtraSmall, ButtonSmall, IconDeleteButton } from '../button/Button';
import { Link, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { formatFileSize, getFileTypeLabel, countTextCharacters } from '@/lib/utils';
import { FiPaperclip} from "react-icons/fi";
import { CiFileOn } from "react-icons/ci";


import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { trainModel} from '../../../features/aiModel/trainModelSlice';
import toast from 'react-hot-toast';

export default function TrainModelForm() {
  const { t } = useTranslation();

  const trainModelSchema = z.object({
    name: z.string().min(2, t('trainModelPage.validation.nameRequired')),
    modelType: z.string().min(1, t('trainModelPage.validation.modelTypeRequired')),
  });

  type TrainModelFormData = z.infer<typeof trainModelSchema>;
  
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [totalChars, setTotalChars] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrainModelFormData>({
    resolver: zodResolver(trainModelSchema),
    mode: 'onChange',
    defaultValues: {
      modelType: 'gpt-4o'
    }
  });

  const dispatch = useDispatch<AppDispatch>();
  const { status } = useSelector((state: RootState) => state.trainModel);
  const navigate = useNavigate();

  const onSubmit = async (data: TrainModelFormData) => {
    if (step === 1) {
      setStep(2);
    } else {
      if (uploadedFiles.length === 0) {
        toast.error(t('trainModelPage.toast.noFilesError'));
        return;
      }
      try {
        await dispatch(
          trainModel({
            name: data.name,
            modelType: data.modelType,
            files: uploadedFiles,
          })
        ).unwrap();

        toast.success(t('trainModelPage.toast.trainSuccess'));
        setUploadedFiles([]);
        navigate("/main-menu/ai-model");
      } catch (err: any) {
        toast.error(t('trainModelPage.toast.trainError', { error: err }));
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const validFiles = Array.from(event.target.files).filter(file =>
        ['application/pdf', 'text/plain', 'application/msword', 'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type)
      );
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const validFiles = files.filter(file => ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type));
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const preventDefaults = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };

  useEffect(() => {
    const calculateTotalChars = async () => {
      const counts = await Promise.all(uploadedFiles.map(file => countTextCharacters(file).catch(() => 0)));
      setTotalChars(counts.reduce((acc, curr) => acc + curr, 0));
    };
    if (uploadedFiles.length > 0) { calculateTotalChars(); } else { setTotalChars(0); }
  }, [uploadedFiles]);

  function handleRemoveFile(idx: number): void {
    setUploadedFiles(prev => prev.filter((_, index) => index !== idx));
  }

  return (
    <div className="mx-auto max-w-6xl mt-10">
      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">{t('trainModelPage.step1.title')}</h2>
            <Input label={t('trainModelPage.step1.modelNameLabel')} {...register('name')} />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            <CustomSelect
              text={t('trainModelPage.step1.selectLlmLabel')}
              {...register('modelType')}
              options={[{ label: 'GPT-4o', value: 'gpt-4o' }]}
              error={errors.modelType?.message}
              defaultValue="gpt-4o"
            />
            <div className='flex justify-end gap-5 p-5'>
              <Link to="/main-menu/ai-model">
                <ButtonExtraSmall value={t('trainModelPage.step1.cancelButton')} isOutline />
              </Link>
              <ButtonExtraSmall value={t('trainModelPage.step1.nextButton')} type="submit" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-2">
              <h2 className="text-[22px] font-semibold text-foreground mb-6">{t('trainModelPage.step2.title')}</h2>
              <Tabs defaultValue="file" className="w-full mb-4">
                <TabsList className='w-[204px]'>
                  <TabsTrigger value="file">{t('trainModelPage.step2.fileTab')}</TabsTrigger>
                </TabsList>
              </Tabs>
              <Card
                className="min-h-[300px] border-dashed border-[#D4D8DE] dark:border-[#2C3139] border-2 flex justify-center items-center text-muted-foreground text-sm p-6"
                onDrop={handleDrop}
                onDragOver={preventDefaults}
                onDragEnter={preventDefaults}
                onDragLeave={preventDefaults}
              >
                <div className="h-full flex justify-center items-center flex-col space-y-2">
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3 text-primary">
                    <FiPaperclip className='text-[20px]' />
                    {t('trainModelPage.step2.dragAndDrop')}
                  </label>
                  <input type="file" id="file-upload" multiple onChange={handleFileChange} className="hidden" />
                  <p>{t('trainModelPage.step2.supportedFiles')}</p>
                </div>
              </Card>

              {uploadedFiles.length > 0 && (
                <div className='mt-5 space-y-2'>
                  {uploadedFiles.map((file, idx) => (
                    <div className='border-[1px] flex items-center gap-4 mt-1 text-[#101214] dark:text-[#FFFFFF] border-[#D4D8DE] dark:border-[#2C3139] w-full px-[16px] py-[12px] rounded-md' key={idx}>
                      <div><CiFileOn className='text-[32px] text-muted-foreground' /></div>
                      <div className='flex-grow'>
                        <div className='text-sm font-medium text-[#101214] dark:text-[#FFFFFF]'>{file.name}</div>
                        <div className='text-xs text-[#A3ABB8]'>
                          <span className='uppercase'>{getFileTypeLabel(file.type, file.name)}</span>
                          <span className='mx-2'>|</span>
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <div className='ml-auto'><IconDeleteButton onClick={() => handleRemoveFile(idx)} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-1 space-y-4">
              <Card className="border-[#D4D8DE] dark:border-[#2C3139] border-[1px] rounded-[8px] p-[16px]">
                <p className="text-[22px] font-500 text-center font-bold mb-[20px]">{t('trainModelPage.sidebar.title')}</p>
                <p className="text-[16px] font-500">{t('trainModelPage.sidebar.totalChars')}</p>
                <p className="text-[#A3ABB8] font-500 mb-5">{totalChars.toLocaleString()}/1,000,000</p>
                <ButtonSmall
                  value={status === 'loading' ? t('trainModelPage.sidebar.trainingButton') : t('trainModelPage.sidebar.createButton')}
                  disabled={uploadedFiles.length === 0 || status === 'loading'}
                  type='submit'
                  customClass='w-full'
                />
              </Card>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}