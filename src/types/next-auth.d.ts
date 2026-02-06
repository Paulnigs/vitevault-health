import 'next-auth';
import { UserRole } from '@/lib/models/User';

declare module 'next-auth' {
    interface User {
        id: string;
        role: UserRole;
        linkCode: string;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: UserRole;
            linkCode: string;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: UserRole;
        linkCode: string;
    }
}
