import { GetServerSideProps } from 'next';

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
        <div>
            <h1>Bookings Page</h1>
            <ul>
                {bookings.map((b) => (
                    <li key={b.id}>{b.service} on {b.date} at {b.time}</li>
                ))}
            </ul>
        </div>
    );
};

export default BookingsPage;
