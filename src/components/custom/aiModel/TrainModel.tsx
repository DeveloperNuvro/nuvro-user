import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { InputBox as Input } from '@/components/custom/inputbox/InputBox';
import CustomSelect from '../select/CustomSelect';
import { ButtonExtraSmall, ButtonSmall } from '../button/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { trainModel } from '../../../features/aiModel/trainModelSlice';
import toast from 'react-hot-toast';
import moment from 'moment-timezone';

export default function TrainModelForm() {
  const { t } = useTranslation();

  const trainModelSchema = z.object({
    name: z.string().min(2, t('trainModelPage.validation.nameRequired')),
    modelType: z.string().min(1, t('trainModelPage.validation.modelTypeRequired')),
    sourceDataTimezone: z.string().min(1, t('trainModelPage.validation.timezoneRequired')),
  });

  type TrainModelFormData = z.infer<typeof trainModelSchema>;

  const timezones = useMemo(() => moment.tz.names(), []);
  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrainModelFormData>({
    resolver: zodResolver(trainModelSchema),
    mode: 'onChange',
    defaultValues: {
      modelType: 'gemini-2.5-flash',
      sourceDataTimezone: userTimezone,
    },
  });

  const dispatch = useDispatch<AppDispatch>();
  const { status } = useSelector((state: RootState) => state.trainModel);
  const navigate = useNavigate();

  const onSubmit = async (data: TrainModelFormData) => {
    try {
      const created = await dispatch(
        trainModel({
          name: data.name,
          modelType: data.modelType,
          sourceDataTimezone: data.sourceDataTimezone,
          files: undefined,
        })
      ).unwrap();

      toast.success(t('trainModelPage.toast.trainSuccess'));

      const id = (created as { _id?: string })?._id;
      if (id) {
        navigate(`/main-menu/ai-model/update/${id}`);
      } else {
        navigate('/main-menu/ai-model');
      }
    } catch (err: any) {
      toast.error(t('trainModelPage.toast.trainError', { error: err }));
    }
  };

  return (
    <div className="mx-auto max-w-xl mt-10">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">{t('trainModelPage.step1.title')}</h2>

        <Input label={t('trainModelPage.step1.modelNameLabel')} {...register('name')} />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}

        <CustomSelect
          text={t('trainModelPage.step1.selectLlmLabel')}
          {...register('modelType')}
          options={[{ label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' }]}
          error={errors.modelType?.message}
          defaultValue="gemini-2.5-flash"
        />

        <CustomSelect
          text={t('trainModelPage.step1.timezoneLabel', 'Source Data Timezone')}
          {...register('sourceDataTimezone')}
          options={timezones.map((tz) => ({ label: tz, value: tz }))}
          error={errors.sourceDataTimezone?.message}
          defaultValue={userTimezone}
        />

        <p className="text-sm text-muted-foreground">
          {t('trainModelPage.step1.afterCreateHint', 'After creation you’ll be taken to the model page to train it with PDF, WooCommerce or Shopify.')}
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/main-menu/ai-model">
            <ButtonExtraSmall value={t('trainModelPage.step1.cancelButton')} isOutline />
          </Link>
          <ButtonSmall
            value={status === 'loading' ? t('trainModelPage.sidebar.trainingButton') : t('trainModelPage.sidebar.createButton')}
            disabled={status === 'loading'}
            type="submit"
            customClass="min-w-[140px]"
          />
        </div>
      </form>
    </div>
  );
}
