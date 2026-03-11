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

export interface ILockedFund {
    _id: mongoose.Types.ObjectId;
    medicationId?: mongoose.Types.ObjectId;
    medicationName: string;
    amount: number;
    lockedAt: Date;
    unlocksAt: Date;
    isActive: boolean;
}

export interface IWallet extends Document {
    _id: mongoose.Types.ObjectId;
    owner: mongoose.Types.ObjectId; // Parent userId
    balance: number;
    currency: string;
    transactions: ITransaction[];
    lockedFunds: ILockedFund[];
    scheduledDeposits: {
        amount: number;
        schedule: ScheduleType;
        nextDate: Date;
        fromUserId: mongoose.Types.ObjectId;
        isActive: boolean;
    }[];
    createdAt: Date;
    updatedAt: Date;
    // Virtual property: Total balance minus active locked funds
    readonly availableBalance?: number;
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

const LockedFundSchema = new Schema<ILockedFund>({
    medicationId: {
        type: Schema.Types.ObjectId,
        ref: 'Medication',
    },
    medicationName: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    lockedAt: {
        type: Date,
        default: Date.now,
    },
    unlocksAt: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
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
        lockedFunds: [LockedFundSchema],
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

// Helper: Get available balance (Total - Active Locked Funds)
WalletSchema.virtual('availableBalance').get(function () {
    const lockedTotal = this.lockedFunds
        .filter((fund) => fund.isActive && fund.unlocksAt > new Date())
        .reduce((sum, fund) => sum + fund.amount, 0);
    return Math.max(0, this.balance - lockedTotal);
});

WalletSchema.set('toJSON', { virtuals: true });
WalletSchema.set('toObject', { virtuals: true });

const Wallet: Model<IWallet> = mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);

export default Wallet;
