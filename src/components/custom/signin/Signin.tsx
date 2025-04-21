
import SignUpAndSignInPageComponent from '../SignUpAndSignInPageComponent/SignUpAndSignInPageComponent'
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '../button/Button';
import InputBox from '../inputbox/InputBox';
import Checkbox from '../checkbox/Checkbox';
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '@/features/auth/authSlice';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { AppDispatch, RootState } from '@/app/store';

const signinSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    rememberMe: z.boolean().refine((val) => val !== undefined, { message: 'Remember Me is required' }),
});

type SigninFormData = z.infer<typeof signinSchema>;

const Signin = () => {

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isValid },
    } = useForm<SigninFormData>({
        resolver: zodResolver(signinSchema),
        mode: 'onChange',
    });
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { status} = useSelector((state: RootState) => state.auth);
  

     const onSubmit = async (data: SigninFormData) => {
        try {
          const payload = {
            email: data.email,
            password: data.password,
          };
    
          const result : any = await dispatch(loginUser(payload)).unwrap();
          console.log(result.data.user.onboardingCompleted);
    
          toast.success(result?.message || 'Logged in successfully!');
          if(result.data.user.onboardingCompleted
            === false) navigate('/onboarding');
          else navigate('/main-menu');
          
        } catch (err: any) {
          console.error('❌ Signin failed:', err);
          if (err) {
            console.log(err)
            toast.error(err);
            
          }
        }
      };

    return (
        <div>
            <SignUpAndSignInPageComponent heading='Welcome Back!' paragraph="Let’s power up your AI-Chatbot and grow your business effortlessly.">
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col items-start w-full space-y-4"
                >

                    <InputBox
                        label="Email"
                        type="email"
                        {...register('email')}
                        error={errors.email?.message}
                    />
                    <InputBox
                        label="Password"
                        type="password"
                        {...register('password')}
                        error={errors.password?.message}
                    />


                    <div className="flex items-center justify-between w-full mt-2 mb-2">
                        <Controller
                            name="rememberMe"
                            defaultValue={false}
                            control={control}
                            render={({ field }) => (
                                <div className="flex items-start w-full gap-3">
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    <p className="text-sm text-[#101214] dark:text-white">
                                        Remember Me

                                    </p>
                                </div>
                            )}
                        />
                        <div>
                            <Link to="/forgot-password" className="text-sm text-[#8C52FF] hover:underline">Forgot password?</Link>
                        </div>
                    </div>


                    <div className="text-sm text-[#101214] dark:text-white text-center w-full">
                        <Button value={`${status === 'loading' ? 'Signing in...' : 'Sign In'}`} type="submit" disabled={!isValid} />
                        Don’t have account?{' '}
                        <Link to="/signup" className="text-[#8C52FF] hover:underline">Sign Up</Link>
                    </div>
                </form>
            </SignUpAndSignInPageComponent>
        </div>
    )
}

export default Signin