import mongoose, { Schema, Document, Model } from 'mongoose';

export type TransactionType = 'deposit' | 'deduction';
export type ScheduleType = 'one-time' | 'daily' | 'weekly' | 'monthly';

export interface ITransaction {
    _id: mongoose.Types.ObjectId;
    amount: number;
    type: TransactionType;
    description: string;
    date: Date;
    schedule: ScheduleType;
    medicationId?: mongoose.Types.ObjectId;
    fromUserId?: mongoose.Types.ObjectId;
}

export interface IWallet extends Document {
    _id: mongoose.Types.ObjectId;
    owner: mongoose.Types.ObjectId; // Parent userId
    balance: number;
    currency: string;
    transactions: ITransaction[];
    scheduledDeposits: {
        amount: number;
        schedule: ScheduleType;
        nextDate: Date;
        fromUserId: mongoose.Types.ObjectId;
        isActive: boolean;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['deposit', 'deduction'],
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    date: {
        type: Date,
        default: Date.now,
    },
    schedule: {
        type: String,
        enum: ['one-time', 'daily', 'weekly', 'monthly'],
        default: 'one-time',
    },
    medicationId: {
        type: Schema.Types.ObjectId,
        ref: 'Medication',
    },
    fromUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
});

const WalletSchema = new Schema<IWallet>(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Owner is required'],
        },
        balance: {
            type: Number,
            default: 0,
            min: [0, 'Balance cannot be negative'],
        },
        currency: {
            type: String,
            default: 'NGN', // Nigerian Naira
        },
        transactions: [TransactionSchema],
        scheduledDeposits: [{
            amount: { type: Number, required: true },
            schedule: {
                type: String,
                enum: ['one-time', 'daily', 'weekly', 'monthly'],
                required: true,
            },
            nextDate: { type: Date, required: true },
            fromUserId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            isActive: { type: Boolean, default: true },
        }],
    },
    {
        timestamps: true,
    }
);

// Indexes
WalletSchema.index({ owner: 1 });

// Methods
WalletSchema.methods.addTransaction = function (
    amount: number,
    type: TransactionType,
    description: string,
    schedule: ScheduleType = 'one-time',
    fromUserId?: mongoose.Types.ObjectId,
    medicationId?: mongoose.Types.ObjectId
) {
    this.transactions.push({
        amount,
        type,
        description,
        date: new Date(),
        schedule,
        fromUserId,
        medicationId,
    });

    if (type === 'deposit') {
        this.balance += amount;
    } else {
        this.balance -= amount;
    }
};

const Wallet: Model<IWallet> = mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);

export default Wallet;
