import { GetServerSideProps } from 'next';
import ProtectedRoute from '../lib/protected-route';

interface Booking {
    id: string;
    service: string;
    date: string;
    time: string;
}

export const getServerSideProps: GetServerSideProps<{ bookings: Booking[] }> = async () => {
    const bookings = await fetch('https://api.example.com/bookings')
        .then(res => res.json())
        .catch(() => []); // Handle errors by returning an empty array

    return {
        props: {
            bookings,
        },
    };
};

const BookingsPage = ({ bookings }: { bookings: Booking[] }) => {
    return (
        <ProtectedRoute>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Your Bookings</h1>
                {bookings.length === 0 ? (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                        <p className="text-gray-600">You don&apos;t have any bookings yet.</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {bookings.map((b) => (
                            <li key={b.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <div className="font-medium text-lg">{b.service}</div>
                                <div className="text-gray-600">
                                    {b.date} at {b.time}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </ProtectedRoute>
    );
};

export default BookingsPage;
