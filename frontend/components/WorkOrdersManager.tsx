import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import { 
    WorkOrder, 
    WorkOrderStatus, 
    PartStatus, 
    WorkOrderCreate, 
    WorkOrderPart, 
    WorkOrderLabor,
    FirestoreUser 
} from '../lib/types';
import { 
    getWorkOrders, 
    createWorkOrder, 
    updateWorkOrder, 
    deleteWorkOrder 
} from '../lib/api';
import PartsInventoryManager from './PartsInventoryManager';
import PhotoUpload from './PhotoUpload';

interface WorkOrdersManagerProps {
    onWorkOrderAdded?: () => void;
    onWorkOrderUpdated?: () => void;
}

const statusColors = {
    [WorkOrderStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [WorkOrderStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [WorkOrderStatus.WAITING_FOR_PARTS]: 'bg-yellow-100 text-yellow-800',
    [WorkOrderStatus.WORK_COMPLETED]: 'bg-green-100 text-green-800',
};

const statusLabels = {
    [WorkOrderStatus.DRAFT]: 'Draft',
    [WorkOrderStatus.IN_PROGRESS]: 'In Progress',
    [WorkOrderStatus.WAITING_FOR_PARTS]: 'Waiting for Parts',
    [WorkOrderStatus.WORK_COMPLETED]: 'Completed',
};

export default function WorkOrdersManager({ onWorkOrderAdded, onWorkOrderUpdated }: WorkOrdersManagerProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'workorders' | 'inventory'>('workorders');
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [customers, setCustomers] = useState<FirestoreUser[]>([]);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all');

    // Load work orders
    const loadWorkOrders = useCallback(async () => {
        if (!user) return;
        
        try {
            setIsLoading(true);
            setError(null);
            const workOrdersData = await getWorkOrders();
            setWorkOrders(workOrdersData);
        } catch (err) {
            console.error('Error loading work orders:', err);
            setError('Failed to load work orders');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Load customers for the work order form
    const loadCustomers = useCallback(async () => {
        if (!user) return;
        
        try {
            // We'll need to create a customers API endpoint similar to other components
            // For now, we'll use a placeholder
            setCustomers([]);
        } catch (err) {
            console.error('Error loading customers:', err);
        }
    }, [user]);

    useEffect(() => {
        loadWorkOrders();
        loadCustomers();
    }, [loadWorkOrders, loadCustomers]);

    const filteredWorkOrders = workOrders.filter(wo => 
        statusFilter === 'all' || wo.status === statusFilter
    );

    const handleCreateWorkOrder = () => {
        setSelectedWorkOrder(null);
        setIsCreateModalOpen(true);
    };

    const handleEditWorkOrder = (workOrder: WorkOrder) => {
        setSelectedWorkOrder(workOrder);
        setIsEditModalOpen(true);
    };

    const handleViewWorkOrder = (workOrder: WorkOrder) => {
        setSelectedWorkOrder(workOrder);
        setIsViewModalOpen(true);
    };

    const handlePhotosUpdate = async (workOrderId: string, photos: string[]) => {
        try {
            // Update the work order with new photos
            await updateWorkOrder(workOrderId, { photos });
            // Reload work orders to get updated data
            await loadWorkOrders();
        } catch (err) {
            console.error('Error updating photos:', err);
            setError('Failed to update photos');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary dark:border-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                        Work Orders & Inventory
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400">
                        Manage service appointments and parts inventory
                    </p>
                </div>
                {activeTab === 'workorders' && (
                    <button
                        onClick={handleCreateWorkOrder}
                        className="inline-flex items-center px-4 py-2 bg-primary dark:bg-accent text-white font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-accent/90 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Work Order
                    </button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-neutral-200 dark:border-neutral-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('workorders')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'workorders'
                                ? 'border-primary dark:border-accent text-primary dark:text-accent'
                                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                    >
                        Work Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'inventory'
                                ? 'border-primary dark:border-accent text-primary dark:text-accent'
                                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                    >
                        Parts Inventory
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'workorders' ? (
                <>
                    {/* Error display */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Status:
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | 'all')}
                        className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
                    >
                        <option value="all">All Statuses</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    {filteredWorkOrders.length} work order{filteredWorkOrders.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Work Orders List */}
            <div className="grid gap-4">
                {filteredWorkOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-neutral-400 dark:text-neutral-600 text-6xl mb-4">🔧</div>
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                            No work orders found
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                            {statusFilter === 'all' 
                                ? 'Create your first work order to get started.'
                                : `No work orders with status "${statusLabels[statusFilter as WorkOrderStatus]}".`
                            }
                        </p>
                        {statusFilter === 'all' && (
                            <button
                                onClick={handleCreateWorkOrder}
                                className="inline-flex items-center px-4 py-2 bg-primary dark:bg-accent text-white font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-accent/90 transition-colors"
                            >
                                Create Work Order
                            </button>
                        )}
                    </div>
                ) : (
                    filteredWorkOrders.map((workOrder) => (
                        <div
                            key={workOrder.id}
                            className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                            {workOrder.work_order_number}
                                        </h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[workOrder.status]}`}>
                                            {statusLabels[workOrder.status]}
                                        </span>
                                        {!workOrder.is_editable && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                                                Read Only
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-md font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                                        {workOrder.title}
                                    </h4>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                                        {workOrder.description}
                                    </p>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-neutral-500 dark:text-neutral-400">Customer:</span>
                                            <div className="font-medium text-neutral-900 dark:text-white">
                                                {workOrder.customer_id}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-neutral-500 dark:text-neutral-400">Vehicle:</span>
                                            <div className="font-medium text-neutral-900 dark:text-white">
                                                {workOrder.vehicle_id}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-neutral-500 dark:text-neutral-400">Mileage:</span>
                                            <div className="font-medium text-neutral-900 dark:text-white">
                                                {workOrder.mileage.toLocaleString()} mi
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-neutral-500 dark:text-neutral-400">Total Cost:</span>
                                            <div className="font-medium text-neutral-900 dark:text-white">
                                                {formatCurrency(workOrder.total_cost)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-neutral-500 dark:text-neutral-400">Parts ({workOrder.parts.length}):</span>
                                            <div className="font-medium text-neutral-900 dark:text-white">
                                                {formatCurrency(workOrder.parts_total)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-neutral-500 dark:text-neutral-400">Labor ({workOrder.labor_entries.length}):</span>
                                            <div className="font-medium text-neutral-900 dark:text-white">
                                                {formatCurrency(workOrder.labor_total)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-neutral-500 dark:text-neutral-400">Created:</span>
                                            <div className="font-medium text-neutral-900 dark:text-white">
                                                {formatDate(workOrder.created_at)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-neutral-500 dark:text-neutral-400">Photos:</span>
                                            <div className="font-medium text-neutral-900 dark:text-white">
                                                {workOrder.photos.length}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                    <button
                                        onClick={() => handleViewWorkOrder(workOrder)}
                                        className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                        title="View Details"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    {workOrder.is_editable && (
                                        <button
                                            onClick={() => handleEditWorkOrder(workOrder)}
                                            className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                            title="Edit Work Order"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

                    {/* Modals would go here - Create and Edit modals */}
                    {/* For now, we'll show a placeholder */}
                    {(isCreateModalOpen || isEditModalOpen) && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                        {isCreateModalOpen ? 'Create Work Order' : 'Edit Work Order'}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setIsCreateModalOpen(false);
                                            setIsEditModalOpen(false);
                                        }}
                                        className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="text-center py-8">
                                    <p className="text-neutral-600 dark:text-neutral-400">
                                        Work Order form coming next...
                                    </p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
                                        This will include customer/vehicle selection, parts tracking, labor entries, and photo uploads.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detailed Work Order View Modal */}
                    {isViewModalOpen && selectedWorkOrder && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                            {selectedWorkOrder.work_order_number}
                                        </h3>
                                        <p className="text-neutral-600 dark:text-neutral-400">
                                            {selectedWorkOrder.title}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsViewModalOpen(false)}
                                        className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Work Order Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700 pb-2">
                                                Work Order Information
                                            </h4>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-500 dark:text-neutral-400">Status:</span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedWorkOrder.status]}`}>
                                                        {statusLabels[selectedWorkOrder.status]}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-500 dark:text-neutral-400">Customer:</span>
                                                    <span className="font-medium">{selectedWorkOrder.customer_id}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-500 dark:text-neutral-400">Vehicle:</span>
                                                    <span className="font-medium">{selectedWorkOrder.vehicle_id}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-500 dark:text-neutral-400">Mileage:</span>
                                                    <span className="font-medium">{selectedWorkOrder.mileage.toLocaleString()} mi</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-500 dark:text-neutral-400">Created:</span>
                                                    <span className="font-medium">{formatDate(selectedWorkOrder.created_at)}</span>
                                                </div>
                                                {selectedWorkOrder.completed_at && (
                                                    <div className="flex justify-between">
                                                        <span className="text-neutral-500 dark:text-neutral-400">Completed:</span>
                                                        <span className="font-medium">{formatDate(selectedWorkOrder.completed_at)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700 pb-2">
                                                Cost Breakdown
                                            </h4>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-500 dark:text-neutral-400">Parts ({selectedWorkOrder.parts.length}):</span>
                                                    <span className="font-medium">{formatCurrency(selectedWorkOrder.parts_total)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-500 dark:text-neutral-400">Labor ({selectedWorkOrder.labor_entries.length}):</span>
                                                    <span className="font-medium">{formatCurrency(selectedWorkOrder.labor_total)}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-2">
                                                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Total:</span>
                                                    <span className="font-bold text-lg">{formatCurrency(selectedWorkOrder.total_cost)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {selectedWorkOrder.description && (
                                        <div>
                                            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                                Description
                                            </h4>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg">
                                                {selectedWorkOrder.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Mechanic Notes */}
                                    {selectedWorkOrder.mechanic_notes && (
                                        <div>
                                            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                                Mechanic Notes
                                            </h4>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg">
                                                {selectedWorkOrder.mechanic_notes}
                                            </p>
                                        </div>
                                    )}

                                    {/* Parts List */}
                                    {selectedWorkOrder.parts.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                                                Parts Used
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedWorkOrder.parts.map((part, index) => (
                                                    <div key={index} className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                                                        <div>
                                                            <div className="font-medium text-sm">{part.part_name}</div>
                                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                Qty: {part.quantity_used}/{part.quantity_needed} • {formatCurrency(part.unit_cost)} each
                                                            </div>
                                                        </div>
                                                        <div className="text-sm font-medium">
                                                            {formatCurrency(part.total_cost)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Labor Entries */}
                                    {selectedWorkOrder.labor_entries.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                                                Labor
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedWorkOrder.labor_entries.map((labor, index) => (
                                                    <div key={index} className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                                                        <div>
                                                            <div className="font-medium text-sm">{labor.description}</div>
                                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                {labor.hours} hours • {formatCurrency(labor.hourly_rate)}/hour
                                                            </div>
                                                        </div>
                                                        <div className="text-sm font-medium">
                                                            {formatCurrency(labor.total_cost)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Photo Upload Section */}
                                    <div>
                                        <PhotoUpload
                                            workOrderId={selectedWorkOrder.id}
                                            photos={selectedWorkOrder.photos}
                                            onPhotosUpdate={(photos) => handlePhotosUpdate(selectedWorkOrder.id, photos)}
                                            disabled={!selectedWorkOrder.is_editable}
                                            maxPhotos={10}
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                                        <button
                                            onClick={() => setIsViewModalOpen(false)}
                                            className="px-4 py-2 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                        >
                                            Close
                                        </button>
                                        {selectedWorkOrder.is_editable && (
                                            <button
                                                onClick={() => {
                                                    setIsViewModalOpen(false);
                                                    handleEditWorkOrder(selectedWorkOrder);
                                                }}
                                                className="px-4 py-2 bg-primary dark:bg-accent text-white rounded-md hover:bg-primary/90 dark:hover:bg-accent/90"
                                            >
                                                Edit Work Order
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Parts Inventory Tab */
                <PartsInventoryManager />
            )}
        </div>
    );
}