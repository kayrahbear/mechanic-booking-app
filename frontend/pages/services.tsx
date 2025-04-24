import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { fetchServices } from '../lib/api';

interface Service {
    id: string;
    name: string;
    minutes: number;
    description: string;
    price: number;
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
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Our Services</h1>

            {services.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <p className="text-gray-600">No services available at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <div key={service.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="font-bold text-xl mb-2">{service.name}</h3>
                            <p className="text-gray-600 mb-4">{service.description}</p>
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-medium text-lg">${service.price}</span>
                                <span className="text-gray-600">{service.minutes} minutes</span>
                            </div>
                            <Link
                                href={`/book?service_id=${service.id}`}
                                className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md"
                            >
                                Book Now
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ServicesPage;
