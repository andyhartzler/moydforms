'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { FormFieldConfig, FileUploadResult } from '@/types/forms';
import { Camera, Image as ImageIcon, X, Plus, Monitor } from 'lucide-react';

// Google Drive icon component using actual logo
const GoogleDriveIcon = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-10 w-10',
  };
  return (
    <img
      src="/icons/google-drive-icon.png"
      alt="Google Drive"
      className={sizeClasses[size]}
    />
  );
};

interface ImageUploadProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  onFileUpload?: (file: File, fieldId: string) => Promise<FileUploadResult>;
}

interface UploadedImage {
  name: string;
  url: string;
  storage_path?: string;
  file?: File;
  source?: 'device' | 'google_drive';
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Helper to create File objects (works around TypeScript quirks with File constructor)
const createFile = (blob: Blob, name: string, type: string): File => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FileConstructor = globalThis.File as any;
  return new FileConstructor([blob], name, { type }) as File;
};

export default function ImageUpload({ field, value, onChange, error, onBlur, onFocus, onFileUpload }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [gapiLoaded, setGapiLoaded] = useState(false);

  const images: UploadedImage[] = value || [];
  const maxImages = field.maxImages ?? 10;
  const maxSizeMB = field.maxFileSizeMB ?? 10;
  const allowCamera = field.allowCamera ?? true;
  const allowGallery = field.allowGallery ?? true;

  // Google API configuration
  const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleDriveEnabled = !!(GOOGLE_API_KEY && GOOGLE_CLIENT_ID);

  // Load Google API scripts
  useEffect(() => {
    if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) return;

    const loadGapi = () => {
      if (window.gapi) {
        window.gapi.load('client:picker', () => {
          setGapiLoaded(true);
        });
      } else {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.gapi.load('client:picker', () => {
            setGapiLoaded(true);
          });
        };
        document.body.appendChild(script);
      }
    };

    const loadGsi = () => {
      if (!window.google?.accounts) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    };

    loadGapi();
    loadGsi();
  }, [GOOGLE_API_KEY, GOOGLE_CLIENT_ID]);

  const validateImage = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Image size exceeds ${maxSizeMB}MB limit`;
    }
    return null;
  };

  const processImage = async (file: File): Promise<{ url: string; path?: string }> => {
    if (onFileUpload) {
      const result = await onFileUpload(file, field.id);
      return { url: result.url, path: result.path };
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ url: e.target?.result as string });
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
          const result = await processImage(file);
          newImages.push({
            name: file.name,
            url: result.url,
            storage_path: result.path,
            file: onFileUpload ? undefined : file,
            source: 'device',
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

  // Google Drive Picker
  const handleGoogleDriveAuth = useCallback(() => {
    if (!window.google?.accounts?.oauth2 || !GOOGLE_CLIENT_ID) return;

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response: any) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          openGooglePicker(response.access_token);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  }, [GOOGLE_CLIENT_ID]);

  const openGooglePicker = useCallback((token: string) => {
    if (!window.google?.picker || !GOOGLE_API_KEY) return;

    const view = new window.google.picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)
      .setMimeTypes('image/*');

    const remainingSlots = maxImages - images.length;
    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setCallback(handlePickerCallback)
      .setMaxItems(remainingSlots > 1 ? remainingSlots : 1)
      .build();

    picker.setVisible(true);
  }, [GOOGLE_API_KEY, maxImages, images.length]);

  const handlePickerCallback = useCallback(async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      if (images.length >= maxImages) {
        alert(`Maximum ${maxImages} images allowed`);
        return;
      }

      setUploading(true);
      const newImages: UploadedImage[] = [];

      for (const doc of data.docs as Array<{ id: string; name: string; mimeType?: string; url?: string }>) {
        if (images.length + newImages.length >= maxImages) break;

        const fileName: string = doc.name;
        const mimeType: string = doc.mimeType || 'image/jpeg';
        let imageUrl = doc.url || `https://drive.google.com/uc?id=${doc.id}`;

        let storagePath: string | undefined;

        // If onFileUpload is provided, download and re-upload the file
        if (onFileUpload && accessToken) {
          try {
            const response = await fetch(
              `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (response.ok) {
              const blob = await response.blob();

              // Validate file size
              if (blob.size > maxSizeMB * 1024 * 1024) {
                alert(`Image "${fileName}" exceeds ${maxSizeMB}MB limit`);
                continue;
              }

              // Create File object from blob
              const file = createFile(blob, fileName, mimeType);
              const uploadResult = await onFileUpload(file, field.id);
              imageUrl = uploadResult.url;
              storagePath = uploadResult.path;
            }
          } catch (err) {
            console.error('Failed to download Google Drive image:', err);
            // Fall back to direct Google Drive URL
            imageUrl = `https://drive.google.com/uc?id=${doc.id}`;
          }
        }

        newImages.push({
          name: fileName,
          url: imageUrl,
          storage_path: storagePath,
          source: 'google_drive',
        });
      }

      setUploading(false);

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }
    }
  }, [accessToken, images, maxImages, maxSizeMB, onChange, onFileUpload, field.id]);

  const handleGoogleDriveClick = () => {
    if (images.length >= maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }
    if (accessToken) {
      openGooglePicker(accessToken);
    } else {
      handleGoogleDriveAuth();
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
            {image.source === 'google_drive' && (
              <span className="absolute bottom-1 left-1 p-1 bg-white/80 rounded text-blue-600">
                <GoogleDriveIcon />
              </span>
            )}
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
            <div className={`flex flex-col h-full gap-1 ${googleDriveEnabled ? '' : ''}`}>
              {/* Camera/Gallery buttons */}
              {allowCamera && allowGallery ? (
                <>
                  <button
                    type="button"
                    onClick={openCamera}
                    disabled={field.enabled === false}
                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed ${googleDriveEnabled ? 'rounded-t-lg' : 'rounded-t-lg'} transition-colors ${
                      error ? 'border-red-300' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                    } ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Camera className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-0.5">Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={openGallery}
                    disabled={field.enabled === false}
                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed transition-colors ${
                      error ? 'border-red-300' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                    } ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ImageIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-0.5">Gallery</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={allowCamera ? openCamera : openGallery}
                  disabled={field.enabled === false}
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed ${googleDriveEnabled ? 'rounded-t-lg' : 'rounded-lg'} transition-colors ${
                    error ? 'border-red-300' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  } ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-0.5">Add Image</span>
                </button>
              )}

              {/* Google Drive button */}
              {googleDriveEnabled && (
                <button
                  type="button"
                  onClick={handleGoogleDriveClick}
                  disabled={field.enabled === false}
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-b-lg transition-colors ${
                    error ? 'border-red-300' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  } ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <GoogleDriveIcon />
                  <span className="text-xs text-gray-500 mt-0.5">Drive</span>
                </button>
              )}
            </div>
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
