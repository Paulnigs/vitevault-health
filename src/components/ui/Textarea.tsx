'use client';

import { forwardRef, TextareaHTMLAttributes, useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        {
            label,
            error,
            helperText,
            className = '',
            id,
            rows = 4,
            ...props
        },
        ref
    ) => {
        const generatedId = useId();
        const textareaId = id || generatedId;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                        {label}
                    </label>
                )}

                <div className="relative">
                    <textarea
                        ref={ref}
                        id={textareaId}
                        rows={rows}
                        aria-invalid={!!error}
                        aria-describedby={
                            error
                                ? `${textareaId}-error`
                                : helperText
                                    ? `${textareaId}-helper`
                                    : undefined
                        }
                        className={`
              w-full px-4 py-3 rounded-lg border-2 text-slate-900
              bg-white transition-all duration-150 ease-in-out
              placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-offset-0 resize-y
              ${error
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/30'
                            }
              disabled:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60
              ${className}
            `}
                        {...props}
                    />
                </div>

                {error && (
                    <p
                        id={`${textareaId}-error`}
                        className="mt-1.5 text-sm text-red-500 flex items-center gap-1"
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
                    <p id={`${textareaId}-helper`} className="mt-1.5 text-sm text-slate-500">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

export default Textarea;
