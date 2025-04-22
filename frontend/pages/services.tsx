import { GetServerSideProps } from 'next';

interface Service {
    id: string;
    name: string;
    minutes: number;
}

export const getServerSideProps: GetServerSideProps<{ services: Service[] }> = async () => {
    const services = await fetch('https://api.example.com/services')
        .then(res => res.json())
        .catch(() => []); // Handle errors by returning an empty array

    return {
        props: {
            services,
        },
    };
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
