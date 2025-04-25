import { useState } from 'react';
import { Booking } from '../lib/types';
import { format } from 'date-fns';

interface PendingAppointmentsListProps {
    bookings: Booking[];
    onApprove: (bookingId: string, notes?: string) => Promise<void>;
    onDeny: (bookingId: string, notes?: string) => Promise<void>;
    isLoading?: boolean;
}

export default function PendingAppointmentsList({
    bookings,
    onApprove,
    onDeny,
    isLoading = false
}: PendingAppointmentsListProps) {
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
    const [notes, setNotes] = useState<string>('');
    const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

    const handleExpand = (bookingId: string) => {
        if (expandedBookingId === bookingId) {
            setExpandedBookingId(null);
            setNotes('');
        } else {
            setExpandedBookingId(bookingId);
            setNotes('');
        }
    };

    const handleApprove = async (bookingId: string) => {
        setProcessingBookingId(bookingId);
        try {
            await onApprove(bookingId, notes);
            setExpandedBookingId(null);
            setNotes('');
        } finally {
            setProcessingBookingId(null);
        }
    };

    const handleDeny = async (bookingId: string) => {
        setProcessingBookingId(bookingId);
        try {
            await onDeny(bookingId, notes);
            setExpandedBookingId(null);
            setNotes('');
        } finally {
            setProcessingBookingId(null);
        }
    };

    if (bookings.length === 0) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Pending Appointments</h2>
                <p className="text-gray-500">No pending appointments to review.</p>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Pending Appointments</h2>

            <div className="space-y-4">
                {bookings.map((booking) => (
                    <div key={booking.id} className="border rounded-md overflow-hidden">
                        <div
                            className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
                            onClick={() => handleExpand(booking.id)}
                        >
                            <div>
                                <h3 className="font-medium">{booking.service_name}</h3>
                                <p className="text-sm text-gray-600">
                                    {format(new Date(booking.slot_start), 'MMM d, yyyy')} at {format(new Date(booking.slot_start), 'h:mm a')}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                    {booking.status}
                                </span>
                                <p className="text-sm text-gray-600 mt-1">{booking.customer_name}</p>
                            </div>
                        </div>

                        {expandedBookingId === booking.id && (
                            <div className="p-4 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Customer Email</p>
                                        <p>{booking.customer_email}</p>
                                    </div>
                                    {booking.customer_phone && (
                                        <div>
                                            <p className="text-sm text-gray-500">Phone</p>
                                            <p>{booking.customer_phone}</p>
                                        </div>
                                    )}
                                </div>

                                {booking.notes && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-500">Notes</p>
                                        <p className="text-gray-700">{booking.notes}</p>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label htmlFor={`notes-${booking.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                        Add notes (optional)
                                    </label>
                                    <textarea
                                        id={`notes-${booking.id}`}
                                        rows={3}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        placeholder="Add any notes about this appointment..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => handleApprove(booking.id)}
                                        disabled={isLoading || processingBookingId === booking.id}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingBookingId === booking.id ? 'Processing...' : 'Approve'}
                                    </button>
                                    <button
                                        onClick={() => handleDeny(booking.id)}
                                        disabled={isLoading || processingBookingId === booking.id}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingBookingId === booking.id ? 'Processing...' : 'Deny'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
} 