import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/lib/models';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await dbConnect();

        // Find pharmacy by ID and ensure it has the correct role
        const pharmacy = await User.findOne({ _id: id, role: 'pharmacy' }).select('-password -links -linkCode -notifications -walletId');

        if (!pharmacy) {
            return NextResponse.json(
                { error: 'Pharmacy not found' },
                { status: 404 }
            );
        }

        // Transform to match expected format (if anyone consumes this)
        const pharmacyData = {
            id: pharmacy._id,
            name: pharmacy.name,
            email: pharmacy.email,
            phone: pharmacy.phone || '',
            address: pharmacy.address || '',
            operatingHours: pharmacy.operatingHours || '',
            rating: pharmacy.rating || 5.0,
            services: pharmacy.services || [],
            medications: [], // Inventory not implemented yet
        };

        return NextResponse.json({ pharmacy: pharmacyData });
    } catch (error) {
        console.error('Pharmacy fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pharmacy data' },
            { status: 500 }
        );
    }
}

// Search pharmacies
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { search, limit = 10 } = body;

        await dbConnect();

        const query: Record<string, unknown> = { role: 'pharmacy' };

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { address: searchRegex },
            ];
        }

        const pharmacies = await User.find(query)
            .select('-password -links -linkCode -notifications -walletId')
            .limit(limit);

        const formatted = pharmacies.map(p => ({
            id: p._id,
            name: p.name,
            email: p.email,
            phone: p.phone || '',
            address: p.address || '',
            operatingHours: p.operatingHours || '',
            rating: p.rating || 5.0,
            services: p.services || [],
            medications: [],
        }));

        return NextResponse.json({
            pharmacies: formatted,
            total: formatted.length,
        });
    } catch (error) {
        console.error('Pharmacy search error:', error);
        return NextResponse.json(
            { error: 'Failed to search pharmacies' },
            { status: 500 }
        );
    }
}
