import { useState } from 'react';
import { DaySchedule } from '../lib/types';

type WeekSchedule = {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
};

interface MechanicAvailabilityManagerProps {
    initialSchedule?: WeekSchedule;
    onSave: (schedule: WeekSchedule) => Promise<void>;
    isLoading?: boolean;
}

const defaultSchedule: WeekSchedule = {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
    saturday: { start: null, end: null },
    sunday: { start: null, end: null },
};

export default function MechanicAvailabilityManager({
    initialSchedule = defaultSchedule,
    onSave,
    isLoading = false
}: MechanicAvailabilityManagerProps) {
    const [schedule, setSchedule] = useState<WeekSchedule>(initialSchedule);
    const [isAvailable, setIsAvailable] = useState<{ [key: string]: boolean }>({
        monday: !!initialSchedule.monday.start,
        tuesday: !!initialSchedule.tuesday.start,
        wednesday: !!initialSchedule.wednesday.start,
        thursday: !!initialSchedule.thursday.start,
        friday: !!initialSchedule.friday.start,
        saturday: !!initialSchedule.saturday.start,
        sunday: !!initialSchedule.sunday.start,
    });

    const handleToggleDay = (day: string) => {
        const newIsAvailable = { ...isAvailable, [day]: !isAvailable[day] };
        setIsAvailable(newIsAvailable);

        // If toggling to unavailable, clear the times
        if (!newIsAvailable[day]) {
            setSchedule({
                ...schedule,
                [day]: { start: null, end: null }
            });
        } else {
            // If toggling to available, set default times
            setSchedule({
                ...schedule,
                [day]: { start: '09:00', end: '17:00' }
            });
        }
    };

    const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
        setSchedule({
            ...schedule,
            [day]: {
                ...schedule[day as keyof WeekSchedule],
                [field]: value
            }
        });
    };

    const handleSubmit = async () => {
        // Convert the schedule to the format expected by the API
        const finalSchedule = { ...schedule };

        // Set unavailable days to null
        Object.keys(isAvailable).forEach((day) => {
            if (!isAvailable[day]) {
                finalSchedule[day as keyof WeekSchedule] = { start: null, end: null };
            }
        });

        await onSave(finalSchedule);
    };

    const days = [
        { key: 'monday', label: 'Monday' },
        { key: 'tuesday', label: 'Tuesday' },
        { key: 'wednesday', label: 'Wednesday' },
        { key: 'thursday', label: 'Thursday' },
        { key: 'friday', label: 'Friday' },
        { key: 'saturday', label: 'Saturday' },
        { key: 'sunday', label: 'Sunday' },
    ];

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Set Your Weekly Availability</h2>

            <div className="space-y-6">
                {days.map(({ key, label }) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="w-full sm:w-1/4">
                            <label className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    checked={isAvailable[key]}
                                    onChange={() => handleToggleDay(key)}
                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                />
                                <span className="ml-2 font-medium">{label}</span>
                            </label>
                        </div>

                        {isAvailable[key] && (
                            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-3/4">
                                <div className="flex flex-col w-1/2">
                                    <label className="text-sm text-gray-600 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        value={schedule[key as keyof WeekSchedule].start || ''}
                                        onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    />
                                </div>

                                <div className="flex flex-col w-1/2">
                                    <label className="text-sm text-gray-600 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        value={schedule[key as keyof WeekSchedule].end || ''}
                                        onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8">
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Saving...' : 'Save Schedule'}
                </button>
            </div>
        </div>
    );
} 