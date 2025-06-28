import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import { 
    PartInventory, 
    PartInventoryCreate 
} from '../lib/types';
import { 
    getPartsInventory, 
    createPartInventory, 
    updatePartInventory, 
    deletePartInventory,
    adjustPartQuantity,
    getLowStockParts
} from '../lib/api';

interface PartsInventoryManagerProps {
    onPartAdded?: () => void;
    onPartUpdated?: () => void;
}

export default function PartsInventoryManager({ onPartAdded, onPartUpdated }: PartsInventoryManagerProps) {
    const { user } = useAuth();
    const [parts, setParts] = useState<PartInventory[]>([]);
    const [lowStockParts, setLowStockParts] = useState<PartInventory[]>([]);
    const [selectedPart, setSelectedPart] = useState<PartInventory | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    // Form states
    const [formData, setFormData] = useState<PartInventoryCreate>({
        part_number: '',
        part_name: '',
        description: '',
        category: '',
        quantity_on_hand: 0,
        minimum_stock_level: 0,
        reorder_quantity: 0,
        unit_cost: 0,
        supplier: '',
        supplier_part_number: ''
    });

    const [adjustmentData, setAdjustmentData] = useState({
        quantity_change: 0,
        reason: ''
    });

    // Load parts inventory
    const loadParts = useCallback(async () => {
        if (!user) return;
        
        try {
            setIsLoading(true);
            setError(null);
            const [partsData, lowStockData] = await Promise.all([
                getPartsInventory(),
                getLowStockParts()
            ]);
            setParts(partsData);
            setLowStockParts(lowStockData);
        } catch (err) {
            console.error('Error loading parts inventory:', err);
            setError('Failed to load parts inventory');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadParts();
    }, [loadParts]);

    // Filter parts based on search and filters
    const filteredParts = parts.filter(part => {
        const matchesSearch = searchTerm === '' || 
            part.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (part.description && part.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;
        
        const matchesLowStock = !showLowStockOnly || 
            (part.minimum_stock_level && part.quantity_on_hand <= part.minimum_stock_level);
        
        return matchesSearch && matchesCategory && matchesLowStock;
    });

    // Get unique categories for filter
    const categories = Array.from(new Set(parts.map(part => part.category).filter(Boolean)));

    const handleCreatePart = () => {
        setFormData({
            part_number: '',
            part_name: '',
            description: '',
            category: '',
            quantity_on_hand: 0,
            minimum_stock_level: 0,
            reorder_quantity: 0,
            unit_cost: 0,
            supplier: '',
            supplier_part_number: ''
        });
        setIsCreateModalOpen(true);
    };

    const handleEditPart = (part: PartInventory) => {
        setSelectedPart(part);
        setFormData({
            part_number: part.part_number,
            part_name: part.part_name,
            description: part.description || '',
            category: part.category || '',
            quantity_on_hand: part.quantity_on_hand,
            minimum_stock_level: part.minimum_stock_level || 0,
            reorder_quantity: part.reorder_quantity || 0,
            unit_cost: part.unit_cost,
            supplier: part.supplier || '',
            supplier_part_number: part.supplier_part_number || ''
        });
        setIsEditModalOpen(true);
    };

    const handleAdjustQuantity = (part: PartInventory) => {
        setSelectedPart(part);
        setAdjustmentData({
            quantity_change: 0,
            reason: ''
        });
        setIsAdjustModalOpen(true);
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            if (isCreateModalOpen) {
                await createPartInventory(formData);
                onPartAdded?.();
            } else if (isEditModalOpen && selectedPart) {
                await updatePartInventory(selectedPart.id, formData);
                onPartUpdated?.();
            }
            
            await loadParts();
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Error saving part:', err);
            setError('Failed to save part');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmitAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPart) return;

        setIsSaving(true);
        setError(null);

        try {
            await adjustPartQuantity(
                selectedPart.id, 
                adjustmentData.quantity_change, 
                adjustmentData.reason
            );
            await loadParts();
            setIsAdjustModalOpen(false);
        } catch (err) {
            console.error('Error adjusting quantity:', err);
            setError('Failed to adjust quantity');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePart = async (part: PartInventory) => {
        if (!confirm(`Are you sure you want to delete "${part.part_name}"?`)) return;

        try {
            await deletePartInventory(part.id);
            await loadParts();
        } catch (err) {
            console.error('Error deleting part:', err);
            setError('Failed to delete part');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStockStatus = (part: PartInventory) => {
        if (!part.minimum_stock_level) return null;
        
        if (part.quantity_on_hand === 0) {
            return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
        } else if (part.quantity_on_hand <= part.minimum_stock_level) {
            return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
        } else {
            return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
        }
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
                        Parts Inventory
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400">
                        Manage parts stock levels and track inventory
                    </p>
                </div>
                <button
                    onClick={handleCreatePart}
                    className="inline-flex items-center px-4 py-2 bg-primary dark:bg-accent text-white font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-accent/90 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Part
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                    {error}
                </div>
            )}

            {/* Low Stock Alert */}
            {lowStockParts.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                Low Stock Alert
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                <p>{lowStockParts.length} part{lowStockParts.length !== 1 ? 's' : ''} below minimum stock level:</p>
                                <ul className="mt-1 list-disc list-inside">
                                    {lowStockParts.slice(0, 3).map(part => (
                                        <li key={part.id}>{part.part_name} ({part.quantity_on_hand} remaining)</li>
                                    ))}
                                    {lowStockParts.length > 3 && (
                                        <li>...and {lowStockParts.length - 3} more</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-64">
                    <input
                        type="text"
                        placeholder="Search parts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Category:
                    </label>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showLowStockOnly}
                        onChange={(e) => setShowLowStockOnly(e.target.checked)}
                        className="rounded border-neutral-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Low stock only</span>
                </label>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    {filteredParts.length} part{filteredParts.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Parts List */}
            <div className="grid gap-4">
                {filteredParts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-neutral-400 dark:text-neutral-600 text-6xl mb-4">📦</div>
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                            No parts found
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                            {searchTerm || categoryFilter !== 'all' || showLowStockOnly 
                                ? 'Try adjusting your search filters.'
                                : 'Add your first part to get started.'
                            }
                        </p>
                        {(!searchTerm && categoryFilter === 'all' && !showLowStockOnly) && (
                            <button
                                onClick={handleCreatePart}
                                className="inline-flex items-center px-4 py-2 bg-primary dark:bg-accent text-white font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-accent/90 transition-colors"
                            >
                                Add First Part
                            </button>
                        )}
                    </div>
                ) : (
                    filteredParts.map((part) => {
                        const stockStatus = getStockStatus(part);
                        return (
                            <div
                                key={part.id}
                                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                                {part.part_name}
                                            </h3>
                                            <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                                #{part.part_number}
                                            </span>
                                            {stockStatus && (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                                    {stockStatus.label}
                                                </span>
                                            )}
                                        </div>
                                        {part.description && (
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                                                {part.description}
                                            </p>
                                        )}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-neutral-500 dark:text-neutral-400">On Hand:</span>
                                                <div className="font-medium text-neutral-900 dark:text-white">
                                                    {part.quantity_on_hand}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-neutral-500 dark:text-neutral-400">Unit Cost:</span>
                                                <div className="font-medium text-neutral-900 dark:text-white">
                                                    {formatCurrency(part.unit_cost)}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-neutral-500 dark:text-neutral-400">Category:</span>
                                                <div className="font-medium text-neutral-900 dark:text-white">
                                                    {part.category || 'Uncategorized'}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-neutral-500 dark:text-neutral-400">Supplier:</span>
                                                <div className="font-medium text-neutral-900 dark:text-white">
                                                    {part.supplier || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        {(part.minimum_stock_level || part.reorder_quantity) && (
                                            <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                                {part.minimum_stock_level && (
                                                    <div>
                                                        <span className="text-neutral-500 dark:text-neutral-400">Min Stock:</span>
                                                        <div className="font-medium text-neutral-900 dark:text-white">
                                                            {part.minimum_stock_level}
                                                        </div>
                                                    </div>
                                                )}
                                                {part.reorder_quantity && (
                                                    <div>
                                                        <span className="text-neutral-500 dark:text-neutral-400">Reorder Qty:</span>
                                                        <div className="font-medium text-neutral-900 dark:text-white">
                                                            {part.reorder_quantity}
                                                        </div>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-neutral-500 dark:text-neutral-400">Last Ordered:</span>
                                                    <div className="font-medium text-neutral-900 dark:text-white">
                                                        {formatDate(part.last_ordered)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        <button
                                            onClick={() => handleAdjustQuantity(part)}
                                            className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                            title="Adjust Quantity"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 11v2a1 1 0 001 1h8a1 1 0 001-1v-2M7 4h10l-1 10H8L7 4z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleEditPart(part)}
                                            className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                            title="Edit Part"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeletePart(part)}
                                            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                            title="Delete Part"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create/Edit Modal */}
            {(isCreateModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                {isCreateModalOpen ? 'Add New Part' : 'Edit Part'}
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

                        <form onSubmit={handleSubmitForm} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Part Number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.part_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, part_number: e.target.value }))}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Part Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.part_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, part_name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Unit Cost *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={formData.unit_cost}
                                        onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Quantity on Hand *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.quantity_on_hand}
                                        onChange={(e) => setFormData(prev => ({ ...prev, quantity_on_hand: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Minimum Stock Level
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.minimum_stock_level}
                                        onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock_level: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Reorder Quantity
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.reorder_quantity}
                                        onChange={(e) => setFormData(prev => ({ ...prev, reorder_quantity: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Supplier
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.supplier}
                                        onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Supplier Part Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.supplier_part_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, supplier_part_number: e.target.value }))}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setIsEditModalOpen(false);
                                    }}
                                    className="px-4 py-2 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-primary dark:bg-accent text-white rounded-md hover:bg-primary/90 dark:hover:bg-accent/90 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : isCreateModalOpen ? 'Add Part' : 'Update Part'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adjust Quantity Modal */}
            {isAdjustModalOpen && selectedPart && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                Adjust Quantity
                            </h3>
                            <button
                                onClick={() => setIsAdjustModalOpen(false)}
                                className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                <span className="font-medium">{selectedPart.part_name}</span>
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-500">
                                Current quantity: {selectedPart.quantity_on_hand}
                            </p>
                        </div>

                        <form onSubmit={handleSubmitAdjustment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Quantity Change *
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={adjustmentData.quantity_change}
                                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity_change: parseInt(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    placeholder="e.g., 10 to add, -5 to remove"
                                />
                                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                                    New quantity will be: {selectedPart.quantity_on_hand + adjustmentData.quantity_change}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Reason *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={adjustmentData.reason}
                                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                    placeholder="e.g., Received shipment, Used in work order"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAdjustModalOpen(false)}
                                    className="px-4 py-2 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-primary dark:bg-accent text-white rounded-md hover:bg-primary/90 dark:hover:bg-accent/90 disabled:opacity-50"
                                >
                                    {isSaving ? 'Adjusting...' : 'Adjust Quantity'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}