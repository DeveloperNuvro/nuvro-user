import React from 'react';
import { RiDeleteBin6Line } from "react-icons/ri";


type ButtonProps = {
  value?: string;
  isOutline?: boolean;
  type?: 'button' | 'submit' | 'reset' | undefined;
  customClass?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({ value, type = "button", ...rest }: ButtonProps) => {
  return (
    <button
      type={type}
      className="
        md:h-[56px] w-full h-[40px]
        bg-[#8C52FF] rounded-[8px] px-[16px] py-[8px] mb-[10px]
        text-[16px] font-[600] text-[#FFFFFF]
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer
      "
      {...rest}
    >
      {value}
    </button>
  );
};

export const ButtonSmall = ({ value, customClass, type = "button", isOutline = false, ...rest }: ButtonProps) => {
  return (
    <button
      type={type}
      className={
        `
        ${customClass}
        ${isOutline ? 'bg-none border-[1px] border-[#8C52FF] text-[#8C52FF] ' : 'bg-[#8C52FF] text-[#FFFFFF]'}
        md:h-[46px] w-[220px]
        rounded-[8px] px-[16px] py-[8px] mb-[10px]
        text-[16px]
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer font-500
       `
      }
      {...rest}
    >
      {value}
    </button>
  );
};

export const ButtonExtraSmall = ({ value, type = "button", isOutline = false, ...rest }: ButtonProps) => {
  return (
    <button
      type={type}
      className={
        `
        ${isOutline ? 'bg-none border-[1px] border-[#8C52FF] text-[#8C52FF] ' : 'bg-[#8C52FF] text-[#FFFFFF]'}
        md:h-[40px] w-[120px]
        rounded-[8px] px-[10px] py-[8px] mb-[10px]
        text-[16px]
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer font-500
       `
      }
      {...rest}
    >
      {value}
    </button>
  );
};

export const IconDeleteButton = ({ type = "button", isOutline = false, ...rest }: ButtonProps) => {
  return (
    <button
      type={type}
      className={
        `
      bg-[#FCEDEC] dark:bg-[#E2483D]
        flex items-center justify-center
        h-[40px] w-[40px]
        rounded-[8px]  
        text-[16px]
        cursor-pointer font-500
       `
      }
      {...rest}
    >
      <RiDeleteBin6Line className='text-[#E2483D] dark:text-[#FFFFFF]  text-[22px]' />
    </button>
  );
}