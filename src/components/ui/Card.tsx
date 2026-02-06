import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
    children,
    className = '',
    hover = false,
    padding = 'md',
}: CardProps) {
    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-7',
    };

    return (
        <div
            className={`
        bg-white rounded-xl shadow-md
        ${paddingStyles[padding]}
        ${hover ? 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
}
