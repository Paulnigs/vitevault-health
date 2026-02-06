import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMedication extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    remainingQty: number;
    totalQty: number;
    usageRate: number; // Pills per day
    refillCost: number;
    walletId: mongoose.Types.ObjectId;
    pharmacyId?: mongoose.Types.ObjectId;
    lastRefillDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Virtual
    countdownDays?: number;
}

const MedicationSchema = new Schema<IMedication>(
    {
        name: {
            type: String,
            required: [true, 'Medication name is required'],
            trim: true,
        },
        description: {
            type: String,
        },
        remainingQty: {
            type: Number,
            required: true,
            min: [0, 'Quantity cannot be negative'],
        },
        totalQty: {
            type: Number,
            required: true,
            min: [1, 'Total quantity must be at least 1'],
        },
        usageRate: {
            type: Number,
            required: true,
            min: [0.1, 'Usage rate must be positive'],
            default: 1, // 1 pill per day
        },
        refillCost: {
            type: Number,
            required: true,
            min: [0, 'Cost cannot be negative'],
        },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: [true, 'Wallet is required'],
        },
        pharmacyId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        lastRefillDate: {
            type: Date,
            default: Date.now,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: Calculate days until medication runs out
MedicationSchema.virtual('countdownDays').get(function () {
    if (this.usageRate <= 0) return 999;
    return Math.floor(this.remainingQty / this.usageRate);
});

// Indexes
MedicationSchema.index({ walletId: 1 });
MedicationSchema.index({ pharmacyId: 1 });
MedicationSchema.index({ isActive: 1 });

// Methods
MedicationSchema.methods.consumeDaily = function () {
    this.remainingQty = Math.max(0, this.remainingQty - this.usageRate);
    return this.remainingQty;
};

MedicationSchema.methods.refill = function () {
    this.remainingQty = this.totalQty;
    this.lastRefillDate = new Date();
};

const Medication: Model<IMedication> = mongoose.models.Medication || mongoose.model<IMedication>('Medication', MedicationSchema);

export default Medication;
