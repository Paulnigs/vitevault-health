'use client';

import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    options: SelectOption[];
    placeholder?: string;
    leftIcon?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            error,
            helperText,
            options,
            placeholder = 'Select an option',
            leftIcon,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-[#343A40] mb-1.5"
                    >
                        {label}
                    </label>
                )}

                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6C757D] z-10">
                            {leftIcon}
                        </div>
                    )}

                    <select
                        ref={ref}
                        id={selectId}
                        aria-invalid={!!error}
                        aria-describedby={
                            error
                                ? `${selectId}-error`
                                : helperText
                                    ? `${selectId}-helper`
                                    : undefined
                        }
                        className={`
              w-full px-4 py-3 rounded-lg border-2 text-[#343A40]
              bg-white transition-all duration-150 ease-in-out
              appearance-none cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-offset-0
              ${leftIcon ? 'pl-10' : ''}
              pr-10
              ${error
                                ? 'border-[#DC3545] focus:border-[#DC3545] focus:ring-[#DC3545]/30'
                                : 'border-gray-200 focus:border-[#007BFF] focus:ring-[#007BFF]/30'
                            }
              disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
              ${className}
            `}
                        {...props}
                    >
                        <option value="" disabled>
                            {placeholder}
                        </option>
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* Dropdown arrow */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6C757D]">
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>
                </div>

                {error && (
                    <p
                        id={`${selectId}-error`}
                        className="mt-1.5 text-sm text-[#DC3545] flex items-center gap-1"
                        role="alert"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        {error}
                    </p>
                )}

                {helperText && !error && (
                    <p id={`${selectId}-helper`} className="mt-1.5 text-sm text-[#6C757D]">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
