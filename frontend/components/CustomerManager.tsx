import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import { NHTSAMake, NHTSAModel } from '../lib/types';

// Customer types
interface Customer {
    id: string;
    email: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    role: string;
    created_by_mechanic: boolean;
    vehicles: Vehicle[];
    invitation_status?: string;
    created_at: string;
    updated_at: string;
}

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
    user_id: string;
    is_primary: boolean;
}

interface CustomerFormData {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    vehicle_vin: string;
    send_invitation: boolean;
}

interface CustomerManagerProps {
    onCustomerAdded?: () => void;
    onCustomerUpdated?: () => void;
    onCustomerDeleted?: () => void;
}

export default function CustomerManager({ 
    onCustomerAdded, 
    onCustomerUpdated, 
    onCustomerDeleted 
}: CustomerManagerProps) {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [makes, setMakes] = useState<NHTSAMake[]>([]);
    const [models, setModels] = useState<NHTSAModel[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
    const [showInvitationDialog, setShowInvitationDialog] = useState<string | null>(null);
    const [showVehicleForm, setShowVehicleForm] = useState<string | null>(null);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [vehicleFormData, setVehicleFormData] = useState({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        vin: ''
    });

    // Form state
    const [formData, setFormData] = useState<CustomerFormData>({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: new Date().getFullYear(),
        vehicle_vin: '',
        send_invitation: false
    });

    const loadCustomers = useCallback(async () => {
        try {
            setLoading(true);
            const token = await user?.getIdToken();
            const response = await fetch('/api/customers', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load customers');
            }

            const customersData = await response.json();
            setCustomers(customersData);
        } catch (err) {
            console.error('Error loading customers:', err);
            setError('Failed to load customers');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Load customers
    useEffect(() => {
        if (user) {
            loadCustomers();
        }
    }, [user, loadCustomers]);

    // Load makes when component mounts
    useEffect(() => {
        loadMakes();
    }, []);

    // Load models when make changes
    useEffect(() => {
        if (formData.vehicle_make) {
            loadModels(formData.vehicle_make);
        } else {
            setModels([]);
        }
    }, [formData.vehicle_make]);

    // Load models when vehicle form make changes
    useEffect(() => {
        if (vehicleFormData.make) {
            loadModels(vehicleFormData.make);
        } else {
            setModels([]);
        }
    }, [vehicleFormData.make]);

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
        
        if (!formData.name || !formData.email) {
            setError('Name and email are required');
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            
            const token = await user?.getIdToken();
            const url = editingCustomer 
                ? `/api/customers/${editingCustomer.id}`
                : '/api/customers';
            
            const method = editingCustomer ? 'PUT' : 'POST';
            
            // Prepare payload
            const payload: Record<string, unknown> = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone || undefined,
                address: formData.address || undefined,
                city: formData.city || undefined,
                state: formData.state || undefined,
                zip_code: formData.zip_code || undefined
            };

            // Add vehicle information for new customers
            if (!editingCustomer) {
                if (formData.vehicle_make && formData.vehicle_model) {
                    payload.vehicle_make = formData.vehicle_make;
                    payload.vehicle_model = formData.vehicle_model;
                    payload.vehicle_year = formData.vehicle_year;
                    payload.vehicle_vin = formData.vehicle_vin || undefined;
                }
                payload.send_invitation = formData.send_invitation;
            }
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save customer');
            }

            // Reset form and reload customers
            resetForm();
            await loadCustomers();

            // Call callback
            if (editingCustomer) {
                onCustomerUpdated?.();
            } else {
                onCustomerAdded?.();
            }
        } catch (err) {
            console.error('Error saving customer:', err);
            setError(err instanceof Error ? err.message : 'Failed to save customer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            email: customer.email,
            phone: customer.phone || '',
            address: customer.address || '',
            city: customer.city || '',
            state: customer.state || '',
            zip_code: customer.zip_code || '',
            vehicle_make: '',
            vehicle_model: '',
            vehicle_year: new Date().getFullYear(),
            vehicle_vin: '',
            send_invitation: false
        });
        setShowAddForm(true);
    };

    const handleDelete = async (customerId: string) => {
        if (!confirm('Are you sure you want to delete this customer? This will also delete their vehicles and booking history.')) {
            return;
        }

        try {
            const token = await user?.getIdToken();
            const response = await fetch(`/api/customers/${customerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete customer');
            }

            await loadCustomers();
            onCustomerDeleted?.();
        } catch (err) {
            console.error('Error deleting customer:', err);
            setError('Failed to delete customer');
        }
    };

    const handleSendInvitation = async (customerId: string) => {
        try {
            const token = await user?.getIdToken();
            const response = await fetch(`/api/customers/${customerId}/invite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to send invitation');
            }

            setShowInvitationDialog(null);
            await loadCustomers();
            alert('Invitation sent successfully!');
        } catch (err) {
            console.error('Error sending invitation:', err);
            setError(err instanceof Error ? err.message : 'Failed to send invitation');
        }
    };

    const resetForm = () => {
        setShowAddForm(false);
        setEditingCustomer(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zip_code: '',
            vehicle_make: '',
            vehicle_model: '',
            vehicle_year: new Date().getFullYear(),
            vehicle_vin: '',
            send_invitation: false
        });
        setError('');
    };

    const toggleCustomerExpansion = (customerId: string) => {
        const newExpanded = new Set(expandedCustomers);
        if (newExpanded.has(customerId)) {
            newExpanded.delete(customerId);
        } else {
            newExpanded.add(customerId);
        }
        setExpandedCustomers(newExpanded);
    };

    const getInvitationStatusColor = (status?: string) => {
        switch (status) {
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'accepted': return 'text-green-600 bg-green-100';
            case 'expired': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const handleAddVehicle = (customerId: string) => {
        setShowVehicleForm(customerId);
        setEditingVehicle(null);
        setVehicleFormData({
            make: '',
            model: '',
            year: new Date().getFullYear(),
            vin: ''
        });
    };

    const handleEditVehicle = (customerId: string, vehicle: Vehicle) => {
        setShowVehicleForm(customerId);
        setEditingVehicle(vehicle);
        setVehicleFormData({
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            vin: vehicle.vin || ''
        });
    };

    const handleVehicleSubmit = async (customerId: string) => {
        if (!vehicleFormData.make || !vehicleFormData.model) {
            setError('Make and model are required');
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            
            const token = await user?.getIdToken();
            
            if (editingVehicle) {
                // Update existing vehicle
                const response = await fetch(`/api/customers/${customerId}/vehicles/${editingVehicle.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(vehicleFormData)
                });

                if (!response.ok) {
                    throw new Error('Failed to update vehicle');
                }
            } else {
                // Add new vehicle
                const response = await fetch(`/api/customers/${customerId}/vehicles`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(vehicleFormData)
                });

                if (!response.ok) {
                    throw new Error('Failed to add vehicle');
                }
            }

            // Reload customers to show updated vehicles
            await loadCustomers();
            setShowVehicleForm(null);
            setEditingVehicle(null);
            
        } catch (err) {
            console.error('Error saving vehicle:', err);
            setError(err instanceof Error ? err.message : 'Failed to save vehicle');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteVehicle = async (customerId: string, vehicleId: string) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) {
            return;
        }

        try {
            const token = await user?.getIdToken();
            const response = await fetch(`/api/customers/${customerId}/vehicles/${vehicleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete vehicle');
            }

            await loadCustomers();
        } catch (err) {
            console.error('Error deleting vehicle:', err);
            setError('Failed to delete vehicle');
        }
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <span className="text-neutral-600 dark:text-neutral-300 mt-2 block">Loading customers...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Customer Management</h3>
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-accent-dark text-white px-4 py-2 rounded-md transition-colors"
                    >
                        Add Customer
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
                <div className="bg-neutral-50 dark:bg-neutral-700 p-6 rounded-lg">
                    <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">
                        {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                    </h4>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Full Name*
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Email*
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                    required
                                    disabled={!!editingCustomer}
                                />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                />
                            </div>

                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Address
                                </label>
                                <input
                                    id="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                />
                            </div>

                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    City
                                </label>
                                <input
                                    id="city"
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                />
                            </div>

                            <div>
                                <label htmlFor="state" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    State
                                </label>
                                <input
                                    id="state"
                                    type="text"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                />
                            </div>

                            <div>
                                <label htmlFor="zip_code" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    ZIP Code
                                </label>
                                <input
                                    id="zip_code"
                                    type="text"
                                    value={formData.zip_code}
                                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                />
                            </div>
                        </div>

                        {/* Vehicle Information (only for new customers) */}
                        {!editingCustomer && (
                            <div className="border-t pt-4">
                                <h5 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                                    Vehicle Information (Optional)
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="vehicle_make" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            Make
                                        </label>
                                        <select
                                            id="vehicle_make"
                                            value={formData.vehicle_make}
                                            onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value, vehicle_model: '' })}
                                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
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
                                        <label htmlFor="vehicle_model" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            Model
                                        </label>
                                        <select
                                            id="vehicle_model"
                                            value={formData.vehicle_model}
                                            onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                            disabled={!formData.vehicle_make}
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
                                        <label htmlFor="vehicle_year" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            Year
                                        </label>
                                        <select
                                            id="vehicle_year"
                                            value={formData.vehicle_year}
                                            onChange={(e) => setFormData({ ...formData, vehicle_year: parseInt(e.target.value) })}
                                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        >
                                            {Array.from({ length: 45 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="vehicle_vin" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            VIN
                                        </label>
                                        <input
                                            id="vehicle_vin"
                                            type="text"
                                            value={formData.vehicle_vin}
                                            onChange={(e) => setFormData({ ...formData, vehicle_vin: e.target.value })}
                                            maxLength={17}
                                            placeholder="17-character VIN"
                                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Invitation Option (only for new customers) */}
                        {!editingCustomer && (
                            <div className="flex items-center space-x-2">
                                <input
                                    id="send_invitation"
                                    type="checkbox"
                                    checked={formData.send_invitation}
                                    onChange={(e) => setFormData({ ...formData, send_invitation: e.target.checked })}
                                    className="rounded border-neutral-300 text-primary focus:ring-primary dark:border-neutral-600 dark:bg-neutral-800"
                                />
                                <label htmlFor="send_invitation" className="text-sm text-neutral-700 dark:text-neutral-300">
                                    Send account invitation email to customer
                                </label>
                            </div>
                        )}

                        <div className="flex gap-2 pt-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-accent-dark text-white px-4 py-2 rounded-md disabled:opacity-70 transition-colors"
                            >
                                {submitting ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Add Customer')}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-neutral-500 hover:bg-neutral-600 text-white px-4 py-2 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Customers List */}
            <div className="space-y-3">
                {customers.length === 0 ? (
                    <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
                        No customers yet. Click &ldquo;Add Customer&rdquo; to get started.
                    </p>
                ) : (
                    customers.map((customer) => (
                        <div
                            key={customer.id}
                            className="border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded-lg"
                        >
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-medium text-neutral-900 dark:text-white">
                                                {customer.name}
                                            </h4>
                                            {customer.invitation_status && (
                                                <span className={`text-xs px-2 py-1 rounded ${getInvitationStatusColor(customer.invitation_status)}`}>
                                                    {customer.invitation_status}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                                            {customer.email}
                                        </p>
                                        {customer.phone && (
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                                                {customer.phone}
                                            </p>
                                        )}
                                        {customer.address && (
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                {customer.address}
                                                {customer.city && `, ${customer.city}`}
                                                {customer.state && `, ${customer.state}`}
                                                {customer.zip_code && ` ${customer.zip_code}`}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleCustomerExpansion(customer.id)}
                                            className="text-sm text-primary dark:text-accent hover:underline"
                                        >
                                            {expandedCustomers.has(customer.id) ? 'Hide' : 'Show'} Details
                                        </button>
                                        <button
                                            onClick={() => handleEdit(customer)}
                                            className="text-sm bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 px-3 py-1 rounded transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedCustomers.has(customer.id) && (
                                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-600">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h5 className="font-medium text-neutral-900 dark:text-white mb-2">
                                                    Account Info
                                                </h5>
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                    Created: {new Date(customer.created_at).toLocaleDateString()}
                                                </p>
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                    Role: {customer.role}
                                                </p>
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                    Created by mechanic: {customer.created_by_mechanic ? 'Yes' : 'No'}
                                                </p>
                                                <div className="mt-3 flex gap-2">
                                                    {customer.created_by_mechanic && (!customer.invitation_status || customer.invitation_status === 'expired') && (
                                                        <button
                                                            onClick={() => setShowInvitationDialog(customer.id)}
                                                            className="text-sm bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded transition-colors"
                                                        >
                                                            Send Invite
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        className="text-sm bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 px-3 py-1 rounded transition-colors"
                                                    >
                                                        Delete Customer
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h5 className="font-medium text-neutral-900 dark:text-white">
                                                        Vehicles ({customer.vehicles.length})
                                                    </h5>
                                                    <button
                                                        onClick={() => handleAddVehicle(customer.id)}
                                                        className="text-xs text-primary dark:text-accent hover:underline"
                                                    >
                                                        Add Vehicle
                                                    </button>
                                                </div>
                                                {customer.vehicles.length === 0 ? (
                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                                        No vehicles registered
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {customer.vehicles.map((vehicle) => (
                                                            <div key={vehicle.id} className="text-sm border border-neutral-200 dark:border-neutral-600 rounded p-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <span className="text-neutral-900 dark:text-white font-medium">
                                                                            {vehicle.year} {vehicle.make} {vehicle.model}
                                                                        </span>
                                                                        {vehicle.is_primary && (
                                                                            <span className="ml-2 text-xs bg-primary dark:bg-accent text-white px-1 py-0.5 rounded">
                                                                                Primary
                                                                            </span>
                                                                        )}
                                                                        {vehicle.vin && (
                                                                            <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">
                                                                                VIN: {vehicle.vin}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => handleEditVehicle(customer.id, vehicle)}
                                                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteVehicle(customer.id, vehicle.id)}
                                                                            className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Vehicle Form Modal */}
            {showVehicleForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
                            {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                        </h3>
                        
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleVehicleSubmit(showVehicleForm);
                        }} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="vehicle_make" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Make*
                                    </label>
                                    <select
                                        id="vehicle_make"
                                        value={vehicleFormData.make}
                                        onChange={(e) => {
                                            setVehicleFormData({ ...vehicleFormData, make: e.target.value, model: '' });
                                            if (e.target.value) {
                                                loadModels(e.target.value);
                                            } else {
                                                setModels([]);
                                            }
                                        }}
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
                                    <label htmlFor="vehicle_model" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Model*
                                    </label>
                                    <select
                                        id="vehicle_model"
                                        value={vehicleFormData.model}
                                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        required
                                        disabled={!vehicleFormData.make}
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
                                    <label htmlFor="vehicle_year" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Year*
                                    </label>
                                    <select
                                        id="vehicle_year"
                                        value={vehicleFormData.year}
                                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: parseInt(e.target.value) })}
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        required
                                    >
                                        {Array.from({ length: 45 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="vehicle_vin" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        VIN (optional)
                                    </label>
                                    <input
                                        id="vehicle_vin"
                                        type="text"
                                        value={vehicleFormData.vin}
                                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, vin: e.target.value })}
                                        maxLength={17}
                                        placeholder="17-character VIN"
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-accent-dark text-white px-4 py-2 rounded-md disabled:opacity-70 transition-colors"
                                >
                                    {submitting ? 'Saving...' : (editingVehicle ? 'Update Vehicle' : 'Add Vehicle')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowVehicleForm(null);
                                        setEditingVehicle(null);
                                        setError('');
                                    }}
                                    className="bg-neutral-500 hover:bg-neutral-600 text-white px-4 py-2 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invitation Confirmation Dialog */}
            {showInvitationDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg max-w-md w-full mx-4">
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
                            Send Account Invitation
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                            This will create a Firebase account for the customer and send them login credentials via email. 
                            Are you sure you want to proceed?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleSendInvitation(showInvitationDialog)}
                                className="bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-accent-dark text-white px-4 py-2 rounded-md"
                            >
                                Send Invitation
                            </button>
                            <button
                                onClick={() => setShowInvitationDialog(null)}
                                className="bg-neutral-500 hover:bg-neutral-600 text-white px-4 py-2 rounded-md"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}