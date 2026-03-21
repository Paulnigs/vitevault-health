import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { Users, Wallets } from '@/lib/indexedDB';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please provide email and password');
                }

                const user = Users.findByEmail(credentials.email);

                if (!user) {
                    throw new Error('No user found with this email');
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

                if (!isPasswordValid) {
                    throw new Error('Invalid password');
                }

                // Get wallet ID if parent
                let walletId: string | undefined;
                if (user.role === 'parent') {
                    const wallet = Wallets.findByOwner(user._id);
                    walletId = wallet?._id;
                }

                return {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    linkCode: user.linkCode,
                    walletId,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.linkCode = user.linkCode;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as any;
                session.user.linkCode = token.linkCode as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET || 'vitavault-offline-secret-key-2024',
};
