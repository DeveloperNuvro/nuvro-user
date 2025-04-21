import { forwardRef } from 'react';

type CheckboxProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'checked' | 'onChange'>;

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, ...rest }, ref) => {
    return (
      <label className="flex w-[20px] h-[20px] items-center mb-4 cursor-pointer relative">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...rest}
        />
        <span
          className={`w-[20px] h-[20px] rounded-[4px] border-[1.5px] flex items-center justify-center transition-all duration-200
            ${checked ? 'bg-[#8C52FF]' : 'bg-transparent'}
            ${checked ? 'border-[#8C52FF]' : 'border-[#8C52FF] dark:border-white'}
          `}
        >
          {checked && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
Checkbox.displayName = 'Checkbox';
