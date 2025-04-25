import { GetServerSideProps } from "next";
import { useAuth } from "../lib/auth-context";
import Link from "next/link";

export default function Home() {
    const { user, loading } = useAuth();

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4 text-neutral-900 dark:text-white">Mechanic Scheduling App</h1>
                <p className="text-xl text-neutral-800 dark:text-neutral-200 mb-8">Book your vehicle service with our expert mechanics</p>

                {!loading && (
                    user ? (
                        <div className="space-y-4">
                            <p className="text-green-700">Welcome back, {user.email}!</p>
                            <div className="flex justify-center space-x-4">
                                <Link
                                    href="/services"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Browse Services
                                </Link>
                                <Link
                                    href="/bookings"
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-base font-medium rounded-md text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                >
                                    View My Bookings
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-neutral-800 dark:text-neutral-200 mb-4">Sign in to book services and manage your appointments</p>
                            <div className="flex justify-center space-x-4">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/register"
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-base font-medium rounded-md text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                >
                                    Create Account
                                </Link>
                            </div>
                        </div>
                    )
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">Quality Service</h2>
                    <p className="text-neutral-800 dark:text-neutral-200">Our certified mechanics provide top-notch service for all vehicle makes and models.</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">Easy Scheduling</h2>
                    <p className="text-neutral-800 dark:text-neutral-200">Book appointments online in seconds with real-time availability.</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">Transparent Pricing</h2>
                    <p className="text-neutral-800 dark:text-neutral-200">Know exactly what you&apos;ll pay before you book - no surprises.</p>
                </div>
            </div>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async () => {
    return { props: {} };
};
