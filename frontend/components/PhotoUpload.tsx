import { useState, useRef } from 'react';
import { uploadWorkOrderPhoto, deleteWorkOrderPhoto } from '../lib/api';

interface PhotoUploadProps {
    workOrderId: string;
    photos: string[];
    onPhotosUpdate: (photos: string[]) => void;
    disabled?: boolean;
    maxPhotos?: number;
}

export default function PhotoUpload({ 
    workOrderId, 
    photos, 
    onPhotosUpdate, 
    disabled = false,
    maxPhotos = 10 
}: PhotoUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // Check if adding these photos would exceed the limit
        if (photos.length + files.length > maxPhotos) {
            setUploadError(`Cannot upload more than ${maxPhotos} photos total`);
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    throw new Error(`${file.name} is not an image file`);
                }

                // Validate file size (10MB)
                const maxSize = 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    throw new Error(`${file.name} is larger than 10MB`);
                }

                // Upload the file
                const response = await uploadWorkOrderPhoto(workOrderId, file);
                return response.photo_url;
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            const updatedPhotos = [...photos, ...uploadedUrls];
            onPhotosUpdate(updatedPhotos);

            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('Photo upload error:', error);
            setUploadError(error instanceof Error ? error.message : 'Failed to upload photos');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeletePhoto = async (photoIndex: number) => {
        if (!confirm('Are you sure you want to delete this photo?')) return;

        try {
            await deleteWorkOrderPhoto(workOrderId, photoIndex);
            const updatedPhotos = photos.filter((_, index) => index !== photoIndex);
            onPhotosUpdate(updatedPhotos);
        } catch (error) {
            console.error('Photo delete error:', error);
            setUploadError('Failed to delete photo');
        }
    };

    const openLightbox = (photoUrl: string) => {
        // Simple lightbox - open in new tab/window
        window.open(photoUrl, '_blank');
    };

    return (
        <div className="space-y-4">
            {/* Upload Section */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Photos ({photos.length}/{maxPhotos})
                </h4>
                {!disabled && photos.length < maxPhotos && (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={isUploading}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="inline-flex items-center px-3 py-2 text-sm bg-primary dark:bg-accent text-white rounded-md hover:bg-primary/90 dark:hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <>
                                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Photos
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {uploadError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
                </div>
            )}

            {/* Photo Grid */}
            {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map((photoUrl, index) => (
                        <div key={index} className="relative group">
                            <div className="aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden">
                                <img
                                    src={photoUrl}
                                    alt={`Work order photo ${index + 1}`}
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => openLightbox(photoUrl)}
                                    loading="lazy"
                                />
                                
                                {/* Delete button - only show if not disabled */}
                                {!disabled && (
                                    <button
                                        onClick={() => handleDeletePhoto(index)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        title="Delete photo"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}

                                {/* View button overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                    <button
                                        onClick={() => openLightbox(photoUrl)}
                                        className="p-2 bg-white dark:bg-neutral-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        title="View full size"
                                    >
                                        <svg className="w-4 h-4 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                    <svg className="w-12 h-12 mx-auto text-neutral-400 dark:text-neutral-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {disabled ? 'No photos uploaded' : 'No photos yet. Click "Add Photos" to upload images.'}
                    </p>
                </div>
            )}

            {/* Upload Instructions */}
            {!disabled && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
                    <p>• Supported formats: JPEG, PNG, WebP</p>
                    <p>• Maximum file size: 10MB per photo</p>
                    <p>• Maximum photos: {maxPhotos} per work order</p>
                    <p>• Click on any photo to view full size</p>
                </div>
            )}
        </div>
    );
}