import { NextResponse } from 'next/server';

// Mock pharmacy data
const mockPharmacies = [
    {
        id: 'pharm-001',
        name: 'VitaCare Pharmacy',
        address: '123 Health Street, Lagos',
        phone: '+234 801 234 5678',
        email: 'contact@vitacare.ng',
        operatingHours: '8:00 AM - 10:00 PM',
        rating: 4.8,
        services: ['Prescription Filling', 'Home Delivery', 'Health Consultation'],
        medications: [
            { name: 'Insulin', price: 15000, inStock: true },
            { name: 'Metformin', price: 3500, inStock: true },
            { name: 'Lisinopril', price: 4200, inStock: true },
            { name: 'Atorvastatin', price: 5800, inStock: false },
        ],
    },
    {
        id: 'pharm-002',
        name: 'HealthPlus Pharmacy',
        address: '456 Wellness Avenue, Abuja',
        phone: '+234 802 345 6789',
        email: 'info@healthplus.ng',
        operatingHours: '7:00 AM - 11:00 PM',
        rating: 4.6,
        services: ['Prescription Filling', 'Vaccination', 'Lab Tests'],
        medications: [
            { name: 'Omeprazole', price: 2800, inStock: true },
            { name: 'Amoxicillin', price: 1500, inStock: true },
            { name: 'Ciprofloxacin', price: 3200, inStock: true },
            { name: 'Paracetamol', price: 500, inStock: true },
        ],
    },
    {
        id: 'pharm-003',
        name: 'MediCare Express',
        address: '789 Care Road, Port Harcourt',
        phone: '+234 803 456 7890',
        email: 'support@medicare.ng',
        operatingHours: '24 Hours',
        rating: 4.9,
        services: ['24/7 Service', 'Emergency Supplies', 'Free Consultation'],
        medications: [
            { name: 'Amlodipine', price: 2500, inStock: true },
            { name: 'Losartan', price: 4000, inStock: true },
            { name: 'Metoprolol', price: 3800, inStock: true },
            { name: 'Aspirin', price: 800, inStock: true },
        ],
    },
];

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Find pharmacy by ID
        const pharmacy = mockPharmacies.find((p) => p.id === id);

        if (!pharmacy) {
            // Return a generic pharmacy if ID not found (for demo)
            return NextResponse.json({
                pharmacy: {
                    id,
                    name: 'Demo Pharmacy',
                    address: 'Virtual Location',
                    phone: '+234 800 000 0000',
                    email: 'demo@pharmacy.ng',
                    operatingHours: '9:00 AM - 6:00 PM',
                    rating: 4.5,
                    services: ['General Services'],
                    medications: [],
                },
            });
        }

        return NextResponse.json({ pharmacy });
    } catch (error) {
        console.error('Pharmacy fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pharmacy data' },
            { status: 500 }
        );
    }
}

// Get all pharmacies (for listing)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { search, limit = 10 } = body;

        let results = mockPharmacies;

        // Filter by search term if provided
        if (search) {
            const searchLower = search.toLowerCase();
            results = mockPharmacies.filter(
                (p) =>
                    p.name.toLowerCase().includes(searchLower) ||
                    p.address.toLowerCase().includes(searchLower)
            );
        }

        return NextResponse.json({
            pharmacies: results.slice(0, limit),
            total: results.length,
        });
    } catch (error) {
        console.error('Pharmacy search error:', error);
        return NextResponse.json(
            { error: 'Failed to search pharmacies' },
            { status: 500 }
        );
    }
}
