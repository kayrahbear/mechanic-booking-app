import { GetServerSideProps } from 'next';
import { fetchServices } from '../lib/api';

interface Service {
    id: string;
    name: string;
    minutes: number;
}

export const getServerSideProps: GetServerSideProps<{ services: Service[] }> = async () => {
    try {
        const services = await fetchServices();
        return {
            props: {
                services,
            },
        };
    } catch (error) {
        console.error('Error fetching services:', error);
        return {
            props: {
                services: [],
            },
        };
    }
};

const ServicesPage = ({ services }: { services: Service[] }) => {
    return (
        <div>
            <h1>Services Page</h1>
            <ul>
                {services.map((s) => (
                    <li key={s.id}>{s.name} – {s.minutes} min</li>
                ))}
            </ul>
        </div>
    );
};

export default ServicesPage;
