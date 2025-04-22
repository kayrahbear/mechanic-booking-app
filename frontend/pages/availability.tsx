import { GetServerSideProps } from 'next';

interface Availability {
    id: string;
    date: string;
    timeSlots: string[];
}

export const getServerSideProps: GetServerSideProps<{ availability: Availability[] }> = async () => {
    const availability = await fetch('https://api.example.com/availability')
        .then(res => res.json())
        .catch(() => []); // Handle errors by returning an empty array

    return {
        props: {
            availability,
        },
    };
};

const AvailabilityPage = ({ availability }: { availability: Availability[] }) => {
    return (
        <div>
            <h1>Availability Page</h1>
            <ul>
                {availability.map((a) => (
                    <li key={a.id}>{a.date} – {a.timeSlots.join(', ')}</li>
                ))}
            </ul>
        </div>
    );
};

export default AvailabilityPage;
