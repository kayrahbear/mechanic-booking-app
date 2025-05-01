import { useState } from 'react';
import { Booking } from '../lib/types';
import { format } from 'date-fns';

interface UpcomingAppointmentsListProps {
    bookings: Booking[];
    isLoading?: boolean;
}

export default function UpcomingAppointmentsList({
    bookings,
    isLoading = false
}: UpcomingAppointmentsListProps) {
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

    const handleExpand = (bookingId: string) => {
        if (expandedBookingId === bookingId) {
            setExpandedBookingId(null);
        } else {
            setExpandedBookingId(bookingId);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card border border-neutral-100 dark:border-neutral-700">
                <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Upcoming Appointments</h2>
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (bookings.length === 0) {
        return (
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card border border-neutral-100 dark:border-neutral-700">
                <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Upcoming Appointments</h2>
                <p className="text-neutral-800 dark:text-neutral-200">No upcoming appointments scheduled.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card border border-neutral-100 dark:border-neutral-700">
            <h2 className="text-xl font-semibold mb-6 text-neutral-900 dark:text-white">Upcoming Appointments</h2>

            <div className="space-y-4">
                {bookings.map((booking) => (
                    <div key={booking.id} className="border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-md overflow-hidden">
                        <div
                            className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 dark:bg-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-600"
                            onClick={() => handleExpand(booking.id)}
                        >
                            <div>
                                <h3 className="font-medium">{booking.service_name}</h3>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                    {format(new Date(booking.slot_start), 'MMM d, yyyy')} at {format(new Date(booking.slot_start), 'h:mm a')}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-900">
                                    {booking.status}
                                </span>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">{booking.customer_name}</p>
                            </div>
                        </div>

                        {expandedBookingId === booking.id && (
                            <div className="p-4 border-t border-neutral-100 dark:border-neutral-700">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Customer Email</p>
                                        <p>{booking.customer_email}</p>
                                    </div>
                                    {booking.customer_phone && (
                                        <div>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Phone</p>
                                            <p>{booking.customer_phone}</p>
                                        </div>
                                    )}
                                </div>

                                {booking.notes && (
                                    <div className="mb-4">
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Notes</p>
                                        <p className="text-neutral-800 dark:text-neutral-200">{booking.notes}</p>
                                    </div>
                                )}

                                {booking.calendar_event_id && (
                                    <div className="mb-4">
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Calendar</p>
                                        <p className="text-green-600 dark:text-green-400">
                                            <span className="inline-block mr-1">✓</span> Added to calendar
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
} 