
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import InputBox from '../inputbox/InputBox';
import Checkbox from '../checkbox/Checkbox';
import { Button } from '../button/Button';
import SignUpAndSignInPageComponent from '../SignUpAndSignInPageComponent/SignUpAndSignInPageComponent';
import { Link } from 'react-router-dom';
import { registerUser } from '../../../features/auth/authSlice'; // adjust the import path as necessary
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store'; // Adjust the path to your store definition
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store'; // Adjust the path to your store definition
import toast from 'react-hot-toast';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
});

type SignupFormData = z.infer<typeof signupSchema>;

const Signup = () => {

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
  const { status} = useSelector((state: RootState) => state.auth);


  const onSubmit = async (data: SignupFormData) => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'business',
      };

      const result : any = await dispatch(registerUser(payload)).unwrap();
      console.log('✅ Registered:', result);
      console.log(status)

      toast.success(result?.message || 'Registered successfully!');
      navigate('/signin');
  
    } catch (err: any) {
      console.error('❌ Signup failed:', err);
      if (err) {
        console.log(err)
        toast.error(err);
        
      }
    }
  };

  return (
    <div>
      <SignUpAndSignInPageComponent heading='Power Up Your Conversations — Start for Free!' paragraph='Streamline support, enhance engagement, and let AI handle the rest, effortlessly.'>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col items-start w-full space-y-4"
        >
          <InputBox
            label="Name"
            type="text"
            {...register('name')}
            error={errors.name?.message}
          />
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
                  I agree to Nuvro's{' '}
                  <span className="text-[#ff21b0]">Terms & Conditions</span> and{' '}
                  <span className="text-[#ff21b0]">Privacy Policy</span>
                </p>
              </div>
            )}
          />
          {errors.terms && (
            <p className="text-red-500 text-sm -mt-2">{errors.terms.message}</p>
          )}


          <div className="text-sm text-[#101214] dark:text-white text-center w-full">
            <Button
              value={status === 'loading' ? 'Creating...' : 'Get Started'}
              type="submit"
              disabled={!isValid || status === 'loading'}
            />
            Already have an account?{' '}
            <Link to="/signin" className="text-[#ff21b0] hover:underline">Sign In</Link>
          </div>
        </form>
      </SignUpAndSignInPageComponent>
    </div>
  );
};

export default Signup;
Signup.displayName = 'Signup';
