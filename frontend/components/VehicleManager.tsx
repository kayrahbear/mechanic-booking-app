import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import { Vehicle, NHTSAMake, NHTSAModel } from '../lib/types';

interface VehicleManagerProps {
    onVehicleAdded?: () => void;
    onVehicleUpdated?: () => void;
    onVehicleDeleted?: () => void;
}

export default function VehicleManager({ 
    onVehicleAdded, 
    onVehicleUpdated, 
    onVehicleDeleted 
}: VehicleManagerProps) {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [makes, setMakes] = useState<NHTSAMake[]>([]);
    const [models, setModels] = useState<NHTSAModel[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        vin: ''
    });

    // Load user's vehicles
    useEffect(() => {
        if (user) {
            loadVehicles();
        }
    }, [user, loadVehicles]);

    // Load makes when component mounts
    useEffect(() => {
        loadMakes();
    }, []);

    // Load models when make changes
    useEffect(() => {
        if (formData.make) {
            loadModels(formData.make);
        } else {
            setModels([]);
        }
    }, [formData.make]);

    const loadVehicles = useCallback(async () => {
        try {
            setLoading(true);
            const token = await user?.getIdToken();
            const response = await fetch('/api/vehicles/users/me/vehicles', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load vehicles');
            }

            const vehiclesData = await response.json();
            setVehicles(vehiclesData);
        } catch (err) {
            console.error('Error loading vehicles:', err);
            setError('Failed to load vehicles');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const loadMakes = async () => {
        try {
            const response = await fetch('/api/vehicles/makes');
            if (!response.ok) {
                throw new Error('Failed to load makes');
            }
            const makesData = await response.json();
            setMakes(makesData);
        } catch (err) {
            console.error('Error loading makes:', err);
            // Don't show error to user, fallback will be handled by backend
        }
    };

    const loadModels = async (make: string) => {
        try {
            const response = await fetch(`/api/vehicles/models/${encodeURIComponent(make)}`);
            if (!response.ok) {
                throw new Error('Failed to load models');
            }
            const modelsData = await response.json();
            setModels(modelsData);
        } catch (err) {
            console.error('Error loading models:', err);
            setModels([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.make || !formData.model || !formData.year) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            
            const token = await user?.getIdToken();
            const url = editingVehicle 
                ? `/api/vehicles/users/me/vehicles/${editingVehicle.id}`
                : '/api/vehicles/users/me/vehicles';
            
            const method = editingVehicle ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    make: formData.make,
                    model: formData.model,
                    year: formData.year,
                    vin: formData.vin || undefined
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save vehicle');
            }

            // Reset form and reload vehicles
            setFormData({ make: '', model: '', year: new Date().getFullYear(), vin: '' });
            setShowAddForm(false);
            setEditingVehicle(null);
            await loadVehicles();

            // Call callback
            if (editingVehicle) {
                onVehicleUpdated?.();
            } else {
                onVehicleAdded?.();
            }
        } catch (err) {
            console.error('Error saving vehicle:', err);
            setError(err instanceof Error ? err.message : 'Failed to save vehicle');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setFormData({
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            vin: vehicle.vin || ''
        });
        setShowAddForm(true);
    };

    const handleDelete = async (vehicleId: string) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) {
            return;
        }

        try {
            const token = await user?.getIdToken();
            const response = await fetch(`/api/vehicles/users/me/vehicles/${vehicleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete vehicle');
            }

            await loadVehicles();
            onVehicleDeleted?.();
        } catch (err) {
            console.error('Error deleting vehicle:', err);
            setError('Failed to delete vehicle');
        }
    };

    const handleSetPrimary = async (vehicleId: string) => {
        try {
            const token = await user?.getIdToken();
            const response = await fetch(`/api/vehicles/users/me/vehicles/${vehicleId}/primary`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to set primary vehicle');
            }

            await loadVehicles();
        } catch (err) {
            console.error('Error setting primary vehicle:', err);
            setError('Failed to set primary vehicle');
        }
    };

    const cancelForm = () => {
        setShowAddForm(false);
        setEditingVehicle(null);
        setFormData({ make: '', model: '', year: new Date().getFullYear(), vin: '' });
        setError('');
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="spinner mr-2"></div>
                <span className="text-neutral-600 dark:text-neutral-300">Loading vehicles...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Vehicle Information</h3>
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-accent-dark text-white px-4 py-2 rounded-md transition-colors"
                    >
                        Add Vehicle
                    </button>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-error dark:text-red-300 rounded-md">
                    {error}
                </div>
            )}

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">
                        {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                    </h4>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="make" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Make*
                                </label>
                                <select
                                    id="make"
                                    value={formData.make}
                                    onChange={(e) => setFormData({ ...formData, make: e.target.value, model: '' })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                    required
                                >
                                    <option value="">Select Make</option>
                                    {makes.map((make) => (
                                        <option key={make.Make_ID} value={make.Make_Name}>
                                            {make.Make_Name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="model" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Model*
                                </label>
                                <select
                                    id="model"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                    required
                                    disabled={!formData.make}
                                >
                                    <option value="">Select Model</option>
                                    {models.map((model) => (
                                        <option key={model.Model_ID} value={model.Model_Name}>
                                            {model.Model_Name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="year" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Year*
                                </label>
                                <select
                                    id="year"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                    required
                                >
                                    {Array.from({ length: 45 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="vin" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    VIN (optional)
                                </label>
                                <input
                                    id="vin"
                                    type="text"
                                    value={formData.vin}
                                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                                    maxLength={17}
                                    placeholder="17-character VIN"
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-accent-dark text-white px-4 py-2 rounded-md disabled:opacity-70 transition-colors"
                            >
                                {submitting ? 'Saving...' : (editingVehicle ? 'Update Vehicle' : 'Add Vehicle')}
                            </button>
                            <button
                                type="button"
                                onClick={cancelForm}
                                className="bg-neutral-500 hover:bg-neutral-600 text-white px-4 py-2 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Vehicles List */}
            <div className="space-y-3">
                {vehicles.length === 0 ? (
                    <p className="text-neutral-500 dark:text-neutral-400 text-center py-4">
                        No vehicles added yet. Click &quot;Add Vehicle&quot; to get started.
                    </p>
                ) : (
                    vehicles.map((vehicle) => (
                        <div
                            key={vehicle.id}
                            className={`p-4 border rounded-lg ${
                                vehicle.is_primary 
                                    ? 'border-primary bg-primary/5 dark:border-accent dark:bg-accent/5' 
                                    : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-medium text-neutral-900 dark:text-white">
                                            {vehicle.year} {vehicle.make} {vehicle.model}
                                        </h4>
                                        {vehicle.is_primary && (
                                            <span className="bg-primary dark:bg-accent text-white text-xs px-2 py-1 rounded">
                                                Primary
                                            </span>
                                        )}
                                    </div>
                                    {vehicle.vin && (
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                            VIN: {vehicle.vin}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {!vehicle.is_primary && (
                                        <button
                                            onClick={() => handleSetPrimary(vehicle.id)}
                                            className="text-sm text-primary dark:text-accent hover:underline"
                                        >
                                            Set Primary
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(vehicle)}
                                        className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(vehicle.id)}
                                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
