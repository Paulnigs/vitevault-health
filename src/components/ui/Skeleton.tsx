interface SkeletonProps {
    width?: string;
    height?: string;
    rounded?: 'sm' | 'md' | 'lg' | 'full';
    className?: string;
}

export default function Skeleton({
    width = '100%',
    height = '1rem',
    rounded = 'md',
    className = '',
}: SkeletonProps) {
    const roundedStyles = {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
    };

    return (
        <div
            className={`skeleton ${roundedStyles[rounded]} ${className}`}
            style={{ width, height }}
            aria-hidden="true"
            role="presentation"
        />
    );
}

// Preset skeleton variants
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height="0.875rem"
                    width={i === lines - 1 ? '60%' : '100%'}
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`bg-white rounded-xl shadow-md p-5 ${className}`}>
            <Skeleton height="1.5rem" width="40%" className="mb-4" />
            <SkeletonText lines={3} />
            <div className="flex gap-2 mt-4">
                <Skeleton height="2.5rem" width="6rem" rounded="lg" />
                <Skeleton height="2.5rem" width="6rem" rounded="lg" />
            </div>
        </div>
    );
}

export function SkeletonAvatar({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const sizes = {
        sm: '2rem',
        md: '3rem',
        lg: '4rem',
    };

    return (
        <Skeleton
            width={sizes[size]}
            height={sizes[size]}
            rounded="full"
            className={className}
        />
    );
}
