import SignUpAndSignInPageComponent from '../SignUpAndSignInPageComponent/SignUpAndSignInPageComponent'
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../button/Button';
import InputBox from '../inputbox/InputBox';
import { useTranslation } from 'react-i18next';

import { Link,useNavigate} from 'react-router-dom'
import { loginUser } from '@/features/auth/authSlice';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { AppDispatch, RootState } from '@/app/store';

const Signin = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Zod schema with translated error messages
    const signinSchema = z.object({
        email: z.string().email(t('signinPage.validation.invalidEmail')),
        password: z.string().min(6, t('signinPage.validation.passwordLength')),
    });

    type SigninFormData = z.infer<typeof signinSchema>;

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm<SigninFormData>({
        resolver: zodResolver(signinSchema),
        mode: 'onChange',
    });
    const dispatch = useDispatch<AppDispatch>();
    const { status } = useSelector((state: RootState) => state.auth);

    const onSubmit = async (data: SigninFormData) => {
        try {
            const payload = {
                email: data.email,
                password: data.password,
            };

            const result: any = await dispatch(loginUser(payload)).unwrap();
            toast.success(result?.message || t('signinPage.toast.loginSuccess'));

            // 🔧 FIX: Instead of reloading, navigate to the appropriate route
            // This prevents the redirect loop issue
            if (result?.data?.user?.onboardingCompleted === true) {
                console.log("✅ Onboarding is complete. Navigating to dashboard...");
                // Determine the default route based on user role
                const defaultRoute = result?.data?.user?.role === 'agent' 
                    ? '/main-menu/agent/inbox' 
                    : '/main-menu/overview';
                
                // Use navigate instead of reload to prevent redirect loop
                setTimeout(() => {
                    navigate(defaultRoute, { replace: true });
                }, 500);
            } else {
                console.log("📝 Onboarding is incomplete. Navigating to /onboarding...");
                navigate('/onboarding', { replace: true });
            }

            

        } catch (err: any) {
            if (err) {
                toast.error(err);
            }
        }
    };

    return (
        <div>
        <SignUpAndSignInPageComponent 
                heading= { t('signinPage.heading') }
    paragraph = { t('signinPage.paragraph') }
        >
        <form
                    onSubmit={ handleSubmit(onSubmit) }
    className = "flex flex-col items-start w-full space-y-4"
        >
        <InputBox
                        label={ t('signinPage.form.emailLabel') }
    type = "email"
    {...register('email') }
    error = { errors.email?.message }
        />
        <InputBox
                        label={ t('signinPage.form.passwordLabel') }
    type = "password"
    {...register('password') }
    error = { errors.password?.message }
        />
        <div className="w-full text-right">
          <Link 
            to="/forgot-password" 
            className="text-sm text-[#ff21b0] hover:underline"
          >
            {t('signinPage.form.forgotPasswordLink') || 'Forgot Password?'}
          </Link>
        </div>
        <div className="text-sm text-[#101214] dark:text-white text-center w-full" >
            <Button 
                            value={ status === 'loading' ? t('signinPage.form.signingInButton') : t('signinPage.form.signInButton') }
    type = "submit"
    disabled = {!isValid
} 
                        />
{ t('signinPage.form.noAccountPrompt') } { ' ' }
<Link to="/signup" className = "text-[#ff21b0] hover:underline" > { t('signinPage.form.signUpLink') } </Link>
    </div>
    </form>
    </SignUpAndSignInPageComponent>
    </div>
    )
}

export default Signin;