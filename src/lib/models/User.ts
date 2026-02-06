import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'child' | 'parent' | 'pharmacy';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    links: mongoose.Types.ObjectId[]; // Family/pharmacy connections
    linkCode: string; // Unique code for linking
    avatar?: string;
    phone?: string;
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
        },
        passwordHash: {
            type: String,
            required: [true, 'Password is required'],
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
        },
        role: {
            type: String,
            enum: ['child', 'parent', 'pharmacy'],
            required: [true, 'Role is required'],
        },
        links: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        linkCode: {
            type: String,
            unique: true,
            default: () => Math.random().toString(36).substring(2, 8).toUpperCase(),
        },
        avatar: {
            type: String,
        },
        phone: {
            type: String,
        },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ linkCode: 1 });

// Prevent model recompilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
