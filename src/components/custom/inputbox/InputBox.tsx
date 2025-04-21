import { forwardRef, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

type RegularInputProps = React.InputHTMLAttributes<HTMLInputElement>;
export type InputBoxProps = {
  label?: string;
  type?: 'text' | 'email' | 'password';
  error?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const InputBox = forwardRef<HTMLInputElement, InputBoxProps>(
  ({ label, type = 'text', error, disabled, ...rest }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isActive = isFocused || (rest.value && rest.value.toString().length > 0);

    return (
      <div
        onClick={() => setIsFocused(true)}
        className={`
          md:w-[560px] w-full md:h-[56px] relative border-[1px] mb-[22px]
          bg-[#FFFFFF] dark:bg-[#0D0D0D] rounded-[6px] py-[8px] px-[20px] flex
          ${isActive ? 'flex-col items-start border-[#8C52FF] dark:border-[#B9B6C1]' : 'flex-row items-center border-[#A3ABB8] dark:border-[#2C3139]'}
          ${error ? 'border-red-400' : ''}
          
        `}
      >
        <label
          className={`
            text-[#A3ABB8] dark:text-[#A3ABB8] font-medium transition-all w-full duration-200
            ${isActive ? 'text-[10px] mb-[2px]' : 'text-[16px]'}
          `}
        >
          {label}
        </label>

        <div className="flex items-center justify-between w-full h-full relative">
          <input
            ref={ref}
            type={type === 'password' ? (isPasswordVisible ? 'text' : 'password') : type}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              w-full h-full bg-transparent outline-none text-[#101214] dark:text-white
              text-[16px] font-medium placeholder-transparent
            `}
            {...rest}
          />

          {type === 'password' && (
            <div
              className="absolute top-1/2 right-0 -translate-y-1/2 cursor-pointer"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              {isPasswordVisible ? (
                <FiEye className="text-[20px] text-[#101214] dark:text-white" />
              ) : (
                <FiEyeOff className="text-[20px] text-[#A3ABB8]" />
              )}
            </div>
          )}
        </div>

        {error && <span className="text-red-400 text-[12px] mt-3">{error}</span>}
      </div>
    );
  }
);



export const RegularInput = ({ value, onChange, className, ...rest }: RegularInputProps) => {
  return (
    <div className={`${className} w-full md:w-[560px] flex justify-center items-center rounded-[16px] px-10`}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        {...rest}
        className="w-full md:w-[560px] h-[56px] outline-none border-[1px] border-[#A3ABB8] dark:border-[#2C3139] rounded-[6px] py-[8px] px-[20px]"
      />
    </div>
  );
};

export default InputBox;

