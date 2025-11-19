import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../button/Button';
import InputBox from '../inputbox/InputBox';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import SignUpAndSignInPageComponent from '../SignUpAndSignInPageComponent/SignUpAndSignInPageComponent';
import { api } from '@/api/axios';
import toast from 'react-hot-toast';
import { useState } from 'react';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const forgotPasswordSchema = z.object({
    email: z.string().email(t('forgotPassword.validation.invalidEmail') || 'Invalid email address'),
  });

  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      const response = await api.post('/api/v1/users/forgot-password', {
        email: data.email,
      });

      // 🔧 FIX: Always show success message (backend returns success even if email doesn't exist for security)
      if (response.data && response.data.success !== false) {
        setEmailSent(true);
        const successMessage = response.data.message || t('forgotPassword.toast.emailSent') || 'If that email exists, a password reset link has been sent.';
        toast.success(successMessage, {
          duration: 5000,
          position: 'top-center',
        });
      } else {
        // This shouldn't happen, but handle it just in case
        toast.error(response.data?.message || t('forgotPassword.toast.error') || 'Failed to send reset email');
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      // 🔧 FIX: Extract error message from different possible response structures
      let errorMessage = t('forgotPassword.toast.error') || 'Failed to send reset email';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div>
        <SignUpAndSignInPageComponent
          heading={t('forgotPassword.emailSent.heading') || 'Check Your Email'}
          paragraph={t('forgotPassword.emailSent.paragraph') || 'We\'ve sent a password reset link to your email address. Please check your inbox and follow the instructions.'}
        >
          <div className="flex flex-col items-center w-full space-y-4">
            <div className="w-full p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <p className="text-green-800 dark:text-green-200 text-sm">
                {t('forgotPassword.emailSent.message') || 'If that email exists, a password reset link has been sent. Please check your inbox and spam folder.'}
              </p>
            </div>
            <div className="text-sm text-[#101214] dark:text-white text-center w-full">
              <Button
                value={t('forgotPassword.emailSent.backToLogin') || 'Back to Login'}
                type="button"
                onClick={() => navigate('/signin')}
              />
            </div>
          </div>
        </SignUpAndSignInPageComponent>
      </div>
    );
  }

  return (
    <div>
      <SignUpAndSignInPageComponent
        heading={t('forgotPassword.heading') || 'Forgot Password'}
        paragraph={t('forgotPassword.paragraph') || 'Enter your email address and we\'ll send you a link to reset your password.'}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col items-start w-full space-y-4"
        >
          <InputBox
            label={t('forgotPassword.form.emailLabel') || 'Email Address'}
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <div className="text-sm text-[#101214] dark:text-white text-center w-full">
            <Button
              value={isLoading ? (t('forgotPassword.form.sendingButton') || 'Sending...') : (t('forgotPassword.form.sendResetLinkButton') || 'Send Reset Link')}
              type="submit"
              disabled={!isValid || isLoading}
            />
            <div className="mt-4">
              {t('forgotPassword.form.rememberPassword') || 'Remember your password?'}{' '}
              <Link to="/signin" className="text-[#ff21b0] hover:underline">
                {t('forgotPassword.form.signInLink') || 'Sign In'}
              </Link>
            </div>
          </div>
        </form>
      </SignUpAndSignInPageComponent>
    </div>
  );
};

export default ForgotPassword;

