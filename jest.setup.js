import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
        };
    },
    useParams() {
        return {};
    },
    usePathname() {
        return '';
    },
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
    useSession() {
        return {
            data: {
                user: {
                    email: 'test@example.com',
                    name: 'Test User',
                },
            },
            status: 'authenticated',
        };
    },
    signIn: jest.fn(),
    signOut: jest.fn(),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button>,
        span: ({ children, ...props }: { children: React.ReactNode }) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
    console.error = (...args: unknown[]) => {
        if (
            typeof args[0] === 'string' &&
            args[0].includes('Warning: ReactDOM.render is no longer supported')
        ) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterAll(() => {
    console.error = originalError;
});
