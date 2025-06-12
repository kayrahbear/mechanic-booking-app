import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { getServices, Service } from '../lib/api';


export const getServerSideProps: GetServerSideProps<{ services: Service[] }> = async () => {
    console.log(`[getServerSideProps /services] Fetching services using API client`);
    try {
        const services = await getServices();
        console.log(`[getServerSideProps /services] Received ${services.length} services from backend.`);
        return {
            props: {
                services,
            },
        };
    } catch (error) {
        console.error('[getServerSideProps /services] Error fetching services from backend:', error);
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
            <h1 className="text-3xl font-bold mb-6 text-neutral-900 dark:text-white">Our Services</h1>

            {services.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg text-center">
                    <p className="text-neutral-800 dark:text-neutral-200">No services available at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <div key={service.id} className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card border border-neutral-100 dark:border-neutral-700 hover:shadow-md transition-shadow">
                            <h3 className="font-bold text-xl mb-2 text-neutral-900 dark:text-white">{service.name}</h3>
                            <p className="text-neutral-800 dark:text-neutral-200 mb-4">{service.description}</p>
                            <div className="flex justify-between items-center border-t border-neutral-100 dark:border-neutral-700 pt-4">
                                <span className="font-medium text-lg text-neutral-900 dark:text-white">${service.price}</span>
                                <span className="text-neutral-700 dark:text-neutral-300">{service.minutes} minutes</span>
                            </div>
                            <Link
                                href={`/book?service_id=${service.id}`}
                                className="mt-4 block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md"
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
