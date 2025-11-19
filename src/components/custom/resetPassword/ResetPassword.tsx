import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../button/Button';
import InputBox from '../inputbox/InputBox';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SignUpAndSignInPageComponent from '../SignUpAndSignInPageComponent/SignUpAndSignInPageComponent';
import { api } from '@/api/axios';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    console.log('🔍 ResetPassword: Token from URL:', tokenFromUrl ? 'Found' : 'Not found');
    console.log('🔍 ResetPassword: Full URL:', window.location.href);
    console.log('🔍 ResetPassword: Search params:', Object.fromEntries(searchParams.entries()));
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      console.log('✅ ResetPassword: Token set successfully');
    } else {
      console.error('❌ ResetPassword: No token found in URL');
      toast.error(t('resetPassword.error.noToken') || 'Invalid reset link. Please request a new password reset.', {
        duration: 5000,
        position: 'top-center',
      });
      // Don't navigate immediately - let user see the error
      setTimeout(() => {
        navigate('/forgot-password');
      }, 3000); // Give user more time to read the error
    }
  }, [searchParams, navigate, t]);

  const resetPasswordSchema = z.object({
    password: z.string().min(6, t('resetPassword.validation.passwordLength') || 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, t('resetPassword.validation.confirmPasswordLength') || 'Please confirm your password'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('resetPassword.validation.passwordsDoNotMatch') || 'Passwords do not match',
    path: ['confirmPassword'],
  });

  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error(t('resetPassword.error.noToken') || 'Invalid reset link', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post('/api/v1/users/reset-password', {
        token,
        password: data.password,
      });

      // 🔧 FIX: Check for success response
      if (response.data && response.data.success !== false) {
        setPasswordReset(true);
        const successMessage = response.data.message || t('resetPassword.toast.success') || 'Password reset successfully!';
        toast.success(successMessage, {
          duration: 5000,
          position: 'top-center',
        });
        setTimeout(() => {
          navigate('/signin');
        }, 2000);
      } else {
        // Response indicates failure
        const errorMessage = response.data?.message || t('resetPassword.toast.error') || 'Failed to reset password';
        toast.error(errorMessage, {
          duration: 4000,
          position: 'top-center',
        });
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      // 🔧 FIX: Extract error message from different possible response structures
      let errorMessage = t('resetPassword.toast.error') || 'Failed to reset password';
      
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
      
      // If token is invalid or expired, redirect to forgot password
      if (err.response?.status === 400 || err.response?.status === 401) {
        setTimeout(() => {
          navigate('/forgot-password');
        }, 3000); // Give user time to read the error message
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (passwordReset) {
    return (
      <div>
        <SignUpAndSignInPageComponent
          heading={t('resetPassword.success.heading') || 'Password Reset Successful'}
          paragraph={t('resetPassword.success.paragraph') || 'Your password has been reset successfully. You can now sign in with your new password.'}
        >
          <div className="flex flex-col items-center w-full space-y-4">
            <div className="w-full p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <p className="text-green-800 dark:text-green-200 text-sm">
                {t('resetPassword.success.message') || 'Your password has been reset successfully. Redirecting to login...'}
              </p>
            </div>
            <div className="text-sm text-[#101214] dark:text-white text-center w-full">
              <Button
                value={t('resetPassword.success.goToLogin') || 'Go to Login'}
                type="button"
                onClick={() => navigate('/signin')}
              />
            </div>
          </div>
        </SignUpAndSignInPageComponent>
      </div>
    );
  }

  if (!token) {
    return null; // Will redirect in useEffect
  }

  return (
    <div>
      <SignUpAndSignInPageComponent
        heading={t('resetPassword.heading') || 'Reset Your Password'}
        paragraph={t('resetPassword.paragraph') || 'Enter your new password below.'}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col items-start w-full space-y-4"
        >
          <InputBox
            label={t('resetPassword.form.newPasswordLabel') || 'New Password'}
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          <InputBox
            label={t('resetPassword.form.confirmPasswordLabel') || 'Confirm New Password'}
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <div className="text-sm text-[#101214] dark:text-white text-center w-full">
            <Button
              value={isLoading ? (t('resetPassword.form.resettingButton') || 'Resetting...') : (t('resetPassword.form.resetPasswordButton') || 'Reset Password')}
              type="submit"
              disabled={!isValid || isLoading}
            />
            <div className="mt-4">
              <Link to="/signin" className="text-[#ff21b0] hover:underline">
                {t('resetPassword.form.backToLogin') || 'Back to Login'}
              </Link>
            </div>
          </div>
        </form>
      </SignUpAndSignInPageComponent>
    </div>
  );
};

export default ResetPassword;

