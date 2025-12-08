'use client';

import { useRef, useState } from 'react';
import { FormFieldConfig } from '@/types/forms';
import { Camera, Image as ImageIcon, X, Plus } from 'lucide-react';

interface ImageUploadProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  onFileUpload?: (file: File, fieldId: string) => Promise<string>;
}

interface UploadedImage {
  name: string;
  url: string;
  file?: File;
}

export default function ImageUpload({ field, value, onChange, error, onBlur, onFocus, onFileUpload }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const images: UploadedImage[] = value || [];
  const maxImages = field.maxImages ?? 10;
  const maxSizeMB = field.maxFileSizeMB ?? 10;
  const allowCamera = field.allowCamera ?? true;
  const allowGallery = field.allowGallery ?? true;

  const validateImage = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Image size exceeds ${maxSizeMB}MB limit`;
    }
    return null;
  };

  const processImage = async (file: File): Promise<string> => {
    // If there's an upload handler, use it
    if (onFileUpload) {
      return onFileUpload(file, field.id);
    }

    // Otherwise, create a local preview URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (fileList: FileList) => {
    if (images.length >= maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    const newImages: UploadedImage[] = [];
    setUploading(true);

    try {
      for (let i = 0; i < fileList.length && images.length + newImages.length < maxImages; i++) {
        const file = fileList[i];
        const validationError = validateImage(file);

        if (validationError) {
          alert(validationError);
          continue;
        }

        try {
          const url = await processImage(file);
          newImages.push({
            name: file.name,
            url,
            file: onFileUpload ? undefined : file,
          });
        } catch (err) {
          console.error('Image processing failed:', err);
          alert('Failed to process image');
        }
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages.length > 0 ? newImages : null);
  };

  const openCamera = () => {
    if (inputRef.current) {
      inputRef.current.capture = 'environment';
      inputRef.current.click();
    }
  };

  const openGallery = () => {
    if (inputRef.current) {
      inputRef.current.removeAttribute('capture');
      inputRef.current.click();
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={maxImages > 1}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        disabled={field.enabled === false || uploading}
        className="hidden"
        onFocus={onFocus}
        onBlur={onBlur}
      />

      {/* Image grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {/* Existing images */}
        {images.map((image, index) => (
          <div key={index} className="relative aspect-square group">
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              disabled={field.enabled === false}
              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Add more button */}
        {images.length < maxImages && !uploading && (
          <div className="aspect-square">
            {allowCamera && allowGallery ? (
              <div className="flex flex-col h-full gap-1">
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={field.enabled === false}
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-t-lg transition-colors ${
                    error ? 'border-red-300' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  } ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Camera className="h-5 w-5 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Camera</span>
                </button>
                <button
                  type="button"
                  onClick={openGallery}
                  disabled={field.enabled === false}
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-b-lg transition-colors ${
                    error ? 'border-red-300' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  } ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Gallery</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={allowCamera ? openCamera : openGallery}
                disabled={field.enabled === false}
                className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
                  error ? 'border-red-300' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                } ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Plus className="h-8 w-8 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">Add Image</span>
              </button>
            )}
          </div>
        )}

        {/* Loading indicator */}
        {uploading && (
          <div className="aspect-square flex items-center justify-center border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {images.length} / {maxImages} images
      </p>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
