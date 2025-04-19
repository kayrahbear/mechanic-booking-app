import { GetServerSideProps } from "next";
import { fetchServices } from "../lib/api";

interface Service {
    id: string;
    name: string;
    minutes: number;
}

export default function Home({ services }: { services: Service[] }) {
    return (
        <main className="p-6">
            <h1 className="text-2xl font-bold mb-4">Available Services</h1>
            <ul>
                {services.map((s) => (
                    <li key={s.id}>{s.name} – {s.minutes} min</li>
                ))}
            </ul>
        </main>
    );
}

export const getServerSideProps: GetServerSideProps<{ services: Service[] }> = async () => {
    const services = await fetchServices().catch(() => []);
    return { props: { services } };
};
