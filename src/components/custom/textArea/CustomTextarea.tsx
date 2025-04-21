import { forwardRef } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CustomTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const CustomTextarea = forwardRef<HTMLTextAreaElement, CustomTextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1 w-full">
        {label && <Label className="text-sm">{label}</Label>}
        <textarea
          ref={ref}
          className={cn(
            "w-full md:w-[560px] dark:text-[#FFFFFF] dark:border-[#2C3139] placeholder:text-[16px] h-[240px] text-[#101214] placeholder:text-[#A3ABB8] border border-[#A3ABB8] focus:border-[#8C52FF] dark:focus:border-[#B9B6C1] text-sm rounded-md px-3 py-2 resize-none min-h-[100px] outline-none",
            error && "border-destructive",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400 my-1">{error}</p>}
      </div>
    );
  }
);

CustomTextarea.displayName = "CustomTextarea";
export default CustomTextarea;
