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
    address?: string;
    operatingHours?: string;
    services?: string[];
    rating?: number;
    walletId?: mongoose.Types.ObjectId;
    notifications: {
        refillReminders: boolean;
        depositAlerts: boolean;
        connectionRequests: boolean;
        emailNotifications: boolean;
    };
    resetToken?: string;
    resetTokenExpiry?: Date;
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
        address: { type: String },
        operatingHours: { type: String },
        services: [{ type: String }],
        rating: { type: Number, default: 5.0 },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
        },
        notifications: {
            refillReminders: { type: Boolean, default: true },
            depositAlerts: { type: Boolean, default: true },
            connectionRequests: { type: Boolean, default: true },
            emailNotifications: { type: Boolean, default: false },
        },
        resetToken: { type: String },
        resetTokenExpiry: { type: Date },
    },
    {
        timestamps: true,
    }
);

// Indexes
UserSchema.index({ role: 1 });

// Prevent model recompilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
