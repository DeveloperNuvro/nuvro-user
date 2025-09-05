import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import InputBox from '../inputbox/InputBox';
import Checkbox from '../checkbox/Checkbox';
import { Button } from '../button/Button';
import SignUpAndSignInPageComponent from '../SignUpAndSignInPageComponent/SignUpAndSignInPageComponent';
import { Link } from 'react-router-dom';
import { registerUser } from '../../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import toast from 'react-hot-toast';

const Signup = () => {
  const { t } = useTranslation();

  const signupSchema = z.object({
    name: z.string().min(2, t('signupPage.validation.nameLength')),
    email: z.string().email(t('signupPage.validation.invalidEmail')),
    password: z.string().min(6, t('signupPage.validation.passwordLength')),
    terms: z.literal(true, {
      errorMap: () => ({ message: t('signupPage.validation.termsRequired') }),
    }),
  });

  type SignupFormData = z.infer<typeof signupSchema>;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { status } = useSelector((state: RootState) => state.auth);

  const onSubmit = async (data: SignupFormData) => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'business',
      };

      const result: any = await dispatch(registerUser(payload)).unwrap();
      
      toast.success(result?.message || t('signupPage.toast.registerSuccess'));
      navigate('/signin');
  
    } catch (err: any) {
      if (err) {
        toast.error(err);
      }
    }
  };

  return (
    <div>
      <SignUpAndSignInPageComponent 
        heading={t('signupPage.heading')} 
        paragraph={t('signupPage.paragraph')}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col items-start w-full space-y-4"
        >
          <InputBox
            label={t('signupPage.form.nameLabel')}
            type="text"
            {...register('name')}
            error={errors.name?.message}
          />
          <InputBox
            label={t('signupPage.form.emailLabel')}
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <InputBox
            label={t('signupPage.form.passwordLabel')}
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />

          <Controller
            name="terms"
            control={control}
            render={({ field }) => (
              <div className="flex items-start w-full gap-3">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <p className="text-sm text-[#101214] dark:text-white">
                  {t('signupPage.form.termsPrefix')}{' '}
                  <span className="text-[#ff21b0]">{t('signupPage.form.termsLink')}</span>{' '}{t('signupPage.form.termsAnd')}{' '}
                  <span className="text-[#ff21b0]">{t('signupPage.form.privacyLink')}</span>
                </p>
              </div>
            )}
          />
          {errors.terms && (
            <p className="text-red-500 text-sm -mt-2">{errors.terms.message}</p>
          )}

          <div className="text-sm text-[#101214] dark:text-white text-center w-full">
            <Button
              value={status === 'loading' ? t('signupPage.form.creatingButton') : t('signupPage.form.getStartedButton')}
              type="submit"
              disabled={!isValid || status === 'loading'}
            />
            {t('signupPage.form.alreadyHaveAccount')}{' '}
            <Link to="/signin" className="text-[#ff21b0] hover:underline">{t('signupPage.form.signInLink')}</Link>
          </div>
        </form>
      </SignUpAndSignInPageComponent>
    </div>
  );
};

export default Signup;
Signup.displayName = 'Signup';