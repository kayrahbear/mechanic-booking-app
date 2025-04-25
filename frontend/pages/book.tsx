// frontend/pages/book.tsx
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import BookingForm from '../components/BookingForm';
import { fetchServices } from '../lib/api';
import ProtectedRoute from '../lib/protected-route';

interface Service {
    id: string;
    name: string;
    minutes: number;
    description: string;
    price: number;
}

interface BookPageProps {
    services: Service[];
}

export const getServerSideProps: GetServerSideProps<BookPageProps> = async () => {
    try {
        // Get services from API
        const services = await fetchServices();

        return {
            props: {
                services,
            },
        };
    } catch (error) {
        console.error('Error fetching services for booking page:', error);
        return {
            props: {
                services: [],
            },
        };
    }
};

export default function BookPage({ services }: BookPageProps) {
    const router = useRouter();
    const { service_id, date } = router.query;

    return (
        <ProtectedRoute>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6 text-gray-900">Book a Service</h1>

                <BookingForm
                    services={services}
                    initialServiceId={service_id as string}
                    initialDate={date as string}
                />
            </div>
        </ProtectedRoute>
    );
}