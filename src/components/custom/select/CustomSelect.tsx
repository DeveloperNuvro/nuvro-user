import React, { forwardRef } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: string;
};

interface CustomSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  text?: string;
  options: Option[];
  error?: string;
}

const CustomSelect = forwardRef<HTMLSelectElement, CustomSelectProps>(
  ({ label, text, options, error, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const isActive = isFocused || (!!props.value && props.value.toString().length > 0);

    return (
      <div className="space-y-1 md:w-[560px] w-full md:h-[56px]">
        {label && <Label className="text-sm">{label}</Label>}
        <select
          ref={ref}
          className={cn(
            `md:w-[560px] w-full text-[#A3ABB8] dark:text-[#A3ABB8] md:h-[56px] bg-[#FFFFFF] dark:bg-[#0D0D0D] rounded-[6px] py-[8px] px-[20px] flex outline-none
            ${isActive ? "border-[#8C52FF] dark:border-[#B9B6C1]" : "border-[#A3ABB8] dark:border-[#2C3139]"}
            border`,
            error && "border-destructive",
            className
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        >
          <option value="">{text}</option>
          {options.map((opt) => (
            <option className="text-black dark:text-white" key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
      </div>
    );
  }
);

CustomSelect.displayName = "CustomSelect";
export default CustomSelect;
