import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI environment variable is not set! Falling back to localhost.');
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vitavault';

interface GlobalMongoose {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    // eslint-disable-next-line no-var
    var mongoose: GlobalMongoose | undefined;
}

const cached: GlobalMongoose = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
    global.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('✅ MongoDB connected successfully');
            return mongoose;
        }).catch((error) => {
            console.error('❌ MongoDB connection failed:', error.message);
            console.error('Connection string used:', MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@'));
            throw error;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
